import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const COOKIE = "stats_auth";

/** The cookie holds a signature of the password, never the password itself. */
export function token(password: string) {
  return createHmac("sha256", password).update("portfolio-stats-v1").digest("hex");
}

export function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function isSignedIn() {
  const pw = process.env.STATS_PASSWORD;
  if (!pw) return false;
  const value = (await cookies()).get(COOKIE)?.value;
  return !!value && same(value, token(pw));
}
