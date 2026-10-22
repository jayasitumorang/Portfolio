"use client";

import { useEffect } from "react";

// Drives the AR look: elements with data-tilt lean toward the pointer (or the phone's tilt),
// and --px/--py on <html> let backgrounds drift with it. Purely decorative; renders nothing.
export function ARField() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement;
    let active: HTMLElement | null = null;
    let frame = 0;

    const tilt = (el: HTMLElement, x: number, y: number) => {
      const max = Number(el.dataset.tilt) || 8;
      el.style.rotate = `${-y} ${x} 0 ${(Math.hypot(x, y) * max * 2).toFixed(2)}deg`;
      el.style.setProperty("--mx", `${((x + 0.5) * 100).toFixed(1)}%`);
      el.style.setProperty("--my", `${((y + 0.5) * 100).toFixed(1)}%`);
      el.classList.add("is-tilting");
    };
    const reset = (el: HTMLElement) => {
      el.style.rotate = "";
      el.classList.remove("is-tilting");
    };

    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        root.style.setProperty("--px", (e.clientX / innerWidth - 0.5).toFixed(3));
        root.style.setProperty("--py", (e.clientY / innerHeight - 0.5).toFixed(3));
        const el = (e.target as Element | null)?.closest<HTMLElement>("[data-tilt]") ?? null;
        if (active && active !== el) reset(active);
        active = el;
        if (!el) return;
        const r = el.getBoundingClientRect();
        tilt(el, (e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5);
      });
    };
    const onLeave = () => {
      if (active) reset(active);
      active = null;
    };

    // Phones: tilt the hero diagram and the AR floor with the device.
    const hero = document.querySelector<HTMLElement>(".stack[data-tilt]");
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      const x = Math.max(-0.5, Math.min(0.5, e.gamma / 60));
      const y = Math.max(-0.5, Math.min(0.5, (e.beta - 45) / 60));
      root.style.setProperty("--px", x.toFixed(3));
      root.style.setProperty("--py", y.toFixed(3));
      if (hero) tilt(hero, x, y);
    };
    const touch = matchMedia("(hover: none)").matches;

    if (touch) window.addEventListener("deviceorientation", onOrient);
    else {
      document.addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("pointerleave", onLeave);
    }
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("deviceorientation", onOrient);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return null;
}
