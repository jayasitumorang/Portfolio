"use client";

import { useEffect, useRef, useState } from "react";
import type { CanvasTexture, Material, Mesh, MeshStandardMaterial, Object3D } from "three";

// "A day of shipping": a scroll-driven 3D story. The character walks into a studio café,
// grabs a coffee, sits down, writes code, deploys, and the camera flies out over the city at night.
// Every movement is tied to scroll position (scroll back and they walk backwards).
// three.js is loaded only when the section is close to the screen.

const STAGES = [
  { key: "start", title: "Start", text: "Every good system starts with understanding the problem (and a coffee)." },
  { key: "build", title: "Build", text: "Web, mobile, APIs and data: React, Next.js, Spring Boot, ASP.NET and Python." },
  { key: "ship", title: "Ship", text: "To production on AWS and Azure, with CI/CD and security done properly." },
] as const;

// ---------- timeline helpers (scroll progress 0..1) ----------
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (t: number) => t * t * (3 - 2 * t);
const seg = (p: number, a: number, b: number) => ease(clamp01((p - a) / (b - a)));
const lin = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

const T = {
  walkIn: [0.0, 0.17],
  grab: [0.18, 0.25],
  sip: [0.25, 0.3],
  walkToDesk: [0.31, 0.43],
  sit: [0.43, 0.49],
  lidOpen: [0.49, 0.53],
  code: [0.53, 0.68],
  deploy: [0.68, 0.79],
  fly: [0.8, 1],
} as const;

const DOOR_X = -22;
const COUNTER_X = -11;
const DESK_X = 5;
const WALK_Z = 0.7;

const CODE = [
  [["kw", "export async function "], ["fn", "ship"], ["p", "(order: "], ["ty", "Order"], ["p", ") {"]],
  [["p", "  const "], ["v", "route"], ["p", " = "], ["kw", "await "], ["fn", "plan"], ["p", "(order);"]],
  [["p", "  "], ["kw", "await "], ["fn", "track"], ["p", "(route, { realtime: "], ["kw", "true"], ["p", " });"]],
  [["p", "  "], ["kw", "await "], ["fn", "invoice"], ["p", "(order.customer);"]],
  [["p", "  "], ["kw", "return "], ["fn", "deploy"], ["p", "("], ["s", "\"production\""], ["p", ");"]],
  [["p", "}"]],
] as const;
const TERMINAL = [
  ["$ npm run test", "#9fb3c8"],
  ["  ✓ 128 passed", "#3ccf8e"],
  ["$ npm run build", "#9fb3c8"],
  ["  ✓ compiled in 4.2s", "#3ccf8e"],
  ["$ deploy --prod", "#9fb3c8"],
  ["  ✓ live on aws · azure", "#3ccf8e"],
] as const;
const TOKEN_COLORS: Record<string, string> = { kw: "#c792ea", fn: "#82aaff", ty: "#ffcb6b", v: "#f07178", s: "#c3e88d", p: "#d6deeb" };

