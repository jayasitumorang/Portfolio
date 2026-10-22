import Image from "next/image";
import Link from "next/link";
import { cacheLife } from "next/cache";
import { ARField } from "@/components/ARField";
import { BuyButton } from "@/components/BuyButton";
import { SiteNav } from "@/components/SiteNav";
import { books } from "@/data/books";
import { profile } from "@/data/profile";

// The current year, cached so the page can still be prerendered.
async function currentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getUTCFullYear();
}

// Landing page: who I am in one line, my novels, and the way into the portfolio.
export default async function Home() {
  const year = await currentYear();
  // Direct QRIS sales show up once Midtrans is configured (env vars are read at build time).
  const selling = !!process.env.MIDTRANS_SERVER_KEY;
  const quotes = books.flatMap((b) => b.quotes.map((q) => ({ ...q, book: b.title })));

  return (
    <>
      <SiteNav tab="home" />

      <main id="top" className="page landing">
        {/* ---------- hero ---------- */}
        <section className="wrap land-hero">
          <div className="land-copy">
            <span className="eyebrow">
              <span className="dot" aria-hidden /> {profile.role} · Novelist · {profile.location}
            </span>
            <h1>
              I write code by day <span>and love stories by night.</span>
            </h1>
            <p className="lede">
              I&apos;m {profile.name}. I build web and mobile systems end to end, and I write warm, funny Indonesian
              romcoms about ordinary people, everyday work and small brave decisions.
            </p>
            <div className="ctas">
              <a className="btn primary" href="#books">
                Read my novels
              </a>
              <Link className="btn" href="/portfolio">
                See my portfolio
              </Link>
            </div>
          </div>

          <div className="shelf" aria-hidden>
            {books.map((b, i) => (
              <a
                key={b.slug}
                href={`#${b.slug}`}
                tabIndex={-1}
                className={`book book-${i}`}
                data-tilt="6"
                style={{ "--spine": b.spine, "--glow": b.glow } as React.CSSProperties}
              >
                <span className="book-3d">
                  <Image src={b.cover} alt="" sizes="(max-width: 880px) 45vw, 260px" quality={90} priority className="book-cover" />
                </span>
              </a>
            ))}
          </div>
        </section>

        {/* ---------- quotes marquee ---------- */}
        <div className="marquee" aria-label="Quotes from the novels">
          <div className="marquee-track">
            {[...quotes, ...quotes].map((q, i) => (
              <span key={i} aria-hidden={i >= quotes.length || undefined}>
                <q>{q.text}</q> <em>— {q.who}</em>
              </span>
            ))}
          </div>
        </div>

        {/* ---------- books ---------- */}
        <section id="books" className="section wrap">
          <div className="sec-head">
            <div>
              <span className="label">Writing</span>
              <h2>Two novels, out now on Google Play Books</h2>
            </div>
            <p>Indonesian romantic comedies, one in an office server room and one on a university campus.</p>
          </div>

          <div className="books">
            {books.map((b, i) => (
              <article
                id={b.slug}
                key={b.slug}
                className={`novel${i % 2 ? " flip" : ""}`}
                style={{ "--spine": b.spine, "--glow": b.glow } as React.CSSProperties}
              >
                <a className="book novel-book" href={b.url} target="_blank" rel="noopener noreferrer" data-tilt="8" aria-label={`${b.title} on Google Play Books`}>
                  <span className="book-3d">
                    <Image
                      src={b.cover}
                      alt={`Cover of ${b.title}: ${b.subtitle}`}
                      sizes="(max-width: 880px) 70vw, 340px"
                      quality={90}
                      placeholder="blur"
                      className="book-cover"
                    />
                  </span>
                </a>
                <div className="novel-copy">
                  <span className="novel-num mono">
                    No. {String(i + 1).padStart(2, "0")} · {b.pages} pages · Bahasa Indonesia
                  </span>
                  <h3>{b.title}</h3>
                  <p className="novel-sub">{b.subtitle}</p>
                  <div className="chips">
                    {b.genre.map((g) => (
                      <span className="chip" key={g}>
                        {g}
                      </span>
                    ))}
                  </div>
                  <blockquote className="novel-hook">{b.hook}</blockquote>
                  <p>{b.blurb}</p>
                  <div className="ctas">
                    <a className="btn play-books" href={b.url} target="_blank" rel="noopener noreferrer">
                      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                        <path fill="currentColor" d="M4 3.5v17a1 1 0 0 0 1.5.86l14-8.5a1 1 0 0 0 0-1.72l-14-8.5A1 1 0 0 0 4 3.5Z" />
                      </svg>
                      Read on Google Play Books
                    </a>
                    {selling && <BuyButton slug={b.slug} title={b.title} price={b.price} />}
                  </div>
                  <ul className="novel-quotes">
                    {b.quotes.map((q) => (
                      <li key={q.text}>
                        <q>{q.text}</q>
                        <span className="mono">
                          {q.who} · {q.where}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ---------- portfolio ---------- */}
        <section id="portfolio" className="section wrap">
          <div className="sec-head">
            <div>
              <span className="label">Portfolio</span>
              <h2>The engineering side, two ways</h2>
            </div>
            <p>Same CV, pick how you want to read it.</p>
          </div>
          <div className="pick">
            <Link href="/portfolio" className="pick-card" data-tilt="6">
              <span className="pick-icon mono" aria-hidden>
                {"</>"}
              </span>
              <h3>Classic</h3>
              <p>A fast one-page CV: experience, AI work, live GitHub projects, stack and certificates.</p>
              <span className="pick-go">Open classic →</span>
            </Link>
            <Link href="/portfolio/3d" className="pick-card pick-3d" data-tilt="6">
              <span className="pick-icon mono" aria-hidden>
                3D
              </span>
              <h3>Three.js walk</h3>
              <p>Walk down an office building, one room per chapter of my career. Play with WASD and fight bugs.</p>
              <span className="pick-go">Enter the 3D walk →</span>
            </Link>
          </div>
        </section>
      </main>

      <ARField />
      <footer className="wrap footer">
        <span>
          © {year} {profile.name}
        </span>
        <span>
          <a href={`mailto:${profile.email}`}>{profile.email}</a> · Instagram @jaya_situmorang
        </span>
        <p className="privacy">
          Privacy: this site logs each visit (page, time, approximate location, device, referring site and IP address) to
          see how people find it. The data is never sold or shared. To have yours removed, email {profile.email}.
        </p>
      </footer>
    </>
  );
}
