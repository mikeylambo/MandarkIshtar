// UPSTREAM: SLU Look Kit (toon ramp, inverted-hull outline, inversion pass, stepped afterimages).
// The shell at 6f08d17 has no Look Kit; these use the capability names from GDD §12 so they can be extracted.
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PALETTE } from "./palette";

/** Faceted solids need welded, smoothed normals for a gap-free inverted hull. */
const hullCache = new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry>();
function hullGeometry(g: THREE.BufferGeometry): THREE.BufferGeometry {
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

let ramp: THREE.DataTexture | null = null;
/** 3-step toon ramp. */
export function toonRamp(): THREE.DataTexture {
  if (ramp) return ramp;
  const data = new Uint8Array([70, 70, 70, 255, 165, 165, 165, 255, 255, 255, 255, 255]);
  ramp = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  ramp.minFilter = THREE.NearestFilter; ramp.magFilter = THREE.NearestFilter; ramp.needsUpdate = true;
  return ramp;
}

const toonCache = new Map<string, THREE.MeshToonMaterial>();
export function toon(color: number, emissive = 0, emissiveIntensity = 0, key = ""): THREE.MeshToonMaterial {
  const k = `${color}:${emissive}:${emissiveIntensity}:${key}`;
  let m = toonCache.get(k);
  if (!m) { m = new THREE.MeshToonMaterial({ color, gradientMap: toonRamp(), emissive, emissiveIntensity }); toonCache.set(k, m); }
  return m;
}
/** Unshared toon material (for per-instance tints/flashes). */
export function toonUnique(color: number, emissive = 0, emissiveIntensity = 0): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({ color, gradientMap: toonRamp(), emissive, emissiveIntensity });
}

/** Inverted-hull outline ≈1.5 px at 1080p via a shader that extrudes along normals in view space. */
const outlineMat = new THREE.ShaderMaterial({
  uniforms: { thickness: { value: 0.035 }, color: { value: new THREE.Color(PALETTE.ink) } },
  vertexShader: `uniform float thickness; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vec3 n = normalize(normalMatrix * normal); mv.xyz += n * thickness * (-mv.z) * 0.045; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform vec3 color; void main(){ gl_FragColor = vec4(color,1.0); }`,
  side: THREE.BackSide,
});
export function outlineMaterial(): THREE.ShaderMaterial { return outlineMat; }

export function withOutline(mesh: THREE.Mesh, scale = 1): THREE.Mesh {
  const o = new THREE.Mesh(hullGeometry(mesh.geometry), outlineMat);
  o.scale.setScalar(scale);
  o.userData.outline = true;
  o.renderOrder = -1;
  mesh.add(o);
  return mesh;
}

/** Soft contact shadow for grounding (presentation only). */
const blobMat = new THREE.MeshBasicMaterial({ color: 0x0a0e1e, transparent: true, opacity: 0.28, depthWrite: false });
const blobGeo = new THREE.CircleGeometry(1, 24);
export function blob(r: number): THREE.Mesh { const b = new THREE.Mesh(blobGeo, blobMat); b.rotation.x = -Math.PI / 2; b.position.y = 0.02; b.scale.setScalar(r); return b; }

export function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, outline = true): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = false; m.receiveShadow = false;
  if (outline) withOutline(m);
  return m;
}

/** Full-screen colour inversion (the event). amount 0..1; rim mode = gold rim pulse for accessibility. */
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

/** Stepped afterimages: discrete frames, never motion blur. Pooled ghost clones. */
export class Afterimages {
  private pool: THREE.Mesh[] = [];
  private live: { m: THREE.Mesh; t: number; life: number; from: THREE.Color; to: THREE.Color }[] = [];
  private readonly geo: THREE.BufferGeometry;
  constructor(private readonly scene: THREE.Scene, max = 60) {
    this.geo = new THREE.CapsuleGeometry(0.36, 1.0, 4, 8);
    for (let i = 0; i < max; i++) {
      const m = new THREE.Mesh(this.geo, new THREE.MeshBasicMaterial({ color: PALETTE.gold, transparent: true, opacity: 0.5, depthWrite: false }));
      m.visible = false; scene.add(m); this.pool.push(m);
    }
  }
  get count(): number { return this.live.length; }
  spawn(pos: THREE.Vector3, rotY: number, from: number = PALETTE.gold, to: number = PALETTE.blue, life = 18, scale = 1): void {
    const m = this.pool.pop() ?? this.live.shift()?.m;
    if (!m) return;
    m.visible = true; m.position.copy(pos); m.rotation.y = rotY; m.scale.setScalar(scale);
    this.live.push({ m, t: 0, life, from: new THREE.Color(from), to: new THREE.Color(to) });
  }
  update(): void {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const a = this.live[i]!;
      a.t++;
      const k = a.t / a.life;
      const step = Math.floor(k * 3) / 3; // discrete steps: gold → blue → fade
      const mat = a.m.material as THREE.MeshBasicMaterial;
      mat.color.copy(a.from).lerp(a.to, Math.min(1, step * 1.5));
      mat.opacity = 0.55 * (1 - step);
      if (a.t >= a.life) { a.m.visible = false; this.pool.push(a.m); this.live.splice(i, 1); }
    }
  }
}
