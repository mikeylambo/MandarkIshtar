import type { Vec } from "./types";

export const FPS = 60;
export const DT = 1 / FPS;
export const DEG = Math.PI / 180;

export const v = (x = 0, z = 0): Vec => ({ x, z });
export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, z: a.z + b.z });
export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, z: a.z - b.z });
export const scale = (a: Vec, s: number): Vec => ({ x: a.x * s, z: a.z * s });
export const len = (a: Vec): number => Math.hypot(a.x, a.z);
export const dist = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.z - b.z);
export const dist2 = (a: Vec, b: Vec): number => (a.x - b.x) ** 2 + (a.z - b.z) ** 2;
export const dot = (a: Vec, b: Vec): number => a.x * b.x + a.z * b.z;
export const norm = (a: Vec, fallback: Vec = { x: 0, z: 1 }): Vec => {
  const l = Math.hypot(a.x, a.z);
  return l > 1e-9 ? { x: a.x / l, z: a.z / l } : { ...fallback };
};
export const dirTo = (from: Vec, to: Vec, fallback?: Vec): Vec => norm(sub(to, from), fallback);
export const angleOf = (a: Vec): number => Math.atan2(a.x, a.z);
export const fromAngle = (r: number): Vec => ({ x: Math.sin(r), z: Math.cos(r) });
export const rotate = (a: Vec, r: number): Vec => {
  const c = Math.cos(r), s = Math.sin(r);
  return { x: a.x * c + a.z * s, z: -a.x * s + a.z * c };
};
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const clamp = (x: number, lo: number, hi: number): number => (x < lo ? lo : x > hi ? hi : x);
export const angleBetween = (a: Vec, b: Vec): number => {
  const la = len(a), lb = len(b);
  if (la < 1e-9 || lb < 1e-9) return Math.PI;
  return Math.acos(clamp(dot(a, b) / (la * lb), -1, 1));
};
export const copy = (a: Vec): Vec => ({ x: a.x, z: a.z });
export const set = (out: Vec, a: Vec): Vec => { out.x = a.x; out.z = a.z; return out; };
export const mirrorX = (a: Vec): Vec => ({ x: -a.x, z: a.z });

/** Closest distance from point p to segment ab. */
export function segDist(p: Vec, a: Vec, b: Vec): number {
  const abx = b.x - a.x, abz = b.z - a.z;
  const l2 = abx * abx + abz * abz;
  let t = l2 > 0 ? ((p.x - a.x) * abx + (p.z - a.z) * abz) / l2 : 0;
  t = clamp(t, 0, 1);
  return Math.hypot(p.x - (a.x + abx * t), p.z - (a.z + abz * t));
}

/** Stable 32-bit hash mixing for state hashing. */
export function hashMix(h: number, value: number): number {
  const q = Math.round(value * 1000) | 0;
  h ^= q;
  h = Math.imul(h, 0x01000193);
  return h >>> 0;
}
