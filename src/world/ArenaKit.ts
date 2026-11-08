import * as THREE from "three";
import type { EncounterDef } from "../sim/encounter";
import { mesh, toon, toonUnique } from "../look/LookKit";
import { PALETTE, THEME_ACCENT } from "../look/palette";
import { DeterministicRng } from "@slu/web-shell";
import { buildObservatoryArt, observatoryFloorTexture } from "./ObservatoryArt";

/**
 * Procedural arena kit (final art): glyph floors, ring-walls / void edges, colonnades, floating platonic
 * solids and a per-Trial landmark. Everything is generated from the encounter data.
 */
const texCache = new Map<string, THREE.CanvasTexture>();

function glyphFloorTexture(theme: string, accent: number): THREE.CanvasTexture {
  const key = `${theme}`;
  const cached = texCache.get(key);
  if (cached) return cached;
  const size = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const stone = theme === "descent" ? "#8d8b84" : theme === "innocence" || theme === "ascent" || theme === "dawn" ? "#efece4" : theme === "shadow" ? "#bdbab2" : "#d9d5ca";
  g.fillStyle = stone; g.fillRect(0, 0, size, size);
  const col = `#${accent.toString(16).padStart(6, "0")}`;
  const cx = size / 2;
  const rng = new DeterministicRng(theme.length * 977 + theme.charCodeAt(0));
  g.strokeStyle = col; g.globalAlpha = 0.55;
  // concentric rules
  for (const r of [0.97, 0.9, 0.62, 0.6, 0.34, 0.12]) { g.lineWidth = r > 0.8 ? 6 : 3; g.beginPath(); g.arc(cx, cx, r * cx, 0, Math.PI * 2); g.stroke(); }
  // radial ticks (cuneiform-meets-math)
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * Math.PI * 2;
    const long = i % 10 === 0;
    const r0 = 0.9 * cx, r1 = (long ? 0.8 : 0.86) * cx;
    g.lineWidth = long ? 5 : 2;
    g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cx + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r1, cx + Math.sin(a) * r1); g.stroke();
    if (long) { // wedge glyph
      const r2 = 0.72 * cx;
      g.beginPath(); g.moveTo(cx + Math.cos(a) * r2, cx + Math.sin(a) * r2);
      g.lineTo(cx + Math.cos(a + 0.03) * (r2 - 26), cx + Math.sin(a + 0.03) * (r2 - 26));
      g.lineTo(cx + Math.cos(a - 0.03) * (r2 - 26), cx + Math.sin(a - 0.03) * (r2 - 26)); g.closePath(); g.stroke();
    }
  }
  // inscribed polygon (7-gon: the Engine) and a theme figure
  g.lineWidth = 3;
  const sides = theme === "observatory" ? 7 : 3 + (theme.length % 5);
  g.beginPath();
  for (let i = 0; i <= sides; i++) { const a = (i / sides) * Math.PI * 2 - Math.PI / 2; const x = cx + Math.cos(a) * 0.6 * cx, y = cx + Math.sin(a) * 0.6 * cx; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
  g.stroke();
  // scattered proof marks
  g.globalAlpha = 0.25; g.font = "28px serif"; g.fillStyle = col;
  const marks = ["∴", "∵", "≡", "∀", "∃", "⊢", "∎", "λ", "Σ", "∂"];
  for (let i = 0; i < 40; i++) { const a = rng.range(0, Math.PI * 2), r = rng.range(0.38, 0.56) * cx; g.fillText(rng.pick(marks), cx + Math.cos(a) * r, cx + Math.sin(a) * r); }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  texCache.set(key, t);
  return t;
}

