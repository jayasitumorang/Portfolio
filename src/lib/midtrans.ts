import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import type { OrderStatus } from "@/lib/supabase";

// Midtrans Core API, QRIS only. Docs: https://docs.midtrans.com/reference/gopay-1
// Charged as GoPay: its QR is QRIS, so any QRIS app can pay it, and it works on accounts where
// payment_type "qris" is not enabled for the Core API.
// MIDTRANS_IS_PRODUCTION=true switches from the sandbox to live payments.

const base = () =>
  process.env.MIDTRANS_IS_PRODUCTION === "true" ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com";

export const midtransReady = () => !!process.env.MIDTRANS_SERVER_KEY;

async function call<T>(path: string, init?: { method: "POST"; body: unknown }): Promise<T> {
  const key = process.env.MIDTRANS_SERVER_KEY;
  if (!key) throw new Error("MIDTRANS_SERVER_KEY is not set");
  const res = await fetch(`${base()}${path}`, {
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
  };
  if (!res.ok) {
    const detail = [json.status_message ?? "request failed", ...(json.validation_messages ?? [])].join("; ");
    throw new Error(`Midtrans ${res.status}: ${detail}`);
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

/** Creates a QRIS payment (GoPay QR) that expires after `minutes`. */
export async function chargeQris(o: {
  orderId: string;
  amount: number;
  item: { id: string; name: string };
  email: string;
  name: string | null;
  minutes: number;
}) {
  const tx = await call<MidtransTx>("/v2/charge", {
    method: "POST",
    body: {
      payment_type: "gopay",
      transaction_details: { order_id: o.orderId, gross_amount: o.amount },
      item_details: [{ id: o.item.id, price: o.amount, quantity: 1, name: o.item.name.slice(0, 50) }],
      customer_details: { email: o.email, first_name: o.name ?? undefined },
      custom_expiry: { expiry_duration: o.minutes, unit: "minute" },
    },
  });
  if (tx.status_code !== "201") {
    const detail = [tx.status_message ?? "charge failed", ...(tx.validation_messages ?? [])].join("; ");
    throw new Error(`Midtrans ${tx.status_code}: ${detail}`);
  }
  return tx;
}

export const getStatus = (orderId: string) => call<MidtransTx>(`/v2/${encodeURIComponent(orderId)}/status`);

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
