"use client";

import { useEffect, useRef, useState } from "react";
import type { CanvasTexture, Material, Mesh, MeshStandardMaterial, Object3D } from "three";
import profilePhoto from "@/assets/profile.jpg";
import { aiWork, certifications, education, experience, languages, layers, practices, profile, speaking, type Role } from "@/data/profile";

// The whole portfolio as one scroll-driven 3D world. A character in a hoodie walks through a row of
// rooms, one per chapter: lobby (name) → five jobs → AI lab → GitHub gallery → workshop (stack) →
// library (education) → studio (code, deploy, live) → camera flies out over the night city → contact.
// Drag on the scene to look around the character in 360°. All text also exists as hidden HTML for
// screen readers and search engines.

export type RepoLite = { name: string; description: string | null; language: string | null; pushed_at: string; html_url: string; stargazers_count: number };

// ---------------------------------------------------------------- stops
type Station =
  | { kind: "intro"; id: string; rail: string }
  | { kind: "job"; id: string; rail: string; role: Role; current: boolean }
  | { kind: "ai" | "projects" | "skills" | "edu" | "ship" | "contact"; id: string; rail: string };

const jobs = [...experience].reverse(); // oldest first
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

// ---------------------------------------------------------------- timeline (pure; shared by 3D and UI)
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const segE = (t: number, a: number, b: number) => ease(clamp01((t - a) / (b - a)));

const ROOM = 9.5; // room width along the corridor
const stationX = (i: number) => 6 + i * ROOM; // centre of each room / its main sign
const standX = (i: number) => stationX(i) - 1.7; // where the character stops
const START_X = standX(0);
const DESK_X = stationX(SHIP) + 1;
const WORLD_START = stationX(0) - ROOM / 2;
const WORLD_END = stationX(SHIP) + ROOM / 2;

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
  raw.push({ kind: "fly", w: 0.9, station: STATIONS.length - 1 });
  raw.push({ kind: "hold", w: 0.5, station: STATIONS.length - 1 });
  const total = raw.reduce((s, r) => s + r.w, 0);
  TOTAL_WEIGHT = total;
  let acc = 0;
  return raw.map((r) => {
    const a = acc / total;
    acc += r.w;
    return { ...r, a, b: acc / total };
  });
})();
// about half a screen of scrolling per unit of weight: each room is a couple of wheel flicks
const SECTION_VH = Math.round(TOTAL_WEIGHT * 52 + 100);
const segAt = (p: number) => TIMELINE.find((s) => p < s.b) ?? TIMELINE[TIMELINE.length - 1];
const first = (kind: Seg["kind"]) => TIMELINE.find((s) => s.kind === kind)!;
const stationAt = (p: number) => {
  const s = segAt(p);
  if (s.kind === "walk") return (p - s.a) / (s.b - s.a) > 0.55 ? s.station : Math.max(0, s.station - 1);
  return s.station;
};
/** Where each stop "rests" (used for snapping and the jump buttons). */
const restAt = (i: number) => {
  if (i === STATIONS.length - 1) return 1;
  if (i === SHIP) return first("deploy").b - 0.004;
  const d = TIMELINE.find((s) => s.station === i && s.kind === "dwell");
  return d ? (i === 0 ? 0 : (d.a + d.b) / 2) : 0;
};

// ---------------------------------------------------------------- desk screen content
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

/** One-line caption shown at the bottom while you're in a room. */
function caption(s: Station): { meta: string; title: string } {
  switch (s.kind) {
    case "intro": return { meta: `${profile.role} · ${profile.location}`, title: "Scroll to walk through my career" };
    case "job": return { meta: `${period(s.role)} · ${s.role.domain}${s.current ? " · current" : ""}`, title: s.role.company };
    case "ai": return { meta: "Self-hosted AI", title: "AI lab" };
    case "projects": return { meta: "Live from GitHub", title: "Projects" };
    case "skills": return { meta: "Toolbox", title: "Every layer of the stack" };
    case "edu": return { meta: "Education & talks", title: education.school };
    case "ship": return { meta: "Build → test → deploy", title: "Then I ship it" };
    default: return { meta: "Contact", title: "Let's build something" };
  }
}

// Room looks: floor, back wall, accent. Each stop gets its own space.
type Look = { floor: number; wall: number; accent: number; mood?: "dark" };
function lookFor(s: Station): Look {
  if (s.kind === "job") {
    switch (s.role.domain) {
      case "GovTech": return { floor: 0xb86b45, wall: 0xd9e8cf, accent: 0xce1126 }; // village hall: terracotta + sage
      case "Fintech": return { floor: 0x2b2f36, wall: 0x1c2740, accent: 0xe8b54a, mood: "dark" }; // vault: marble + gold
      case "EdTech": return { floor: 0xc49a6c, wall: 0xf3e8cc, accent: 0x2f6b4f }; // classroom: wood + chalk green
      case "Logistics": return { floor: 0x9da3a8, wall: 0x6f7f8f, accent: 0xf2b134 }; // warehouse: concrete + safety yellow
      default: return { floor: 0xdfe3e8, wall: 0xffffff, accent: 0x2b57de }; // current office
    }
  }
  switch (s.kind) {
    case "intro": return { floor: 0xd2b48c, wall: 0xf1ede6, accent: 0x2b57de };
    case "ai": return { floor: 0x121826, wall: 0x182033, accent: 0x7d5cff, mood: "dark" };
    case "projects": return { floor: 0x6b4a33, wall: 0xf6f5f1, accent: 0x111111 };
    case "skills": return { floor: 0xa38b6d, wall: 0xd9c4a0, accent: 0xe8a33d };
    case "edu": return { floor: 0x7a4b2e, wall: 0x5d3d2a, accent: 0xe8c47a, mood: "dark" };
    default: return { floor: 0xd9c3a5, wall: 0xeef1f6, accent: 0x2b57de };
  }
}