let sky: THREE.Mesh | null = null;
export function starfield(): THREE.Mesh {
  if (sky) return sky;
  const geo = new THREE.SphereGeometry(180, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { warm: { value: 0 } },
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform float warm; varying vec3 vP;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
      void main(){ float y = vP.y; vec3 deep = mix(vec3(0.043,0.08,0.19), vec3(0.01,0.012,0.03), smoothstep(-0.6,0.5,y));
        vec3 g = floor(vP * 260.0); float s = step(0.9965, h(g)) * (0.6 + 0.4 * h(g + 1.0));
        vec3 col = deep + vec3(s) * vec3(0.8,0.85,1.0);
        vec3 dawn = mix(vec3(1.0,0.86,0.62), vec3(1.0,0.97,0.9), smoothstep(-0.2,0.6,y));
        gl_FragColor = vec4(mix(col, dawn, warm), 1.0); }`,
  });
  sky = new THREE.Mesh(geo, mat);
  sky.frustumCulled = false;
  return sky;
}

export interface ArenaView { group: THREE.Group; floor: THREE.Mesh; animate(t: number): void; dispose(): void }

const PLATONIC = (): THREE.BufferGeometry[] => [new THREE.TetrahedronGeometry(1), new THREE.OctahedronGeometry(1), new THREE.IcosahedronGeometry(1), new THREE.DodecahedronGeometry(1), new THREE.BoxGeometry(1.3, 1.3, 1.3)];

export function buildArena(def: EncounterDef): ArenaView {
  const theme = def.arena.theme as string;
  const accent = THEME_ACCENT[theme] ?? PALETTE.blue;
  const R = def.arena.radius;
  const group = new THREE.Group();
  group.name = `arena:${def.id}`;
  const rng = new DeterministicRng(def.id.split("").reduce((s, c) => s * 31 + c.charCodeAt(0), 7) >>> 0);
  const anims: ((t: number) => void)[] = [];

  // Opt-in A/B comparison: ?art=classic restores the original hub visuals.
  // Gameplay and collision remain exactly the same in either view.
  const cartoonObservatory = theme === "observatory"
    && typeof window !== "undefined"
    && new URLSearchParams(window.location.search).get("art") !== "classic";
  // The concept's graphic floor is unlit so its ink lines retain contrast.
  const floorMat = cartoonObservatory
    ? new THREE.MeshBasicMaterial({ map: observatoryFloorTexture() })
    : toonUnique(0xffffff, 0, 0, { map: glyphFloorTexture(theme, accent) });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(R, 96), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.name = "floor";
  group.add(floor);
  const slab = mesh(new THREE.CylinderGeometry(R, R * 0.92, 1.2, 96, 1, true), toon(PALETTE.stoneShade), false);
  slab.position.y = -0.6; group.add(slab);

  if (def.arena.edge === "wall") {
    const wall = mesh(new THREE.TorusGeometry(R + 0.35, 0.35, 8, 96), toon(PALETTE.stone));
    wall.rotation.x = Math.PI / 2; wall.position.y = 0.3; group.add(wall);
    // colonnade (instanced to stay inside the draw-call budget)
    const n = Math.round(R * 2.2);
    const colGeo = new THREE.CylinderGeometry(0.32, 0.38, 3, 10);
    const col = new THREE.InstancedMesh(colGeo, toon(PALETTE.stone), n);
    const cap = new THREE.InstancedMesh(new THREE.BoxGeometry(0.95, 0.25, 0.95), toon(PALETTE.stone), n);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = Math.sin(a) * (R + 0.9), z = Math.cos(a) * (R + 0.9);
      m4.makeTranslation(x, 1.5, z); col.setMatrixAt(i, m4);
      m4.makeTranslation(x, 3.1, z); cap.setMatrixAt(i, m4);
    }
    group.add(col, cap);
    const lintel = mesh(new THREE.TorusGeometry(R + 0.9, 0.18, 6, 96), toon(PALETTE.stone));
    lintel.rotation.x = Math.PI / 2; lintel.position.y = 3.3; group.add(lintel);
  } else {
    // void edge: luminous rule and a falling-away underside
    const edge = new THREE.Mesh(new THREE.RingGeometry(R - 0.12, R + 0.05, 96), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.8 }));
    edge.rotation.x = -Math.PI / 2; edge.position.y = 0.01; group.add(edge);
    const under = mesh(new THREE.ConeGeometry(R * 0.92, R * 1.4, 7, 1, true), toon(PALETTE.stoneShade), false);
    under.rotation.x = Math.PI; under.position.y = -1.2 - R * 0.7; group.add(under);
  }

  // obstacles: pillars with capitals
  for (const o of def.arena.obstacles) {
    const p = mesh(new THREE.CylinderGeometry(o.r, o.r * 1.08, 3, 14), toon(PALETTE.stone));
    p.position.set(o.x, 1.5, o.z); group.add(p);
    const c = mesh(new THREE.BoxGeometry(o.r * 2.4, 0.3, o.r * 2.4), toon(PALETTE.stone));
    c.position.set(o.x, 3.1, o.z); group.add(c);
  }

  // floating platonic solids in the cosmic deep
  const solids = PLATONIC();
  const floaters = new THREE.Group();
  for (let i = 0; i < 16; i++) {
    const s = mesh(solids[i % solids.length]!, toon(theme === "descent" ? 0x6e6c66 : PALETTE.stone), true);
    const a = rng.range(0, Math.PI * 2), r = rng.range(R + 8, R + 30);
    s.position.set(Math.sin(a) * r, rng.range(-14, 10), Math.cos(a) * r);
    s.scale.setScalar(rng.range(0.6, 2.6));
    s.userData.spin = rng.range(-0.4, 0.4);
    floaters.add(s);
  }
  group.add(floaters);
  anims.push((t) => { floaters.children.forEach((s, i) => { s.rotation.y = t * (s.userData.spin as number); s.rotation.x = t * 0.1 + i; s.position.y += Math.sin(t * 0.5 + i) * 0.002; }); });

  landmark(def, group, R, accent, rng, anims);
  if (cartoonObservatory) {
    const art = buildObservatoryArt(R);
    group.add(art.group);
    anims.push(art.animate);
  }

  const sk = starfield();
  (sk.material as THREE.ShaderMaterial).uniforms.warm!.value = theme === "dawn" || theme === "ascent" ? 0.15 : 0;
  group.add(sk);

  return {
    group, floor,
    animate: (t) => { for (const a of anims) a(t); },
    dispose: () => { group.traverse((o) => { if (o instanceof THREE.Mesh && o !== sk && o.geometry && !(o.material instanceof THREE.ShaderMaterial && o.userData.outline)) o.geometry.dispose(); }); },
  };
}

function landmark(def: EncounterDef, g: THREE.Group, R: number, accent: number, rng: DeterministicRng, anims: ((t: number) => void)[]): void {
  const theme = def.arena.theme as string;
  const glow = (color: number, op = 0.6) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false });
  switch (theme) {
    case "reflection": { // prism garden beyond the wall
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + 0.2, r = R + 4 + rng.range(0, 4);
        const c = mesh(new THREE.OctahedronGeometry(1), toon(0xcfe8ff, accent, 0.25));
        c.scale.set(0.6, rng.range(2, 4), 0.6); c.position.set(Math.sin(a) * r, 1.5, Math.cos(a) * r); g.add(c);
      }
      break;
    }
    case "shadow": { // lanterns and dark
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2, r = R + 3;
        const post = mesh(new THREE.CylinderGeometry(0.12, 0.12, 4, 6), toon(PALETTE.stoneShade)); post.position.set(Math.sin(a) * r, 2, Math.cos(a) * r); g.add(post);
        const lamp = new THREE.Mesh(new THREE.OctahedronGeometry(0.35), glow(0xcfe0ff, 0.9)); lamp.position.set(Math.sin(a) * r, 4.2, Math.cos(a) * r); g.add(lamp);
      }
      break;
    }
    case "recurrence": { // mirrored hall panels
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2, r = R + 2.6;
        const p = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 4.5), new THREE.MeshBasicMaterial({ color: 0x9fb4ff, transparent: true, opacity: 0.18, side: THREE.DoubleSide }));
        p.position.set(Math.sin(a) * r, 2.3, Math.cos(a) * r); p.lookAt(0, 2.3, 0); g.add(p);
      }
      break;
    }
    case "dominion": { // throne terraces
      for (let k = 0; k < 3; k++) {
        const t = mesh(new THREE.CylinderGeometry(R + 3 + k * 2.4, R + 3 + k * 2.4, 1 + k * 1.2, 64, 1, true), toon(PALETTE.stoneShade), false);
        t.position.y = (1 + k * 1.2) / 2 - 0.2; g.add(t);
      }
      const throne = mesh(new THREE.BoxGeometry(3, 6, 1.5), toon(PALETTE.stone)); throne.position.set(0, 4, R + 7); g.add(throne);
      break;
    }
    case "judgment": { // scales and a bell tower
      const tower = mesh(new THREE.CylinderGeometry(1.1, 1.4, 12, 8), toon(PALETTE.stone)); tower.position.set(0, 6, R + 5); g.add(tower);
      const bell = mesh(new THREE.CylinderGeometry(0.5, 1.1, 1.4, 12, 1, true), toon(0xd8c79a)); bell.position.set(0, 11, R + 5); g.add(bell);
      const beam = mesh(new THREE.BoxGeometry(12, 0.25, 0.25), toon(PALETTE.stone)); beam.position.set(0, 7, -R - 5); g.add(beam);
      for (const s of [-1, 1]) { const pan = mesh(new THREE.CylinderGeometry(1.4, 1.1, 0.25, 16), toon(PALETTE.stone)); pan.position.set(s * 5.5, 5, -R - 5); g.add(pan); }
      anims.push((t) => { beam.rotation.z = Math.sin(t * 0.6) * 0.08; });
      break;
    }
    case "prophecy": { // star-chart dome
      const dome = new THREE.Mesh(new THREE.SphereGeometry(R + 10, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: accent, wireframe: true, transparent: true, opacity: 0.12 }));
      g.add(dome);
      anims.push((t) => { dome.rotation.y = t * 0.02; });
      break;
    }
    case "innocence": case "ascent": { // a garden of white geometry
      for (let i = 0; i < 26; i++) {
        const a = rng.range(0, Math.PI * 2), r = R + rng.range(1.5, 9);
        const stem = mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.6, 5), toon(0xffffff)); stem.position.set(Math.sin(a) * r, 0.8, Math.cos(a) * r); g.add(stem);
        const bloom = mesh(new THREE.IcosahedronGeometry(0.45, 0), toon(0xffffff, 0xfff6e0, theme === "ascent" ? 0.6 : 0.15));
        bloom.position.set(Math.sin(a) * r, 1.8, Math.cos(a) * r); g.add(bloom);
      }
      break;
    }
    case "observatory": {
      const orrery = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4 + i * 0.5, 0.04, 6, 64), new THREE.MeshBasicMaterial({ color: accent }));
        ring.rotation.x = Math.PI / 2 + i * 0.35; orrery.add(ring);
      }
      const core = mesh(new THREE.IcosahedronGeometry(0.6, 0), toon(PALETTE.stone)); orrery.add(core);
      orrery.position.y = 3; g.add(orrery);
      anims.push((t) => { orrery.children.forEach((c, i) => { c.rotation.z = t * (0.2 + i * 0.1); }); });
      const dome = new THREE.Mesh(new THREE.SphereGeometry(R + 6, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2.3), new THREE.MeshBasicMaterial({ color: accent, wireframe: true, transparent: true, opacity: 0.08 }));
      g.add(dome);
      break;
    }
    case "descent": {
      const gate = def.gate ?? 1;
      // seven arches, one darkened per gate
      for (let i = 0; i < 7; i++) {
        const a = Math.PI + (i - 3) * 0.32;
        const arch = mesh(new THREE.TorusGeometry(2.4, 0.3, 6, 24, Math.PI), toon(i < gate ? 0x55534d : PALETTE.stone));
        arch.position.set(Math.sin(a) * (R + 4), 0, Math.cos(a) * (R + 4)); arch.lookAt(0, 0, 0); g.add(arch);
      }
      break;
    }
    case "dawn": {
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(2.2), glow(0xfff2c8, 0.8));
      star.position.set(0, 26, 30); g.add(star);
      anims.push((t) => { star.rotation.y = t * 0.3; });
      break;
    }
    case "coldOpen": {
      break;
    }
    default: break;
  }
}
