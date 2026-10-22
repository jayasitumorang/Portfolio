import { randomBytes } from "node:crypto";
import { isIP } from "node:net";
import { books } from "@/data/books";
import { chargeQris, midtransReady } from "@/lib/midtrans";
import { ORDER_TABLE, supabaseAdmin } from "@/lib/supabase";
import { device } from "@/lib/visitor";

// Starts a direct book sale: creates the order, asks Midtrans for a QRIS code and returns the
// secret token for the buyer's order page (/order#token).

const EXPIRY_MINUTES = 15;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const json = (body: unknown, status = 200) => Response.json(body, { status });

export async function POST(req: Request) {
  const h = req.headers;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const origin = h.get("origin");
  try {
    if (!origin || new URL(origin).host !== host) return json({ error: "Forbidden" }, 403);
  } catch {
    return json({ error: "Forbidden" }, 403);
  }

  const db = supabaseAdmin();
  if (!db || !midtransReady()) return json({ error: "Pembayaran belum aktif. Coba lagi nanti." }, 503);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Bad request" }, 400);
  }
  const book = books.find((b) => b.slug === body.slug);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 200) : "";
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 80) : null;
  if (!book) return json({ error: "Buku tidak ditemukan." }, 400);
  if (!EMAIL.test(email)) return json({ error: "Email tidak valid." }, 400);

  // A few open orders per IP at a time is plenty for a real buyer.
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "";
  const ipAddress = isIP(ip) ? ip : null;
  if (ipAddress) {
    const { count } = await db
      .from(ORDER_TABLE)
      .select("id", { count: "exact", head: true })
      .eq("ip_address", ipAddress)
      .eq("status", "pending")
      .gte("created_at", new Date(Date.now() - 30 * 60_000).toISOString());
    if ((count ?? 0) >= 5) return json({ error: "Terlalu banyak pesanan terbuka. Coba lagi sebentar lagi." }, 429);
  }

  const orderId = `BOOK-${book.slug.slice(0, 8).toUpperCase()}-${Date.now().toString(36)}${randomBytes(4).toString("hex")}`;
  const token = randomBytes(24).toString("hex");

  const { error } = await db.from(ORDER_TABLE).insert({
    order_id: orderId,
    access_token: token,
    book_slug: book.slug,
    book_title: book.title,
    amount: book.price,
    email,
    name,
    ip_address: ipAddress,
    country: h.get("x-vercel-ip-country"),
    device: device(h.get("user-agent") ?? ""),
  });
  if (error) {
    console.error(`${ORDER_TABLE} insert failed: ${error.message}`);
    return json({ error: "Gagal membuat pesanan." }, 500);
  }

  try {
    const tx = await chargeQris({
      orderId,
      amount: book.price,
      item: { id: book.slug, name: book.title },
      email,
      name,
      minutes: EXPIRY_MINUTES,
    });
    const qr = tx.actions?.find((a) => a.name === "generate-qr-code")?.url ?? null;
    await db
      .from(ORDER_TABLE)
      .update({
        transaction_id: tx.transaction_id ?? null,
        payment_type: "qris",
        qr_url: qr,
        expires_at: new Date(Date.now() + EXPIRY_MINUTES * 60_000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("order_id", orderId);
  } catch (e) {
    console.error(`checkout ${orderId}: ${(e as Error).message}`);
    await db.from(ORDER_TABLE).update({ status: "failed", updated_at: new Date().toISOString() }).eq("order_id", orderId);
    // Midtrans messages carry no secrets and make a failed setup diagnosable from the page.
    return json({ error: `QRIS gagal dibuat. Coba lagi. (${(e as Error).message})` }, 502);
  }

  return json({ token });
}
