import Image from "next/image";
import Link from "next/link";
import { cacheLife } from "next/cache";
import { BuyButton } from "@/components/BuyButton";
import { Rewrite } from "@/components/Rewrite";
import { SiteNav } from "@/components/SiteNav";
import { books } from "@/data/books";
import { profile } from "@/data/profile";
import room from "@/assets/room.png";

// The current year, cached so the page can still be prerendered.
async function currentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getUTCFullYear();
}

// The contents page: the home page reads like a book.
const chapters = [
  { id: "chapter-1", num: "I", title: "Two shelves, one heart", page: 1 },
  { id: "books", num: "II", title: "The novels", page: 7 },
  { id: "margins", num: "III", title: "Lines I underlined", page: 19 },
  { id: "portfolio", num: "IV", title: "The other desk", page: 23 },
];

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
        {/* ---------- the room: one figure, an empty wall, a sentence written on it ---------- */}
        <section className="room" aria-labelledby="room-title">
          <div className="room-scene">
            <Image src={room} alt="Illustration of Jaya sitting alone on a chair in an empty white room" fill priority sizes="100vw" quality={90} className="room-img" />
          </div>
          <div className="room-wall">
            <p className="room-hello">hi, I&apos;m {profile.shortName.split(" ")[0]}.</p>
            <Rewrite as="h1" className="room-title" code="while (alive) { write(code); write(story); }" prose="I write code by day, and stories by night." />
            <p className="room-sub">an engineer who writes, and a writer who loves art</p>
          </div>
          <a className="room-cue" href="#hello">
            come in <span aria-hidden>↓</span>
          </a>
        </section>

        {/* ---------- contents page ---------- */}
        <nav id="hello" className="wrap toc" aria-label="Contents">
          <p className="toc-kicker">Contents</p>
          <ol>
            {chapters.map((c) => (
              <li key={c.id}>
                <a href={`#${c.id}`}>
                  <span className="ch-num">{c.num}</span>
                  <span className="ch-title">{c.title}</span>
                  <span className="ch-dots" aria-hidden />
                  <span className="ch-page">{c.page}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* ---------- chapter I: who I am, set as book text with footnotes ---------- */}
        <section id="chapter-1" className="wrap chapter">
          <header className="chapter-head">
            <span className="chapter-num">Chapter I</span>
            <h2 className="chapter-title">
              Two shelves, <em>one heart.</em>
            </h2>
          </header>
          <div className="ch-one">
            <div className="book-text">
              <p className="dropcap">
                Hello, I&apos;m {profile.name}. By day I build web and mobile systems end to end, and lately AI that sees and
                thinks.
                <sup>
                  <a href="#fn-1" id="ref-1">
                    1
                  </a>
                </sup>{" "}
                By night I write warm, funny Indonesian romcoms about ordinary people, everyday work and small brave
                decisions.
                <sup>
                  <a href="#fn-2" id="ref-2">
                    2
                  </a>
                </sup>
              </p>
              <div className="ctas">
                <a className="btn primary" href="#books">
                  Read my novels
                </a>
                <Link className="btn" href="/portfolio">
                  See my portfolio
                </Link>
              </div>
              <ol className="footnotes">
                <li id="fn-1">
                  {profile.role}, {profile.location}.{" "}
                  <a href="#ref-1" aria-label="Back to the text">
                    ↩
                  </a>
                </li>
                <li id="fn-2">
                  {books.length} novels so far, both on Google Play Books.{" "}
                  <a href="#ref-2" aria-label="Back to the text">
                    ↩
                  </a>
                </li>
              </ol>
            </div>

            <div className="shelf" aria-hidden>
              {books.map((b, i) => (
                <a
                  key={b.slug}
                  href={`#${b.slug}`}
                  tabIndex={-1}
                  className={`book book-${i}`}
                  style={{ "--spine": b.spine, "--glow": b.glow } as React.CSSProperties}
                >
                  <span className="book-3d">
                    <Image src={b.cover} alt="" sizes="(max-width: 880px) 45vw, 260px" quality={90} priority className="book-cover" />
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- chapter II: each novel as an open book ---------- */}
        <section id="books" className="wrap chapter">
          <header className="chapter-head">
            <span className="chapter-num">Chapter II</span>
            <Rewrite className="chapter-title" code="publish(heart, { pages: 239 })" prose="The novels" />
            <p className="epigraph">Indonesian romantic comedies, one in an office server room and one on a university campus.</p>
          </header>

          {books.map((b, i) => (
            <article id={b.slug} key={b.slug} className="spread" style={{ "--spine": b.spine, "--glow": b.glow } as React.CSSProperties}>
              <div className="leaf leaf-left">
                <a className="book novel-book" href={b.url} target="_blank" rel="noopener noreferrer" aria-label={`${b.title} on Google Play Books`}>
                  <span className="book-3d">
                    <Image
                      src={b.cover}
                      alt={`Cover of ${b.title}: ${b.subtitle}`}
                      sizes="(max-width: 880px) 70vw, 320px"
                      quality={90}
                      placeholder="blur"
                      className="book-cover"
                    />
                  </span>
                </a>
                <span className="folio">{8 + i * 6}</span>
              </div>
              <div className="leaf leaf-right">
                <span className="novel-num">
                  No. {String(i + 1).padStart(2, "0")} · {b.pages} pages · Bahasa Indonesia
                </span>
                <h3>{b.title}</h3>
                <p className="novel-sub">{b.subtitle}</p>
                <p className="genre">{b.genre.join(" · ")}</p>
                <blockquote className="pull">{b.hook}</blockquote>
                <p className="dropcap">{b.blurb}</p>
                <div className="ctas">
                  <a className="btn play-books" href={b.url} target="_blank" rel="noopener noreferrer">
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                      <path fill="currentColor" d="M4 3.5v17a1 1 0 0 0 1.5.86l14-8.5a1 1 0 0 0 0-1.72l-14-8.5A1 1 0 0 0 4 3.5Z" />
                    </svg>
                    Read on Google Play Books
                  </a>
                  {selling && <BuyButton slug={b.slug} title={b.title} subtitle={b.subtitle} price={b.price} cover={b.cover} glow={b.glow} spine={b.spine} />}
                </div>
                <span className="folio">{9 + i * 6}</span>
              </div>
            </article>
          ))}
        </section>

        {/* ---------- chapter III: lines underlined in the margins ---------- */}
        <section id="margins" className="wrap chapter">
          <header className="chapter-head">
            <span className="chapter-num">Chapter III</span>
            <h2 className="chapter-title">
              Lines I <em>underlined</em>
            </h2>
          </header>
          <ul className="underlined">
            {quotes.map((q) => (
              <li key={q.text}>
                <q>
                  <mark>{q.text}</mark>
                </q>
                <span className="who">
                  — {q.who}, <cite>{q.book}</cite>, {q.where}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- chapter IV: the engineering side ---------- */}
        <section id="portfolio" className="wrap chapter">
          <header className="chapter-head">
            <span className="chapter-num">Chapter IV</span>
            <Rewrite className="chapter-title" code="open('./portfolio', { mode: 'both' })" prose="The other desk" />
            <p className="epigraph">The engineering side. Same CV, pick how you want to read it.</p>
          </header>
          <div className="pick">
            <Link href="/portfolio" className="pick-card">
              <span className="pick-icon mono" aria-hidden>
                {"</>"}
              </span>
              <h3>Classic</h3>
              <p>A fast one-page CV: experience, AI work, live GitHub projects, stack and certificates.</p>
              <span className="pick-go">Open classic →</span>
            </Link>
            <Link href="/portfolio/3d" className="pick-card pick-3d">
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

      <footer className="wrap footer">
        <span>
          © {year} {profile.name}
        </span>
        <span>
          <a href={`mailto:${profile.email}`}>{profile.email}</a> · Instagram @jaya_situmorang
        </span>
        <p className="colophon">Set in Fraunces and Caveat. Written in Medan, built with Next.js, and read by you.</p>
        <p className="privacy">
          Privacy: this site logs each visit (page, time, approximate location, device, referring site and IP address) to
          see how people find it. The data is never sold or shared. To have yours removed, email {profile.email}.
        </p>
      </footer>
    </>
  );
}
