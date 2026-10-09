import { getGitHub } from "@/lib/github";
import { profile } from "@/data/profile";

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6", JavaScript: "#e3b341", Python: "#3572a5", Java: "#b07219", "C#": "#178600",
  Kotlin: "#a97bff", PHP: "#4f5d95", Go: "#00add8", HTML: "#e34c26", CSS: "#663399", Vue: "#41b883",
  Dart: "#00b4ab", Shell: "#89e051", PowerShell: "#012456", Batchfile: "#c1f12e",
};

const fmt = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(iso));

export async function GitHubSection() {
  const { repos, activity, fetchedAt } = await getGitHub(6);
  const ghUrl = `https://github.com/${profile.github}`;

  return (
    <section id="projects" className="section wrap">
      <div className="sec-head">
        <div>
          <span className="label">Projects</span>
          <h2>Live from GitHub</h2>
        </div>
        <span className="live">
          <span className="dot" aria-hidden /> Updates when I push · checked {fmt(fetchedAt)}
        </span>
      </div>

      <div className="gh-grid">
        <div className="repos">
          {repos && repos.length > 0 ? (
            repos.map((r) => (
              <a key={r.name} className="repo" href={r.html_url} target="_blank" rel="noopener noreferrer">
                <span className="repo-name">{r.name}</span>
                {r.description && <p>{r.description}</p>}
                <span className="repo-meta">
                  {r.language && (
                    <span className="lang">
                      <i style={{ background: LANG_COLORS[r.language] ?? "var(--muted)" }} />
                      {r.language}
                    </span>
                  )}
                  {r.stargazers_count > 0 && <span>★ {r.stargazers_count}</span>}
                  <span>Updated {fmt(r.pushed_at)}</span>
                </span>
              </a>
            ))
          ) : (
            <div className="gh-empty">
              {repos ? "No public repositories yet. " : "GitHub is not answering right now. "}
              See everything on{" "}
              <a href={ghUrl} target="_blank" rel="noopener noreferrer">
                github.com/{profile.github}
              </a>
              .
            </div>
          )}
        </div>

        <aside className="feed" aria-label="Recent GitHub activity">
          <h3>Recent activity</h3>
          {activity && activity.length > 0 ? (
            <ol>
              {activity.map((a) => (
                <li key={a.id}>
                  <div>
                    <b>{a.repo}</b>
                    <span>
                      {a.text} · {fmt(a.when)}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>
              {activity ? "No public activity in the last 90 days." : "Activity is unavailable right now."}
            </p>
          )}
          <p style={{ margin: "14px 0 0", fontSize: 14 }}>
            <a href={ghUrl} target="_blank" rel="noopener noreferrer">
              View profile on GitHub →
            </a>
          </p>
        </aside>
      </div>
    </section>
  );
}