export function DayStory() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stage, setStage] = useState(0);
  const [mode, setMode] = useState<"3d" | "static" | "none">("3d");

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let disposed = false;
    let cleanup = () => {};

    const start = async () => {
      const THREE = await import("three");
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
      const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 600);
      const css = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
      const isDark = () => {
        const t = document.documentElement.dataset.theme;
        return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
      };
      const dayBg = new THREE.Color();
      const nightBg = new THREE.Color("#0b1224");
      const bg = new THREE.Color();
      scene.background = bg;
      scene.fog = new THREE.Fog(bg, 60, 220);

      // ---------- lights ----------
      const hemi = new THREE.HemisphereLight(0xeaf0ff, 0x4a4036, 1.3);
      scene.add(hemi);
      const sun = new THREE.DirectionalLight(0xfff4e0, 2.4);
      sun.position.set(-12, 22, 14);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 20, bottom: -20, near: 1, far: 80 });
      sun.shadow.bias = -0.0004;
      scene.add(sun);
      const lamp = new THREE.PointLight(0xffc27a, 0, 9, 1.6); // desk lamp, turns on at night
      lamp.position.set(DESK_X - 1.6, 1.9, -1.2);
      scene.add(lamp);

      // ---------- materials & builders ----------
      const mat = (color: string | number, rough = 0.8, metal = 0.02) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
      const M = {
        floor: mat(0xd9c3a5, 0.9),
        wall: mat(0xeef1f6, 0.95),
        wood: mat(0x8a5a3b, 0.6),
        woodLight: mat(0xc49a6c, 0.6),
        dark: mat(0x232a36, 0.5, 0.2),
        metal: mat(0x9aa3ae, 0.35, 0.7),
        glass: new THREE.MeshStandardMaterial({ color: 0xbfd6ff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.22 }),
        plant: mat(0x3f8f5a, 0.8),
        pot: mat(0xe2d6c6, 0.9),
        cup: mat(0xffffff, 0.5),
        sleeve: mat(0xb9864f, 0.9),
        skin: mat(0xd9a77f, 0.7),
        hair: mat(0x15171c, 0.8),
        suit: mat(0x1f2633, 0.7),
        shirt: mat(0xf4f6f9, 0.8),
        tie: mat(0x2b4c9b, 0.6),
        shoe: mat(0x111111, 0.4),
        city: mat(0x8d97a8, 0.9),
        road: mat(0x3b414b, 0.95),
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
      const screenTex = (w: number, h: number) => {
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        return { c, g: c.getContext("2d")!, tex };
      };
      const screenMat = (tex: CanvasTexture) => new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });

      // ---------- the studio ----------
      const studio = new THREE.Group();
      scene.add(studio);
      studio.add(box(40, 0.2, 10, M.floor, -6, -0.1, 0));
      // back wall with big windows (pillars + sill + header), glass in the gaps
      studio.add(box(40, 0.9, 0.3, M.wall, -6, 0.45, -3.2));
      studio.add(box(40, 0.8, 0.3, M.wall, -6, 3.6, -3.2));
      for (let x = -26; x <= 14; x += 5) studio.add(box(0.5, 4, 0.35, M.wall, x, 2, -3.2));
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(40, 2.4), M.glass);
      glass.position.set(-6, 2.1, -3.15);
      studio.add(glass);
      // side wall with the door
      studio.add(box(0.3, 4, 3.4, M.wall, DOOR_X - 2, 2, -1.5));
      studio.add(box(0.3, 1.2, 2.2, M.wall, DOOR_X - 2, 3.4, 2.4));
      studio.add(box(0.3, 4, 1.4, M.wall, DOOR_X - 2, 2, 4.3));

      // café counter + coffee machine
      studio.add(box(4.6, 1.05, 1.1, M.wood, COUNTER_X, 0.525, -1.4));
      studio.add(box(4.8, 0.08, 1.25, M.woodLight, COUNTER_X, 1.09, -1.4));
      studio.add(box(0.9, 0.9, 0.6, M.metal, COUNTER_X - 1.4, 1.58, -1.6));
      studio.add(box(0.7, 0.2, 0.35, M.dark, COUNTER_X - 1.4, 1.65, -1.25));
      for (let i = 0; i < 3; i++) studio.add(cyl(0.05, 0.04, 0.12, M.cup, COUNTER_X + 1.2 + i * 0.16, 1.19, -1.65));
      // menu board
      const menu = screenTex(256, 128);
      menu.g.fillStyle = "#1f2633";
      menu.g.fillRect(0, 0, 256, 128);
      menu.g.fillStyle = "#f4f6f9";
      menu.g.font = "bold 22px monospace";
      menu.g.fillText("COFFEE  ☕", 18, 34);
      menu.g.font = "16px monospace";
      menu.g.fillStyle = "#c3cad6";
      ["espresso ....... 1", "flat white ..... 2", "deploy roast ... ∞"].forEach((l, i) => menu.g.fillText(l, 18, 64 + i * 22));
      menu.tex.needsUpdate = true;
      const menuBoard = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), screenMat(menu.tex));
      menuBoard.position.set(COUNTER_X, 2.6, -3.0);
      studio.add(menuBoard);

      // plants
      for (const [x, z] of [[-17, -2.3], [-4, -2.4], [12.5, -2.3]]) {
        studio.add(cyl(0.32, 0.25, 0.6, M.pot, x, 0.3, z));
        const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 0), M.plant);
        leaves.position.set(x, 1.05, z);
        leaves.castShadow = true;
        studio.add(leaves);
      }

      // desk, chair, monitors, laptop, phone, lamp, server rack
      studio.add(box(3.4, 0.07, 1.4, M.woodLight, DESK_X, 0.76, -1.6));
      for (const dx of [-1.6, 1.6]) studio.add(box(0.06, 0.74, 1.3, M.dark, DESK_X + dx, 0.37, -1.6));
      const chair = new THREE.Group();
      chair.add(box(0.6, 0.08, 0.6, M.dark, 0, 0.5, 0));
      chair.add(box(0.6, 0.7, 0.07, M.dark, 0, 0.88, 0.3));
      chair.add(cyl(0.04, 0.04, 0.45, M.metal, 0, 0.25, 0));
      chair.position.set(DESK_X, 0, 0.1);
      studio.add(chair);

      const codeScr = screenTex(640, 400);
      const termScr = screenTex(640, 400);
      const mon = (x: number, tex: CanvasTexture, rotY: number) => {
        const g = new THREE.Group();
        g.add(box(1.25, 0.78, 0.05, M.dark, 0, 0, 0));
        const s = new THREE.Mesh(new THREE.PlaneGeometry(1.17, 0.7), screenMat(tex));
        s.position.z = 0.03;
        g.add(s);
        g.add(box(0.06, 0.3, 0.06, M.metal, 0, -0.5, -0.05));
        g.add(box(0.36, 0.03, 0.22, M.metal, 0, -0.64, -0.05));
        g.position.set(x, 1.43, -2.05);
        g.rotation.y = rotY;
        studio.add(g);
      };
      mon(DESK_X - 0.66, codeScr.tex, 0.18);
      mon(DESK_X + 0.66, termScr.tex, -0.18);

      const laptop = new THREE.Group();
      laptop.add(box(0.7, 0.03, 0.48, M.metal, 0, 0, 0));
      const lid = new THREE.Group();
      lid.position.set(0, 0.015, -0.24);
      const lidPanel = box(0.7, 0.025, 0.48, M.metal, 0, 0, 0.24);
      lid.add(lidPanel);
      const lapScr = screenTex(256, 160);
      const lapScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.42), screenMat(lapScr.tex));
      lapScreen.rotation.x = Math.PI / 2;
      lapScreen.position.set(0, -0.014, 0.24);
      lid.add(lapScreen);
      laptop.add(lid);
      laptop.position.set(DESK_X, 0.81, -1.15);
      studio.add(laptop);

      const phoneScr = screenTex(160, 300);
      const phone = new THREE.Group();
      phone.add(box(0.2, 0.02, 0.38, M.dark, 0, 0, 0));
      const phoneScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.34), screenMat(phoneScr.tex));
      phoneScreen.rotation.x = -Math.PI / 2;
      phoneScreen.position.y = 0.012;
      phone.add(phoneScreen);
      phone.position.set(DESK_X + 1.25, 0.8, -1.05);
      phone.rotation.y = -0.4;
      studio.add(phone);

      studio.add(cyl(0.12, 0.15, 0.04, M.dark, DESK_X - 1.5, 0.81, -2.0));
      studio.add(cyl(0.02, 0.02, 0.8, M.dark, DESK_X - 1.5, 1.2, -2.0, 8));
      studio.add(cyl(0.05, 0.18, 0.2, M.dark, DESK_X - 1.5, 1.62, -1.85));

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
      rack.position.set(DESK_X + 3.4, 0, -2.4);
      studio.add(rack);

      // cups: one waiting on the counter, one in hand, one put down on the desk
      const makeCup = () => {
        const g = new THREE.Group();
        g.add(cyl(0.07, 0.055, 0.2, M.cup, 0, 0, 0));
        g.add(cyl(0.072, 0.072, 0.07, M.sleeve, 0, -0.01, 0));
        g.add(cyl(0.075, 0.075, 0.02, M.cup, 0, 0.11, 0));
        return g;
      };
      const counterCup = makeCup();
      counterCup.position.set(COUNTER_X + 0.4, 1.23, -1.05);
      studio.add(counterCup);
      const deskCup = makeCup();
      deskCup.position.set(DESK_X - 1.0, 0.9, -1.1);
      studio.add(deskCup);

      // ---------- the character (faces +z by default) ----------
      const person = new THREE.Group();
      const hips = new THREE.Group();
      hips.position.y = 0.95;
      person.add(hips);
      hips.add(box(0.36, 0.16, 0.22, M.suit, 0, 0, 0));
      const torso = new THREE.Group();
      hips.add(torso);
      torso.add(box(0.42, 0.56, 0.24, M.suit, 0, 0.32, 0));
      torso.add(box(0.14, 0.4, 0.01, M.shirt, 0, 0.4, 0.122));
      torso.add(box(0.05, 0.3, 0.012, M.tie, 0, 0.38, 0.13));
      const head = new THREE.Group();
      head.position.y = 0.72;
      torso.add(head);
      head.add(cyl(0.06, 0.07, 0.1, M.skin, 0, -0.06, 0));
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 16), M.skin);
      skull.position.y = 0.1;
      skull.scale.set(0.95, 1.08, 1);
      skull.castShadow = true;
      head.add(skull);
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.137, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2.1), M.hair);
      hair.position.y = 0.13;
      hair.rotation.x = -0.25;
      head.add(hair);
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
        const shoulder = limb(0.32, 0.055, M.suit);
        shoulder.position.set(side * 0.27, 0.56, 0);
        torso.add(shoulder);
        const elbow = limb(0.3, 0.05, M.suit);
        elbow.position.y = -0.32;
        shoulder.add(elbow);
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), M.skin);
        hand.position.y = -0.31;
        elbow.add(hand);
        const grip = new THREE.Group();
        grip.position.set(0, -0.33, 0.02);
        elbow.add(grip);
        return { shoulder, elbow, grip };
      };
      const leg = (side: number) => {
        const hip = limb(0.46, 0.075, M.suit);
        hip.position.set(side * 0.11, -0.04, 0);
        hips.add(hip);
        const knee = limb(0.44, 0.065, M.suit);
        knee.position.y = -0.46;
        hip.add(knee);
        knee.add(box(0.12, 0.08, 0.26, M.shoe, 0, -0.44, 0.05));
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

      // ---------- city outside (revealed by the fly-out) ----------
      const city = new THREE.Group();
      scene.add(city);
      city.add(box(400, 0.1, 400, M.road, 0, -0.25, 0));
      const windowMats: MeshStandardMaterial[] = [];
      const windowTex = (() => {
        const t = screenTex(64, 128);
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
      for (let gx = -6; gx <= 6; gx++) {
        for (let gz = -6; gz <= 4; gz++) {
          const x = gx * 22 + (rnd() - 0.5) * 6;
          const z = gz * 22 + (rnd() - 0.5) * 6;
          if (Math.abs(x + 6) < 30 && Math.abs(z) < 14) continue; // keep the studio block clear
          const h = 8 + rnd() * (Math.abs(gx) < 3 && gz < 0 ? 60 : 30);
          const w = 8 + rnd() * 8;
          const d = 8 + rnd() * 8;
          const wm = new THREE.MeshStandardMaterial({
            color: 0x8d97a8, roughness: 0.85, emissive: 0xffffff, emissiveMap: windowTex, emissiveIntensity: 0,
          });
          const tex = windowTex.clone();
          tex.repeat.set(w / 6, h / 10);
          tex.needsUpdate = true;
          wm.emissiveMap = tex;
          windowMats.push(wm);
          const b = box(w, h, d, wm, x, h / 2 - 0.2, z);
          city.add(b);
        }
      }

      // ---------- screens ----------
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
        g.font = "16px monospace";
        g.fillText("ship.ts", 16, 23);
        g.font = "19px monospace";
        let left = chars;
        CODE.forEach((line, i) => {
          let x = 18;
          const y = 72 + i * 34;
          g.fillStyle = "#4a566b";
          g.fillText(String(i + 1), 4, y);
          x = 40;
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
        // laptop mirrors a zoomed-out view
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
        g.font = "20px monospace";
        TERMINAL.slice(0, lines).forEach(([t, col], i) => {
          g.fillStyle = col;
          g.fillText(t, 22, 46 + i * 40);
        });
        if (live > 0) {
          g.fillStyle = `rgba(60,207,142,${live})`;
          g.fillRect(22, 300, 596, 70);
          g.fillStyle = `rgba(11,15,23,${live})`;
          g.font = "bold 26px monospace";
          g.fillText("● LIVE  jayasitumorang.vercel.app", 40, 345);
        }
        tex.needsUpdate = true;
        // phone lights up with an app screen when we go live
        const pg = phoneScr.g;
        pg.fillStyle = "#05070b";
        pg.fillRect(0, 0, 160, 300);
        if (live > 0) {
          pg.globalAlpha = live;
          pg.fillStyle = "#2b57de";
          pg.fillRect(0, 0, 160, 300);
          pg.fillStyle = "#ffffff";
          pg.font = "bold 18px sans-serif";
          pg.fillText("Deployed ✓", 22, 60);
          pg.fillStyle = "rgba(255,255,255,0.85)";
          for (let i = 0; i < 4; i++) pg.fillRect(20, 96 + i * 42, 120, 26);
          pg.globalAlpha = 1;
        }
        phoneScr.tex.needsUpdate = true;
      };
      drawCode(0);
      drawTerm(0, 0);

      // ---------- pose & scene from progress ----------
      const camPos = new THREE.Vector3();
      const camLook = new THREE.Vector3();
      const setRot = (o: Object3D, x: number, y = 0, z = 0) => o.rotation.set(x, y, z);

      const update = (p: number, time: number) => {
        // where is the character?
        const wIn = lin(p, ...T.walkIn);
        const wDesk = lin(p, ...T.walkToDesk);
        let x: number;
        let walking = false;
        let distance: number;
        if (p < T.grab[0]) {
          x = mix(DOOR_X, COUNTER_X, wIn);
          walking = wIn > 0 && wIn < 1;
          distance = x - DOOR_X;
        } else if (p < T.walkToDesk[0]) {
          x = COUNTER_X;
          distance = COUNTER_X - DOOR_X;
        } else {
          x = mix(COUNTER_X, DESK_X, wDesk);
          walking = wDesk > 0 && wDesk < 1;
          distance = COUNTER_X - DOOR_X + (x - COUNTER_X);
        }

        const grab = seg(p, ...T.grab);
        const sip = seg(p, ...T.sip);
        const sit = seg(p, ...T.sit);
        const hasCup = p >= T.grab[0] + (T.grab[1] - T.grab[0]) * 0.6 && p < T.sit[0] + (T.sit[1] - T.sit[0]) * 0.7;
        counterCup.visible = !hasCup && p < T.grab[1];
        handCup.visible = hasCup;
        deskCup.visible = p >= T.sit[0] + (T.sit[1] - T.sit[0]) * 0.7;

        // facing: walk = +x (π/2); at counter and desk turn to face the back wall (π)
        let facing = Math.PI / 2;
        if (p >= T.grab[0] && p < T.walkToDesk[0]) facing = mix(Math.PI / 2, Math.PI, seg(p, T.grab[0], T.grab[0] + 0.03)) - (p > T.sip[1] ? mix(0, Math.PI / 2, seg(p, T.sip[1], T.walkToDesk[0])) : 0);
        if (p >= T.walkToDesk[1]) facing = mix(Math.PI / 2, Math.PI, seg(p, T.walkToDesk[1], T.walkToDesk[1] + 0.02));
        person.rotation.y = facing;
        person.position.set(x, 0, mix(WALK_Z, 0.35, sit));

        // walk cycle driven by distance walked, so it stays in step with the scroll
        const phase = distance * 2.4;
        const swing = walking ? Math.sin(phase) * 0.55 : 0;
        hips.position.y = mix(0.95 + (walking ? Math.abs(Math.cos(phase)) * 0.04 : 0), 0.58, sit);
        torso.rotation.x = mix(walking ? 0.05 : 0, 0.12, sit);

        // legs: forward is negative x-rotation for a +z-facing model
        setRot(legL.hip, mix(-swing, -1.45, sit));
        setRot(legR.hip, mix(swing, -1.45, sit));
        setRot(legL.knee, mix(walking ? Math.max(0, Math.sin(phase + Math.PI)) * 0.7 : 0, 1.5, sit));
        setRot(legR.knee, mix(walking ? Math.max(0, Math.sin(phase)) * 0.7 : 0, 1.5, sit));

        // arms
        const typing = seg(p, T.lidOpen[1], T.code[0] + 0.02) * (1 - seg(p, T.deploy[1], T.fly[0] + 0.05));
        const tap = Math.sin(time * 18) * 0.06 * typing;
        let lS = swing * 0.8;
        let lE = -0.15;
        let rS = -swing * 0.8;
        let rE = -0.15;
        if (hasCup) {
          // holding the cup in front; raise it to sip
          rS = mix(-0.35, -1.25, sip * (1 - seg(p, T.sip[1], T.sip[1] + 0.02)));
          rE = mix(-1.25, -1.6, sip);
          if (walking) rS += -swing * 0.15;
        } else if (p >= T.grab[0] && p < T.grab[1]) {
          rS = mix(0, -1.1, grab);
          rE = mix(-0.15, -0.3, grab);
        }
        lS = mix(lS, -0.95, typing);
        lE = mix(lE, -0.75, typing) + tap;
        rS = hasCup ? rS : mix(rS, -0.95, typing);
        rE = hasCup ? rE : mix(rE, -0.75, typing) - tap;
        // at the very end: lean back with arms down
        setRot(armL.shoulder, lS, 0, -0.05);
        setRot(armL.elbow, lE);
        setRot(armR.shoulder, rS, 0, 0.05);
        setRot(armR.elbow, rE);
        head.rotation.x = hasCup ? -sip * 0.25 : mix(0, 0.12, typing);

        // laptop, code, deploy
        lid.rotation.x = mix(0, -1.85, seg(p, ...T.lidOpen));
        const codeLen = CODE.reduce((s, l) => s + l.reduce((a, [, t]) => a + t.length, 0), 0);
        drawCode(Math.round(lin(p, ...T.code) * codeLen));
        const dep = lin(p, ...T.deploy);
        drawTerm(Math.round(dep * TERMINAL.length), seg(p, T.deploy[0] + 0.07, T.deploy[1]));
        leds.forEach((l, i) => {
          const on = clamp01(dep * 1.4 - (i % 8) * 0.05);
          l.emissiveIntensity = on * (0.7 + 0.3 * Math.sin(time * 6 + i));
        });

        // day → night during the fly-out
        const night = seg(p, T.fly[0], 0.93);
        bg.copy(dayBg).lerp(nightBg, night);
        (scene.fog as InstanceType<typeof THREE.Fog>).color.copy(bg);
        sun.intensity = mix(2.4, 0.25, night);
        hemi.intensity = mix(isDark() ? 0.9 : 1.3, 0.35, night);
        lamp.intensity = mix(0, 3.5, seg(p, T.deploy[1], T.fly[0] + 0.06));
        windowMats.forEach((m) => (m.emissiveIntensity = night * 1.1));

        // ---------- camera ----------
        if (p < T.grab[0]) {
          const t = seg(p, 0, T.grab[0]);
          camPos.set(x + mix(3.5, 2.2, t), mix(2.4, 2.1, t), mix(7.5, 6, t));
          camLook.set(x + 0.6, 1.3, 0);
        } else if (p < T.walkToDesk[0]) {
          const t = seg(p, T.grab[0], T.walkToDesk[0]);
          camPos.set(mix(COUNTER_X + 2.2, COUNTER_X + 1.6, t), mix(2.1, 1.95, t), mix(6, 3.2, t));
          camLook.set(COUNTER_X - 0.1, mix(1.3, 1.55, t), -0.6);
        } else if (p < T.walkToDesk[1]) {
          camPos.set(x + 2.6, 2.3, 6.4);
          camLook.set(x + 0.8, 1.3, 0);
        } else if (p < T.deploy[0]) {
          const t = seg(p, T.walkToDesk[1], T.code[0] + 0.05);
          camPos.set(mix(DESK_X + 2.6, DESK_X + 1.25, t), mix(2.3, 2.35, t), mix(6.4, 2.2, t));
          camLook.set(mix(DESK_X + 0.8, DESK_X - 0.15, t), mix(1.3, 1.2, t), mix(0, -2, t));
        } else if (p < T.fly[0]) {
          const t = seg(p, ...T.deploy);
          camPos.set(mix(DESK_X + 1.25, DESK_X + 2.8, t), mix(2.35, 2.7, t), mix(2.2, 4.8, t));
          camLook.set(mix(DESK_X - 0.15, DESK_X + 1.2, t), mix(1.2, 1.2, t), mix(-2, -1.6, t));
        } else {
          const t = seg(p, ...T.fly);
          camPos.set(mix(DESK_X + 2.8, 34, t), mix(2.7, 70, t), mix(4.8, 78, t));
          camLook.set(mix(DESK_X + 1.2, -2, t), mix(1.2, 0, t), mix(-1.6, -2, t));
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
        camera.fov = w < 700 ? 58 : 40;
        camera.updateProjectionMatrix();
      };
      const applyTheme = () => {
        dayBg.set(css("--bg") || "#f4f6f9");
        M.floor.color.set(isDark() ? 0x6b5a46 : 0xd9c3a5);
        M.wall.color.set(isDark() ? 0x2a3242 : 0xeef1f6);
      };
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
      const stageOf = (p: number) => (p < T.walkToDesk[1] ? 0 : p < T.deploy[0] ? 1 : 2);

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

      if (reduced) {
        update(0.74, 0); // one still frame: at the desk, deployed
        renderer.render(scene, camera);
        setStage(2);
        cleanup = () => {
          ro.disconnect();
          mo.disconnect();
          mq.removeEventListener("change", applyTheme);
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
        const s = stageOf(current);
        if (s !== shown) setStage((shown = s));
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
  }, []);

  return (
    <section ref={sectionRef} className={`story story-${mode}`} aria-label="A day of shipping: start, build, ship">
      <div className="story-sticky">
        <canvas ref={canvasRef} className="story-canvas" aria-hidden />
        <div className="story-ui wrap">
          <span className="story-hint" aria-hidden>
            Scroll to follow the day ↓
          </span>
          <ol className="story-steps">
            {STAGES.map((s, i) => (
              <li key={s.key} className={i === stage ? "on" : i < stage ? "done" : ""} aria-current={i === stage ? "step" : undefined}>
                <b>
                  <i>{String(i + 1).padStart(2, "0")}</i> {s.title}
                </b>
                <span>{s.text}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
