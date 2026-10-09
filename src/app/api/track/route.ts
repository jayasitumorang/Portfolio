import { createHash } from "node:crypto";
import { supabaseAdmin, VISITOR_TABLE } from "@/lib/supabase";
import { browser, device, isBot, os, source } from "@/lib/visitor";

// Receives one page view from the visitor's browser (Tracker.tsx) and stores it in Supabase.
// No IP address is stored: visitor_id is a salted hash that changes every day.

const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export async function POST(req: Request) {
  const h = req.headers;
  const host = h.get("x-forwarded-host") ?? h.get("host");

  // Only accept beacons sent by this site's own pages.
  const origin = h.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== host) return new Response(null, { status: 403 });
    } catch {
      return new Response(null, { status: 403 });
    }
  }

  const ua = h.get("user-agent") ?? "";
  const db = supabaseAdmin();
  if (!db || isBot(ua)) return new Response(null, { status: 204 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }

  const referrer = str(body.referrer, 500);
  const utmSource = str(body.utm_source, 80);
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "";
  const day = new Date().toISOString().slice(0, 10);
  const salt = process.env.VISITOR_SALT ?? process.env.SUPABASE_SECRET_KEY ?? "";
  const city = h.get("x-vercel-ip-city");

  const { error } = await db.from(VISITOR_TABLE).insert({
    path: str(body.path, 200) ?? "/",
    referrer,
    source: source(referrer, utmSource, host),
    utm_source: utmSource,
    utm_medium: str(body.utm_medium, 80),
    utm_campaign: str(body.utm_campaign, 120),
    country: h.get("x-vercel-ip-country"),
    region: h.get("x-vercel-ip-country-region"),
    city: city ? decodeURIComponent(city) : null,
    device: device(ua),
    browser: browser(ua),
    os: os(ua),
    visitor_id: createHash("sha256").update(`${salt}|${day}|${ip}|${ua}`).digest("hex").slice(0, 16),
  });
  if (error) console.error(`${VISITOR_TABLE} insert failed: ${error.message}`);

  return new Response(null, { status: 204 });
}
