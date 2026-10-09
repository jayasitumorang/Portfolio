"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CanvasTexture, Group, Material, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, Sprite, SpriteMaterial } from "three";
import profilePhoto from "@/assets/profile.jpg";
import { aiWork, certifications, education, experience, languages, layers, practices, profile, speaking, type Role } from "@/data/profile";

// The whole portfolio as one 3D office building. You walk DOWN through it, one room per chapter,
// taking the stairs after every doorway: lobby → five jobs → AI lab → GitHub gallery → workshop →
// library → ground-floor studio (code, deploy, live) → camera flies out over the city → contact.
//  • Scroll: a guided walk.
//  • Play: W A S D / arrows (or the joystick) to walk, Shift to run, Space to jump, F (or click) to
//    swing the sword at the bugs crawling around, E to grab the coffee or sit down and ship, Esc to exit.
// Drag on the scene to look around the character in 360°. All text also exists as hidden HTML.

export type RepoLite = { name: string; description: string | null; language: string | null; pushed_at: string; html_url: string; stargazers_count: number };

// ---------------------------------------------------------------- stops
type Station =
  | { kind: "intro"; id: string; rail: string }
  | { kind: "job"; id: string; rail: string; role: Role; current: boolean }
  | { kind: "ai" | "projects" | "skills" | "edu" | "ship" | "contact"; id: string; rail: string };

const jobs = [...experience].reverse();
const STATIONS: Station[] = [
  { kind: "intro", id: "intro", rail: "Me" },
  ...jobs.map((r, i) => ({ kind: "job" as const, id: `job-${i}`, rail: r.start.slice(0, 4), role: r, current: !r.end })),
  { kind: "ai", id: "ai", rail: "AI" },
  { kind: "projects", id: "projects", rail: "GitHub" },
  { kind: "skills", id: "skills", rail: "Stack" },
  { kind: "edu", id: "edu", rail: "Edu" },
  { kind: "ship", id: "ship", rail: "Ship" },
  { kind: "contact", id: "contact", rail: "Contact" },
];
const CURRENT_STATION = STATIONS.findIndex((s) => s.kind === "job" && s.current);
const SHIP = STATIONS.findIndex((s) => s.kind === "ship");
const CONTACT = STATIONS.length - 1;

// ---------------------------------------------------------------- geometry of the building (pure)
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const segE = (t: number, a: number, b: number) => ease(clamp01((t - a) / (b - a)));
const damp = (k: number, dt: number) => 1 - Math.exp(-k * dt);

const ROOM = 9.5;
const DROP = 1.3; // each room is one half-floor lower than the last
const STAIR_RUN = 2.2;
const stationX = (i: number) => 6 + i * ROOM;
const standX = (i: number) => stationX(i) - 1.7;
const floorOf = (i: number) => -Math.min(i, SHIP) * DROP;
const START_X = standX(0);
const DESK_X = stationX(SHIP) + 1;
const WORLD_START = stationX(0) - ROOM / 2;
const WORLD_END = stationX(SHIP) + ROOM / 2;
const GROUND = floorOf(SHIP) - 0.25;
const COFFEE_X = standX(CURRENT_STATION) + 1.25;
const roomOf = (x: number) => Math.min(SHIP, Math.max(0, Math.round((x - 6) / ROOM)));
// the staircase just inside each room, coming down from the room before
const STAIRS = STATIONS.slice(0, SHIP).map((_, i) => {
  const x0 = stationX(i) + ROOM / 2 + 0.15;
  return { x0, x1: x0 + STAIR_RUN, from: floorOf(i), to: floorOf(i + 1) };
});
const floorY = (x: number) => {
  for (const s of STAIRS) {
    if (x < s.x0) return s.from;
    if (x <= s.x1) return mix(s.from, s.to, (x - s.x0) / (s.x1 - s.x0));
  }
  return floorOf(SHIP);
};

// ---------------------------------------------------------------- scroll timeline
type Seg = { kind: "walk" | "dwell" | "sit" | "lid" | "code" | "deploy" | "fly" | "hold"; w: number; from?: number; to?: number; station: number; a: number; b: number };
let TOTAL_WEIGHT = 0;
const TIMELINE: Seg[] = (() => {
  const raw: Omit<Seg, "a" | "b">[] = [];
  let x = START_X;
  STATIONS.forEach((s, i) => {
    if (i >= SHIP) return;
    if (standX(i) > x) raw.push({ kind: "walk", w: (standX(i) - x) * 0.032, from: x, to: standX(i), station: i });
    raw.push({ kind: "dwell", w: s.kind === "job" && s.current ? 1.05 : 0.7, station: i });
    x = standX(i);
  });
  raw.push({ kind: "walk", w: (DESK_X - x) * 0.032, from: x, to: DESK_X, station: SHIP });
  raw.push({ kind: "sit", w: 0.3, station: SHIP });
  raw.push({ kind: "lid", w: 0.18, station: SHIP });
  raw.push({ kind: "code", w: 0.6, station: SHIP });
  raw.push({ kind: "deploy", w: 0.55, station: SHIP });
  raw.push({ kind: "fly", w: 0.9, station: CONTACT });
  raw.push({ kind: "hold", w: 0.5, station: CONTACT });
  const total = raw.reduce((s, r) => s + r.w, 0);
  TOTAL_WEIGHT = total;
  let acc = 0;
  return raw.map((r) => {
    const a = acc / total;
    acc += r.w;
    return { ...r, a, b: acc / total };
  });
})();
const SECTION_VH = Math.round(TOTAL_WEIGHT * 52 + 100);
const segAt = (p: number) => TIMELINE.find((s) => p < s.b) ?? TIMELINE[TIMELINE.length - 1];
const first = (kind: Seg["kind"]) => TIMELINE.find((s) => s.kind === kind)!;
const stationAt = (p: number) => {
  const s = segAt(p);
  if (s.kind === "walk") return (p - s.a) / (s.b - s.a) > 0.55 ? s.station : Math.max(0, s.station - 1);
  return s.station;
};
const restAt = (i: number) => {
  if (i === CONTACT) return 1;
  if (i === SHIP) return first("deploy").b - 0.004;
  const d = TIMELINE.find((s) => s.station === i && s.kind === "dwell");
  return d ? (i === 0 ? 0 : (d.a + d.b) / 2) : 0;
};

// bugs: one in most rooms, two in the AI lab
const BUG_ROOMS = STATIONS.flatMap((s, i) => (i > 0 && i < SHIP ? (s.kind === "ai" ? [i, i] : [i]) : []));
const BUG_COUNT = BUG_ROOMS.length;

// ---------------------------------------------------------------- desk screens
const CODE = [
  [["kw", "export async function "], ["fn", "ship"], ["p", "(order: "], ["ty", "Order"], ["p", ") {"]],
  [["p", "  const "], ["v", "route"], ["p", " = "], ["kw", "await "], ["fn", "plan"], ["p", "(order);"]],
  [["p", "  "], ["kw", "await "], ["fn", "track"], ["p", "(route, { realtime: "], ["kw", "true"], ["p", " });"]],
  [["p", "  "], ["kw", "await "], ["fn", "invoice"], ["p", "(order.customer);"]],
  [["p", "  "], ["kw", "return "], ["fn", "deploy"], ["p", "("], ["s", "\"production\""], ["p", ");"]],
  [["p", "}"]],
] as const;
const CODE_LEN = CODE.reduce((s, l) => s + l.reduce((a, [, t]) => a + t.length, 0), 0);
const TERMINAL = [
  ["$ npm run test", "#9fb3c8"], ["  ✓ 128 passed", "#3ccf8e"], ["$ npm run build", "#9fb3c8"],
  ["  ✓ compiled in 4.2s", "#3ccf8e"], ["$ deploy --prod", "#9fb3c8"], ["  ✓ live on aws · azure", "#3ccf8e"],
] as const;
const TOKEN_COLORS: Record<string, string> = { kw: "#c792ea", fn: "#82aaff", ty: "#ffcb6b", v: "#f07178", s: "#c3e88d", p: "#d6deeb" };

