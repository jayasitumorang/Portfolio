import "server-only";
import { getStatus, toStatus, type MidtransTx } from "@/lib/midtrans";
import { ORDER_TABLE, supabaseAdmin, type OrderRow } from "@/lib/supabase";

const COLUMNS =
  "created_at,order_id,access_token,book_slug,book_title,amount,email,name,status,payment_type,issuer,transaction_id,qr_url,expires_at,paid_at,downloads,country,device";

export async function findByToken(token: string) {
  const db = supabaseAdmin();
  if (!db || !/^[a-f0-9]{48}$/.test(token)) return null;
  const { data } = await db.from(ORDER_TABLE).select(COLUMNS).eq("access_token", token).maybeSingle();
  return (data as OrderRow | null) ?? null;
}

/**
 * Applies a Midtrans transaction to the order. A paid order only moves on to refunded, and the amount
 * must match what we charged, so a replayed or edited notification can't unlock a book.
 */
export async function applyTransaction(tx: MidtransTx): Promise<OrderRow | null> {
  const db = supabaseAdmin();
  if (!db) return null;
  const { data } = await db.from(ORDER_TABLE).select(COLUMNS).eq("order_id", tx.order_id).maybeSingle();
  const order = data as OrderRow | null;
  if (!order) return null;

  const next = toStatus(tx);
  if (Math.round(Number(tx.gross_amount)) !== order.amount) {
    console.error(`order ${order.order_id}: Midtrans amount ${tx.gross_amount} does not match ${order.amount}`);
    return order;
  }
  if (next === order.status || (order.status === "paid" && next !== "refunded")) return order;

  const patch = {
    status: next,
    updated_at: new Date().toISOString(),
    transaction_id: tx.transaction_id ?? null,
    payment_type: tx.payment_type ?? order.payment_type,
    issuer: tx.issuer ?? tx.acquirer ?? order.issuer,
    paid_at: next === "paid" ? new Date().toISOString() : order.paid_at,
  };
  const { error } = await db.from(ORDER_TABLE).update(patch).eq("order_id", order.order_id);
  if (error) console.error(`${ORDER_TABLE} update failed: ${error.message}`);
  return { ...order, ...patch };
}

/** Asks Midtrans directly; used when the buyer's page polls a pending order. */
export async function refresh(order: OrderRow) {
  if (order.status !== "pending") return order;
  try {
    return (await applyTransaction(await getStatus(order.order_id))) ?? order;
  } catch (e) {
    // Midtrans answers 404 until the buyer opens QRIS in Snap. If they never do, no notification ever
    // comes, so a pending order past its expiry (plus a little slack) is expired here.
    const stale = order.expires_at && Date.parse(order.expires_at) + 2 * 60_000 < Date.now();
    if (!stale || !(e as Error).message.startsWith("Midtrans 404")) return order;
    const db = supabaseAdmin();
    const patch = { status: "expired" as const, updated_at: new Date().toISOString() };
    await db?.from(ORDER_TABLE).update(patch).eq("order_id", order.order_id).eq("status", "pending");
    return { ...order, ...patch };
  }
}
