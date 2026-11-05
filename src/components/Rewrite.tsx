"use client";

import { useEffect, useRef, useState } from "react";

// "Written twice": a heading first appears as the line of code, then rewrites itself into prose,
// letter by letter, when it scrolls into view. The small </> button flips it back to source and again.
// Screen readers and search engines always get the prose; with reduced motion the prose simply shows.

const GLYPHS = "abcdefghijklmnopqrstuvwxyz{}()<>=;:/*_";
const DURATION = 1500;

type Tag = "h1" | "h2" | "p";

export function Rewrite({ code, prose, as: As = "h2", className }: { code: string; prose: string; as?: Tag; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  // head: the part already rewritten into the target; tail: what is left of the original
  const [parts, setParts] = useState({ head: "", noise: "", tail: code, toProse: true });
  const [source, setSource] = useState(true);
  const anim = useRef(0);

  const run = (from: string, to: string, toProse: boolean) => {
    cancelAnimationFrame(anim.current);
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      const eased = 1 - (1 - t) ** 3;
      const n = Math.round(eased * to.length);
      const noise = Array.from({ length: Math.min(5, to.length - n) }, () => GLYPHS[(Math.random() * GLYPHS.length) | 0]).join("");
      const rest = from.slice(n + noise.length);
      setParts({ head: to.slice(0, n), noise, tail: rest, toProse });
      if (t < 1) anim.current = requestAnimationFrame(tick);
      else setParts({ head: to, noise: "", tail: "", toProse });
    };
    anim.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // no animation: show the prose on the next frame
      anim.current = requestAnimationFrame(() => {
        setParts({ head: prose, noise: "", tail: "", toProse: true });
        setSource(false);
      });
      return () => cancelAnimationFrame(anim.current);
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        setSource(false);
        run(code, prose, true);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(anim.current);
    };
    // run is stable enough for a one-time observer; code/prose never change for a heading
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flip = () => {
    const next = !source;
    setSource(next);
    if (next) run(prose, code, false);
    else run(code, prose, true);
  };

  return (
    <As ref={ref as never} className={`rw ${source ? "is-source" : "is-prose"} ${className ?? ""}`}>
      <span className="sr-only">{prose}</span>
      <span aria-hidden>
        <span className={parts.toProse ? "rw-prose" : "rw-code"}>{parts.head}</span>
        <span className="rw-noise">{parts.noise}</span>
        <span className={parts.toProse ? "rw-code" : "rw-prose"}>{parts.tail}</span>
      </span>
      <button type="button" className="rw-flip" onClick={flip} aria-label={source ? "Read as prose" : "View the source"} title={source ? "read" : "view source"}>
        {"</>"}
      </button>
    </As>
  );
}
