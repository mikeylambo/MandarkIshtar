import * as THREE from "three";

/**
 * Operation glyph decals (presentation only): flat additive cards drawn from the same silhouettes as the HUD op icons,
 * so every op reads by shape in the world as well as in the HUD — Vector chevrons, Phase glass shards, Order clock,
 * Null broken ring. Pooled meshes; only live glyphs draw.
 */
export type GlyphKind = "chevron" | "shard" | "clock" | "hand" | "nullring" | "hourglass";

const TEX = new Map<GlyphKind, THREE.CanvasTexture>();
function texture(kind: GlyphKind): THREE.CanvasTexture {
  let t = TEX.get(kind);
  if (t) return t;
  const S = 256, c = document.createElement("canvas"); c.width = c.height = S;
  const g = c.getContext("2d")!; g.translate(S / 2, S / 2);
  g.fillStyle = "#fff"; g.strokeStyle = "#fff"; g.lineJoin = "miter";
  const glow = (b: number) => { g.shadowColor = "#fff"; g.shadowBlur = b; };
  switch (kind) {
    case "chevron": glow(18); for (const off of [-46, 34]) { g.beginPath(); g.moveTo(off - 40, -90); g.lineTo(off + 6, -90); g.lineTo(off + 56, 0); g.lineTo(off + 6, 90); g.lineTo(off - 40, 90); g.lineTo(off + 10, 0); g.closePath(); g.globalAlpha = off < 0 ? 0.55 : 1; g.fill(); } break;
    case "shard": glow(14); g.globalAlpha = 0.5; g.beginPath(); g.moveTo(-40, -110); g.lineTo(60, -70); g.lineTo(30, 110); g.lineTo(-60, 70); g.closePath(); g.fill(); g.globalAlpha = 1; g.lineWidth = 7; g.stroke(); g.beginPath(); g.moveTo(-30, -60); g.lineTo(40, -40); g.lineWidth = 5; g.stroke(); break;
    case "clock": glow(16); g.lineWidth = 9; g.beginPath(); g.arc(0, 0, 104, 0, Math.PI * 2); g.stroke(); g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 86, 0, Math.PI * 2); g.stroke();
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; const long = i % 3 === 0; g.lineWidth = long ? 8 : 4; g.beginPath(); g.moveTo(Math.sin(a) * (long ? 62 : 72), -Math.cos(a) * (long ? 62 : 72)); g.lineTo(Math.sin(a) * 84, -Math.cos(a) * 84); g.stroke(); } break;
    case "hand": glow(12); g.beginPath(); g.moveTo(-7, 10); g.lineTo(0, -82); g.lineTo(7, 10); g.closePath(); g.fill(); g.beginPath(); g.arc(0, 0, 12, 0, Math.PI * 2); g.fill(); break;
    case "hourglass": glow(14); g.lineWidth = 8; g.beginPath(); g.moveTo(-56, -90); g.lineTo(56, -90); g.lineTo(8, 0); g.lineTo(56, 90); g.lineTo(-56, 90); g.lineTo(-8, 0); g.closePath(); g.stroke(); g.beginPath(); g.moveTo(-30, 62); g.lineTo(30, 62); g.lineTo(0, 30); g.closePath(); g.fill(); break;
    case "nullring": glow(20); g.lineWidth = 22; for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.2; g.beginPath(); g.arc(0, 0, 92, a, a + 1.15); g.stroke(); } g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 60, 0, Math.PI * 2); g.globalAlpha = 0.5; g.stroke(); break;
  }
  t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; TEX.set(kind, t);
  return t;
}

interface Glyph {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; life: number; t: number;
  x: number; y: number; z: number; vx: number; vz: number; s0: number; s1: number; rot: number; spin: number; flat: boolean; yaw: number; fadeIn: number;
}
export interface GlyphSpec {
  kind: GlyphKind; x: number; z: number; y?: number; color: number; life: number;
  size?: number; endSize?: number; yaw?: number; spin?: number; vx?: number; vz?: number; flat?: boolean; intensity?: number; fadeIn?: number;
}

const POOL = 64;
export class OpGlyphs {
  private readonly pool: Glyph[] = [];
  private readonly live: Glyph[] = [];
  private readonly geo = new THREE.PlaneGeometry(1, 1);
  readonly group = new THREE.Group();
  constructor(scene: THREE.Scene) {
    this.group.name = "op-glyphs";
    scene.add(this.group);
  }
  spawn(s: GlyphSpec): void {
    let g = this.pool.pop();
    if (!g) {
      if (this.live.length >= POOL) { g = this.live.shift()!; }
      else {
        const mat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(this.geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 5; this.group.add(mesh);
        g = { mesh, mat, life: 0, t: 0, x: 0, y: 0, z: 0, vx: 0, vz: 0, s0: 1, s1: 1, rot: 0, spin: 0, flat: true, yaw: 0, fadeIn: 0 };
      }
    }
    g.mat.map = texture(s.kind); g.mat.needsUpdate = true;
    g.mat.color.setHex(s.color).multiplyScalar(s.intensity ?? 1.6);
    Object.assign(g, { life: s.life, t: 0, x: s.x, y: s.y ?? 0.12, z: s.z, vx: s.vx ?? 0, vz: s.vz ?? 0, s0: s.size ?? 1.5, s1: s.endSize ?? s.size ?? 1.5, rot: 0, spin: s.spin ?? 0, flat: s.flat ?? true, yaw: s.yaw ?? 0, fadeIn: s.fadeIn ?? 3 });
    g.mesh.visible = true;
    this.live.push(g);
  }
  /** One presentation tick (called once per rendered sim frame, like the line VFX). */
  update(camera: THREE.Camera): void {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const g = this.live[i]!;
      g.t++;
      if (g.t > g.life) { g.mesh.visible = false; this.live.splice(i, 1); this.pool.push(g); continue; }
      const k = g.t / g.life, ease = 1 - (1 - k) * (1 - k);
      g.x += g.vx; g.z += g.vz; g.vx *= 0.9; g.vz *= 0.9; g.rot += g.spin;
      g.mesh.position.set(g.x, g.y, g.z);
      g.mesh.scale.setScalar(g.s0 + (g.s1 - g.s0) * ease);
      if (g.flat) g.mesh.rotation.set(-Math.PI / 2, 0, g.yaw + g.rot);
      else { g.mesh.quaternion.copy(camera.quaternion); g.mesh.rotateZ(g.rot); }
      g.mat.opacity = Math.min(1, g.t / Math.max(1, g.fadeIn)) * (k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4);
    }
  }
  clear(): void { for (const g of this.live) { g.mesh.visible = false; this.pool.push(g); } this.live.length = 0; }
  get count(): number { return this.live.length; }
}
