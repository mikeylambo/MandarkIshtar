import * as THREE from "three";
import { CAMERA } from "../data/camera";
import type { World } from "../sim/World";

/** High-angle chase camera (GDD Camera module). Presentation only; never read by the sim. */
export class CameraRig {
  private focus = new THREE.Vector3();
  private yaw = 0;
  private yawTarget = 0;
  private pitch: number = CAMERA.pitchDeg;
  private distance: number = CAMERA.distance;
  private flourishT = 0;
  private introT = 0;
  zoom = 1;
  reducedMotion = false;
  /** Title/menu backdrop: a low, slow orbit of the arena centre that lets the moon and skyline pass through frame. */
  cinematic = false;

  constructor(private readonly cam: THREE.PerspectiveCamera) { cam.fov = CAMERA.fovDeg; }

  reset(w: World): void {
    this.cinematic = false;
    this.yaw = this.yawTarget = (w.def.arena.yawDeg * Math.PI) / 180;
    this.focus.set(w.markov.pos.x, 0, w.markov.pos.z);
    this.pitch = w.def.boss === "giant" ? CAMERA.giant.pitchDeg : CAMERA.pitchDeg;
    this.distance = w.def.boss === "giant" ? CAMERA.giant.distance : CAMERA.distance;
    this.introT = w.def.kind === "boss" && !w.def.echo ? CAMERA.bossIntroFrames : 0;
  }
  skipIntro(): void { this.introT = 0; }
  flourish(): void { if (!this.reducedMotion) this.flourishT = CAMERA.roomClearFrames; }

  /** shake: the shell TraumaShake offset (already scaled by the accessibility slider). */
  update(w: World, mx: number, mz: number, punch: { x: number; z: number; t: number }, shake: { x: number; y: number; z: number }): void {
    const def = w.def;
    if (this.cinematic) { this.orbit(); return; }
    let pitch: number = CAMERA.pitchDeg, dist: number = CAMERA.distance;
    if (def.boss === "giant") { pitch = CAMERA.giant.pitchDeg; dist = CAMERA.giant.distance; }
    if (def.boss === "child") dist = CAMERA.child.distance;
    if (def.kind === "hub") { pitch = 50; dist = 20; }
    if (def.boss === "ishtar" && (w.flags.ishtarPhase ?? 0) >= 3) { pitch = CAMERA.ishtarP3.pitchDeg; dist = CAMERA.ishtarP3.distance; }
    if (w.status === "intro") dist *= 1 - CAMERA.lawCardZoom;
    // focus: 0.7 Markov + 0.3 threat centroid (within 14 u); boss framing wins
    let tx = 0, tz = 0, n = 0;
    for (const a of w.actors) {
      if (!a.alive || a.neutral) continue;
      const d = Math.hypot(a.pos.x - mx, a.pos.z - mz);
      if (d > CAMERA.threatRange && !a.boss) continue;
      const wgt = a.boss ? 2 : 1;
      tx += a.pos.x * wgt; tz += a.pos.z * wgt; n += wgt;
    }
    if (def.boss === "child" && w.director.boss) { tx = w.director.boss.pos.x; tz = w.director.boss.pos.z; n = 1; }
    let fx = mx, fz = mz;
    if (n > 0) { fx = mx * CAMERA.markovWeight + (tx / n) * CAMERA.threatWeight; fz = mz * CAMERA.markovWeight + (tz / n) * CAMERA.threatWeight; }
    // clamp so Markov stays in the center 60%
    const maxOff = dist * 0.18;
    const ox = fx - mx, oz = fz - mz, ol = Math.hypot(ox, oz);
    if (ol > maxOff) { fx = mx + (ox / ol) * maxOff; fz = mz + (oz / ol) * maxOff; }
    const k = 1 / CAMERA.dampingFrames;
    this.focus.x += (fx - this.focus.x) * k; this.focus.z += (fz - this.focus.z) * k;
    this.pitch += (pitch - this.pitch) * 0.08; this.distance += (dist / this.zoom - this.distance) * 0.08;
    if (this.flourishT > 0) { this.flourishT--; const t = 1 - this.flourishT / CAMERA.roomClearFrames; this.yaw = this.yawTarget + Math.sin(t * Math.PI) * (CAMERA.roomClearYawDeg * Math.PI / 180); }
    else this.yaw += (this.yawTarget - this.yaw) * 0.1;
    let yaw = this.yaw, d = this.distance, p = this.pitch;
    if (this.introT > 0) { this.introT--; const t = this.introT / CAMERA.bossIntroFrames; yaw += t * Math.PI * 0.6; d *= 1 + t * 0.25; p -= t * 12; }
    const pr = (p * Math.PI) / 180;
    const pf = punch.t > 0 ? punch.t / 10 : 0;
    const cx = this.focus.x + punch.x * pf, cz = this.focus.z + punch.z * pf;
    this.cam.position.set(cx - Math.sin(yaw) * Math.cos(pr) * d, Math.sin(pr) * d, cz - Math.cos(yaw) * Math.cos(pr) * d);
    this.cam.position.x += shake.x; this.cam.position.y += shake.y; this.cam.position.z += shake.z;
    const lookY = def.boss === "ishtar" && (w.flags.ishtarPhase ?? 0) >= 3 ? 6 : 0;
    this.cam.lookAt(cx, lookY, cz);
  }
  private orbitYaw = 0;
  private orbit(): void {
    const C = CAMERA.title;
    if (!this.reducedMotion) this.orbitYaw += C.yawPerFrame;
    this.focus.multiplyScalar(0.94); // ease onto the arena centre
    this.pitch += (C.pitchDeg - this.pitch) * 0.05; this.distance += (C.distance - this.distance) * 0.05;
    const yaw = this.yaw + this.orbitYaw, pr = (this.pitch * Math.PI) / 180, d = this.distance;
    this.cam.position.set(this.focus.x - Math.sin(yaw) * Math.cos(pr) * d, Math.sin(pr) * d + C.lookY * 0.4, this.focus.z - Math.cos(yaw) * Math.cos(pr) * d);
    this.cam.lookAt(this.focus.x, C.lookY, this.focus.z);
  }
  get introActive(): boolean { return this.introT > 0; }
}
