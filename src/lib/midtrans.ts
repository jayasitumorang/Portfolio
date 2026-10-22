import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import type { OrderStatus } from "@/lib/supabase";

// Midtrans: Snap creates the payment (QRIS via GoPay), the Core API reads its status back.
// Docs: https://docs.midtrans.com/docs/snap-snap-integration-guide
// MIDTRANS_IS_PRODUCTION=true switches from the sandbox to live payments.

const production = () => process.env.MIDTRANS_IS_PRODUCTION === "true";
const host = (sub: "api" | "app") => `https://${sub}${production() ? "" : ".sandbox"}.midtrans.com`;

export const midtransReady = () => !!process.env.MIDTRANS_SERVER_KEY;

/** What the buyer's browser needs to embed Snap; the client key is public by design. */
export const snapClient = () => ({ clientKey: process.env.MIDTRANS_CLIENT_KEY || null, production: production() });

async function call<T>(url: string, init?: { method: "POST"; body: unknown }): Promise<T> {
  const key = process.env.MIDTRANS_SERVER_KEY;
  if (!key) throw new Error("MIDTRANS_SERVER_KEY is not set");
  const res = await fetch(url, {
    method: init?.method ?? "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
    },
    body: init ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as T & {
    status_code?: string;
    status_message?: string;
    validation_messages?: string[];
    error_messages?: string[];
  };
  if (!res.ok) {
    const detail = [json.status_message ?? "request failed", ...(json.validation_messages ?? []), ...(json.error_messages ?? [])];
    throw new Error(`Midtrans ${res.status}: ${detail.join("; ")}`);
  }
  return json;
}

export type MidtransTx = {
  status_code: string;
  status_message?: string;
  validation_messages?: string[];
  transaction_id?: string;
  order_id: string;
  gross_amount: string;
  payment_type?: string;
  transaction_status: string;
  fraud_status?: string;
  issuer?: string;
  acquirer?: string;
  expiry_time?: string;
  qr_string?: string;
  actions?: { name: string; method: string; url: string }[];
};

/**
 * Creates a Snap payment limited to QRIS (GoPay's QR is QRIS, so any QRIS app can pay it) that
 * expires after `minutes`. Snap only offers the methods that are active on the Midtrans account.
 */
export async function createSnap(o: {
  orderId: string;
  amount: number;
  item: { id: string; name: string };
  email: string;
  name: string | null;
  minutes: number;
  finishUrl: string;
}) {
  const snap = await call<{ token?: string; redirect_url?: string }>(`${host("app")}/snap/v1/transactions`, {
    method: "POST",
    body: {
      transaction_details: { order_id: o.orderId, gross_amount: o.amount },
      item_details: [{ id: o.item.id, price: o.amount, quantity: 1, name: o.item.name.slice(0, 50) }],
      customer_details: { email: o.email, first_name: o.name ?? undefined },
      enabled_payments: ["gopay", "other_qris"],
      expiry: { unit: "minute", duration: o.minutes },
      callbacks: { finish: o.finishUrl },
    },
  });
  if (!snap.token || !snap.redirect_url) throw new Error("Midtrans Snap: no token in response");
  return { token: snap.token, url: snap.redirect_url };
}

/** The Snap token is the last segment of its redirect URL, which is what the order row keeps. */
export const snapToken = (url: string) => url.split("/").pop() || null;

export const getStatus = (orderId: string) => call<MidtransTx>(`${host("api")}/v2/${encodeURIComponent(orderId)}/status`);

/** Checks the signature_key Midtrans puts on every notification. */
export function validSignature(n: { order_id?: string; status_code?: string; gross_amount?: string; signature_key?: string }) {
  const key = process.env.MIDTRANS_SERVER_KEY;
  if (!key || !n.order_id || !n.status_code || !n.gross_amount || !n.signature_key) return false;
  const want = createHash("sha512").update(`${n.order_id}${n.status_code}${n.gross_amount}${key}`).digest("hex");
  const a = Buffer.from(want);
  const b = Buffer.from(n.signature_key);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Midtrans transaction_status → our order status. */
export function toStatus(tx: Pick<MidtransTx, "transaction_status" | "fraud_status">): OrderStatus {
  switch (tx.transaction_status) {
    case "settlement":
      return "paid";
    case "capture":
      return tx.fraud_status === "challenge" ? "pending" : "paid";
    case "expire":
      return "expired";
    case "cancel":
    case "deny":
    case "failure":
      return "failed";
    case "refund":
    case "partial_refund":
      return "refunded";
    default:
      return "pending";
  }
}
