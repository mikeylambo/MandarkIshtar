import * as THREE from "three";
import type { World } from "../sim/World";
import type { Actor } from "../sim/entities";
import type { TheoremType } from "../sim/types";
import { hullGeometry, outlineMaterial, toonUnique } from "../look/LookKit";
import { PALETTE } from "../look/palette";
import { theoremGeometry } from "./figures";

export const THEOREM_TYPES: TheoremType[] = ["axiom", "corollary", "variable", "constant", "iterator", "paradox", "oracle", "herald"];
const CAP = 64;

interface TypeSet { solid: THREE.InstancedMesh; outline: THREE.InstancedMesh; ghost: THREE.InstancedMesh }

/**
 * All Theorems render as instanced draws: per type one solid + one outline (+ one ghost layer for spectral/phased),
 * and every Certainty ring in a single instanced draw (arc length per instance in the shader).
 * Peak density (40 Theorems) costs ≈ 20 draws instead of ≈ 120.
 */
export class TheoremInstancer {
  private readonly sets = new Map<TheoremType, TypeSet>();
  private readonly rings: THREE.InstancedMesh;
  private readonly ringFrac: THREE.InstancedBufferAttribute;
  private readonly ringCol: THREE.InstancedBufferAttribute;
  private readonly halos: THREE.InstancedMesh;
  private readonly irises: THREE.InstancedMesh;
  private readonly flags: THREE.InstancedMesh;
  private readonly m4 = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly e = new THREE.Euler();
  private readonly v = new THREE.Vector3();
  private readonly s = new THREE.Vector3();
  private readonly c = new THREE.Color();
  highContrast = false;

