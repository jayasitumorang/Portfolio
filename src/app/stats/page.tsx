import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { signIn, signOut } from "./actions";
import { isSignedIn } from "./auth";
import { countryName, DAYS, loadStats, TZ, type Ranked, type Stats } from "./data";

export const metadata: Metadata = { title: "Visitor stats", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ wrong?: string }> };

export default function StatsPage({ searchParams }: Props) {
  return (
    <main className="wrap stats">
      <Suspense fallback={<p className="muted">Loading…</p>}>
        <Gate searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Gate({ searchParams }: Props) {
  await connection(); // decide on every request: env vars and the sign-in cookie are only known at runtime
  if (!process.env.STATS_PASSWORD) {
    return (
      <Notice title="Stats page is off">
        Add a <code>STATS_PASSWORD</code> environment variable in Vercel and redeploy to turn it on.
      </Notice>
    );
  }
  if (!(await isSignedIn())) {
    const { wrong } = await searchParams;
    return (
      <form action={signIn} className="login-card">
        <span className="label">Private</span>
        <h1>Visitor stats</h1>
        <label htmlFor="password" className="muted">
          Password
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" required autoFocus />
        {wrong && <p className="form-error">That password is not right. Try again.</p>}
        <button className="btn primary" type="submit">
          Sign in
        </button>
      </form>
    );
  }

  const stats = await loadStats();
  if (!stats) {
    return (
      <Notice title="Supabase is not connected">
        Add <code>SUPABASE_URL</code> and <code>SUPABASE_SECRET_KEY</code> in Vercel and redeploy.
      </Notice>
    );
  }
  if ("error" in stats) {
    return (
      <Notice title="Could not read the visitor log">
        Supabase said: {stats.error}. If the table is missing, run <code>supabase/log_viewers.sql</code> in the Supabase SQL
        Editor.
      </Notice>
    );
  }
  return <Dashboard s={stats} />;
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="login-card">
      <span className="label">Stats</span>
      <h1>{title}</h1>
      <p className="muted">{children}</p>
    </div>
  );
}

const shortDay = (key: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${key}T00:00:00Z`));
const when = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(iso));

function Dashboard({ s }: { s: Stats }) {
  const max = Math.max(1, ...s.days.map((d) => d.views));
  const top = s.sources[0];
  return (
    <>
      <div className="stats-head">
        <div>
          <span className="label">Private · last {DAYS} days · WIB</span>
          <h1>Visitor stats</h1>
        </div>
        <form action={signOut}>
          <button className="btn" type="submit">
            Sign out
          </button>
        </form>
      </div>

      <div className="tiles">
        <div className="tile">
          <span>Page views</span>
          <b>{s.views.toLocaleString("en")}</b>
        </div>
        <div className="tile">
          <span>Visitors today</span>
          <b>{s.visitorsToday}</b>
        </div>
        <div className="tile">
          <span>Avg visitors / active day</span>
          <b>{s.avgVisitors}</b>
        </div>
        <div className="tile">
          <span>Top source</span>
          <b>{top ? top.label : "None yet"}</b>
        </div>
      </div>

      <section className="chart-card">
        <div className="chart-title">
          <h2>Page views per day</h2>
          <span className="muted">Hover a day for views and visitors</span>
        </div>
        <div className="vchart" role="img" aria-label={`Page views per day for the last ${DAYS} days, peak ${max}`}>
          <div className="vchart-y" aria-hidden>
            <span>{max}</span>
            <span>{Math.round(max / 2)}</span>
            <span>0</span>
          </div>
          <div className="vchart-plot">
            {s.days.map((d) => (
              <div className="vcol" key={d.key} tabIndex={0}>
                {d.views > 0 && <i style={{ height: `${(d.views / max) * 100}%` }} />}
                <span className="tip" role="tooltip">
                  <b>{shortDay(d.key)}</b>
                  {d.views} views · {d.visitors} visitors
                </span>
              </div>
            ))}
          </div>
          <div className="vchart-x" aria-hidden>
            <span>{shortDay(s.days[0].key)}</span>
            <span>{shortDay(s.days[Math.floor(s.days.length / 2)].key)}</span>
            <span>Today</span>
          </div>
        </div>
        <details className="as-table">
          <summary>Show as a table</summary>
          <table>
            <thead>
              <tr>
                <th>Day</th>
                <th>Views</th>
                <th>Visitors</th>
              </tr>
            </thead>
            <tbody>
              {[...s.days].reverse().map((d) => (
                <tr key={d.key}>
                  <td>{shortDay(d.key)}</td>
                  <td>{d.views}</td>
                  <td>{d.visitors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>

      <div className="rank-grid">
        <RankCard title="Countries" items={s.countries} total={s.views} />
        <RankCard title="Sources" items={s.sources} total={s.views} />
        <RankCard title="Devices" items={s.devices} total={s.views} />
        <RankCard title="Browsers" items={s.browsers} total={s.views} />
      </div>

      <section className="chart-card">
        <div className="chart-title">
          <h2>Recent visits</h2>
          <span className="muted">Newest first</span>
        </div>
        {s.recent.length ? (
          <div className="table-scroll">
            <table className="recent">
              <thead>
                <tr>
                  <th>Time (WIB)</th>
                  <th>Page</th>
                  <th>Location</th>
                  <th>Source</th>
                  <th>Device</th>
                </tr>
              </thead>
              <tbody>
                {s.recent.map((r, i) => (
                  <tr key={`${r.created_at}-${i}`}>
                    <td className="mono">{when(r.created_at)}</td>
                    <td className="mono">{r.path}</td>
                    <td>{[r.city, countryName(r.country)].filter(Boolean).join(", ") || "Unknown"}</td>
                    <td>{r.source}</td>
                    <td>
                      {r.device} · {r.browser} on {r.os}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No visits yet. Share your link and check back.</p>
        )}
      </section>
    </>
  );
}

function RankCard({ title, items, total }: { title: string; items: Ranked; total: number }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <section className="chart-card">
      <h2>{title}</h2>
      {items.length ? (
        <ol className="rank">
          {items.map((i) => (
            <li key={i.label} title={`${i.label}: ${i.value} views (${Math.round((i.value / Math.max(total, 1)) * 100)}%)`}>
              <span className="rank-label">{i.label}</span>
              <span className="rank-bar" aria-hidden>
                <i style={{ width: `${(i.value / max) * 100}%` }} />
              </span>
              <span className="rank-val">{i.value}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="muted">No data yet.</p>
      )}
    </section>
  );
}
