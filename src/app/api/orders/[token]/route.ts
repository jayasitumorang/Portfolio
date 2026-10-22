import { findByToken, refresh } from "@/lib/orders";

// Order status for the buyer's order page, which polls it while the QR code is open.
export async function GET(_req: Request, ctx: RouteContext<"/api/orders/[token]">) {
  const { token } = await ctx.params;
  const found = await findByToken(token);
  if (!found) return Response.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });

  // The webhook normally updates the order; asking Midtrans too covers a missed or slow notification.
  const o = await refresh(found);
  return Response.json(
    {
      status: o.status,
      book: o.book_title,
      slug: o.book_slug,
      amount: o.amount,
      email: o.email,
      qr: o.status === "pending" ? o.qr_url : null,
      expiresAt: o.expires_at,
      paidAt: o.paid_at,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