  constructor(private readonly root: THREE.Object3D) {
    for (const t of THREE_TYPES()) {
      const geo = theoremGeometry(t);
      if (t === "iterator") geo.rotateX(Math.PI / 2);
      const solidMat = toonUnique(0xffffff, PALETTE.blue, 0.12);
      if (t === "oracle") { solidMat.transparent = true; solidMat.opacity = 0.6; }
      const ghostMat = toonUnique(0xffffff, PALETTE.blue, 0.3, { transparent: true, opacity: 0.3 });
      ghostMat.depthWrite = false;
      const solid = this.im(geo, solidMat, true);
      const ghost = this.im(geo, ghostMat, true);
      const outline = this.im(hullGeometry(geo), outlineMaterial(), false);
      outline.renderOrder = -1;
      this.sets.set(t, { solid, ghost, outline });
    }
    // Certainty rings: one draw, arc + colour per instance.
    const ringGeo = new THREE.RingGeometry(1, 1.13, 48);
    ringGeo.rotateX(-Math.PI / 2);
    this.ringFrac = new THREE.InstancedBufferAttribute(new Float32Array(CAP * 2), 1);
    this.ringCol = new THREE.InstancedBufferAttribute(new Float32Array(CAP * 2 * 3), 3);
    ringGeo.setAttribute("aFrac", this.ringFrac);
    ringGeo.setAttribute("aCol", this.ringCol);
    const ringMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: `attribute float aFrac; attribute vec3 aCol; varying float vFrac; varying vec3 vCol; varying vec2 vP;
        void main(){ vFrac = aFrac; vCol = aCol; vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying float vFrac; varying vec3 vCol; varying vec2 vP;
        void main(){ float a = atan(vP.x, vP.y) / 6.28318530718; a = a < 0.0 ? a + 1.0 : a; if (a > vFrac) discard; gl_FragColor = vec4(vCol, 0.9); }`,
    });
    this.rings = new THREE.InstancedMesh(ringGeo, ringMat, CAP * 2);
    this.prep(this.rings);
    this.halos = this.im(new THREE.TorusGeometry(1, 0.06, 6, 32).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xc7b46a }), false);
    this.irises = this.im(new THREE.TorusGeometry(0.3, 0.05, 6, 24), new THREE.MeshBasicMaterial({ color: PALETTE.blue }), false);
    this.flags = this.im(new THREE.PlaneGeometry(0.9, 0.55).translate(0.45, 0.45, 0), new THREE.MeshBasicMaterial({ color: PALETTE.blueDeep, side: THREE.DoubleSide }), false);
  }

  private prep(m: THREE.InstancedMesh): void { m.count = 0; m.frustumCulled = false; m.visible = false; this.root.add(m); }
  private im(geo: THREE.BufferGeometry, mat: THREE.Material, colored: boolean): THREE.InstancedMesh {
    const m = new THREE.InstancedMesh(geo, mat, CAP);
    if (colored) m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(CAP * 3), 3);
    this.prep(m);
    return m;
  }

  static isTheorem(a: Actor): boolean { return (THREE_TYPES() as string[]).includes(a.type); }

  update(w: World, at: (a: Actor) => [number, number], t: number): void {
    const n = new Map<THREE.InstancedMesh, number>();
    const put = (m: THREE.InstancedMesh, color?: THREE.Color) => { const i = n.get(m) ?? 0; if (i >= m.instanceMatrix.count) return; m.setMatrixAt(i, this.m4); if (color) m.setColorAt(i, color); n.set(m, i + 1); };
    let ri = 0;
    for (const a of w.actors) {
      if (!a.alive || !TheoremInstancer.isTheorem(a)) continue;
      const set = this.sets.get(a.type as TheoremType)!;
      const [x, z] = at(a);
      const tele = a.state === "telegraph" || (a.d.declaring ?? 0) > 0;
      const spawnK = a.state === "spawn" ? Math.max(0.05, 1 - a.stateT / 30) : 1;
      const pulse = tele ? 1 + Math.sin(t * 30) * 0.06 : 1;
      const sc = spawnK * pulse;
      const spins = a.type !== "herald" && a.type !== "iterator";
      const y = (a.type === "herald" ? 1.0 : 0.85) + (spins ? Math.sin(t * 2 + a.id) * 0.08 : 0);
      const yaw = spins ? t * (tele ? 6 : 1.2) + a.id : Math.atan2(a.facing.x, a.facing.z);
      this.e.set(a.type === "iterator" ? 0 : 0, yaw, a.type === "iterator" ? t * 2 : 0);
      this.q.setFromEuler(this.e);
      this.m4.compose(this.v.set(x, y, z), this.q, this.s.set(sc, sc, sc));
      // Shape first; colour tint second: broken = red, commanded = blue, telegraph = pale blue (white when high-contrast), freed = gold.
      const broken = a.state === "broken";
      this.c.setHex(broken ? 0xff8a8a : a.neutral ? 0xffe0a0 : a.commandedBy ? 0xa9c2ff : tele ? (this.highContrast ? 0xffffff : 0xcfe0ff) : a.buffT > 0 ? 0xe2eaff : 0xfbfaf6);
      if (broken) this.c.lerp(new THREE.Color(PALETTE.red), 0.35 + Math.sin(t * 20) * 0.2);
      const ghost = a.spectral || a.phasedT > 0;
      put(ghost ? set.ghost : set.solid, this.c);
      if (!ghost) put(set.outline);
      if (a.type === "oracle") put(this.irises);
      if (a.type === "herald") put(this.flags);
      if (a.elite && !a.d.eliteStripped) { this.m4.compose(this.v.set(x, 1.9, z), new THREE.Quaternion(), this.s.set(a.radius + 0.25, 1, a.radius + 0.25)); put(this.halos); }
      // Certainty ring
      if (ri < this.rings.instanceMatrix.count) {
        const r = (a.radius + 0.15) * spawnK;
        this.m4.compose(this.v.set(x, 0.04, z), new THREE.Quaternion(), this.s.set(r, 1, r));
        this.rings.setMatrixAt(ri, this.m4);
        this.ringFrac.setX(ri, a.maxCertainty > 0 ? Math.max(0.001, a.certainty / a.maxCertainty) : 0);
        this.c.setHex(broken ? PALETTE.red : PALETTE.blue);
        this.ringCol.setXYZ(ri, this.c.r, this.c.g, this.c.b);
        ri++;
      }
    }
    const all: THREE.InstancedMesh[] = [this.halos, this.irises, this.flags];
    for (const s of this.sets.values()) all.push(s.solid, s.ghost, s.outline);
    for (const m of all) { const c = n.get(m) ?? 0; m.count = c; m.visible = c > 0; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
    this.rings.count = ri; this.rings.visible = ri > 0; this.rings.instanceMatrix.needsUpdate = true; this.ringFrac.needsUpdate = true; this.ringCol.needsUpdate = true;
  }
}

function THREE_TYPES(): TheoremType[] { return THEOREM_TYPES; }