// ================================================================ component
export function CareerWalk({ repos }: { repos: RepoLite[] | null }) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(0);
  const [mode, setMode] = useState<"3d" | "static" | "none">("3d");
  const [dragged, setDragged] = useState(false);

  const goTo = (i: number) => {
    const s = sectionRef.current;
    if (!s) return;
    const top = s.getBoundingClientRect().top + scrollY;
    scrollTo({ top: top + restAt(i) * (s.offsetHeight - innerHeight), behavior: "smooth" });
  };

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let disposed = false;
    let cleanup = () => {};

    const start = async () => {
      const THREE = await import("three");
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
      const hemi = new THREE.HemisphereLight(0xeaf0ff, 0x4a4036, 1.3);
      const sun = new THREE.DirectionalLight(0xfff4e0, 2.2);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 12, bottom: -12, near: 1, far: 70 });
      sun.shadow.bias = -0.0004;
      scene.add(hemi, sun, sun.target);
      const lamp = new THREE.PointLight(0xffc27a, 0, 9, 1.6);
      lamp.position.set(DESK_X - 1.6, 1.9, -1.2);
      scene.add(lamp);

      // ---------- builders ----------
      const mat = (color: string | number, rough = 0.8, metal = 0.02) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
      const glow = (color: number, intensity = 1.6) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.4 });
      const M = {
        wood: mat(0x8a5a3b, 0.6), woodLight: mat(0xc49a6c, 0.6), dark: mat(0x232a36, 0.5, 0.2), metal: mat(0x9aa3ae, 0.35, 0.7),
        plant: mat(0x3f8f5a, 0.8), pot: mat(0xe2d6c6, 0.9), cup: mat(0xffffff, 0.5), sleeve: mat(0xb9864f, 0.9),
        skin: mat(0xd9a77f, 0.7), hair: mat(0x15171c, 0.8), road: mat(0x3b414b, 0.95), red: mat(0xce1126, 0.7),
        white: mat(0xffffff, 0.8), gold: mat(0xe8b54a, 0.35, 0.6), blue: mat(0x2b57de, 0.5), amber: mat(0xe8a33d, 0.6),
        green: mat(0x2f8f6a, 0.7), roof: mat(0xa0442c, 0.8), chalk: mat(0x2c4a3c, 0.9), cardboard: mat(0xc09461, 0.9),
        yellow: mat(0xf2b134, 0.6), peg: mat(0xc9ad84, 0.9),
        // outfit: hoodie, jeans, sneakers
        hoodie: mat(0x3d4f7a, 0.85), hoodieDark: mat(0x2f3e62, 0.9), string: mat(0xf4f6f9, 0.7),
        jeans: mat(0x35507a, 0.85), sneaker: mat(0xf5f5f2, 0.6), sole: mat(0xd6d6d0, 0.7), stripe: mat(0xe8a33d, 0.6),
        glass: new THREE.MeshStandardMaterial({ color: 0xbfd6ff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.22 }),
      };
      const box = (w: number, h: number, d: number, m: Material, x = 0, y = 0, z = 0) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
      };
      const cyl = (rt: number, rb: number, h: number, m: Material, x = 0, y = 0, z = 0, segments = 20) => {
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segments), m);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
      };
      const canvasTex = (w: number, h: number) => {
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        return { c, g: c.getContext("2d")!, tex };
      };
      const screenMat = (tex: CanvasTexture) => new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
      const plant = (x: number, z: number, s = 1) => {
        scene.add(cyl(0.32 * s, 0.25 * s, 0.6 * s, M.pot, x, 0.3 * s, z));
        const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62 * s, 0), M.plant);
        leaves.position.set(x, 1.05 * s, z);
        leaves.castShadow = true;
        scene.add(leaves);
      };

      // ---------- signs (dark panels so they read in any room and theme) ----------
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
      const sign = (w: number, h: number, accent: string, paint: (g: CanvasRenderingContext2D, W: number, H: number) => void) => {
        const W = 1024;
        const H = Math.round((W * h) / w);
        const t = canvasTex(W, H);
        t.g.fillStyle = "#0f1626";
        t.g.fillRect(0, 0, W, H);
        t.g.fillStyle = accent;
        t.g.fillRect(0, 0, W, 10);
        paint(t.g, W, H);
        t.tex.needsUpdate = true;
        const grp = new THREE.Group();
        grp.add(box(w + 0.12, h + 0.12, 0.08, M.dark, 0, 0, -0.05));
        grp.add(new THREE.Mesh(new THREE.PlaneGeometry(w, h), screenMat(t.tex)));
        return grp;
      };
      const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;
      const SIGN_Y = 2.3;
      const SIGN_Z = -3.0;

      // ---------- rooms: floor, back wall, partitions with doorways ----------
      const lookMats = new Map<string, { floor: MeshStandardMaterial; wall: MeshStandardMaterial }>();
      STATIONS.forEach((s, i) => {
        if (i > SHIP) return;
        const L = lookFor(s);
        const floor = mat(L.floor, 0.85);
        const wall = mat(L.wall, 0.95);
        lookMats.set(s.id, { floor, wall });
        const cx = stationX(i);
        scene.add(box(ROOM, 0.2, 9, floor, cx, -0.1, 0.5));
        if (s.kind === "ship") {
          // studio: windows onto the city
          scene.add(box(ROOM, 0.9, 0.3, wall, cx, 0.45, -3.2), box(ROOM, 0.7, 0.3, wall, cx, 3.85, -3.2));
          for (let k = -2; k <= 2; k++) scene.add(box(0.35, 4.2, 0.35, wall, cx + k * 2.35, 2.1, -3.2));
          const g = new THREE.Mesh(new THREE.PlaneGeometry(ROOM, 2.6), M.glass);
          g.position.set(cx, 2.2, -3.15);
          scene.add(g);
        } else {
          scene.add(box(ROOM, 4.2, 0.3, wall, cx, 2.1, -3.2));
        }
        // skirting in the room's accent colour
        scene.add(box(ROOM, 0.12, 0.05, mat(L.accent, 0.6), cx, 0.06, -3.03));
        // partition with a doorway on the room's right edge (the walk goes through the gap)
        const px = cx + ROOM / 2;
        if (i < SHIP) {
          scene.add(box(0.25, 4.2, 2.9, wall, px, 2.1, -1.75));
          scene.add(box(0.25, 1.2, 2.2, wall, px, 3.6, 0.8));
          scene.add(box(0.25, 4.2, 0.6, wall, px, 2.1, 2.2));
        }
      });
      // entrance wall at the very start
      scene.add(box(0.3, 4.2, 6.4, lookMats.get("intro")!.wall, WORLD_START, 2.1, -0.1));

      // ---------- room contents ----------
      let counterCup: Object3D | null = null;
      const makeCup = () => {
        const g = new THREE.Group();
        g.add(cyl(0.07, 0.055, 0.2, M.cup), cyl(0.072, 0.072, 0.07, M.sleeve, 0, -0.01, 0), cyl(0.075, 0.075, 0.02, M.cup, 0, 0.11, 0));
        return g;
      };
      const roomLights: { light: InstanceType<typeof THREE.PointLight>; base: number }[] = [];

      STATIONS.forEach((s, i) => {
        const x = stationX(i);
        const L = lookFor(s);
        const ac = hex(L.accent === 0x111111 ? 0x2b57de : L.accent);
        if (L.mood === "dark") {
          const pl = new THREE.PointLight(L.accent, 6, 9, 1.4);
          pl.position.set(x, 3.4, -1);
          scene.add(pl);
          roomLights.push({ light: pl, base: 6 });
        }

        if (s.kind === "intro") {
          const sg = sign(3.8, 2.3, ac, (g, W) => {
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
          });
          sg.position.set(x, SIGN_Y, SIGN_Z);
          scene.add(sg);
          const photo = new THREE.TextureLoader().load(profilePhoto.src);
          photo.colorSpace = THREE.SRGBColorSpace;
          const fx = x + 2.85;
          scene.add(box(1.5, 1.5, 0.08, M.woodLight, fx, SIGN_Y + 0.2, SIGN_Z - 0.02));
          const face = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), new THREE.MeshBasicMaterial({ map: photo, toneMapped: false }));
          face.position.set(fx, SIGN_Y + 0.2, SIGN_Z + 0.03);
          scene.add(face);
          scene.add(box(1.8, 0.02, 1.1, M.blue, x - 3.2, 0.01, 0.8)); // welcome mat
          plant(x - 3.6, -2.4);
          return;
        }

        if (s.kind === "job") {
          const r = s.role;
          const sg = sign(4.0, 2.6, ac, (g, W) => {
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
          });
          sg.position.set(x, SIGN_Y, SIGN_Z);
          scene.add(sg);
          const px = x + 2.6;
          switch (r.domain) {
            case "GovTech": {
              scene.add(box(1.2, 0.8, 1, M.white, px, 0.4, -1.8));
              const roof = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.6, 4), M.roof);
              roof.position.set(px, 1.1, -1.8);
              roof.rotation.y = Math.PI / 4;
              roof.castShadow = true;
              scene.add(roof, cyl(0.025, 0.025, 2.2, M.metal, px + 0.9, 1.1, -1.4, 8));
              scene.add(box(0.6, 0.18, 0.02, M.red, px + 1.2, 2.06, -1.4), box(0.6, 0.18, 0.02, M.white, px + 1.2, 1.88, -1.4));
              scene.add(box(1.6, 0.08, 0.4, M.wood, x - 3, 0.45, -2.4), box(1.6, 0.4, 0.08, M.wood, x - 3, 0.7, -2.6)); // bench
              break;
            }
            case "Fintech": {
              for (let k = 0; k < 3; k++) for (let j = 0; j < 4 + k * 2; j++) scene.add(cyl(0.22, 0.22, 0.07, M.gold, px - 0.5 + k * 0.5, 0.04 + j * 0.075, -1.7, 24));
              const vault = cyl(1.0, 1.0, 0.2, M.metal, x - 3, 1.6, -3.0, 32);
              const knob = cyl(0.25, 0.25, 0.25, M.gold, x - 3, 1.6, -2.85, 16);
              vault.rotation.x = knob.rotation.x = Math.PI / 2;
              scene.add(vault, knob);
              break;
            }
            case "EdTech": {
              scene.add(box(2.2, 1.3, 0.06, M.chalk, x - 3.3, 2.1, -3.0), box(2.3, 0.08, 0.15, M.wood, x - 3.3, 1.42, -2.95));
              [M.blue, M.amber, M.green, M.red].forEach((m, k) => scene.add(box(0.8 - k * 0.05, 0.14, 0.55, m, px, 0.07 + k * 0.14, -1.7)));
              scene.add(box(0.7, 0.03, 0.7, M.dark, px, 0.66, -1.7), cyl(0.18, 0.2, 0.12, M.dark, px, 0.6, -1.7));
              break;
            }
            case "Logistics": {
              for (const rx of [x - 3.4, x + 3.2]) {
                for (const ry of [0.05, 1.05, 2.05]) scene.add(box(1.6, 0.06, 1.0, M.metal, rx, ry, -2.5));
                for (const dx of [-0.78, 0.78]) scene.add(box(0.06, 2.6, 1.0, M.yellow, rx + dx, 1.3, -2.5));
                for (const ry of [0.08, 1.08]) for (const bx of [-0.4, 0.35]) scene.add(box(0.6, 0.5, 0.7, M.cardboard, rx + bx, ry + 0.28, -2.5));
              }
              scene.add(box(ROOM, 0.02, 0.15, M.yellow, x, 0.01, 1.7));
              const t = new THREE.Group();
              t.add(box(0.5, 0.45, 0.42, M.dark, 0.85, 0.38, 0), box(1.9, 0.08, 0.4, M.metal, 0, 0.17, 0), box(1.25, 0.5, 0.48, M.blue, -0.25, 0.46, 0));
              t.position.set(px - 0.6, 0, -1.4);
              t.rotation.y = -0.3;
              scene.add(t);
              break;
            }
            default: {
              // the current office, with the coffee bar
              scene.add(box(3.0, 1.05, 1.0, M.wood, x + 2.6, 0.525, -1.6), box(3.2, 0.08, 1.15, M.woodLight, x + 2.6, 1.09, -1.6));
              scene.add(box(0.8, 0.85, 0.55, M.metal, x + 3.6, 1.55, -1.8), box(0.6, 0.2, 0.3, M.dark, x + 3.6, 1.62, -1.45));
              for (let k = 0; k < 3; k++) scene.add(cyl(0.05, 0.04, 0.12, M.cup, x + 1.6 + k * 0.16, 1.19, -1.85));
              const cc = makeCup();
              cc.position.set(standX(i) + 0.3 + 0.95, 1.23, -1.2);
              scene.add(cc);
              counterCup = cc;
              plant(x - 3.6, -2.4);
            }
          }
          return;
        }

        if (s.kind === "ai") {
          const title = sign(3.8, 0.7, ac, (g, W, H) => {
            g.fillStyle = "#ffffff";
            g.font = `700 76px ${FONT_DISPLAY}`;
            g.fillText("AI lab", 56, H / 2 + 26);
            g.fillStyle = "#b9a6ff";
            g.font = `500 28px ${FONT_MONO}`;
            g.fillText("self-hosted · open-source models", W - 560, H / 2 + 12);
          });
          title.position.set(x, 3.4, SIGN_Z);
          scene.add(title);
          aiWork.forEach((a, k) => {
            const mon = sign(1.6, 1.25, ac, (g, W) => {
              g.fillStyle = "#ffffff";
              g.font = `700 58px ${FONT_DISPLAY}`;
              const l = wrap(g, a.title, 44, 110, W - 88, 62, 2);
              g.fillStyle = "#82e0aa";
              g.font = `500 28px ${FONT_MONO}`;
              const p = wrap(g, a.pipeline, 44, 110 + l * 62 + 20, W - 88, 36, 3);
              g.fillStyle = "#aab6c8";
              g.font = `400 26px ${FONT_BODY}`;
              wrap(g, a.summary, 44, 110 + l * 62 + 40 + p * 36, W - 88, 34, 4);
            });
            const mx = x - 1.75 + k * 1.75;
            mon.position.set(mx, 1.85, -2.2);
            mon.rotation.y = (1 - k) * 0.14;
            scene.add(mon, cyl(0.04, 0.04, 1.2, M.metal, mx, 0.62, -2.25, 8), cyl(0.3, 0.3, 0.04, M.dark, mx, 0.02, -2.25));
          });
          // neon strips
          const neon = glow(0x7d5cff, 2.2);
          scene.add(box(ROOM, 0.05, 0.05, neon, x, 4.1, -3.0), box(ROOM, 0.05, 0.05, glow(0x2bd4ff, 2.2), x, 0.15, -3.0));
          return;
        }

        if (s.kind === "projects") {
          const list = (repos ?? []).slice(0, 6);
          const head = sign(1.6, 1.0, "#2b57de", (g, W) => {
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
          });
          head.position.set(x - 3.55, 2.3, SIGN_Z);
          scene.add(head);
          (list.length ? list : [null]).forEach((r, k) => {
            const card = sign(1.75, 1.05, "#2b57de", (g, W) => {
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
            });
            const col = k % 3;
            const row = Math.floor(k / 3);
            card.position.set(x - 1.2 + col * 2.0, 3.05 - row * 1.3, SIGN_Z);
            scene.add(card);
          });
          return;
        }

        if (s.kind === "skills") {
          const sg = sign(4.2, 2.5, ac, (g, W) => {
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
          });
          sg.position.set(x - 0.6, SIGN_Y, SIGN_Z);
          scene.add(sg);
          const side = sign(1.7, 2.5, ac, (g, W) => {
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
          });
          side.position.set(x + 2.9, SIGN_Y, SIGN_Z);
          scene.add(side);
          // pegboard tools
          for (let k = 0; k < 6; k++) scene.add(box(0.08, 0.5 + (k % 3) * 0.15, 0.05, [M.amber, M.metal, M.red][k % 3], x - 3.9 + k * 0.18, 3.6, -3.0));
          scene.add(box(2.4, 0.9, 1.0, M.wood, x - 3.1, 0.45, -2.4));
          return;
        }

        if (s.kind === "edu") {
          const sg = sign(3.8, 2.4, ac, (g, W) => {
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
          });
          sg.position.set(x - 0.5, SIGN_Y, SIGN_Z);
          scene.add(sg);
          const certs = sign(1.9, 2.6, ac, (g, W) => {
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
          });
          certs.position.set(x + 2.95, SIGN_Y, SIGN_Z);
          scene.add(certs);
          // bookshelves
          const bookColors = [M.red, M.blue, M.amber, M.green, M.white];
          for (const sx of [x - 3.9]) {
            scene.add(box(1.4, 3.2, 0.5, M.wood, sx, 1.6, -2.75));
            for (let r = 0; r < 4; r++) for (let b = 0; b < 7; b++) scene.add(box(0.12, 0.5 + (b % 3) * 0.06, 0.32, bookColors[(r + b) % 5], sx - 0.55 + b * 0.17, 0.4 + r * 0.78, -2.6));
          }
          scene.add(cyl(0.02, 0.02, 1.4, M.metal, x + 1.5, 0.7, -1.4, 8), cyl(0.22, 0.22, 0.03, M.dark, x + 1.5, 0.02, -1.4));
          const mic = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), M.dark);
          mic.position.set(x + 1.5, 1.45, -1.4);
          scene.add(mic);
        }
      });

      // ---------- studio desk ----------
      scene.add(box(3.4, 0.07, 1.4, M.woodLight, DESK_X, 0.76, -1.6));
      for (const dx of [-1.6, 1.6]) scene.add(box(0.06, 0.74, 1.3, M.dark, DESK_X + dx, 0.37, -1.6));
      const chair = new THREE.Group();
      chair.add(box(0.6, 0.08, 0.6, M.dark, 0, 0.5, 0), box(0.6, 0.7, 0.07, M.dark, 0, 0.88, 0.3), cyl(0.04, 0.04, 0.45, M.metal, 0, 0.25, 0));
      chair.position.set(DESK_X, 0, 0.1);
      scene.add(chair);
      const codeScr = canvasTex(640, 400);
      const termScr = canvasTex(640, 400);
      const monitor = (x: number, tex: CanvasTexture, rotY: number) => {
        const g = new THREE.Group();
        g.add(box(1.25, 0.78, 0.05, M.dark));
        const s = new THREE.Mesh(new THREE.PlaneGeometry(1.17, 0.7), screenMat(tex));
        s.position.z = 0.03;
        g.add(s, box(0.06, 0.3, 0.06, M.metal, 0, -0.5, -0.05), box(0.36, 0.03, 0.22, M.metal, 0, -0.64, -0.05));
        g.position.set(x, 1.43, -2.05);
        g.rotation.y = rotY;
        scene.add(g);
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
      laptop.position.set(DESK_X, 0.81, -1.15);
      scene.add(laptop);
      const phoneScr = canvasTex(160, 300);
      const phone = new THREE.Group();
      phone.add(box(0.2, 0.02, 0.38, M.dark));
      const phoneScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.34), screenMat(phoneScr.tex));
      phoneScreen.rotation.x = -Math.PI / 2;
      phoneScreen.position.y = 0.012;
      phone.add(phoneScreen);
      phone.position.set(DESK_X + 1.25, 0.8, -1.05);
      phone.rotation.y = -0.4;
      scene.add(phone);
      scene.add(cyl(0.12, 0.15, 0.04, M.dark, DESK_X - 1.5, 0.81, -2.0), cyl(0.02, 0.02, 0.8, M.dark, DESK_X - 1.5, 1.2, -2.0, 8), cyl(0.05, 0.18, 0.2, M.dark, DESK_X - 1.5, 1.62, -1.85));
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
      rack.position.set(DESK_X + 3.2, 0, -2.4);
      scene.add(rack);
      const deskCup = makeCup();
      deskCup.position.set(DESK_X - 1.0, 0.9, -1.1);
      scene.add(deskCup);

      // ---------- the character: hoodie, jeans, sneakers (faces +z by default) ----------
      const person = new THREE.Group();
      const hips = new THREE.Group();
      hips.position.y = 0.95;
      person.add(hips);
      hips.add(box(0.36, 0.16, 0.22, M.jeans));
      const torso = new THREE.Group();
      hips.add(torso);
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.32, 4, 12), M.hoodie);
      body.scale.set(1.12, 1, 0.7);
      body.position.y = 0.32;
      body.castShadow = true;
      torso.add(body);
      torso.add(box(0.26, 0.14, 0.03, M.hoodieDark, 0, 0.16, 0.14)); // kangaroo pocket
      torso.add(box(0.012, 0.16, 0.012, M.string, -0.04, 0.55, 0.15), box(0.012, 0.16, 0.012, M.string, 0.04, 0.55, 0.15)); // drawstrings
      const hood = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.055, 8, 16, Math.PI * 1.2), M.hoodieDark);
      hood.position.set(0, 0.66, -0.06);
      hood.rotation.set(0.2, 0, Math.PI * 0.9);
      torso.add(hood);
      const head = new THREE.Group();
      head.position.y = 0.72;
      torso.add(head);
      head.add(cyl(0.06, 0.07, 0.1, M.skin, 0, -0.06, 0));
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 16), M.skin);
      skull.position.y = 0.1;
      skull.scale.set(0.95, 1.08, 1);
      skull.castShadow = true;
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.137, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2.1), M.hair);
      hair.position.y = 0.13;
      hair.rotation.x = -0.25;
      head.add(skull, hair);
      for (const ex of [-0.045, 0.045]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), M.hair);
        eye.position.set(ex, 0.11, 0.12);
        head.add(eye);
      }
      const limb = (len: number, r: number, m: Material) => {
        const g = new THREE.Group();
        const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, len - r * 2, 4, 10), m);
        mesh.position.y = -len / 2;
        mesh.castShadow = true;
        g.add(mesh);
        return g;
      };
      const arm = (side: number) => {
        const shoulder = limb(0.32, 0.062, M.hoodie);
        shoulder.position.set(side * 0.27, 0.55, 0);
        torso.add(shoulder);
        const elbow = limb(0.3, 0.056, M.hoodie);
        elbow.position.y = -0.32;
        shoulder.add(elbow);
        const cuff = cyl(0.058, 0.058, 0.05, M.hoodieDark, 0, -0.27, 0, 12);
        elbow.add(cuff);
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), M.skin);
        hand.position.y = -0.32;
        elbow.add(hand);
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
        // sneaker: white upper, grey sole, amber stripe
        knee.add(box(0.14, 0.09, 0.3, M.sneaker, 0, -0.42, 0.05), box(0.15, 0.035, 0.32, M.sole, 0, -0.47, 0.05), box(0.145, 0.025, 0.12, M.stripe, 0, -0.41, 0.02));
        return { hip, knee };
      };
      const armL = arm(-1);
      const armR = arm(1);
      const legL = leg(-1);
      const legR = leg(1);
      const handCup = makeCup();
      handCup.rotation.x = Math.PI / 2;
      handCup.position.set(0, -0.02, 0.06);
      armR.grip.add(handCup);
      scene.add(person);

      // ---------- city around the building ----------
      const midX = (WORLD_START + WORLD_END) / 2;
      scene.add(box(700, 0.1, 400, M.road, midX, -0.25, 0));
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
          scene.add(box(w, h, d, wm, x, h / 2 - 0.2, z));
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

      // ---------- 360° look-around: drag to orbit the camera around the character ----------
      let yaw = 0;
      let yawTarget = 0;
      let dragX: number | null = null;
      let lastTouch = 0;
      const onDown = (e: PointerEvent) => {
        dragX = e.clientX;
        lastTouch = performance.now();
      };
      const onMove = (e: PointerEvent) => {
        if (dragX === null) return;
        yawTarget += (e.clientX - dragX) * 0.012;
        dragX = e.clientX;
        lastTouch = performance.now();
        setDragged(true);
      };
      const onUp = () => {
        dragX = null;
        lastTouch = performance.now();
      };
      canvas.addEventListener("pointerdown", onDown);
      addEventListener("pointermove", onMove);
      addEventListener("pointerup", onUp);
      addEventListener("pointercancel", onUp);

      // ---------- per-frame update ----------
      const camPos = new THREE.Vector3();
      const camLook = new THREE.Vector3();
      const pivot = new THREE.Vector3();
      const off = new THREE.Vector3();
      const setRot = (o: Object3D, x: number, y = 0, z = 0) => o.rotation.set(x, y, z);
      const sit0 = first("sit");
      const lid0 = first("lid");
      const code0 = first("code");
      const dep0 = first("deploy");
      const fly0 = first("fly");
      const coffeeDwell = TIMELINE.find((s) => s.kind === "dwell" && s.station === CURRENT_STATION)!;
      const local = (p: number, s: Seg) => clamp01((p - s.a) / (s.b - s.a));

      const update = (p: number, time: number) => {
        const s = segAt(p);
        const t = local(p, s);
        let x = START_X;
        let walking = false;
        for (const sg of TIMELINE) {
          if (sg.kind !== "walk") continue;
          if (p >= sg.b) x = sg.to!;
          else if (p >= sg.a) {
            x = mix(sg.from!, sg.to!, local(p, sg));
            walking = true;
          }
        }
        const sit = segE(p, sit0.a, sit0.b);
        const cT = local(p, coffeeDwell);
        const grab = p >= coffeeDwell.a ? segE(cT, 0.15, 0.4) : 0;
        const sip = p >= coffeeDwell.a ? segE(cT, 0.45, 0.65) * (1 - segE(cT, 0.75, 0.9)) : 0;
        const hasCup = p >= coffeeDwell.a + (coffeeDwell.b - coffeeDwell.a) * 0.33 && p < sit0.a + (sit0.b - sit0.a) * 0.7;
        if (counterCup) counterCup.visible = !hasCup && p < coffeeDwell.b;
        handCup.visible = hasCup;
        deskCup.visible = p >= sit0.a + (sit0.b - sit0.a) * 0.7;

        const focus = s.kind === "dwell" ? Math.min(s.station === 0 ? 1 : segE(t, 0, 0.18), 1 - segE(t, 0.85, 1)) : 0;
        let facing = Math.PI / 2 + focus * (Math.PI / 2) * 0.8;
        if (p >= sit0.a - 0.002) facing = mix(Math.PI / 2, Math.PI, segE(p, sit0.a - 0.006, sit0.a + 0.004));
        person.rotation.y = facing;
        person.position.set(x, 0, mix(0.7, 0.35, sit));
        head.rotation.y = s.kind === "dwell" ? focus * 0.25 : 0;

        const phase = (x - START_X) * 2.4;
        const swing = walking ? Math.sin(phase) * 0.55 : 0;
        hips.position.y = mix(0.95 + (walking ? Math.abs(Math.cos(phase)) * 0.04 : 0), 0.58, sit);
        torso.rotation.x = mix(walking ? 0.05 : 0, 0.12, sit);
        setRot(legL.hip, mix(-swing, -1.45, sit));
        setRot(legR.hip, mix(swing, -1.45, sit));
        setRot(legL.knee, mix(walking ? Math.max(0, Math.sin(phase + Math.PI)) * 0.7 : 0, 1.5, sit));
        setRot(legR.knee, mix(walking ? Math.max(0, Math.sin(phase)) * 0.7 : 0, 1.5, sit));

        const typing = segE(p, lid0.b, code0.a + 0.01) * (1 - segE(p, dep0.b, fly0.a + 0.02));
        const tap = Math.sin(time * 18) * 0.06 * typing;
        let lS = swing * 0.8;
        let lE = -0.15;
        let rS = -swing * 0.8;
        let rE = -0.15;
        if (hasCup) {
          rS = mix(-0.35, -1.25, sip) - (walking ? swing * 0.15 : 0);
          rE = mix(-1.25, -1.6, sip);
        } else if (p >= coffeeDwell.a && p < coffeeDwell.b) {
          rS = mix(0, -1.1, grab);
          rE = mix(-0.15, -0.3, grab);
        }
        lS = mix(lS, -0.95, typing);
        lE = mix(lE, -0.75, typing) + tap;
        if (!hasCup) {
          rS = mix(rS, -0.95, typing);
          rE = mix(rE, -0.75, typing) - tap;
        }
        // idle breathing when standing still
        const breathe = walking ? 0 : Math.sin(time * 1.6) * 0.012;
        torso.position.y = breathe;
        setRot(armL.shoulder, lS, 0, -0.05);
        setRot(armL.elbow, lE);
        setRot(armR.shoulder, rS, 0, 0.05);
        setRot(armR.elbow, rE);
        head.rotation.x = hasCup ? -sip * 0.25 : mix(0, 0.12, typing);

        lid.rotation.x = mix(0, -1.85, segE(p, lid0.a, lid0.b));
        drawCode(Math.round(local(p, code0) * CODE_LEN));
        const dep = local(p, dep0);
        drawTerm(Math.round(dep * TERMINAL.length), segE(dep, 0.55, 1));
        leds.forEach((l, i) => (l.emissiveIntensity = clamp01(dep * 1.4 - (i % 8) * 0.05) * (0.7 + 0.3 * Math.sin(time * 6 + i))));

        const night = segE(p, fly0.a, fly0.a + (fly0.b - fly0.a) * 0.7);
        bg.copy(dayBg).lerp(nightBg, night);
        fog.color.copy(bg);
        sun.intensity = mix(2.2, 0.25, night);
        hemi.intensity = mix(isDark() ? 0.9 : 1.3, 0.35, night);
        lamp.intensity = mix(0, 3.5, segE(p, dep0.b - 0.01, fly0.a + 0.02));
        windowMats.forEach((m) => (m.emissiveIntensity = night * 1.1));
        roomLights.forEach((r, i) => (r.light.intensity = r.base * (0.85 + 0.15 * Math.sin(time * 2 + i))));
        sun.position.set(x - 12, 22, 14);
        sun.target.position.set(x, 0, 0);

        // camera path
        if (p < sit0.a) {
          const signX = s.kind === "dwell" ? stationX(s.station) : x + 1.6;
          camPos.set(mix(x + 2.2, signX + 0.1, focus), mix(2.5, 2.3, focus), mix(7.2, 6.0, focus));
          camLook.set(mix(x + 1.4, signX - 0.3, focus), mix(1.5, 1.9, focus), mix(-0.6, -2.6, focus));
        } else if (p < dep0.a) {
          const k = segE(p, sit0.a, code0.a + 0.01);
          camPos.set(mix(DESK_X + 2.4, DESK_X + 1.25, k), mix(2.4, 2.35, k), mix(6.6, 2.2, k));
          camLook.set(mix(DESK_X + 0.6, DESK_X - 0.15, k), mix(1.4, 1.2, k), mix(-0.4, -2, k));
        } else if (p < fly0.a) {
          const k = segE(p, dep0.a, dep0.b);
          camPos.set(mix(DESK_X + 1.25, DESK_X + 2.8, k), mix(2.35, 2.7, k), mix(2.2, 4.8, k));
          camLook.set(mix(DESK_X - 0.15, DESK_X + 1.2, k), 1.2, mix(-2, -1.6, k));
        } else {
          const k = segE(p, fly0.a, fly0.b);
          camPos.set(mix(DESK_X + 2.8, DESK_X + 10, k), mix(2.7, 75, k), mix(4.8, 80, k));
          camLook.set(mix(DESK_X + 1.2, midX, k), mix(1.2, 0, k), mix(-1.6, -2, k));
        }

        // 360° orbit around the character (eases back a couple of seconds after you let go)
        if (dragX === null && performance.now() - lastTouch > 2200) yawTarget *= 0.94;
        yaw += (yawTarget - yaw) * 0.15;
        if (Math.abs(yaw) > 0.001) {
          const flying = p >= fly0.a;
          const k = Math.min(1, Math.abs(yaw) * 2); // how far into "look around" we are
          pivot.set(flying ? camLook.x : x, flying ? camLook.y : 0.95, flying ? camLook.z : person.position.z);
          off.copy(camPos).sub(pivot);
          if (!flying) {
            // orbit close to the character so the camera stays inside the room on every side
            // whole body in frame: ~2.3 m visible at 3.1 m with a 40° lens
            const dist = mix(off.length(), 3.1, k);
            const lift = mix(camPos.y - pivot.y, 0.45, k);
            off.y = 0;
            off.setLength(Math.sqrt(Math.max(0.01, dist * dist - lift * lift)));
            off.y = lift;
          }
          off.applyAxisAngle(THREE.Object3D.DEFAULT_UP, yaw);
          camPos.copy(pivot).add(off);
          camLook.lerp(pivot, k);
        }
        camera.position.copy(camPos);
        camera.lookAt(camLook);
      };

      // ---------- sizing, theme, loop ----------
      const resize = () => {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / Math.max(1, h);
        camera.fov = w < 700 ? 62 : 40;
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

      if (reduced) {
        update(dep0.b - 0.001, 0);
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

      let current = progress();
      let raf = 0;
      let visible = true;
      let shown = -1;
      const frame = () => {
        raf = requestAnimationFrame(frame);
        if (!visible) return;
        current += (progress() - current) * 0.12;
        update(current, performance.now() / 1000);
        renderer.render(scene, camera);
        const st = stationAt(current);
        if (st !== shown) setActive((shown = st));
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

  const st = STATIONS[active];
  const cap = caption(st);
  const isContact = st.kind === "contact";
  const isIntro = st.kind === "intro";

  return (
    <section ref={sectionRef} id="journey" className={`walk walk-${mode}`} style={{ height: mode === "3d" ? `${SECTION_VH}vh` : undefined }} aria-label="Jaya Situmorang's portfolio as a walk-through">
      {/* snap points: the page settles on each room as you scroll */}
      {mode === "3d" &&
        STATIONS.map((s, i) => <span key={s.id} className="walk-snap" style={{ top: `calc(${restAt(i)} * (100% - 100vh))` }} aria-hidden />)}

      <div className="walk-sticky">
        <canvas ref={canvasRef} className="walk-canvas" aria-hidden />
        <div className="walk-ui wrap">
          <nav className="walk-rail" aria-label="Jump to a room">
            {STATIONS.map((s, i) => (
              <button key={s.id} type="button" className={i === active ? "on" : i < active ? "done" : ""} aria-current={i === active ? "step" : undefined} onClick={() => goTo(i)}>
                {s.rail}
              </button>
            ))}
          </nav>

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
                <b>{cap.title}</b>
                {isIntro && (
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
            {mode === "3d" && !dragged && <span className="walk-hint" aria-hidden>⟲ Drag to look around</span>}
          </div>
        </div>
      </div>

      {/* Everything in the scene, as text, for screen readers and search engines */}
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
