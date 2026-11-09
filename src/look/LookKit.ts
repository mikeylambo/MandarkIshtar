// Game layer over the shell 1.3 Look Kit (@slu/web-shell/look/three).
// The shell owns materials (slu.lit toon), the outline material, the post stack, palette tokens and pooled VFX.
// Kept here only what goes beyond the shell — listed in UPSTREAM.md as shell v1.4 candidates:
//   · welded-normal hull for faceted solids (UPSTREAM: smoothed-hull outline)
//   · full-screen inversion pass with accessibility rim mode (UPSTREAM: inversion pass)
//   · stepped (discrete, never blurred) afterimages (UPSTREAM: stepped afterimages)
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { LookKit as ShellLook } from "@slu/web-shell/look/three";
import { PALETTE } from "./palette";

let look: ShellLook | null = null;
/** Called once by SceneRig after the shell Look Kit is created. */
export function installLook(l: ShellLook): void { look = l; }
export function shellLook(): ShellLook {
  if (!look) throw new Error("Look Kit not installed (SceneRig must be created first)");
  return look;
}
const hex = (c: number) => `#${c.toString(16).padStart(6, "0")}`;

const litCache = new Map<string, THREE.MeshToonMaterial>();
/** Shared shell slu.lit material (banded toon, shadow tint token, spec blob) with an optional emissive. */
export function toon(color: number, emissive = 0, emissiveIntensity = 0, key = ""): THREE.MeshToonMaterial {
  const k = `${color}:${emissive}:${emissiveIntensity}:${key}`;
  let m = litCache.get(k);
  if (!m) { m = toonUnique(color, emissive, emissiveIntensity); litCache.set(k, m); }
  return m;
}
/** Unshared slu.lit material (per-instance tints/flashes). */
export function toonUnique(color: number, emissive = 0, emissiveIntensity = 0, extra: { map?: THREE.Texture; transparent?: boolean; opacity?: number } = {}): THREE.MeshToonMaterial {
  const m = shellLook().material("slu.lit", { color: hex(color), ...(extra.map ? { map: extra.map } : {}) }) as THREE.MeshToonMaterial;
  m.emissive.setHex(emissive); m.emissiveIntensity = emissiveIntensity;
  if (extra.transparent) { m.transparent = true; m.opacity = extra.opacity ?? 1; }
  return m;
}

/** A per-instance copy of a (possibly shared) slu.lit material, so per-actor tints never leak into the cache. */
export function uniqueCopy(m: THREE.MeshToonMaterial): THREE.MeshToonMaterial {
  return toonUnique(m.color.getHex(), m.emissive.getHex(), m.emissiveIntensity, { transparent: m.transparent, opacity: m.opacity });
}

/** UPSTREAM (v1.4): faceted solids need welded, smoothed normals for a gap-free inverted hull. */
const hullCache = new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry>();
export function hullGeometry(g: THREE.BufferGeometry): THREE.BufferGeometry {
  let h = hullCache.get(g);
  if (!h) {
    const c = g.clone();
    for (const k of Object.keys(c.attributes)) if (k !== "position") c.deleteAttribute(k);
    h = mergeVertices(c, 1e-3);
    h.computeVertexNormals();
    hullCache.set(g, h);
  }
  return h;
}

let sharedOutline: THREE.Material | null = null;
/** Shell outline material (one shared instance, tuned by look.mat.outline). */
export function outlineMaterial(): THREE.Material {
  if (!sharedOutline) sharedOutline = shellLook().materials.createOutlineMaterial();
  return sharedOutline;
}

/** Shell inverted-hull outline, on a welded hull so faceted solids have no gaps. */
export function withOutline(mesh: THREE.Mesh): THREE.Mesh {
  const hull = shellLook().materials.createOutline(mesh, outlineMaterial() as THREE.MeshBasicMaterial);
  hull.geometry = hullGeometry(mesh.geometry);
  hull.userData.outline = true;
  hull.renderOrder = -1;
  return mesh;
}

/** Soft contact shadow for grounding (presentation only). */
const blobMat = new THREE.MeshBasicMaterial({ color: 0x03040a, transparent: true, opacity: 0.45, depthWrite: false });
const blobGeo = new THREE.CircleGeometry(1, 24);
export function blob(r: number): THREE.Mesh { const b = new THREE.Mesh(blobGeo, blobMat); b.rotation.x = -Math.PI / 2; b.position.y = 0.02; b.scale.setScalar(r); return b; }

export function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, outline = true): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  if (outline) withOutline(m);
  return m;
}

/** UPSTREAM (v1.4): full-screen colour inversion (the event). amount 0..1; rim = gold rim pulse for accessibility. */
export const InversionShader = {
  uniforms: { tDiffuse: { value: null as THREE.Texture | null }, amount: { value: 0 }, rim: { value: 0 }, desat: { value: 0 }, white: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float amount; uniform float rim; uniform float desat; uniform float white; varying vec2 vUv;
  void main(){ vec4 c = texture2D(tDiffuse, vUv); vec3 col = c.rgb;
    float l = dot(col, vec3(0.299,0.587,0.114)); col = mix(col, vec3(l), desat);
    col = mix(col, vec3(1.0) - col, amount);
    float e = smoothstep(0.55, 0.98, length(vUv - 0.5) * 1.6); col += vec3(0.95,0.72,0.29) * e * rim;
    col = mix(col, vec3(1.0,0.97,0.9), white);
    gl_FragColor = vec4(col, c.a); }`,
};

/** UPSTREAM (v1.4): stepped afterimages — discrete frames, never motion blur. One instanced draw for all ghosts. */
export class Afterimages {
  private readonly mesh: THREE.InstancedMesh;
  private live: { pos: THREE.Vector3; rot: number; t: number; life: number; from: THREE.Color; to: THREE.Color; scale: number }[] = [];
  private readonly m4 = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly c = new THREE.Color();
  constructor(scene: THREE.Scene, private readonly max = 72) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, depthWrite: false });
    this.mesh = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.36, 1.0, 4, 8), mat, max);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    this.mesh.count = 0; this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }
  get count(): number { return this.live.length; }
  spawn(pos: THREE.Vector3, rotY: number, from: number = PALETTE.gold, to: number = PALETTE.blue, life = 18, scale = 1): void {
    if (this.live.length >= this.max) this.live.shift();
    this.live.push({ pos: pos.clone(), rot: rotY, t: 0, life, from: new THREE.Color(from), to: new THREE.Color(to), scale });
  }
  update(): void {
    let n = 0;
    for (let i = this.live.length - 1; i >= 0; i--) { const a = this.live[i]!; a.t++; if (a.t >= a.life) this.live.splice(i, 1); }
    const up = new THREE.Vector3(0, 1, 0);
    for (const a of this.live) {
      const step = Math.floor((a.t / a.life) * 3) / 3; // gold → blue → fade, in discrete steps
      this.c.copy(a.from).lerp(a.to, Math.min(1, step * 1.5)).multiplyScalar(1 - step);
      this.q.setFromAxisAngle(up, a.rot);
      this.m4.compose(a.pos, this.q, new THREE.Vector3(a.scale, a.scale, a.scale));
      this.mesh.setMatrixAt(n, this.m4); this.mesh.setColorAt(n, this.c); n++;
    }
    this.mesh.count = n; this.mesh.instanceMatrix.needsUpdate = true; if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
