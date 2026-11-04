"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { profile } from "@/data/profile";

// Full-screen harbour hero for /portfolio: an illustrated scene (public/hero/harbor.jpg) under a brush-lettered
// headline, parchment buttons and a social rail. It scrolls like a normal page; --p (0..1, how far the hero has
// scrolled away) only adds a little parallax to the picture and fades the copy.
// The picture is optional; without it the sky-and-sea gradient behind it shows instead.
// While the hero is on screen the site nav slides away, since the hero carries its own.

const links = [
  { href: "#top", label: "Home" },
  { href: "#about", label: "About" },
  { href: "#ai", label: "Projects" },
  { href: "#stack", label: "Skills" },
  { href: "#contact", label: "Contact" },
];

function Gull({ className }: { className: string }) {
  return (
    <svg className={`gull ${className}`} viewBox="0 0 60 20" aria-hidden>
      <path d="M2 14 Q15 2 30 13 Q45 2 58 14" />
    </svg>
  );
}

export function HarborHero() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const doc = document.documentElement;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / r.height));
      el.style.setProperty("--p", p.toFixed(4));
      // hide the site nav while the hero's own bar is on screen
      if (r.bottom > 80) doc.dataset.harbor = "1";
      else delete doc.dataset.harbor;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    // first paint: let the entrance animations run
    requestAnimationFrame(() => el.classList.add("is-in"));
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      delete doc.dataset.harbor;
    };
  }, []);

  const [first] = profile.name.split(" ");
  return (
    <section ref={ref} className="harbor" aria-label="Introduction">
      <div className="harbor-stage">
        <div className="harbor-bg" aria-hidden />
        <div className="harbor-gulls" aria-hidden>
          <Gull className="g1" />
          <Gull className="g2" />
          <Gull className="g3" />
        </div>

        <header className="harbor-bar">
          <Link className="harbor-logo" href="/">
            <svg viewBox="0 0 64 64" aria-hidden>
              <path className="bones" d="M10 10 L54 54 M54 10 L10 54" />
              <circle cx="32" cy="28" r="15" className="skull" />
              <rect x="25" y="38" width="14" height="9" rx="2" className="skull" />
              <text x="32" y="32" textAnchor="middle" className="eyes">
                {"</>"}
              </text>
            </svg>
            <span className="brush">{profile.shortName}</span>
          </Link>
          <nav className="harbor-links" aria-label="Sections">
            {links.map((l, i) => (
              <a key={l.href} href={l.href} className={i === 0 ? "on" : undefined}>
                {l.label}
              </a>
            ))}
          </nav>
          <a className="parchment talk" href={`mailto:${profile.email}`}>
            Let&apos;s Talk
          </a>
        </header>

        <div className="harbor-copy">
          <p className="harbor-hi brush">
            Hi, I&apos;m {first}!
            <svg viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden>
              <path d="M4 14 C80 4 180 2 296 8" />
            </svg>
          </p>
          <h1 className="harbor-title brush">
            <span className="w1">Build Something</span>
            <span className="w2">Extraordinary</span>
            <svg className="swash" viewBox="0 0 600 40" preserveAspectRatio="none" aria-hidden>
              <path d="M8 30 C160 12 380 4 592 14" />
            </svg>
          </h1>
          <p className="harbor-lede">
            A {profile.role} turning ideas into <em>amazing</em> digital experiences, from web and mobile to AI that sees and
            thinks.
          </p>
          <div className="harbor-ctas">
            <a className="parchment" href="#ai">
              <svg viewBox="0 0 24 24" aria-hidden className="compass">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 4 L14 12 L12 20 L10 12 Z" />
                <path d="M4 12 L12 10 L20 12 L12 14 Z" />
              </svg>
              View My Projects
            </a>
            <a className="harbor-about" href="#about">
              About Me <span aria-hidden>➜</span>
            </a>
          </div>
        </div>

        <nav className="harbor-social" aria-label="Elsewhere">
          <a href={`https://github.com/${profile.github}`} target="_blank" rel="noopener noreferrer" aria-label="GitHub">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
            </svg>
          </a>
          <a href={`mailto:${profile.email}`} aria-label="Email">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm1 2.2V17h16V7.2l-8 5.3-8-5.3ZM5.4 7l6.6 4.4L18.6 7H5.4Z" />
            </svg>
          </a>
          <a href="/cv-jaya-situmorang.pdf" download aria-label="Download CV">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M6 2h8l6 6v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Zm7 1.5V9h5.5L13 3.5ZM11 11v5.6l-2.3-2.3-1.4 1.4 4.7 4.7 4.7-4.7-1.4-1.4-2.3 2.3V11h-2Z" />
            </svg>
          </a>
        </nav>

        <a className="harbor-cue" href="#ai">
          <span className="mouse" aria-hidden />
          Scroll Down
        </a>

        <svg className="harbor-waves" viewBox="0 0 2880 120" preserveAspectRatio="none" aria-hidden>
          <path className="wv1" d="M0 60 Q90 30 180 60 T360 60 T540 60 T720 60 T900 60 T1080 60 T1260 60 T1440 60 T1620 60 T1800 60 T1980 60 T2160 60 T2340 60 T2520 60 T2700 60 T2880 60 V120 H0 Z" />
          <path className="wv2" d="M0 75 Q120 50 240 75 T480 75 T720 75 T960 75 T1200 75 T1440 75 T1680 75 T1920 75 T2160 75 T2400 75 T2640 75 T2880 75 V120 H0 Z" />
        </svg>

        <div className="harbor-fade" aria-hidden />
      </div>
    </section>
  );
}
