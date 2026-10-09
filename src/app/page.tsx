import Image from "next/image";
import { cacheLife } from "next/cache";
import profilePhoto from "@/assets/profile.jpg";
import { ARField } from "@/components/ARField";
import { CopyEmail } from "@/components/CopyEmail";
import { GitHubSection } from "@/components/GitHubSection";
import { StackDiagram } from "@/components/StackDiagram";
import { ThemeToggle } from "@/components/ThemeToggle";
import { aiWork, certifications, education, experience, languages, layers, practices, profile, speaking } from "@/data/profile";

const month = (ym: string) =>
  new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${ym}-01T00:00:00Z`));

const firstYear = Math.min(...experience.map((r) => Number(r.start.slice(0, 4))));
const domains = Array.from(new Set(experience.map((r) => r.domain)));

// The current year, cached so the page can still be prerendered.
async function currentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getUTCFullYear();
}

export default async function Home() {
  const year = await currentYear();
  const years = year - firstYear;
  return (
    <>
      <header className="nav">
        <nav className="wrap nav-in" aria-label="Main">
          <a href="#top" className="mark">
            <i>{profile.initials}</i>
            {profile.shortName}
          </a>
          <div className="nav-links">
            <a href="#work">Work</a>
            <a href="#ai">AI</a>
            <a href="#projects">Projects</a>
            <a href="#stack">Stack</a>
            <a href="#background">Background</a>
            <a href="#contact">Contact</a>
          </div>
          <div className="theme-slot">
            <ThemeToggle />
          </div>
        </nav>
      </header>

      <main id="top">
        <section className="wrap hero">
          <div>
            <div className="intro">
              <span className="reticle">
                <Image
                  src={profilePhoto}
                  alt={`Portrait of ${profile.name}`}
                  className="avatar"
                  width={96}
                  height={96}
                  quality={90}
                  placeholder="blur"
                  priority
                />
              </span>
              <span className="eyebrow">
                <span className="dot" aria-hidden /> {profile.role} · {profile.location}
              </span>
            </div>
            <h1>
              Jaya Pangihutan <span>Situmorang</span>
            </h1>
            <p className="lede">{profile.summary}</p>
            <div className="ctas">
              <a className="btn primary" href={`mailto:${profile.email}`}>
                Get in touch
              </a>
              <a className="btn" href={`https://github.com/${profile.github}`} target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
              <a className="btn" href="#work">
                See my work
              </a>
            </div>
          </div>
          <StackDiagram years={years} />
        </section>

        <div className="wrap">
          <div className="facts">
            <div className="fact">
              <b>{years}+ years</b>
              <span>building production software</span>
            </div>
            <div className="fact">
              <b>{experience.length} teams</b>
              <span>{domains.join(", ")}</span>
            </div>
            <div className="fact">
              <b>Web + mobile</b>
              <span>from UI to database to cloud</span>
            </div>
            <div className="fact">
              <b>AWS UG speaker</b>
              <span>Medan meetup, 2025</span>
            </div>
          </div>
        </div>

        {/* ---------- experience ---------- */}
        <section id="work" className="section wrap">
          <div className="sec-head">
            <div>
              <span className="label">Experience</span>
              <h2>Where I&apos;ve shipped</h2>
            </div>
            <p>Five teams across five industries, most recently enterprise systems at Wilmar.</p>
          </div>
          <div className="timeline">
            {experience.map((r) => (
              <article className="role" key={r.company}>
                <div className="role-when">
                  <span>
                    {month(r.start)} – {r.end ? month(r.end) : "now"}
                  </span>
                  {!r.end && (
                    <span className="now">
                      <span className="dot" aria-hidden /> Current
                    </span>
                  )}
                </div>
                <div>
                  <div className="role-head">
                    <h3>{r.company}</h3>
                    <span className="role-title">{r.title}</span>
                    <span className="domain">{r.domain}</span>
                  </div>
                  <p>{r.summary}</p>
                  <div className="chips">
                    {r.stack.map((t) => (
                      <span className="chip" key={t}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ---------- AI work ---------- */}
        <section id="ai" className="section wrap">
          <div className="sec-head">
            <div>
              <span className="label">AI work</span>
              <h2>Self-hosted AI, built for real teams</h2>
            </div>
            <p>
              Internal tools I designed and built on open-source models running on our own servers. Company names, data
              and systems are left out on purpose.
            </p>
          </div>
          <div className="ai-grid">
            {aiWork.map((a) => (
              <article className="ai-card" data-tilt="5" key={a.title}>
                <div className="ai-flow mono">{a.pipeline}</div>
                <h3>{a.title}</h3>
                <p>{a.summary}</p>
                <ul>
                  {a.did.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
                <div className="chips">
                  {a.stack.map((t) => (
                    <span className="chip" key={t}>
                      {t}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <GitHubSection />

        {/* ---------- stack ---------- */}
        <section id="stack" className="section wrap">
          <div className="sec-head">
            <div>
              <span className="label">Toolbox</span>
              <h2>Every layer of the stack</h2>
            </div>
            <p>I pick the tool the team already runs, and I&apos;m comfortable moving between them.</p>
          </div>
          <div className="tool-rows">
            {layers.map((l) => (
              <div className="tool-row" key={l.id}>
                <div className="layer-name">
                  <b>{l.label}</b>
                  <span>{l.note}</span>
                </div>
                <div className="chips">
                  {l.items.map((t) => (
                    <span className="chip" key={t}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="practices">
            {practices.map((p) => (
              <div className="practice" data-tilt="7" key={p.title}>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
                <div className="chips">
                  {p.tags.map((t) => (
                    <span className="chip" key={t}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- background ---------- */}
        <section id="background" className="section wrap">
          <div className="sec-head">
            <div>
              <span className="label">Background</span>
              <h2>Education, talks and certificates</h2>
            </div>
            <p>Languages: {languages.join(", ")}.</p>
          </div>
          <div className="bg-grid">
            <div className="panel" data-tilt="4">
              <span className="label">Education</span>
              <h3>{education.school}</h3>
              <div className="muted">
                {education.degree} · {education.place}
              </div>
              <div className="mono muted" style={{ fontSize: 13, marginTop: 6 }}>
                {month(education.start)} – {month(education.end)} · GPA {education.gpa}
              </div>
              <blockquote>Thesis: {education.thesis}</blockquote>
            </div>
            <div className="panel" data-tilt="4">
              <span className="label">Speaking</span>
              {speaking.map((s) => (
                <div key={s.event}>
                  <h3>{s.event}</h3>
                  <div className="muted">
                    {s.role} · {s.year}
                  </div>
                </div>
              ))}
              <blockquote>Sharing what works on AWS with the Medan developer community.</blockquote>
            </div>
          </div>
          <div className="panel" data-tilt="2" style={{ marginTop: 14 }}>
            <span className="label">Certifications</span>
            <ul className="certs">
              {certifications.map((c) => (
                <li key={c.name}>
                  <span>
                    {c.name}
                    {c.issuer && <span className="muted"> · {c.issuer}</span>}
                  </span>
                  <span>{c.year ?? ""}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- contact ---------- */}
        <section id="contact" className="wrap">
          <div className="contact">
            <span className="label">Contact</span>
            <h2>Let&apos;s build something that holds up in production.</h2>
            <p>Have a project, a question, or a talk idea? Email is the fastest way to reach me.</p>
            <div className="email-line" id="email-text">
              {profile.email}
            </div>
            <div className="ctas">
              <a className="btn" href={`mailto:${profile.email}`}>
                Send an email
              </a>
              <CopyEmail email={profile.email} />
              <a className="btn ghost" href={`https://github.com/${profile.github}`} target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
            </div>
          </div>
        </section>
      </main>

      <ARField />
      <footer className="wrap footer">
        <span>
          © {year} {profile.name}
        </span>
        <span>Built with Next.js · Deployed on Vercel · Projects synced from GitHub</span>
        <p className="privacy">
          Privacy: this site logs each visit (page, time, approximate location, device, referring site and IP address) to
          see how people find it. The data is never sold or shared. To have yours removed, email {profile.email}.
        </p>
      </footer>
    </>
  );
}
