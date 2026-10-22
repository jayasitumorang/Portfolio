import { books } from "@/data/books";
import { findByToken } from "@/lib/orders";
import { BOOK_BUCKET, ORDER_TABLE, supabaseAdmin } from "@/lib/supabase";

const MAX_DOWNLOADS = 10;

// Paid orders get a signed link to the EPUB that works for five minutes.
export async function GET(_req: Request, ctx: RouteContext<"/api/orders/[token]/download">) {
  const { token } = await ctx.params;
  const o = await findByToken(token);
  const db = supabaseAdmin();
  if (!o || !db) return new Response("Pesanan tidak ditemukan.", { status: 404 });
  if (o.status !== "paid") return new Response("Pesanan belum dibayar.", { status: 402 });
  if (o.downloads >= MAX_DOWNLOADS) {
    return new Response("Batas unduhan tercapai. Hubungi jayasitumorang19@gmail.com.", { status: 429 });
  }

  const book = books.find((b) => b.slug === o.book_slug);
  if (!book) return new Response("Buku tidak ditemukan.", { status: 404 });

  const { data, error } = await db.storage.from(BOOK_BUCKET).createSignedUrl(book.file, 300, {
    download: `${book.title.replace(/[^\w\s,-]/g, "")}.epub`,
  });
  if (error || !data) {
    console.error(`download ${o.order_id}: ${error?.message}`);
    return new Response("File belum tersedia. Hubungi jayasitumorang19@gmail.com.", { status: 503 });
  }
  await db.from(ORDER_TABLE).update({ downloads: o.downloads + 1 }).eq("order_id", o.order_id);
  return Response.redirect(data.signedUrl, 302);
}
