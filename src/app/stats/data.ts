import "server-only";
import { supabaseAdmin, VISITOR_TABLE, type ViewRow } from "@/lib/supabase";

export const DAYS = 30;
export const TZ = "Asia/Jakarta"; // WIB, Medan's time zone

const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const regionName = new Intl.DisplayNames(["en"], { type: "region" });

export type Ranked = { label: string; value: number }[];
export type Stats = {
  days: { key: string; views: number; visitors: number }[];
  views: number;
  visitorsToday: number;
  avgVisitors: number;
  countries: Ranked;
  sources: Ranked;
  devices: Ranked;
  browsers: Ranked;
  pages: Ranked;
  recent: ViewRow[];
};

function rank(rows: ViewRow[], pick: (r: ViewRow) => string | null, limit = 6): Ranked {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const k = pick(r) || "Unknown";
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const sorted = [...counts].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, limit).map(([label, value]) => ({ label, value }));
  const rest = sorted.slice(limit).reduce((s, [, v]) => s + v, 0);
  return rest ? [...top, { label: "Other", value: rest }] : top;
}

function country(code: string | null) {
  if (!code) return null;
  try {
    return regionName.of(code) ?? code;
  } catch {
    return code;
  }
}

/** Last 30 days of views, aggregated for the dashboard. null = Supabase isn't configured. */
export async function loadStats(): Promise<Stats | { error: string } | null> {
  const db = supabaseAdmin();
  if (!db) return null;

  const since = new Date(Date.now() - DAYS * 86_400_000).toISOString();
  const rows: ViewRow[] = [];
  for (let from = 0; from < 50_000; from += 1000) {
    const { data, error } = await db
      .from(VISITOR_TABLE)
      .select("created_at,path,referrer,source,country,city,device,browser,os,visitor_id")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .range(from, from + 999);
    if (error) return { error: error.message };
    rows.push(...(data as ViewRow[]));
    if (!data || data.length < 1000) break;
  }

  // One bucket per day in WIB, oldest first, including days with no visits.
  const days = Array.from({ length: DAYS }, (_, i) => ({
    key: dayKey.format(new Date(Date.now() - (DAYS - 1 - i) * 86_400_000)),
    views: 0,
    ids: new Set<string>(),
  }));
  const byKey = new Map(days.map((d) => [d.key, d]));
  for (const r of rows) {
    const d = byKey.get(dayKey.format(new Date(r.created_at)));
    if (d) {
      d.views++;
      d.ids.add(r.visitor_id);
    }
  }
  const series = days.map((d) => ({ key: d.key, views: d.views, visitors: d.ids.size }));
  const activeDays = series.filter((d) => d.views > 0).length || 1;

  return {
    days: series,
    views: rows.length,
    visitorsToday: series[series.length - 1].visitors,
    avgVisitors: Math.round((series.reduce((s, d) => s + d.visitors, 0) / activeDays) * 10) / 10,
    countries: rank(rows, (r) => country(r.country)),
    sources: rank(rows, (r) => r.source),
    devices: rank(rows, (r) => r.device, 3),
    browsers: rank(rows, (r) => r.browser, 5),
    pages: rank(rows, (r) => r.path, 5),
    recent: rows.slice(0, 25),
  };
}

export const countryName = country;
