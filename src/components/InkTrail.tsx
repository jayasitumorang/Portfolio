"use client";

import { useEffect, useRef } from "react";

// The pointer leaves soft watercolour ink that spreads a little and fades, like a wet brush on paper.
// Fine pointers only, and never with reduced motion. Drawn on one fixed canvas under the content's ink.

const HUES = ["63, 79, 158", "196, 86, 111", "201, 139, 43"]; // indigo, rose, ochre

export function InkTrail() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !window.matchMedia("(pointer: fine)").matches) return;
    const g = canvas.getContext("2d");
    if (!g) return;

    type Drop = { x: number; y: number; r: number; grow: number; a: number; hue: string };
    const drops: Drop[] = [];
    let hue = 0;
    let last = { x: -1, y: -1 };
    let raf = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      const dist = Math.hypot(dx, dy);
      if (last.x >= 0 && dist < 14) return;
      last = { x: e.clientX, y: e.clientY };
      if (Math.random() < 0.04) hue = (hue + 1) % HUES.length;
      drops.push({ x: e.clientX, y: e.clientY, r: 4 + Math.min(dist, 60) * 0.12, grow: 12 + Math.random() * 14, a: 0.12, hue: HUES[hue] });
      if (drops.length > 90) drops.shift();
      if (!raf) raf = requestAnimationFrame(draw);
    };

    const draw = () => {
      g.clearRect(0, 0, innerWidth, innerHeight);
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.r += d.grow * 0.016;
        d.grow *= 0.97;
        d.a *= 0.975;
        if (d.a < 0.004) {
          drops.splice(i, 1);
          continue;
        }
        const grad = g.createRadialGradient(d.x, d.y, d.r * 0.2, d.x, d.y, d.r);
        grad.addColorStop(0, `rgba(${d.hue}, ${d.a})`);
        grad.addColorStop(0.7, `rgba(${d.hue}, ${d.a * 0.6})`);
        grad.addColorStop(1, `rgba(${d.hue}, 0)`);
        g.fillStyle = grad;
        g.beginPath();
        g.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        g.fill();
      }
      raf = drops.length ? requestAnimationFrame(draw) : 0;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="ink-trail" aria-hidden />;
}

// SVG filters the CSS uses: "wash" roughens watercolour edges, "rough" makes drawn lines look inked.
export function InkFilters() {
  return (
    <svg className="ink-defs" aria-hidden width="0" height="0" focusable="false">
      <filter id="wash" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="7" />
        <feDisplacementMap in="SourceGraphic" scale="60" />
        <feGaussianBlur stdDeviation="6" />
      </filter>
      <filter id="rough">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="3" />
        <feDisplacementMap in="SourceGraphic" scale="2.2" />
      </filter>
    </svg>
  );
}