const monthYear = (ym: string) => new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${ym}-01T00:00:00Z`));
const period = (r: Role) => `${monthYear(r.start)} – ${r.end ? monthYear(r.end) : "now"}`;
const dayMonth = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(iso));

function caption(s: Station): { meta: string; title: string } {
  switch (s.kind) {
    case "intro": return { meta: `${profile.role} · ${profile.location}`, title: "Scroll to walk down, or press W A S D to play" };
    case "job": return { meta: `${period(s.role)} · ${s.role.domain}${s.current ? " · current" : ""}`, title: s.role.company };
    case "ai": return { meta: "Self-hosted AI", title: "AI lab" };
    case "projects": return { meta: "Live from GitHub", title: "Projects" };
    case "skills": return { meta: "Toolbox", title: "Every layer of the stack" };
    case "edu": return { meta: "Education & talks", title: education.school };
    case "ship": return { meta: "Build → test → deploy", title: "Then I ship it" };
    default: return { meta: "Contact", title: "Let's build something" };
  }
}

type Look = { floor: number; wall: number; accent: number; mood?: "dark" };
function lookFor(s: Station): Look {
  if (s.kind === "job") {
    switch (s.role.domain) {
      case "GovTech": return { floor: 0xb86b45, wall: 0xd9e8cf, accent: 0xce1126 };
      case "Fintech": return { floor: 0x2b2f36, wall: 0x1c2740, accent: 0xe8b54a, mood: "dark" };
      case "EdTech": return { floor: 0xc49a6c, wall: 0xf3e8cc, accent: 0x2f6b4f };
      case "Logistics": return { floor: 0x9da3a8, wall: 0x6f7f8f, accent: 0xf2b134 };
      default: return { floor: 0xdfe3e8, wall: 0xffffff, accent: 0x2b57de };
    }
  }
  switch (s.kind) {
    case "intro": return { floor: 0xd2b48c, wall: 0xf1ede6, accent: 0x2b57de };
    case "ai": return { floor: 0x121826, wall: 0x182033, accent: 0x7d5cff, mood: "dark" };
    case "projects": return { floor: 0x6b4a33, wall: 0xf6f5f1, accent: 0x2b57de };
    case "skills": return { floor: 0xa38b6d, wall: 0xd9c4a0, accent: 0xe8a33d };
    case "edu": return { floor: 0x7a4b2e, wall: 0x5d3d2a, accent: 0xe8c47a, mood: "dark" };
    default: return { floor: 0xd9c3a5, wall: 0xeef1f6, accent: 0x2b57de };
  }
}

type Control = {
  playing: boolean;
  keys: Record<string, boolean>;
  joy: { x: number; y: number };
  jump: boolean;
  interact: boolean;
  attack: boolean;
  teleport: number | null;
};

const subscribeTouch = (cb: () => void) => {
  const mq = matchMedia("(hover: none)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

// ================================================================ component
export function CareerWalk({ repos }: { repos: RepoLite[] | null }) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctrl = useRef<Control>({ playing: false, keys: {}, joy: { x: 0, y: 0 }, jump: false, interact: false, attack: false, teleport: null });
  const [active, setActive] = useState(0);
  const [mode, setMode] = useState<"3d" | "static" | "none">("3d");
  const [dragged, setDragged] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [bugsLeft, setBugsLeft] = useState(BUG_COUNT);
  const touch = useSyncExternalStore(subscribeTouch, () => matchMedia("(hover: none)").matches, () => false);
  const roomRef = useRef(0);

  const scrollToRoom = useCallback((i: number, smooth: boolean) => {
    const s = sectionRef.current;
    if (!s) return;
    const top = s.getBoundingClientRect().top + scrollY;
    scrollTo({ top: top + restAt(i) * (s.offsetHeight - innerHeight), behavior: smooth ? "smooth" : "instant" });
  }, []);

  const startPlay = useCallback(() => {
    if (ctrl.current.playing) return;
    ctrl.current.playing = true;
    document.documentElement.classList.add("walk-lock");
    setPlaying(true);
  }, []);
  const stopPlay = useCallback(() => {
    if (!ctrl.current.playing) return;
    ctrl.current.playing = false;
    ctrl.current.keys = {};
    ctrl.current.joy = { x: 0, y: 0 };
    document.documentElement.classList.remove("walk-lock");
    setPlaying(false);
    setPrompt(null);
    requestAnimationFrame(() => scrollToRoom(roomRef.current, false));
  }, [scrollToRoom]);

  const goTo = (i: number) => {
    if (ctrl.current.playing) ctrl.current.teleport = Math.min(i, SHIP);
    else scrollToRoom(i, true);
  };

  // ---------- keyboard ----------
  useEffect(() => {
    if (mode !== "3d") return;
    const MOVE = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"];
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const target = e.target as HTMLElement | null;
      if (target && /input|textarea|select/i.test(target.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const c = ctrl.current;
      if (!c.playing) {
        if (MOVE.includes(k)) {
          startPlay();
          c.keys[k] = true;
          e.preventDefault();
        }
        return;
      }
      if (k === "escape") return stopPlay();
      if (k === " ") c.jump = true;
      if (k === "e" || k === "enter") c.interact = true;
      if ((k === "f" || k === "j" || k === "k") && !e.repeat) c.attack = true;
      c.keys[k] = true;
      if (MOVE.includes(k) || k === " ") e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      ctrl.current.keys[e.key.toLowerCase()] = false;
    };
    addEventListener("keydown", down);
    addEventListener("keyup", up);
    return () => {
      removeEventListener("keydown", down);
      removeEventListener("keyup", up);
    };
  }, [mode, startPlay, stopPlay]);

  useEffect(() => () => document.documentElement.classList.remove("walk-lock"), []);

  // ---------- the 3D world ----------
  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let disposed = false;
    let cleanup = () => {};

    const start = async () => {
      const THREE = await import("three");
      const { RoundedBoxGeometry } = await import("three/examples/jsm/geometries/RoundedBoxGeometry.js");
      await document.fonts?.ready;
      if (disposed) return;

      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
      } catch {
        setMode("none");
        return;
      }
      const small = innerWidth < 760;
      renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 2));
      renderer.shadowMap.enabled = !small;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 700);
      const rootStyle = getComputedStyle(document.documentElement);
      const css = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
      const FONT_DISPLAY = rootStyle.getPropertyValue("--font-display").trim() || "sans-serif";
      const FONT_BODY = rootStyle.getPropertyValue("--font-body").trim() || "sans-serif";
      const FONT_MONO = rootStyle.getPropertyValue("--font-mono").trim() || "monospace";
      const isDark = () => {
        const t = document.documentElement.dataset.theme;
        return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
      };
      const dayBg = new THREE.Color();
      const nightBg = new THREE.Color("#0b1224");
      const bg = new THREE.Color();
      scene.background = bg;
      const fog = new THREE.Fog(bg, 70, 260);
      scene.fog = fog;

      // ---------- lights ----------
      const hemi = new THREE.HemisphereLight(0xeaf0ff, 0x4a4036, 1.35);
      const sun = new THREE.DirectionalLight(0xfff1dc, 2.3);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 14, bottom: -14, near: 1, far: 80 });
      sun.shadow.bias = -0.0004;
      sun.shadow.radius = 4;
      scene.add(hemi, sun, sun.target);

      // ---------- builders ----------
      // `cur` is the group new things go into: each room is a group lifted to its own floor height
      let cur: Object3D = scene;
      const add = (...o: Object3D[]) => cur.add(...o);
      const mat = (color: string | number, rough = 0.8, metal = 0.02) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
      const glow = (color: number, intensity = 1.6) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.4 });
      const M = {
        wood: mat(0x8a5a3b, 0.55), woodLight: mat(0xc49a6c, 0.55), dark: mat(0x232a36, 0.45, 0.2), metal: mat(0x9aa3ae, 0.3, 0.7),
        plant: mat(0x3f8f5a, 0.7), pot: mat(0xe2d6c6, 0.85), cup: mat(0xffffff, 0.45), sleeve: mat(0xb9864f, 0.9),
        skin: mat(0xd9a77f, 0.65), hair: mat(0x15171c, 0.75), road: mat(0x3b414b, 0.95), red: mat(0xce1126, 0.6),
        white: mat(0xffffff, 0.75), gold: mat(0xe8b54a, 0.3, 0.7), blue: mat(0x2b57de, 0.45), amber: mat(0xe8a33d, 0.55),
        green: mat(0x2f8f6a, 0.65), roof: mat(0xa0442c, 0.8), chalk: mat(0x2c4a3c, 0.9), cardboard: mat(0xc09461, 0.9),
        yellow: mat(0xf2b134, 0.55), facade: mat(0x8f99a8, 0.9),
        hoodie: mat(0x3d4f7a, 0.85), hoodieDark: mat(0x2f3e62, 0.9), string: mat(0xf4f6f9, 0.7),
        jeans: mat(0x35507a, 0.85), sneaker: mat(0xf5f5f2, 0.55), sole: mat(0xd6d6d0, 0.7), stripe: mat(0xe8a33d, 0.55),
        blade: new THREE.MeshStandardMaterial({ color: 0xcfe9ff, emissive: 0x4fc3ff, emissiveIntensity: 0.9, metalness: 0.8, roughness: 0.2 }),
        glass: new THREE.MeshStandardMaterial({ color: 0xbfd6ff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.22 }),
      };
      const place = <T extends Object3D>(o: T, x: number, y: number, z: number) => {
        o.position.set(x, y, z);
        o.traverse((c) => {
          c.castShadow = true;
          c.receiveShadow = true;
        });
        return o;
      };
      const box = (w: number, h: number, d: number, m: Material, x = 0, y = 0, z = 0) => {
        const r = Math.min(0.05, Math.min(w, h, d) * 0.3);
        const geo = r > 0.008 ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d);
        return place(new THREE.Mesh(geo, m), x, y, z);
      };
      const slab = (w: number, h: number, d: number, m: Material, x = 0, y = 0, z = 0) => place(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m), x, y, z);
      const cyl = (rt: number, rb: number, h: number, m: Material, x = 0, y = 0, z = 0, segments = 20) =>
        place(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segments), m), x, y, z);
      const canvasTex = (w: number, h: number) => {
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        return { c, g: c.getContext("2d")!, tex };
      };
      const screenMat = (tex: CanvasTexture) => new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, transparent: true });
      const glowTex = (() => {
        const t = canvasTex(128, 128);
        const g = t.g.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, "rgba(255,255,255,1)");
        g.addColorStop(0.25, "rgba(255,255,255,0.45)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        t.g.fillStyle = g;
        t.g.fillRect(0, 0, 128, 128);
        t.tex.needsUpdate = true;
        return t.tex;
      })();
      /** additive glow halo: a cheap "bloom" that works in light and dark themes */
      const halo = (color: number, size: number, x: number, y: number, z: number, opacity = 0.6) => {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
        s.scale.set(size, size, 1);
        s.position.set(x, y, z);
        add(s);
        return s;
      };
      const swaying: { o: Object3D; seed: number }[] = [];
      const plant = (x: number, z: number, s = 1) => {
        add(cyl(0.32 * s, 0.25 * s, 0.6 * s, M.pot, x, 0.3 * s, z));
        const leaves = place(new THREE.Mesh(new THREE.IcosahedronGeometry(0.62 * s, 1), M.plant), x, 1.05 * s, z);
        add(leaves);
        swaying.push({ o: leaves, seed: x });
        return leaves;
      };

      // ---------- signs ----------
      const wrap = (g: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number, maxLines: number) => {
        const words = text.split(" ");
        let line = "";
        let n = 0;
        for (const w of words) {
          const test = line ? `${line} ${w}` : w;
          if (g.measureText(test).width > maxW && line) {
            if (n === maxLines - 1) {
              g.fillText(`${line}…`, x, y + n * lh);
              return n + 1;
            }
            g.fillText(line, x, y + n * lh);
            line = w;
            n++;
          } else line = test;
        }
        g.fillText(line, x, y + n * lh);
        return n + 1;
      };
      const chips = (g: CanvasRenderingContext2D, items: readonly string[], x: number, y: number, maxW: number, size = 24) => {
        g.font = `500 ${size}px ${FONT_MONO}`;
        let cx = x;
        let cy = y;
        for (const t of items) {
          const w = g.measureText(t).width + size * 1.1;
          if (cx + w > x + maxW) {
            cx = x;
            cy += size * 1.9;
          }
          g.fillStyle = "rgba(125,156,255,0.16)";
          g.beginPath();
          g.roundRect(cx, cy - size * 1.1, w, size * 1.55, 8);
          g.fill();
          g.fillStyle = "#c9d6ff";
          g.fillText(t, cx + size * 0.55, cy);
          cx += w + 10;
        }
        return cy;
      };
      type SignRec = { grp: Group; face: MeshBasicMaterial; halo: Sprite; x: number; seed: number };
      const signs: SignRec[] = [];
      const sign = (w: number, h: number, accent: string, paint: (g: CanvasRenderingContext2D, W: number, H: number) => void) => {
        const W = 1024;
        const H = Math.round((W * h) / w);
        const t = canvasTex(W, H);
        const grad = t.g.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, "#131c30");
        grad.addColorStop(1, "#0b111e");
        t.g.fillStyle = grad;
        t.g.fillRect(0, 0, W, H);
        t.g.fillStyle = accent;
        t.g.fillRect(0, 0, W, 10);
        t.g.fillStyle = "rgba(255,255,255,0.025)";
        for (let y = 14; y < H; y += 6) t.g.fillRect(0, y, W, 1);
        paint(t.g, W, H);
        t.tex.needsUpdate = true;
        const grp = new THREE.Group();
        grp.add(box(w + 0.12, h + 0.12, 0.08, M.dark, 0, 0, -0.05));
        const face = screenMat(t.tex);
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), face);
        plane.position.z = 0.002;
        grp.add(plane);
        return { grp, face, accent };
      };
      const mount = (s: ReturnType<typeof sign>, x: number, y: number, z: number, rotY = 0) => {
        s.grp.position.set(x, y, z);
        s.grp.rotation.y = rotY;
        add(s.grp);
        const h = halo(new THREE.Color(s.accent).getHex(), 5.5, x, y, z - 0.15, 0);
        signs.push({ grp: s.grp, face: s.face, halo: h, x, seed: Math.random() * 10 });
      };
      const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;
      const SIGN_Y = 2.3;
      const SIGN_Z = -3.0;

      // ---------- the building: one group per room, each a half-floor lower, with stairs ----------
      const rooms = STATIONS.slice(0, SHIP + 1).map((_, i) => {
        const g = new THREE.Group();
        g.position.y = floorOf(i);
        scene.add(g);
        return g;
      });
      STATIONS.forEach((s, i) => {
        if (i > SHIP) return;
        cur = rooms[i];
        const L = lookFor(s);
        const floor = mat(L.floor, 0.75);
        const wall = mat(L.wall, 0.95);
        const cx = stationX(i);
        // the building below this floor, down to street level (seen on the fly-out)
        const below = floorOf(i) - GROUND - 0.2;
        if (below > 0.05) add(slab(ROOM, below, 9, M.facade, cx, -0.2 - below / 2, 0.5));
        add(slab(ROOM, 0.2, 9, floor, cx, -0.1, 0.5));
        if (s.kind === "ship") {
          add(slab(ROOM, 0.9, 0.3, wall, cx, 0.45, -3.2), slab(ROOM, 0.7, 0.3, wall, cx, 3.85, -3.2));
          for (let k = -2; k <= 2; k++) add(slab(0.35, 4.2, 0.35, wall, cx + k * 2.35, 2.1, -3.2));
          const g = new THREE.Mesh(new THREE.PlaneGeometry(ROOM, 2.6), M.glass);
          g.position.set(cx, 2.2, -3.15);
          add(g);
        } else add(slab(ROOM, 4.2, 0.3, wall, cx, 2.1, -3.2));
        add(slab(ROOM, 0.12, 0.05, mat(L.accent, 0.5), cx, 0.06, -3.03));
        const rug = new THREE.Mesh(new THREE.CircleGeometry(1.5, 48), new THREE.MeshStandardMaterial({ color: L.accent, roughness: 0.95, transparent: true, opacity: 0.18 }));
        rug.rotation.x = -Math.PI / 2;
        rug.position.set(cx + 0.4, 0.012, 1.0);
        rug.receiveShadow = true;
        add(rug);
        // stairs coming down into this room from the one before
        if (i > 0) {
          const x0 = cx - ROOM / 2 + 0.15;
          const N = 8;
          const run = STAIR_RUN / N;
          const stepMat = mat(new THREE.Color(L.floor).lerp(new THREE.Color(0xffffff), 0.15).getHex(), 0.7);
          const nose = glow(lookFor(STATIONS[i - 1]).accent, 0.7);
          for (let k = 0; k < N; k++) {
            const top = DROP * (1 - (k + 0.5) / N);
            add(slab(run + 0.01, top, 7.4, stepMat, x0 + (k + 0.5) * run, top / 2, 0.75));
            add(slab(0.03, 0.025, 7.4, nose, x0 + k * run + 0.015, top, 0.75));
          }
        }
        // partition to the next room, with a doorway; it reaches down to the lower floor
        if (i < SHIP) {
          const px = cx + ROOM / 2;
          const h = 4.2 + DROP;
          const yc = (4.2 - DROP) / 2;
          add(slab(0.25, h, 2.9, wall, px, yc, -1.75), slab(0.25, 1.2, 2.2, wall, px, 3.6, 0.8), slab(0.25, h, 0.6, wall, px, yc, 2.2), slab(0.25, DROP, 2.2, wall, px, -DROP / 2, 0.8));
          const frameMat = glow(L.accent, 0.9);
          add(slab(0.06, 3.0, 0.06, frameMat, px - 0.15, 1.5, -0.25), slab(0.06, 3.0, 0.06, frameMat, px - 0.15, 1.5, 1.65), slab(0.06, 0.06, 1.95, frameMat, px - 0.15, 3.0, 0.7));
        }
        if (L.mood !== "dark" && s.kind !== "ship") {
          add(cyl(0.01, 0.01, 1.0, M.dark, cx + 0.4, 3.7, 0.4, 6), cyl(0.08, 0.32, 0.26, M.dark, cx + 0.4, 3.1, 0.4));
          halo(0xffd9a0, 1.6, cx + 0.4, 2.95, 0.4, 0.55);
        }
      });
      cur = rooms[0];
      add(slab(0.3, 4.2, 6.4, mat(lookFor(STATIONS[0]).wall, 0.95), WORLD_START, 2.1, -0.1));

      // ---------- room contents ----------
      const makeCup = () => {
        const g = new THREE.Group();
        g.add(cyl(0.07, 0.055, 0.2, M.cup), cyl(0.072, 0.072, 0.07, M.sleeve, 0, -0.01, 0), cyl(0.075, 0.075, 0.02, M.cup, 0, 0.11, 0));
        return g;
      };
      let counterCup: Object3D | null = null;
      const roomLights: { light: InstanceType<typeof THREE.PointLight>; base: number }[] = [];
      const neonMats: MeshStandardMaterial[] = [];

      STATIONS.forEach((s, i) => {
        if (i > SHIP) return;
        cur = rooms[i];
        const x = stationX(i);
        const L = lookFor(s);
        const ac = hex(L.accent);
        if (L.mood === "dark") {
          const pl = new THREE.PointLight(L.accent, 7, 9, 1.4);
          pl.position.set(x + 0.5, 3.4, -1);
          add(pl);
          roomLights.push({ light: pl, base: 7 });
        }

        if (s.kind === "intro") {
          mount(
            sign(3.8, 2.3, ac, (g, W) => {
              g.fillStyle = "#7d9cff";
              g.font = `600 30px ${FONT_MONO}`;
              g.fillText(`${profile.role.toUpperCase()} · ${profile.location.toUpperCase()}`, 56, 92);
              g.fillStyle = "#ffffff";
              g.font = `700 92px ${FONT_DISPLAY}`;
              g.fillText("Jaya Pangihutan", 56, 214);
              g.fillStyle = "#7d9cff";
              g.fillText("Situmorang", 56, 314);
              g.fillStyle = "#aab6c8";
              g.font = `400 30px ${FONT_BODY}`;
              wrap(g, profile.summary, 56, 392, W - 112, 40, 4);
            }),
            x, SIGN_Y, SIGN_Z,
          );
          const photo = new THREE.TextureLoader().load(profilePhoto.src);
          photo.colorSpace = THREE.SRGBColorSpace;
          const fx = x + 2.85;
          add(box(1.5, 1.5, 0.08, M.woodLight, fx, SIGN_Y + 0.2, SIGN_Z - 0.02));
          const face = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), new THREE.MeshBasicMaterial({ map: photo, toneMapped: false }));
          face.position.set(fx, SIGN_Y + 0.2, SIGN_Z + 0.03);
          add(face);
          halo(0xffe2b0, 2.6, fx, SIGN_Y + 0.2, SIGN_Z - 0.1, 0.35);
          add(box(1.8, 0.02, 1.1, M.blue, x - 3.2, 0.01, 0.8));
          plant(x - 3.6, -2.4);
          return;
        }

        if (s.kind === "job") {
          const r = s.role;
          mount(
            sign(4.0, 2.6, ac, (g, W) => {
              g.fillStyle = "#7d9cff";
              g.font = `600 28px ${FONT_MONO}`;
              g.fillText(`${period(r).toUpperCase()} · ${r.domain.toUpperCase()}${s.current ? "  ●  CURRENT" : ""}`, 56, 84);
              g.fillStyle = "#ffffff";
              g.font = `700 60px ${FONT_DISPLAY}`;
              const lines = wrap(g, r.company, 56, 160, W - 112, 64, 2);
              const y0 = 160 + lines * 64;
              g.fillStyle = "#c9d2e0";
              g.font = `500 30px ${FONT_BODY}`;
              g.fillText(r.title, 56, y0);
              g.fillStyle = "#aab6c8";
              g.font = `400 27px ${FONT_BODY}`;
              const sl = wrap(g, r.summary, 56, y0 + 50, W - 112, 36, 4);
              chips(g, r.stack.slice(0, 7), 56, y0 + 70 + sl * 36, W - 112, 22);
            }),
            x, SIGN_Y, SIGN_Z,
          );
          const px = x + 2.6;
          switch (r.domain) {
            case "GovTech": {
              add(box(1.2, 0.8, 1, M.white, px, 0.4, -1.8));
              const roof = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.6, 4), M.roof);
              roof.rotation.y = Math.PI / 4;
              add(place(roof, px, 1.1, -1.8), cyl(0.025, 0.025, 2.2, M.metal, px + 0.9, 1.1, -1.4, 8));
              const flag = new THREE.Group();
              flag.add(box(0.6, 0.18, 0.02, M.red, 0.3, 0.09, 0), box(0.6, 0.18, 0.02, M.white, 0.3, -0.09, 0));
              add(place(flag, px + 0.9, 1.97, -1.4));
              swaying.push({ o: flag, seed: 2 });
              break;
            }
            case "Fintech": {
              for (let k = 0; k < 3; k++) for (let j = 0; j < 4 + k * 2; j++) add(cyl(0.22, 0.22, 0.07, M.gold, px - 0.5 + k * 0.5, 0.04 + j * 0.075, -1.7, 24));
              const vault = cyl(1.0, 1.0, 0.2, M.metal, x - 3.1, 2.1, -3.0, 32);
              const knob = cyl(0.25, 0.25, 0.25, M.gold, x - 3.1, 2.1, -2.85, 16);
              vault.rotation.x = knob.rotation.x = Math.PI / 2;
              add(vault, knob);
              halo(0xe8b54a, 2.2, px, 0.5, -1.6, 0.35);
              break;
            }
            case "EdTech": {
              add(box(2.2, 1.3, 0.06, M.chalk, x - 3.3, 2.4, -3.0), box(2.3, 0.08, 0.15, M.wood, x - 3.3, 1.72, -2.95));
              const chalk = canvasTex(512, 300);
              chalk.g.fillStyle = "rgba(255,255,255,0.85)";
              chalk.g.font = `48px ${FONT_BODY}`;
              chalk.g.fillText("Kelas.com ✓", 40, 90);
              chalk.g.fillText("Kelas.work ✓", 40, 160);
              chalk.g.fillText("Kelas.Center ✓", 40, 230);
              chalk.tex.needsUpdate = true;
              const cb = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.15), new THREE.MeshBasicMaterial({ map: chalk.tex, transparent: true }));
              cb.position.set(x - 3.3, 2.4, -2.96);
              add(cb);
              [M.blue, M.amber, M.green, M.red].forEach((m, k) => add(box(0.8 - k * 0.05, 0.14, 0.55, m, px, 0.07 + k * 0.14, -1.7)));
              add(box(0.7, 0.03, 0.7, M.dark, px, 0.66, -1.7), cyl(0.18, 0.2, 0.12, M.dark, px, 0.6, -1.7));
              break;
            }
            case "Logistics": {
              const rx = x + 3.4;
              for (const ry of [0.05, 1.05, 2.05]) add(box(1.6, 0.06, 1.0, M.metal, rx, ry, -2.5));
              for (const dx of [-0.78, 0.78]) add(box(0.06, 2.6, 1.0, M.yellow, rx + dx, 1.3, -2.5));
              for (const ry of [0.08, 1.08]) for (const bx of [-0.4, 0.35]) add(box(0.6, 0.5, 0.7, M.cardboard, rx + bx, ry + 0.28, -2.5));
              add(slab(ROOM - STAIR_RUN, 0.02, 0.15, M.yellow, x + STAIR_RUN / 2, 0.01, 2.6));
              const t = new THREE.Group();
              t.add(box(0.5, 0.45, 0.42, M.dark, 0.85, 0.38, 0), box(1.9, 0.08, 0.4, M.metal, 0, 0.17, 0), box(1.25, 0.5, 0.48, M.blue, -0.25, 0.46, 0));
              t.rotation.y = -0.3;
              add(place(t, x + 1.4, 0, -1.6));
              break;
            }
            default: {
              add(box(3.0, 1.05, 1.0, M.wood, x + 2.6, 0.525, -1.6), box(3.2, 0.08, 1.15, M.woodLight, x + 2.6, 1.09, -1.6));
              add(box(0.8, 0.85, 0.55, M.metal, x + 3.6, 1.55, -1.8), box(0.6, 0.2, 0.3, M.dark, x + 3.6, 1.62, -1.45));
              halo(0xffb070, 0.9, x + 3.6, 1.75, -1.4, 0.5);
              for (let k = 0; k < 3; k++) add(cyl(0.05, 0.04, 0.12, M.cup, x + 1.6 + k * 0.16, 1.19, -1.85));
              const cc = makeCup();
              add(place(cc, COFFEE_X, 1.23, -1.2));
              counterCup = cc;
            }
          }
          return;
        }

        if (s.kind === "ai") {
          mount(
            sign(3.8, 0.7, ac, (g, W, H) => {
              g.fillStyle = "#ffffff";
              g.font = `700 76px ${FONT_DISPLAY}`;
              g.fillText("AI lab", 56, H / 2 + 26);
              g.fillStyle = "#b9a6ff";
              g.font = `500 28px ${FONT_MONO}`;
              g.fillText("self-hosted · open-source models", W - 560, H / 2 + 12);
            }),
            x + 0.5, 3.4, SIGN_Z,
          );
          aiWork.forEach((a, k) => {
            const mx = x - 1.25 + k * 1.75;
            mount(
              sign(1.6, 1.25, ac, (g, W) => {
                g.fillStyle = "#ffffff";
                g.font = `700 58px ${FONT_DISPLAY}`;
                const l = wrap(g, a.title, 44, 110, W - 88, 62, 2);
                g.fillStyle = "#82e0aa";
                g.font = `500 28px ${FONT_MONO}`;
                const pl = wrap(g, a.pipeline, 44, 110 + l * 62 + 20, W - 88, 36, 3);
                g.fillStyle = "#aab6c8";
                g.font = `400 26px ${FONT_BODY}`;
                wrap(g, a.summary, 44, 110 + l * 62 + 40 + pl * 36, W - 88, 34, 4);
              }),
              mx, 1.85, -2.2, (1 - k) * 0.14,
            );
            add(cyl(0.04, 0.04, 1.2, M.metal, mx, 0.62, -2.25, 8), cyl(0.3, 0.3, 0.04, M.dark, mx, 0.02, -2.25));
          });
          const n1 = glow(0x7d5cff, 2.4);
          const n2 = glow(0x2bd4ff, 2.4);
          neonMats.push(n1, n2);
          add(slab(ROOM, 0.05, 0.05, n1, x, 4.1, -3.0), slab(ROOM, 0.05, 0.05, n2, x, 0.15, -3.0));
          for (let k = -2; k <= 2; k++) {
            halo(0x7d5cff, 2.4, x + k * 2, 4.1, -2.9, 0.45);
            halo(0x2bd4ff, 2.0, x + k * 2, 0.2, -2.9, 0.4);
          }
          const brain = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 1), new THREE.MeshStandardMaterial({ color: 0x9d86ff, emissive: 0x7d5cff, emissiveIntensity: 0.8, wireframe: true }));
          brain.position.set(x + 3.6, 1.6, -1.6);
          add(brain);
          halo(0x7d5cff, 1.8, x + 3.6, 1.6, -1.6, 0.5);
          swaying.push({ o: brain, seed: 9 });
          return;
        }

        if (s.kind === "projects") {
          const list = (repos ?? []).slice(0, 6);
          mount(
            sign(1.5, 1.0, "#2b57de", (g, W) => {
              g.fillStyle = "#ffffff";
              g.font = `700 74px ${FONT_DISPLAY}`;
              g.fillText("Live from", 56, 170);
              g.fillText("GitHub", 56, 260);
              g.fillStyle = "#82e0aa";
              g.font = `500 30px ${FONT_MONO}`;
              g.fillText(`● github.com/${profile.github}`, 56, 380);
              g.fillStyle = "#aab6c8";
              g.font = `400 28px ${FONT_BODY}`;
              wrap(g, "Updates on every push through a webhook.", 56, 450, W - 112, 36, 3);
            }),
            x - 3.55, 2.6, SIGN_Z,
          );
          (list.length ? list : [null]).forEach((r, k) => {
            mount(
              sign(1.75, 1.05, "#2b57de", (g, W) => {
                g.fillStyle = "#ffffff";
                g.font = `700 54px ${FONT_MONO}`;
                if (!r) {
                  g.fillText("github.com/", 50, 200);
                  g.fillText(profile.github, 50, 270);
                  return;
                }
                wrap(g, r.name, 50, 120, W - 100, 58, 2);
                g.fillStyle = "#aab6c8";
                g.font = `400 30px ${FONT_BODY}`;
                wrap(g, r.description ?? "", 50, 250, W - 100, 38, 3);
                g.fillStyle = "#82aaff";
                g.font = `500 28px ${FONT_MONO}`;
                g.fillText(`${r.language ?? "—"}${r.stargazers_count ? `  ★ ${r.stargazers_count}` : ""}  ·  ${dayMonth(r.pushed_at)}`, 50, 540);
              }),
              x - 1.2 + (k % 3) * 2.0, 3.05 - Math.floor(k / 3) * 1.3, SIGN_Z,
            );
          });
          plant(x + 4.1, -2.4);
          return;
        }

        if (s.kind === "skills") {
          mount(
            sign(4.2, 2.5, ac, (g, W) => {
              g.fillStyle = "#ffffff";
              g.font = `700 58px ${FONT_DISPLAY}`;
              g.fillText("Every layer of the stack", 56, 100);
              layers.forEach((l, k) => {
                const y = 190 + k * 108;
                g.fillStyle = "#ffcf7a";
                g.font = `600 28px ${FONT_MONO}`;
                g.fillText(l.label.toUpperCase(), 56, y);
                chips(g, l.items, 290, y, W - 330, 23);
              });
            }),
            x - 0.4, SIGN_Y, SIGN_Z,
          );
          mount(
            sign(1.7, 2.5, ac, (g, W) => {
              g.fillStyle = "#ffffff";
              g.font = `700 50px ${FONT_DISPLAY}`;
              g.fillText("Also", 50, 96);
              practices.forEach((p, k) => {
                const y = 190 + k * 210;
                g.fillStyle = "#ffcf7a";
                g.font = `600 40px ${FONT_BODY}`;
                g.fillText(p.title, 50, y);
                g.fillStyle = "#aab6c8";
                g.font = `400 28px ${FONT_BODY}`;
                wrap(g, p.body, 50, y + 46, W - 100, 34, 3);
              });
            }),
            x + 3.05, SIGN_Y, SIGN_Z,
          );
          for (let k = 0; k < 6; k++) add(box(0.08, 0.5 + (k % 3) * 0.15, 0.05, [M.amber, M.metal, M.red][k % 3], x - 3.9 + k * 0.18, 3.6, -3.0));
          return;
        }

        if (s.kind === "edu") {
          mount(
            sign(3.8, 2.4, ac, (g, W) => {
              g.fillStyle = "#e8c47a";
              g.font = `600 28px ${FONT_MONO}`;
              g.fillText(`${education.start.slice(0, 4)} – ${education.end.slice(0, 4)} · GPA ${education.gpa} · ${education.place.toUpperCase()}`, 56, 84);
              g.fillStyle = "#ffffff";
              g.font = `700 64px ${FONT_DISPLAY}`;
              g.fillText(education.school, 56, 166);
              g.fillStyle = "#c9d2e0";
              g.font = `500 30px ${FONT_BODY}`;
              g.fillText(education.degree, 56, 214);
              g.fillStyle = "#aab6c8";
              g.font = `italic 400 26px ${FONT_BODY}`;
              const tl = wrap(g, `Thesis: ${education.thesis}`, 56, 270, W - 112, 34, 3);
              g.fillStyle = "#ffffff";
              g.font = `600 30px ${FONT_BODY}`;
              speaking.forEach((sp, k) => g.fillText(`🎤 ${sp.role} · ${sp.event} ${sp.year}`, 56, 290 + tl * 34 + 30 + k * 44));
              g.fillStyle = "#aab6c8";
              g.font = `400 26px ${FONT_BODY}`;
              g.fillText(`Languages: ${languages.join(", ")}`, 56, 290 + tl * 34 + 30 + speaking.length * 44 + 10);
            }),
            x - 0.3, SIGN_Y, SIGN_Z,
          );
          mount(
            sign(1.9, 2.6, ac, (g, W) => {
              g.fillStyle = "#ffffff";
              g.font = `700 46px ${FONT_DISPLAY}`;
              g.fillText(`${certifications.length} certificates`, 46, 90);
              g.font = `400 25px ${FONT_BODY}`;
              certifications.forEach((c, k) => {
                g.fillStyle = "#e8c47a";
                g.fillText(c.year ?? "—", 46, 160 + k * 112);
                g.fillStyle = "#c9d2e0";
                wrap(g, c.name, 130, 160 + k * 112, W - 176, 30, 3);
              });
            }),
            x + 3.05, SIGN_Y, SIGN_Z,
          );
          add(cyl(0.02, 0.02, 1.4, M.metal, x + 1.6, 0.7, -1.4, 8), cyl(0.22, 0.22, 0.03, M.dark, x + 1.6, 0.02, -1.4));
          add(place(new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), M.dark), x + 1.6, 1.45, -1.4));
          // floating books above the stairs
          const bookColors = [M.red, M.blue, M.amber, M.green, M.white];
          for (let b = 0; b < 5; b++) {
            const bk = box(0.5, 0.08, 0.36, bookColors[b], x - 3.6 + b * 0.35, 2.6 + (b % 2) * 0.3, -2.2);
            add(bk);
            swaying.push({ o: bk, seed: 20 + b });
          }
          halo(0xe8c47a, 1.6, x - 2.9, 2.8, -2.0, 0.4);
        }
      });

      // ---------- studio desk (ground floor) ----------
      cur = rooms[SHIP];
      add(box(3.4, 0.07, 1.4, M.woodLight, DESK_X, 0.76, -1.6));
      for (const dx of [-1.6, 1.6]) add(box(0.06, 0.74, 1.3, M.dark, DESK_X + dx, 0.37, -1.6));
      const chair = new THREE.Group();
      chair.add(box(0.6, 0.08, 0.6, M.dark, 0, 0.5, 0), box(0.6, 0.7, 0.07, M.dark, 0, 0.88, 0.3), cyl(0.04, 0.04, 0.45, M.metal, 0, 0.25, 0));
      add(place(chair, DESK_X, 0, 0.1));
      const codeScr = canvasTex(640, 400);
      const termScr = canvasTex(640, 400);
      const monitor = (x: number, tex: CanvasTexture, rotY: number) => {
        const g = new THREE.Group();
        g.add(box(1.25, 0.78, 0.05, M.dark));
        const s = new THREE.Mesh(new THREE.PlaneGeometry(1.17, 0.7), screenMat(tex));
        s.position.z = 0.03;
        g.add(s, box(0.06, 0.3, 0.06, M.metal, 0, -0.5, -0.05), box(0.36, 0.03, 0.22, M.metal, 0, -0.64, -0.05));
        g.rotation.y = rotY;
        add(place(g, x, 1.43, -2.05));
        halo(0x82aaff, 1.8, x, 1.43, -2.15, 0.25);
      };
      monitor(DESK_X - 0.66, codeScr.tex, 0.18);
      monitor(DESK_X + 0.66, termScr.tex, -0.18);
      const laptop = new THREE.Group();
      laptop.add(box(0.7, 0.03, 0.48, M.metal));
      const lid = new THREE.Group();
      lid.position.set(0, 0.015, -0.24);
      lid.add(box(0.7, 0.025, 0.48, M.metal, 0, 0, 0.24));
      const lapScr = canvasTex(256, 160);
      const lapScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.42), screenMat(lapScr.tex));
      lapScreen.rotation.x = Math.PI / 2;
      lapScreen.position.set(0, -0.014, 0.24);
      lid.add(lapScreen);
      laptop.add(lid);
      add(place(laptop, DESK_X, 0.81, -1.15));
      const phoneScr = canvasTex(160, 300);
      const phone = new THREE.Group();
      phone.add(box(0.2, 0.02, 0.38, M.dark));
      const phoneScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.34), screenMat(phoneScr.tex));
      phoneScreen.rotation.x = -Math.PI / 2;
      phoneScreen.position.y = 0.012;
      phone.add(phoneScreen);
      phone.rotation.y = -0.4;
      add(place(phone, DESK_X + 1.25, 0.8, -1.05));
      add(cyl(0.12, 0.15, 0.04, M.dark, DESK_X - 1.5, 0.81, -2.0), cyl(0.02, 0.02, 0.8, M.dark, DESK_X - 1.5, 1.2, -2.0, 8), cyl(0.05, 0.18, 0.2, M.dark, DESK_X - 1.5, 1.62, -1.85));
      const lamp = new THREE.PointLight(0xffc27a, 0, 9, 1.6);
      lamp.position.set(DESK_X - 1.6, 1.9, -1.2);
      add(lamp);
      const lampHalo = halo(0xffc27a, 2.2, DESK_X - 1.5, 1.55, -1.8, 0);
      const rack = new THREE.Group();
      rack.add(box(0.9, 2.2, 0.8, M.dark, 0, 1.1, 0));
      const leds: MeshStandardMaterial[] = [];
      for (let r = 0; r < 8; r++) {
        rack.add(box(0.8, 0.02, 0.02, M.metal, 0, 0.3 + r * 0.24, 0.41));
        for (let k = 0; k < 3; k++) {
          const led = new THREE.MeshStandardMaterial({ color: 0x14361f, emissive: 0x3ccf8e, emissiveIntensity: 0 });
          leds.push(led);
          const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.02), led);
          m.position.set(-0.3 + k * 0.08, 0.38 + r * 0.24, 0.41);
          rack.add(m);
        }
      }
      add(place(rack, DESK_X + 3.2, 0, -2.4));
      const rackHalo = halo(0x3ccf8e, 2.6, DESK_X + 3.2, 1.2, -1.9, 0);
      const deskCup = makeCup();
      add(place(deskCup, DESK_X - 1.0, 0.9, -1.1));
      cur = scene;

      // ---------- the character: hoodie, jeans, sneakers, and a sword for bugs (faces +z) ----------
      const person = new THREE.Group();
      const body = new THREE.Group();
      person.add(body);
      const hips = new THREE.Group();
      hips.position.y = 0.95;
      body.add(hips);
      hips.add(box(0.36, 0.16, 0.22, M.jeans));
      const torso = new THREE.Group();
      hips.add(torso);
      const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.32, 6, 16), M.hoodie);
      chest.scale.set(1.12, 1, 0.7);
      torso.add(place(chest, 0, 0.32, 0));
      torso.add(box(0.26, 0.14, 0.03, M.hoodieDark, 0, 0.16, 0.14));
      const strings = [box(0.012, 0.16, 0.012, M.string, -0.04, 0.55, 0.15), box(0.012, 0.16, 0.012, M.string, 0.04, 0.55, 0.15)];
      torso.add(...strings);
      const hood = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.055, 10, 20, Math.PI * 1.2), M.hoodieDark);
      hood.rotation.set(0.2, 0, Math.PI * 0.9);
      torso.add(place(hood, 0, 0.66, -0.06));
      const head = new THREE.Group();
      head.position.y = 0.72;
      torso.add(head);
      head.add(cyl(0.06, 0.07, 0.1, M.skin, 0, -0.06, 0));
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 18), M.skin);
      skull.scale.set(0.95, 1.08, 1);
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.137, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2.1), M.hair);
      hair.rotation.x = -0.25;
      head.add(place(skull, 0, 0.1, 0), place(hair, 0, 0.13, 0));
      for (const ex of [-0.045, 0.045]) head.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), M.hair), ex, 0.11, 0.12));
      const limb = (len: number, r: number, m: Material) => {
        const g = new THREE.Group();
        g.add(place(new THREE.Mesh(new THREE.CapsuleGeometry(r, len - r * 2, 6, 12), m), 0, -len / 2, 0));
        return g;
      };
      const arm = (side: number) => {
        const shoulder = limb(0.32, 0.062, M.hoodie);
        shoulder.position.set(side * 0.27, 0.55, 0);
        torso.add(shoulder);
        const elbow = limb(0.3, 0.056, M.hoodie);
        elbow.position.y = -0.32;
        shoulder.add(elbow);
        elbow.add(cyl(0.058, 0.058, 0.05, M.hoodieDark, 0, -0.27, 0, 12));
        elbow.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), M.skin), 0, -0.32, 0));
        const grip = new THREE.Group();
        grip.position.set(0, -0.34, 0.02);
        elbow.add(grip);
        return { shoulder, elbow, grip };
      };
      const leg = (side: number) => {
        const hip = limb(0.46, 0.078, M.jeans);
        hip.position.set(side * 0.11, -0.04, 0);
        hips.add(hip);
        const knee = limb(0.44, 0.07, M.jeans);
        knee.position.y = -0.46;
        hip.add(knee);
        const foot = new THREE.Group();
        foot.position.y = -0.44;
        foot.add(box(0.14, 0.09, 0.3, M.sneaker, 0, 0.02, 0.05), box(0.15, 0.035, 0.32, M.sole, 0, -0.03, 0.05), box(0.145, 0.025, 0.12, M.stripe, 0, 0.03, 0.02));
        knee.add(foot);
        return { hip, knee, foot };
      };
      const armL = arm(-1);
      const armR = arm(1);
      const legL = leg(-1);
      const legR = leg(1);
      // coffee goes in the left hand, the sword in the right
      const handCup = makeCup();
      handCup.rotation.x = Math.PI / 2;
      handCup.position.set(0, -0.02, 0.06);
      armL.grip.add(handCup);
      const sword = new THREE.Group();
      sword.add(cyl(0.022, 0.022, 0.2, M.dark, 0, 0.02, 0, 10), box(0.2, 0.03, 0.05, M.gold, 0, -0.09, 0), box(0.05, 0.85, 0.012, M.blade, 0, -0.52, 0));
      const bladeGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x4fc3ff, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
      bladeGlow.scale.set(0.35, 1.2, 1);
      bladeGlow.position.y = -0.52;
      sword.add(bladeGlow);
      sword.rotation.x = Math.PI / 2; // blade points forward out of the fist
      armR.grip.add(sword);
      // slash trail
      const trailMat = new THREE.MeshBasicMaterial({ color: 0x8fdcff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
      const trail = new THREE.Mesh(new THREE.RingGeometry(0.55, 1.15, 32, 1, -Math.PI * 0.35, Math.PI * 0.9), trailMat);
      trail.rotation.y = -Math.PI / 2;
      trail.position.set(0.25, 1.35, 0.15);
      person.add(trail);
      scene.add(person);
      const blob = new THREE.Mesh(new THREE.CircleGeometry(0.42, 32), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false }));
      blob.rotation.x = -Math.PI / 2;
      scene.add(blob);

      // ---------- bugs ----------
      type Bug = { g: Group; legs: Object3D[]; mat: MeshStandardMaterial; halo: Sprite; room: number; x: number; z: number; tx: number; tz: number; hp: number; alive: boolean; hitT: number; dieT: number; seed: number; heading: number };
      const bugs: Bug[] = BUG_ROOMS.map((room, n) => {
        const g = new THREE.Group();
        const bm = new THREE.MeshStandardMaterial({ color: 0xd2335a, emissive: 0x7a0f2a, emissiveIntensity: 0.6, roughness: 0.35, metalness: 0.2 });
        const shell = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 14), bm);
        shell.scale.set(1, 0.7, 1.25);
        g.add(place(shell, 0, 0.2, 0));
        g.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), M.dark), 0, 0.2, 0.26));
        for (const ex of [-0.06, 0.06]) {
          g.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), M.white), ex, 0.25, 0.34));
          g.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), M.dark), ex, 0.25, 0.38));
          const ant = cyl(0.008, 0.008, 0.22, M.dark, ex * 1.4, 0.38, 0.3, 6);
          ant.rotation.x = 0.7;
          g.add(ant);
        }
        g.add(slab(0.01, 0.16, 0.3, M.dark, 0, 0.33, 0)); // shell seam
        for (const sx of [-0.12, 0.12]) g.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), M.dark), sx, 0.33, -0.05));
        const legs: Object3D[] = [];
        for (let k = 0; k < 6; k++) {
          const side = k < 3 ? -1 : 1;
          const lg = new THREE.Group();
          lg.position.set(side * 0.16, 0.16, -0.12 + (k % 3) * 0.13);
          lg.add(place(new THREE.Mesh(new THREE.CapsuleGeometry(0.015, 0.16, 3, 6), M.dark), side * 0.08, -0.06, 0));
          lg.children[0].rotation.z = side * 1.0;
          g.add(lg);
          legs.push(lg);
        }
        const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff3d6e, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
        h.scale.set(1.1, 1.1, 1);
        h.position.y = 0.2;
        g.add(h);
        const x = stationX(room) + 0.6 + (n % 2) * 1.6;
        const z = 1.2 + (n % 3) * 0.6;
        scene.add(g);
        return { g, legs, mat: bm, halo: h, room, x, z, tx: x, tz: z, hp: 2, alive: true, hitT: 0, dieT: 0, seed: n * 1.7, heading: 0 };
      });
      let bugsAlive = BUG_COUNT;

      // ---------- particles: dust, confetti, sparks ----------
      const DUST = small ? 220 : 520;
      const dustGeo = new THREE.BufferGeometry();
      const dustPos = new Float32Array(DUST * 3);
      const dustBase = new Float32Array(DUST * 3);
      for (let i = 0; i < DUST; i++) {
        const x = mix(WORLD_START, WORLD_END, Math.random());
        dustBase[i * 3] = x;
        dustBase[i * 3 + 1] = floorY(x) + 0.2 + Math.random() * 3.6;
        dustBase[i * 3 + 2] = -2.8 + Math.random() * 6;
      }
      dustPos.set(dustBase);
      dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
      scene.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xfff1d6, size: 0.035, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, map: glowTex })));

      const makeBurst = (count: number, colors: number[], size: number) => {
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(count * 3);
        const vel = new Float32Array(count * 3);
        const col = new Float32Array(count * 3);
        const pal = colors.map((c) => new THREE.Color(c));
        for (let i = 0; i < count; i++) pal[i % pal.length].toArray(col, i * 3);
        geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
        const m = new THREE.PointsMaterial({ size, vertexColors: true, transparent: true, opacity: 0, depthWrite: false });
        scene.add(new THREE.Points(geo, m));
        const state = { life: 0, floor: 0 };
        return {
          fire(x: number, y: number, z: number, up: number, spread: number, floor: number) {
            for (let i = 0; i < count; i++) {
              pos.set([x, y, z], i * 3);
              const a = Math.random() * Math.PI * 2;
              const sp = spread * (0.4 + Math.random());
              vel.set([Math.cos(a) * sp, up * (0.5 + Math.random()), Math.sin(a) * sp], i * 3);
            }
            state.life = 1.6 + up * 0.15;
            state.floor = floor;
          },
          step(dt: number) {
            if (state.life <= 0) return;
            state.life -= dt;
            for (let i = 0; i < count; i++) {
              vel[i * 3 + 1] -= 7 * dt;
              for (let a = 0; a < 3; a++) pos[i * 3 + a] += vel[i * 3 + a] * dt;
              if (pos[i * 3 + 1] < state.floor + 0.02) {
                pos[i * 3 + 1] = state.floor + 0.02;
                vel[i * 3] *= 0.6;
                vel[i * 3 + 2] *= 0.6;
                vel[i * 3 + 1] = 0;
              }
            }
            geo.attributes.position.needsUpdate = true;
            m.opacity = clamp01(state.life);
          },
        };
      };
      const confetti = makeBurst(180, [0x2b57de, 0xe8a33d, 0x3ccf8e, 0xce1126, 0x7d5cff, 0xffffff], 0.07);
      const sparks = makeBurst(70, [0xff3d6e, 0xffd166, 0xb388ff, 0xffffff], 0.06);
      let confArmed = true;

      // ---------- city ----------
      const midX = (WORLD_START + WORLD_END) / 2;
      scene.add(slab(700, 0.1, 400, M.road, midX, GROUND - 0.05, 0));
      const windowMats: MeshStandardMaterial[] = [];
      const windowTex = (() => {
        const t = canvasTex(64, 128);
        t.g.fillStyle = "#000";
        t.g.fillRect(0, 0, 64, 128);
        for (let y = 6; y < 128; y += 12) for (let x = 6; x < 64; x += 12) {
          t.g.fillStyle = Math.random() > 0.35 ? "#ffd58a" : "#20283a";
          t.g.fillRect(x, y, 6, 7);
        }
        t.tex.wrapS = t.tex.wrapT = THREE.RepeatWrapping;
        t.tex.needsUpdate = true;
        return t.tex;
      })();
      let seed = 11;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let gx = -10; gx <= 12; gx++) {
        for (let gz = -6; gz <= 4; gz++) {
          const x = midX + gx * 22 + (rnd() - 0.5) * 6;
          const z = gz * 22 + (rnd() - 0.5) * 6;
          if (x > WORLD_START - 16 && x < WORLD_END + 14 && Math.abs(z) < 16) continue;
          const h = 8 + rnd() * (gz < 0 ? 60 : 30);
          const w = 8 + rnd() * 8;
          const d = 8 + rnd() * 8;
          const tex = windowTex.clone();
          tex.repeat.set(w / 6, h / 10);
          tex.needsUpdate = true;
          const wm = new THREE.MeshStandardMaterial({ color: 0x8d97a8, roughness: 0.85, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0 });
          windowMats.push(wm);
          scene.add(slab(w, h, d, wm, x, GROUND + h / 2, z));
        }
      }

      // ---------- desk screens ----------
      let lastCode = -1;
      let lastTerm = -1;
      const drawCode = (chars: number) => {
        if (chars === lastCode) return;
        lastCode = chars;
        const { g, c, tex } = codeScr;
        g.fillStyle = "#0f1626";
        g.fillRect(0, 0, c.width, c.height);
        g.fillStyle = "#1c2740";
        g.fillRect(0, 0, c.width, 34);
        g.fillStyle = "#8a96a8";
        g.font = `16px ${FONT_MONO}`;
        g.fillText("ship.ts", 16, 23);
        g.font = `19px ${FONT_MONO}`;
        let left = chars;
        CODE.forEach((line, i) => {
          const y = 72 + i * 34;
          g.fillStyle = "#4a566b";
          g.fillText(String(i + 1), 4, y);
          let x = 40;
          for (const [kind, text] of line) {
            if (left <= 0) break;
            const part = text.slice(0, left);
            left -= part.length;
            g.fillStyle = TOKEN_COLORS[kind];
            g.fillText(part, x, y);
            x += g.measureText(part).width;
          }
        });
        tex.needsUpdate = true;
        lapScr.g.drawImage(c, 0, 0, lapScr.c.width, lapScr.c.height);
        lapScr.tex.needsUpdate = true;
      };
      const drawTerm = (lines: number, live: number) => {
        const key = lines * 10 + Math.round(live * 9);
        if (key === lastTerm) return;
        lastTerm = key;
        const { g, c, tex } = termScr;
        g.fillStyle = "#0b0f17";
        g.fillRect(0, 0, c.width, c.height);
        g.font = `20px ${FONT_MONO}`;
        TERMINAL.slice(0, lines).forEach(([t, col], i) => {
          g.fillStyle = col;
          g.fillText(t, 22, 46 + i * 40);
        });
        if (live > 0) {
          g.fillStyle = `rgba(60,207,142,${live})`;
          g.fillRect(22, 300, 596, 70);
          g.fillStyle = `rgba(11,15,23,${live})`;
          g.font = `bold 26px ${FONT_MONO}`;
          g.fillText("● LIVE  jayasitumorang.vercel.app", 40, 345);
        }
        tex.needsUpdate = true;
        const pg = phoneScr.g;
        pg.fillStyle = "#05070b";
        pg.fillRect(0, 0, 160, 300);
        if (live > 0) {
          pg.globalAlpha = live;
          pg.fillStyle = "#2b57de";
          pg.fillRect(0, 0, 160, 300);
          pg.fillStyle = "#ffffff";
          pg.font = `bold 18px ${FONT_BODY}`;
          pg.fillText("Deployed ✓", 22, 60);
          pg.fillStyle = "rgba(255,255,255,0.85)";
          for (let i = 0; i < 4; i++) pg.fillRect(20, 96 + i * 42, 120, 26);
          pg.globalAlpha = 1;
        }
        phoneScr.tex.needsUpdate = true;
      };
      drawCode(0);
      drawTerm(0, 0);

      // ---------- pointer: drag = 360° look, click (in play) = sword ----------
      let yaw = 0;
      let yawTarget = 0;
      let dragX: number | null = null;
      let downAt = { x: 0, t: 0 };
      let lastTouch = 0;
      const onDown = (e: PointerEvent) => {
        dragX = e.clientX;
        downAt = { x: e.clientX, t: performance.now() };
        lastTouch = performance.now();
      };
      const onMove = (e: PointerEvent) => {
        if (dragX === null) return;
        yawTarget += (e.clientX - dragX) * 0.012;
        dragX = e.clientX;
        lastTouch = performance.now();
        if (Math.abs(e.clientX - downAt.x) > 6) setDragged(true);
      };
      const onUp = (e: PointerEvent) => {
        if (dragX !== null && ctrl.current.playing && Math.abs(e.clientX - downAt.x) < 6 && performance.now() - downAt.t < 350) ctrl.current.attack = true;
        dragX = null;
        lastTouch = performance.now();
      };
      canvas.addEventListener("pointerdown", onDown);
      addEventListener("pointermove", onMove);
      addEventListener("pointerup", onUp);
      addEventListener("pointercancel", onUp);

      // =========================================================== state
      type Target = {
        x: number; z: number; y: number; facing: number; move: number; run: number; phase: number;
        sit: number; cup: "counter" | "hand" | "desk"; sip: number; grab: number; typing: number; swing: number;
        lid: number; code: number; dep: number; night: number; fly: number; station: number;
      };
      const sim = { x: START_X, z: 0.7, y: 0, vx: 0, vz: 0, vy: 0, facing: Math.PI / 2, phase: 0, sitting: false, deskT: 0, cup: "counter" as Target["cup"], grabT: 0, sipT: 0, swingT: 0, swingHit: false, shake: 0, winT: 0, wasPlaying: false };
      const pose = { move: 0, run: 0, sit: 0, sip: 0, grab: 0, typing: 0, air: 0, facing: Math.PI / 2, x: START_X, z: 0.7, fy: 0 };
      const cam = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 40, init: false };

      const sit0 = first("sit");
      const lid0 = first("lid");
      const code0 = first("code");
      const dep0 = first("deploy");
      const fly0 = first("fly");
      const coffeeDwell = TIMELINE.find((s) => s.kind === "dwell" && s.station === CURRENT_STATION)!;
      const local = (p: number, s: Seg) => clamp01((p - s.a) / (s.b - s.a));
      let currentP = 0;

      const fromScroll = (p: number): Target => {
        let x = START_X;
        let move = 0;
        for (const sg of TIMELINE) {
          if (sg.kind !== "walk") continue;
          if (p >= sg.b) x = sg.to!;
          else if (p >= sg.a) {
            x = mix(sg.from!, sg.to!, local(p, sg));
            move = 1;
          }
        }
        const s = segAt(p);
        const t = local(p, s);
        const sit = segE(p, sit0.a, sit0.b);
        const cT = local(p, coffeeDwell);
        const focus = s.kind === "dwell" ? Math.min(s.station === 0 ? 1 : segE(t, 0, 0.18), 1 - segE(t, 0.85, 1)) : 0;
        let facing = Math.PI / 2 + focus * (Math.PI / 2) * 0.8;
        if (p >= sit0.a - 0.002) facing = mix(Math.PI / 2, Math.PI, segE(p, sit0.a - 0.006, sit0.a + 0.004));
        const cup: Target["cup"] = p >= sit0.a + (sit0.b - sit0.a) * 0.7 ? "desk" : p >= coffeeDwell.a + (coffeeDwell.b - coffeeDwell.a) * 0.33 ? "hand" : "counter";
        return {
          x, z: mix(0.7, 0.35, sit), y: 0, facing, move, run: 0, phase: (x - START_X) * 2.1, sit, cup, swing: 0,
          sip: p >= coffeeDwell.a ? segE(cT, 0.45, 0.65) * (1 - segE(cT, 0.75, 0.9)) : 0,
          grab: p >= coffeeDwell.a && p < coffeeDwell.b ? segE(cT, 0.15, 0.4) * (1 - segE(cT, 0.33, 0.45)) : 0,
          typing: segE(p, lid0.b, code0.a + 0.01) * (1 - segE(p, dep0.b, fly0.a + 0.02)),
          lid: segE(p, lid0.a, lid0.b), code: local(p, code0), dep: local(p, dep0),
          night: segE(p, fly0.a, fly0.a + (fly0.b - fly0.a) * 0.7), fly: segE(p, fly0.a, fly0.b), station: stationAt(p),
        };
      };

      // ---- play: input → movement with soft collisions, sword, interactions ----
      const PARTITIONS = STATIONS.slice(0, SHIP).map((_, i) => stationX(i) + ROOM / 2);
      const inDoor = (z: number) => z > -0.15 && z < 1.5;
      let promptShown: string | null = null;
      const say = (t: string | null) => {
        if (t !== promptShown) setPrompt((promptShown = t));
      };
      const fromPlay = (dt: number): Target => {
        const c = ctrl.current;
        const k = c.keys;
        if (c.teleport !== null) {
          sim.x = standX(c.teleport);
          sim.z = 0.7;
          sim.vx = sim.vz = 0;
          sim.sitting = false;
          c.teleport = null;
        }
        let ix = (k.d || k.arrowright ? 1 : 0) - (k.a || k.arrowleft ? 1 : 0) + c.joy.x;
        let iz = (k.s || k.arrowdown ? 1 : 0) - (k.w || k.arrowup ? 1 : 0) + c.joy.y;
        const len = Math.hypot(ix, iz);
        if (len > 1) {
          ix /= len;
          iz /= len;
        }
        const running = !!k.shift || Math.hypot(c.joy.x, c.joy.y) > 0.92;
        if (sim.sitting && len > 0.2) sim.sitting = false;
        const speed = sim.sitting ? 0 : (running ? 4.6 : 2.3) * (sim.swingT > 0 ? 0.55 : 1);
        sim.vx += (ix * speed - sim.vx) * damp(9, dt);
        sim.vz += (iz * speed - sim.vz) * damp(9, dt);
        let nx = sim.x + sim.vx * dt;
        let nz = sim.z + sim.vz * dt;
        nz = Math.min(4.2, Math.max(-0.85, nz));
        nx = Math.min(WORLD_END - 0.5, Math.max(WORLD_START + 0.5, nx));
        for (const px of PARTITIONS) {
          const crossing = (sim.x < px - 0.32 && nx >= px - 0.32) || (sim.x > px + 0.32 && nx <= px + 0.32);
          if (crossing && !inDoor(nz)) nx = sim.x;
          if (Math.abs(nx - px) < 0.32) nz = Math.min(1.45, Math.max(-0.1, nz));
        }
        if (Math.abs(nx - DESK_X) < 1.85) nz = Math.max(-0.6, nz);
        if (Math.abs(nx - (stationX(CURRENT_STATION) + 2.6)) < 1.7) nz = Math.max(-0.95, nz);
        const moved = Math.hypot(nx - sim.x, nz - sim.z);
        sim.x = nx;
        sim.z = nz;
        sim.phase += moved * (running ? 1.75 : 2.3);
        if (Math.hypot(sim.vx, sim.vz) > 0.25 && sim.swingT <= 0) sim.facing = Math.atan2(sim.vx, sim.vz);
        if (c.jump && sim.y <= 0 && !sim.sitting) sim.vy = 4.3;
        c.jump = false;
        sim.vy -= 12 * dt;
        sim.y = Math.max(0, sim.y + sim.vy * dt);
        if (sim.y === 0) sim.vy = Math.max(0, sim.vy);

        // sword
        if (c.attack && sim.swingT <= 0 && !sim.sitting) {
          sim.swingT = 1;
          sim.swingHit = false;
          // auto-face the nearest bug in reach, so swings feel fair
          let best: Bug | null = null;
          let bd = 2.4;
          for (const b of bugs) {
            if (!b.alive) continue;
            const d = Math.hypot(b.x - sim.x, b.z - sim.z);
            if (d < bd) {
              bd = d;
              best = b;
            }
          }
          if (best) sim.facing = Math.atan2(best.x - sim.x, best.z - sim.z);
        }
        c.attack = false;
        if (sim.swingT > 0) {
          sim.swingT = Math.max(0, sim.swingT - dt / 0.34);
          if (!sim.swingHit && sim.swingT < 0.55) {
            sim.swingHit = true;
            const fx = Math.sin(sim.facing);
            const fz = Math.cos(sim.facing);
            for (const b of bugs) {
              if (!b.alive) continue;
              const dx = b.x - sim.x;
              const dz = b.z - sim.z;
              const d = Math.hypot(dx, dz);
              if (d < 1.75 && (dx * fx + dz * fz) / Math.max(0.01, d) > 0.15) {
                b.hp -= 1;
                b.hitT = 1;
                b.x += (dx / Math.max(0.01, d)) * 0.7;
                b.z += (dz / Math.max(0.01, d)) * 0.7;
                sim.shake = 0.18;
                if (b.hp <= 0) {
                  b.alive = false;
                  b.dieT = 1;
                  bugsAlive -= 1;
                  setBugsLeft(bugsAlive);
                  sparks.fire(b.x, floorOf(b.room) + 0.3, b.z, 3.2, 1.6, floorOf(b.room));
                  if (bugsAlive === 0) sim.winT = 5;
                }
              }
            }
          }
        }

        // interactions
        const nearCoffee = sim.cup === "counter" && Math.abs(sim.x - COFFEE_X) < 1.4 && sim.z < 1.4;
        const nearDesk = Math.abs(sim.x - DESK_X) < 1.7 && sim.z < 1.8;
        if (c.interact) {
          if (sim.sitting) sim.sitting = false;
          else if (nearCoffee) sim.grabT = 1;
          else if (nearDesk) {
            sim.sitting = true;
            sim.deskT = 0;
            sim.x = DESK_X;
            sim.z = 0.35;
            sim.vx = sim.vz = 0;
            if (sim.cup === "hand") sim.cup = "desk";
          }
          c.interact = false;
        }
        if (sim.grabT > 0) {
          sim.grabT = Math.max(0, sim.grabT - dt * 1.6);
          if (sim.grabT < 0.5 && sim.cup === "counter") {
            sim.cup = "hand";
            sim.sipT = 1;
          }
        }
        if (sim.sipT > 0) sim.sipT = Math.max(0, sim.sipT - dt * 0.6);
        if (sim.sitting) {
          sim.facing = Math.PI;
          sim.deskT = Math.min(1, sim.deskT + dt / 7);
        }
        sim.winT = Math.max(0, sim.winT - dt);
        say(
          sim.sitting
            ? sim.deskT < 1 ? "Shipping… press E to stand up" : "Live! Press E to stand up"
            : nearCoffee ? "Press E to grab a coffee"
            : nearDesk ? "Press E to sit down and ship"
            : sim.winT > 0 ? "All bugs fixed! Head down to the studio and ship it 🚀"
            : null,
        );
        const d = sim.deskT;
        return {
          x: sim.x, z: sim.z, y: sim.y, facing: sim.facing, move: clamp01(Math.hypot(sim.vx, sim.vz) / 2.3), run: clamp01((Math.hypot(sim.vx, sim.vz) - 2.4) / 2),
          phase: sim.phase, sit: sim.sitting ? 1 : 0, cup: sim.cup, swing: sim.swingT > 0 ? 1 - sim.swingT : 0,
          sip: sim.sipT > 0 ? Math.sin(Math.min(1, (1 - sim.sipT) * 1.4) * Math.PI) : 0,
          grab: sim.grabT > 0 ? Math.sin((1 - sim.grabT) * Math.PI) : 0,
          typing: sim.sitting ? segE(d, 0.08, 0.14) * (1 - segE(d, 0.85, 0.95)) : 0,
          lid: sim.sitting || d > 0 ? segE(d, 0, 0.08) : 0, code: clamp01((d - 0.12) / 0.45), dep: clamp01((d - 0.58) / 0.3),
          night: 0, fly: 0, station: sim.sitting && d > 0.92 ? CONTACT : roomOf(sim.x),
        };
      };

      // ---- apply to the scene, smoothly ----
      const setRot = (o: Object3D, x: number, y = 0, z = 0) => o.rotation.set(x, y, z);
      const angleLerp = (a: number, b: number, t: number) => {
        let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
        if (d < -Math.PI) d += Math.PI * 2;
        return a + d * t;
      };
      const pivot = new THREE.Vector3();
      const off = new THREE.Vector3();
      const camPos = new THREE.Vector3();
      const camLook = new THREE.Vector3();
      let idleTime = 0;

      const apply = (T: Target, dt: number, time: number, playing: boolean) => {
        const k = damp(10, dt);
        pose.move += (T.move - pose.move) * damp(8, dt);
        pose.run += (T.run - pose.run) * damp(6, dt);
        pose.sit += (T.sit - pose.sit) * damp(playing ? 5 : 14, dt);
        pose.sip += (T.sip - pose.sip) * k;
        pose.grab += (T.grab - pose.grab) * k;
        pose.typing += (T.typing - pose.typing) * damp(8, dt);
        pose.air += ((T.y > 0.02 ? 1 : 0) - pose.air) * damp(12, dt);
        pose.facing = angleLerp(pose.facing, T.facing, damp(playing ? 14 : 9, dt));
        pose.x += (T.x - pose.x) * damp(playing ? 30 : 20, dt);
        pose.z += (T.z - pose.z) * damp(playing ? 30 : 12, dt);
        const fyTarget = floorY(pose.x);
        pose.fy += (fyTarget - pose.fy) * damp(18, dt);
        idleTime = pose.move > 0.1 ? 0 : idleTime + dt;

        person.position.set(pose.x, pose.fy, pose.z);
        person.rotation.y = pose.facing;
        body.position.y = T.y;
        blob.position.set(pose.x, pose.fy + 0.015, pose.z);
        blob.scale.setScalar(1 - Math.min(0.5, T.y * 0.4));

        if (counterCup) counterCup.visible = T.cup === "counter";
        handCup.visible = T.cup === "hand" && pose.sit < 0.6;
        deskCup.visible = T.cup === "desk" || (T.cup === "hand" && pose.sit >= 0.6);
        sword.visible = playing && pose.sit < 0.5;

        // ---- gait ----
        const A = pose.move * (1 - pose.sit);
        const R = pose.run;
        const ph = T.phase;
        const onStairs = Math.abs(fyTarget - floorY(pose.x + 0.3)) > 0.01 ? 1 : 0;
        const swing = Math.sin(ph) * (0.5 + 0.28 * R) * A;
        const kneeL = (Math.max(0, Math.sin(ph + 1.25)) * (0.85 + 0.6 * R + 0.3 * onStairs) + 0.08) * A;
        const kneeR = (Math.max(0, Math.sin(ph + 1.25 + Math.PI)) * (0.85 + 0.6 * R + 0.3 * onStairs) + 0.08) * A;
        const bob = Math.abs(Math.cos(ph)) * (0.035 + 0.04 * R + 0.03 * onStairs) * A;
        const breathe = Math.sin(time * 1.7) * 0.012 * (1 - A);
        const shift = Math.sin(time * 0.55) * 0.025 * (1 - A) * (1 - pose.sit);
        hips.position.set(shift, mix(0.93 + bob, 0.58, pose.sit) - 0.03 * R * A, 0);
        hips.rotation.set(0, Math.sin(ph) * 0.14 * A, Math.sin(ph) * 0.04 * A + shift * 0.6);
        const sw = T.swing; // 0..1 sword swing progress
        const windup = sw > 0 ? segE(sw, 0, 0.3) * (1 - segE(sw, 0.3, 0.6)) : 0;
        const strike = sw > 0 ? segE(sw, 0.3, 0.55) * (1 - segE(sw, 0.75, 1)) : 0;
        torso.position.y = breathe;
        torso.rotation.set(mix(0.04 * A + 0.24 * R * A, 0.12, pose.sit) + strike * 0.2, -Math.sin(ph) * 0.2 * A + windup * 0.45 - strike * 0.5, 0);
        const tuck = pose.air;
        setRot(legL.hip, mix(-swing - 0.55 * tuck - strike * 0.3, -1.45, pose.sit));
        setRot(legR.hip, mix(swing - 0.25 * tuck + strike * 0.2, -1.45, pose.sit));
        setRot(legL.knee, mix(kneeL + 0.9 * tuck + strike * 0.3, 1.5, pose.sit));
        setRot(legR.knee, mix(kneeR + 0.5 * tuck, 1.5, pose.sit));
        setRot(legL.foot, -kneeL * 0.25);
        setRot(legR.foot, -kneeR * 0.25);

        const tap = Math.sin(time * 18) * 0.06 * pose.typing;
        let lS = swing * 0.9 - 0.9 * tuck;
        let lE = -(0.2 + 0.25 * A + 1.0 * R * A) - Math.max(0, Math.sin(ph)) * 0.25 * A;
        let rS = -swing * 0.9 - 0.9 * tuck;
        let rE = -(0.2 + 0.25 * A + 1.0 * R * A) - Math.max(0, -Math.sin(ph)) * 0.25 * A;
        const holding = T.cup === "hand" && pose.sit < 0.6;
        if (holding) {
          // coffee in the left hand
          lS = mix(-0.35, -1.25, pose.sip) + swing * 0.15;
          lE = mix(-1.25, -1.6, pose.sip);
        }
        if (pose.grab > 0.01) {
          lS = mix(lS, -1.15, pose.grab);
          lE = mix(lE, -0.25, pose.grab);
        }
        if (playing && pose.sit < 0.5) {
          // carrying the sword: right forearm forward, then the slash
          rS = mix(rS * 0.6 - 0.25, -2.7, windup);
          rE = mix(-0.9, -0.35, windup);
          rS = mix(rS, 0.55, strike);
          rE = mix(rE, -0.15, strike);
        }
        lS = mix(lS, -0.95, pose.typing);
        lE = mix(lE, -0.75, pose.typing) + tap;
        rS = mix(rS, -0.95, pose.typing);
        rE = mix(rE, -0.75, pose.typing) - tap;
        setRot(armL.shoulder, lS, 0, -0.06 - 0.1 * tuck);
        setRot(armL.elbow, lE);
        setRot(armR.shoulder, rS, 0, 0.06 + 0.1 * tuck + strike * 0.5);
        setRot(armR.elbow, rE);
        trailMat.opacity = strike * 0.55;
        const look = idleTime > 1.5 ? Math.sin(time * 0.45) * 0.45 * Math.min(1, (idleTime - 1.5) / 1.5) : 0;
        head.rotation.set(holding ? -pose.sip * 0.25 : mix(-0.12 * R * A, 0.12, pose.typing), look * (1 - pose.typing), 0);
        strings.forEach((s, i) => (s.rotation.x = Math.sin(time * 6 + i) * 0.15 * A));

        // bugs: wander, chase you in play mode, flash when hit, pop when fixed
        for (const b of bugs) {
          if (!b.alive) {
            if (b.dieT > 0) {
              b.dieT = Math.max(0, b.dieT - dt * 3);
              b.g.scale.setScalar(b.dieT);
              b.g.position.y += dt * 2;
            }
            b.g.visible = b.dieT > 0;
            continue;
          }
          const bx0 = stationX(b.room) - ROOM / 2 + STAIR_RUN + 0.6;
          const bx1 = stationX(b.room) + ROOM / 2 - 0.6;
          const sameRoom = playing && roomOf(pose.x) === b.room && Math.abs(pose.x - b.x) < 5.5;
          if (sameRoom) {
            const dx = pose.x - b.x;
            const dz = pose.z - b.z;
            const d = Math.hypot(dx, dz);
            b.tx = pose.x - (dx / Math.max(0.01, d)) * 0.85;
            b.tz = pose.z - (dz / Math.max(0.01, d)) * 0.85;
            if (d < 0.75 && T.y < 0.3) {
              sim.vx -= (dx / Math.max(0.01, d)) * -3 * dt * 20;
              sim.vz -= (dz / Math.max(0.01, d)) * -3 * dt * 20;
              sim.shake = Math.max(sim.shake, 0.08);
            }
          } else if (Math.hypot(b.tx - b.x, b.tz - b.z) < 0.2 || Math.random() < 0.004) {
            b.tx = mix(bx0, bx1, Math.random());
            b.tz = mix(-0.4, 3.4, Math.random());
          }
          const dx = b.tx - b.x;
          const dz = b.tz - b.z;
          const d = Math.hypot(dx, dz);
          const sp = (sameRoom ? 1.5 : 0.6) * dt;
          if (d > 0.05) {
            b.x += (dx / d) * Math.min(sp, d);
            b.z += (dz / d) * Math.min(sp, d);
            b.heading = angleLerp(b.heading, Math.atan2(dx, dz), damp(8, dt));
          }
          b.x = Math.min(bx1, Math.max(bx0, b.x));
          b.z = Math.min(3.8, Math.max(-0.6, b.z));
          const walking = d > 0.05 ? 1 : 0;
          b.g.position.set(b.x, floorOf(b.room) + Math.abs(Math.sin(time * 14 + b.seed)) * 0.03 * walking, b.z);
          b.g.rotation.set(0, b.heading, Math.sin(time * 14 + b.seed) * 0.05 * walking);
          b.legs.forEach((lg, i) => (lg.rotation.x = Math.sin(time * 16 + i * 2 + b.seed) * 0.5 * walking));
          b.hitT = Math.max(0, b.hitT - dt * 4);
          b.mat.emissive.setHex(b.hitT > 0 ? 0xffffff : 0x7a0f2a);
          b.mat.emissiveIntensity = 0.6 + b.hitT * 2;
          (b.halo.material as SpriteMaterial).opacity = 0.3 + 0.1 * Math.sin(time * 4 + b.seed);
          b.g.visible = true;
        }

        // desk sequence
        lid.rotation.x = mix(0, -1.85, T.lid);
        drawCode(Math.round(T.code * CODE_LEN));
        drawTerm(Math.round(T.dep * TERMINAL.length), segE(T.dep, 0.55, 1));
        leds.forEach((l, i) => (l.emissiveIntensity = clamp01(T.dep * 1.4 - (i % 8) * 0.05) * (0.7 + 0.3 * Math.sin(time * 6 + i))));
        (rackHalo.material as SpriteMaterial).opacity = clamp01(T.dep * 1.3) * 0.45;
        const live = segE(T.dep, 0.55, 1);
        if (live > 0.6 && confArmed) {
          confetti.fire(DESK_X + 0.6, floorOf(SHIP) + 1.6, -1.6, 4.5, 1.6, floorOf(SHIP));
          confArmed = false;
        }
        if (live < 0.2) confArmed = true;
        confetti.step(dt);
        sparks.step(dt);

        // world
        bg.copy(dayBg).lerp(nightBg, T.night);
        fog.color.copy(bg);
        sun.intensity = mix(2.3, 0.25, T.night);
        hemi.intensity = mix(isDark() ? 0.95 : 1.35, 0.35, T.night);
        const lampOn = Math.max(segE(T.dep, 0.9, 1), T.night);
        lamp.intensity = lampOn * 3.5;
        (lampHalo.material as SpriteMaterial).opacity = lampOn * 0.55;
        windowMats.forEach((m) => (m.emissiveIntensity = T.night * 1.1));
        roomLights.forEach((r, i) => (r.light.intensity = r.base * (0.85 + 0.15 * Math.sin(time * 2 + i))));
        neonMats.forEach((m, i) => (m.emissiveIntensity = 2.2 + Math.sin(time * 3 + i * 2) * 0.5));
        sun.position.set(pose.x - 12, pose.fy + 22, 14);
        sun.target.position.set(pose.x, pose.fy, 0);

        for (const sg of signs) {
          const n = clamp01(1 - (Math.abs(pose.x - sg.x) - 2.5) / 6);
          const flick = n > 0.15 && n < 0.75 ? 0.82 + 0.18 * Math.sin(time * 40 + sg.seed * 7) : 1;
          sg.face.opacity = (0.25 + 0.75 * ease(n)) * flick;
          sg.grp.scale.setScalar(0.94 + 0.06 * ease(n));
          (sg.halo.material as SpriteMaterial).opacity = ease(n) * 0.22;
        }
        for (const s of swaying) s.o.rotation.y = Math.sin(time * 0.8 + s.seed) * 0.12 + (s.seed === 9 ? time * 0.6 : 0);
        for (let i = 0; i < DUST; i++) {
          dustPos[i * 3] = dustBase[i * 3] + Math.sin(time * 0.15 + i) * 0.4;
          dustPos[i * 3 + 1] = dustBase[i * 3 + 1] + Math.sin(time * 0.3 + i * 1.7) * 0.25;
        }
        dustGeo.attributes.position.needsUpdate = true;

        // ---- camera ----
        const fy = pose.fy;
        const ship = floorOf(SHIP);
        if (playing) {
          camPos.set(pose.x + 2.3 + sim.vx * 0.35, fy + 2.6 + T.y * 0.4, pose.z + 6.4);
          camLook.set(pose.x + 0.4 + sim.vx * 0.45, fy + 1.25 + T.y * 0.6, pose.z - 1.4);
          if (pose.sit > 0.5) {
            camPos.set(DESK_X + 1.6, ship + 2.4, 3.4);
            camLook.set(DESK_X - 0.1, ship + 1.2, -1.8);
          }
        } else if (T.sit < 0.01 && T.fly === 0) {
          const s = segAt(currentP);
          const t = local(currentP, s);
          const focus = s.kind === "dwell" ? Math.min(s.station === 0 ? 1 : segE(t, 0, 0.18), 1 - segE(t, 0.85, 1)) : 0;
          const signX = s.kind === "dwell" ? stationX(s.station) : pose.x + 1.6;
          camPos.set(mix(pose.x + 2.2, signX + 0.1, focus), fy + mix(2.5, 2.3, focus), mix(7.2, 6.0, focus));
          camLook.set(mix(pose.x + 1.4, signX - 0.3, focus), fy + mix(1.4, 1.9, focus), mix(-0.6, -2.6, focus));
        } else if (currentP < dep0.a) {
          const q = segE(currentP, sit0.a, code0.a + 0.01);
          camPos.set(mix(DESK_X + 2.4, DESK_X + 1.25, q), ship + mix(2.4, 2.35, q), mix(6.6, 2.2, q));
          camLook.set(mix(DESK_X + 0.6, DESK_X - 0.15, q), ship + mix(1.4, 1.2, q), mix(-0.4, -2, q));
        } else if (currentP < fly0.a) {
          const q = segE(currentP, dep0.a, dep0.b);
          camPos.set(mix(DESK_X + 1.25, DESK_X + 2.8, q), ship + mix(2.35, 2.7, q), mix(2.2, 4.8, q));
          camLook.set(mix(DESK_X - 0.15, DESK_X + 1.2, q), ship + 1.2, mix(-2, -1.6, q));
        } else {
          const q = T.fly;
          camPos.set(mix(DESK_X + 2.8, DESK_X + 14, q), ship + mix(2.7, 70, q), mix(4.8, 82, q));
          camLook.set(mix(DESK_X + 1.2, midX, q), ship + mix(1.2, 2, q), mix(-1.6, -2, q));
        }
        if (dragX === null && performance.now() - lastTouch > 2200) yawTarget *= 0.94;
        yaw += (yawTarget - yaw) * damp(9, dt);
        if (Math.abs(yaw) > 0.001) {
          const flying = T.fly > 0;
          const q = Math.min(1, Math.abs(yaw) * 2);
          pivot.set(flying ? camLook.x : pose.x, flying ? camLook.y : fy + 0.95 + T.y, flying ? camLook.z : pose.z);
          off.copy(camPos).sub(pivot);
          if (!flying) {
            const dist = mix(off.length(), 3.1, q);
            const lift = mix(camPos.y - pivot.y, 0.45, q);
            off.y = 0;
            off.setLength(Math.sqrt(Math.max(0.01, dist * dist - lift * lift)));
            off.y = lift;
          }
          off.applyAxisAngle(THREE.Object3D.DEFAULT_UP, yaw);
          camPos.copy(pivot).add(off);
          camLook.lerp(pivot, q);
        }
        if (!cam.init) {
          cam.pos.copy(camPos);
          cam.look.copy(camLook);
          cam.init = true;
        }
        const ck = damp(playing ? 4.5 : 6, dt);
        cam.pos.lerp(camPos, ck);
        cam.look.lerp(camLook, ck);
        sim.shake = Math.max(0, sim.shake - dt);
        const sh = sim.shake * 0.6;
        camera.position.copy(cam.pos);
        camera.position.y += Math.sin(time * 0.7) * 0.03 * (1 - T.fly) + (Math.random() - 0.5) * sh;
        camera.position.x += Math.sin(time * 0.43) * 0.025 * (1 - T.fly) + (Math.random() - 0.5) * sh;
        camera.lookAt(cam.look);
        const baseFov = canvas.clientWidth < 700 ? 62 : 40;
        cam.fov += (baseFov + pose.run * 7 - cam.fov) * damp(4, dt);
        if (Math.abs(camera.fov - cam.fov) > 0.05) {
          camera.fov = cam.fov;
          camera.updateProjectionMatrix();
        }
      };

      // ---------- sizing, theme, loop ----------
      const resize = () => {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / Math.max(1, h);
        camera.updateProjectionMatrix();
      };
      const applyTheme = () => dayBg.set(css("--bg") || "#f4f6f9");
      resize();
      applyTheme();
      const ro = new ResizeObserver(resize);
      ro.observe(canvas);
      const mo = new MutationObserver(applyTheme);
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      const mq = matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", applyTheme);
      const progress = () => {
        const r = section.getBoundingClientRect();
        return clamp01(-r.top / Math.max(1, r.height - innerHeight));
      };
      const disposeAll = () => {
        scene.traverse((o) => {
          const m = o as Mesh;
          if (m.isMesh) {
            m.geometry.dispose();
            (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x.dispose());
          }
        });
        renderer.dispose();
      };
      const unlisten = () => {
        canvas.removeEventListener("pointerdown", onDown);
        removeEventListener("pointermove", onMove);
        removeEventListener("pointerup", onUp);
        removeEventListener("pointercancel", onUp);
      };

      currentP = progress();
      if (reduced) {
        currentP = dep0.b - 0.001;
        const T = fromScroll(currentP);
        for (let i = 0; i < 60; i++) apply(T, 0.1, 0, false);
        renderer.render(scene, camera);
        cleanup = () => {
          ro.disconnect();
          mo.disconnect();
          mq.removeEventListener("change", applyTheme);
          unlisten();
          disposeAll();
        };
        return;
      }

      let raf = 0;
      let visible = true;
      let shown = -1;
      let last = performance.now();
      const frame = () => {
        raf = requestAnimationFrame(frame);
        const now = performance.now();
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        const playingNow = ctrl.current.playing;
        if (!visible && !playingNow) return;
        let T: Target;
        if (playingNow) {
          if (!sim.wasPlaying) {
            Object.assign(sim, { x: pose.x, z: Math.max(0.2, pose.z), vx: 0, vz: 0, vy: 0, y: 0, facing: pose.facing, sitting: false, deskT: 0, swingT: 0 });
            const s = fromScroll(currentP);
            sim.cup = s.cup === "desk" ? "hand" : s.cup;
            sim.wasPlaying = true;
          }
          T = fromPlay(dt);
        } else {
          if (sim.wasPlaying) {
            sim.wasPlaying = false;
            say(null);
          }
          currentP += (progress() - currentP) * damp(7, dt);
          T = fromScroll(currentP);
        }
        apply(T, dt, now / 1000, playingNow);
        renderer.render(scene, camera);
        roomRef.current = Math.min(T.station, SHIP);
        if (T.station !== shown) setActive((shown = T.station));
      };
      const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { rootMargin: "100px" });
      io.observe(section);
      frame();
      cleanup = () => {
        cancelAnimationFrame(raf);
        io.disconnect();
        ro.disconnect();
        mo.disconnect();
        mq.removeEventListener("change", applyTheme);
        unlisten();
        disposeAll();
      };
    };

    const near = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        near.disconnect();
        if (reduced) setMode("static");
        start();
      },
      { rootMargin: "600px" },
    );
    near.observe(section);
    return () => {
      disposed = true;
      near.disconnect();
      cleanup();
    };
  }, [repos]);

  // ---------- touch joystick ----------
  const joyRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const joyMove = (e: React.PointerEvent) => {
    const el = joyRef.current;
    if (!el || !(e.buttons & 1)) return;
    const r = el.getBoundingClientRect();
    let x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    let y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const l = Math.hypot(x, y);
    if (l > 1) {
      x /= l;
      y /= l;
    }
    ctrl.current.joy = { x, y };
    setKnob({ x, y });
  };
  const joyEnd = () => {
    ctrl.current.joy = { x: 0, y: 0 };
    setKnob({ x: 0, y: 0 });
  };

  const st = STATIONS[active];
  const cap = caption(st);
  const isContact = st.kind === "contact";
  const isIntro = st.kind === "intro";

  return (
    <section
      ref={sectionRef}
      id="journey"
      className={`walk walk-${mode}${playing ? " walk-playing" : ""}`}
      style={{ height: mode === "3d" ? `${SECTION_VH}vh` : undefined }}
      aria-label="Jaya Situmorang's portfolio as a walk-through"
    >
      {mode === "3d" && STATIONS.map((s, i) => <span key={s.id} className="walk-snap" style={{ top: `calc(${restAt(i)} * (100% - 100vh))` }} aria-hidden />)}

      <div className="walk-sticky">
        <canvas ref={canvasRef} className="walk-canvas" aria-hidden />
        <div className="walk-ui wrap">
          <div className="walk-top">
            <nav className="walk-rail" aria-label="Jump to a room">
              {STATIONS.map((s, i) => (
                <button key={s.id} type="button" className={i === active ? "on" : i < active ? "done" : ""} aria-current={i === active ? "step" : undefined} onClick={() => goTo(i)}>
                  {s.rail}
                </button>
              ))}
            </nav>
            {playing && (
              <span className={`walk-bugs${bugsLeft === 0 ? " done" : ""}`} aria-live="polite">
                🐞 Bugs fixed {BUG_COUNT - bugsLeft}/{BUG_COUNT}
              </span>
            )}
          </div>

          {prompt && <div className="walk-prompt" key={prompt}>{prompt}</div>}

          <div className="walk-bottom">
            {isContact ? (
              <div className="walk-contact" key="contact">
                <span className="walk-meta">Contact</span>
                <b>Let&apos;s build something that holds up in production.</b>
                <div className="walk-actions">
                  <a className="btn primary" href={`mailto:${profile.email}`}>
                    {profile.email}
                  </a>
                  <a className="btn" href={`https://github.com/${profile.github}`} target="_blank" rel="noopener noreferrer">
                    GitHub
                  </a>
                </div>
                <small>
                  Privacy: this site logs visits (page, time, approximate location, device, referrer and IP address) to see how people find
                  it. Never sold or shared. Email me to have yours removed.
                </small>
              </div>
            ) : (
              <div className="walk-caption" key={st.id}>
                <span className="walk-meta">{cap.meta}</span>
                <b>{playing && isIntro ? "Bugs are loose downstairs. Grab your sword and go →" : cap.title}</b>
                {isIntro && !playing && (
                  <div className="walk-actions">
                    <a className="btn primary" href={`mailto:${profile.email}`}>
                      Get in touch
                    </a>
                    <a className="btn" href={`https://github.com/${profile.github}`} target="_blank" rel="noopener noreferrer">
                      GitHub
                    </a>
                  </div>
                )}
              </div>
            )}
            {mode === "3d" && (
              <div className="walk-tools">
                {playing ? (
                  <>
                    {!touch && (
                      <span className="walk-keys" aria-hidden>
                        <kbd>W</kbd>
                        <kbd>A</kbd>
                        <kbd>S</kbd>
                        <kbd>D</kbd> move · <kbd>Shift</kbd> run · <kbd>Space</kbd> jump · <kbd>F</kbd> sword · <kbd>E</kbd> use
                      </span>
                    )}
                    <button type="button" className="btn" onClick={stopPlay}>
                      Exit {!touch && <kbd>Esc</kbd>}
                    </button>
                  </>
                ) : (
                  <>
                    {!dragged && <span className="walk-hint" aria-hidden>⟲ Drag to look around</span>}
                    <button type="button" className="btn play" onClick={startPlay}>
                      🎮 Play {!touch && <kbd>WASD</kbd>}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {playing && touch && (
          <>
            <div ref={joyRef} className="joy" onPointerDown={joyMove} onPointerMove={joyMove} onPointerUp={joyEnd} onPointerCancel={joyEnd} onPointerLeave={joyEnd} aria-hidden>
              <i style={{ transform: `translate(${knob.x * 34}px, ${knob.y * 34}px)` }} />
            </div>
            <div className="joy-btns">
              <button type="button" onPointerDown={() => (ctrl.current.attack = true)}>
                ⚔
              </button>
              <button type="button" onPointerDown={() => (ctrl.current.jump = true)}>
                Jump
              </button>
              <button type="button" onPointerDown={() => (ctrl.current.interact = true)}>
                Use
              </button>
            </div>
          </>
        )}
      </div>

      <div className="sr-only">
        <h1>
          {profile.name}, {profile.role} in {profile.location}
        </h1>
        <p>{profile.summary}</p>
        <h2>Experience</h2>
        {experience.map((r) => (
          <article key={r.company}>
            <h3>
              {r.company}: {r.title} ({period(r)}, {r.domain})
            </h3>
            <p>{r.summary}</p>
            <p>Stack: {r.stack.join(", ")}</p>
          </article>
        ))}
        <h2>AI work</h2>
        {aiWork.map((a) => (
          <article key={a.title}>
            <h3>{a.title}</h3>
            <p>{a.summary}</p>
            <ul>
              {a.did.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </article>
        ))}
        <h2>Projects on GitHub</h2>
        <ul>
          {(repos ?? []).map((r) => (
            <li key={r.name}>
              <a href={r.html_url}>{r.name}</a>
              {r.description ? `: ${r.description}` : ""}
            </li>
          ))}
        </ul>
        <h2>Skills</h2>
        <ul>
          {layers.map((l) => (
            <li key={l.id}>
              {l.label}: {l.items.join(", ")}
            </li>
          ))}
          {practices.map((p) => (
            <li key={p.title}>
              {p.title}: {p.body}
            </li>
          ))}
        </ul>
        <h2>Education and talks</h2>
        <p>
          {education.degree}, {education.school} ({education.start.slice(0, 4)}–{education.end.slice(0, 4)}, GPA {education.gpa}). Thesis: {education.thesis}
        </p>
        <p>{speaking.map((s) => `${s.role}, ${s.event} ${s.year}`).join("; ")}</p>
        <ul>
          {certifications.map((c) => (
            <li key={c.name}>
              {c.name}
              {c.year ? ` (${c.year})` : ""}
            </li>
          ))}
        </ul>
        <h2>Contact</h2>
        <p>
          Email <a href={`mailto:${profile.email}`}>{profile.email}</a> or find me on <a href={`https://github.com/${profile.github}`}>GitHub</a>.
        </p>
      </div>
    </section>
  );
}
