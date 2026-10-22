import { getStatus, validSignature } from "@/lib/midtrans";
import { applyTransaction } from "@/lib/orders";

// Midtrans payment notification (set it in Midtrans → Settings → Payment → Notification URL:
// https://<your-site>/api/midtrans/notification). The signature is checked, then the status is
// read back from Midtrans itself, so only Midtrans's own answer can mark an order paid.
export async function POST(req: Request) {
  let n: Record<string, string>;
  try {
    n = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  if (!validSignature(n)) return new Response("Invalid signature", { status: 403 });

  try {
    const tx = await getStatus(n.order_id);
    await applyTransaction(tx);
  } catch (e) {
    console.error(`midtrans notification ${n.order_id}: ${(e as Error).message}`);
    return new Response("Retry", { status: 500 }); // Midtrans retries on non-2xx
  }
  return new Response("OK");
}
