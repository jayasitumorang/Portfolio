import type { Metadata } from "next";
import Image from "next/image";
import { cacheLife } from "next/cache";
import profilePhoto from "@/assets/profile.jpg";
import { CopyEmail } from "@/components/CopyEmail";
import { GitHubSection } from "@/components/GitHubSection";
import { SiteNav } from "@/components/SiteNav";
import { StackDiagram } from "@/components/StackDiagram";
import { Rewrite } from "@/components/Rewrite";
import { aiWork, certifications, education, experience, languages, layers, practices, profile, speaking } from "@/data/profile";

const month = (ym: string) =>
  new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${ym}-01T00:00:00Z`));

const firstYear = Math.min(...experience.map((r) => Number(r.start.slice(0, 4))));
const domains = Array.from(new Set(experience.map((r) => r.domain)));
const companies = new Set(experience.map((r) => r.company)).size;
// Tools for the scrolling ticker under the facts; listed twice so the loop has no seam.
const ticker = Array.from(new Set([...aiWork.flatMap((a) => a.stack), ...layers.flatMap((l) => l.items)]));

// The current year, cached so the page can still be prerendered.
async function currentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getUTCFullYear();
}

export const metadata: Metadata = { title: "Portfolio · Jaya Situmorang" };

// The CV as a classic one-page portfolio. The same CV as a 3D walk lives at /portfolio/3d.
export default async function Portfolio() {
  const year = await currentYear();
  const years = year - firstYear;
  return (
    <>
      <SiteNav tab="portfolio" mode="classic" />

      <main id="top" className="page classic">
        <section id="about" className="wrap hero notebook">
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
            <Rewrite as="p" className="feel-line" code="while (alive) { write(code); write(story); }" prose="I write code by day, and feelings by night." />
            <span className="margin-note" aria-hidden>
              engineer · novelist · art lover
            </span>
            <p className="lede">{profile.summary}</p>
            <div className="ctas">
              <a className="btn primary" href={`mailto:${profile.email}`}>
                Get in touch
              </a>
              <a className="btn" href={`https://github.com/${profile.github}`} target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
              <a className="btn" href="/cv-jaya-situmorang.pdf" download>
                Download CV
              </a>
              <a className="btn" href="#ai">
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
              <b>{companies} teams</b>
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

        <div className="marquee" aria-hidden>
          <div className="marquee-track mono">
            {[...ticker, ...ticker].map((t, i) => (
              <span key={i}>{t}</span>
            ))}
          </div>
        </div>

        {/* ---------- AI work ---------- */}
        <section id="ai" className="section wrap">
          <div className="sec-head">
            <div>
              <span className="label">AI work</span>
              <Rewrite code="ai.train({ eyes: true, heart: true })" prose="AI that sees, built with care" />
            </div>
            <p>
              Internal AI tools I designed and built, from agents grounded in company data to open-source models running on
              our own servers. Company names, data and systems are left out on purpose.
            </p>
          </div>
          <div className="ai-grid">
            {aiWork.map((a) => (
              <article className={a.latest ? "ai-card latest" : "ai-card"} data-tilt={a.latest ? "2" : "5"} key={a.title}>
                {a.image && (
                  <figure className="ai-shot">
                    <Image src={a.image.src} alt={a.image.alt} width={a.image.width} height={a.image.height} sizes="(max-width: 960px) 100vw, 560px" />
                    {a.live && (
                      <span className="live-tag mono">
                        <span className="dot" aria-hidden /> LIVE
                      </span>
                    )}
                  </figure>
                )}
                <div className="ai-body">
                  {a.latest && (
                    <span className="now">
                      <span className="dot" aria-hidden /> Latest
                    </span>
                  )}
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
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ---------- experience ---------- */}
        <section id="work" className="section wrap">
          <div className="sec-head">
            <div>
              <span className="label">Experience</span>
              <Rewrite code="git log --all --oneline" prose="Where I&apos;ve shipped" />
            </div>
            <p>
              {companies} teams across fintech, logistics, EdTech, GovTech and enterprise, most recently enterprise systems
              and AI at Wilmar.
            </p>
          </div>
          <div className="timeline">
            {experience.map((r) => (
              <article className="role" key={r.title + r.company}>
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
                  {r.wins && (
                    <ul className="wins">
                      {r.wins.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  )}
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

        <GitHubSection />

        {/* ---------- stack ---------- */}
        <section id="stack" className="section wrap">
          <div className="sec-head">
            <div>
              <span className="label">Toolbox</span>
              <Rewrite code="import * as tools from &apos;./every-layer&apos;" prose="Every layer, held by hand" />
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
              <Rewrite code="cat ./education ./talks ./certs" prose="Where I learned, and who listened" />
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
            <Rewrite code="send(you, &quot;hello&quot;)" prose="Write to me. I read every letter." />
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
