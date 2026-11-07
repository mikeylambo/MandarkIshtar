// Game layer over the shell 1.3 Game-Feel Kit (@slu/web-shell/feel): trauma shake, post pulses and flashes
// come from the shell FeelDirector + impact bundles. Hitstop stays authoritative in the deterministic sim
// (World.hitstop), so bundles carry no hitstop. Kept here: the camera punch vector and the inversion envelope.
import { FeelDirector, type ImpactBundle } from "@slu/web-shell/feel";
import type { TunableRegistry } from "@slu/web-shell/tuning";
import type { SimEvent } from "../sim/events";
import { FEEL } from "../data/feel";

/** Mandark impact bundles (tunable as feel.impact.<id>). Red is reserved for breaks; gold for Markov. */
export const MANDARK_BUNDLES: ImpactBundle[] = [
  { id: "mi.redirect", trauma: 0.08, vfx: [{ id: "fx.impact.burst", scale: 0.35 }] },
  { id: "mi.contradiction", trauma: 0.42, vfx: [{ id: "fx.shockwave.ring", scale: 0.55 }], post: [{ id: "chromatic.hit", amount: 0.55 }, { id: "vignette.squeeze", amount: 0.4 }] },
  { id: "mi.qed", trauma: 0.26, vfx: [{ id: "fx.impact.burst", scale: 1.1 }], post: [{ id: "bloom.flare", amount: 0.9 }] },
  { id: "mi.sealLost", trauma: 0.38, post: [{ id: "vignette.squeeze", amount: 0.9 }, { id: "chromatic.hit", amount: 0.45 }] },
  { id: "mi.shatter", trauma: 0.65, vfx: [{ id: "fx.impact.burst", scale: 1.6 }], post: [{ id: "chromatic.hit", amount: 1 }], flash: { token: "danger", amount: 0.14 } },
  { id: "mi.stomp", trauma: 0.55, vfx: [{ id: "fx.smoke.puff", scale: 1.2 }, { id: "fx.shockwave.ring", scale: 0.9 }] },
  { id: "mi.dawn", trauma: 0, post: [{ id: "bloom.flare", amount: 1 }], flash: { token: "highlight", amount: 0.5 } },
];

export interface FeelSinks { vfx: (id: string, pos: { x: number; y: number; z: number } | undefined, scale: number, tint?: string) => void; post: (id: string, amount: number) => void; flash: (token: string, amount: number) => void }

export class FeelKit {
  readonly director: FeelDirector;
  punch = { x: 0, z: 0, t: 0 };
  inversion = 0;
  musicDropT = 0;

  constructor(sinks: FeelSinks, registry: TunableRegistry, private readonly opts: () => { shake: number; flash: number; reducedMotion: boolean; vibration: boolean }) {
    this.director = new FeelDirector({
      vfx: (id, c) => sinks.vfx(id, c.position as { x: number; y: number; z: number } | undefined, c.scale, id === "fx.shockwave.ring" ? "danger" : id === "fx.impact.burst" ? "ember" : undefined),
      post: (id, a) => sinks.post(id, a),
      flash: (t, a) => sinks.flash(t, a),
    }, { registry, bundles: MANDARK_BUNDLES });
  }

  get shakeOffset(): { x: number; y: number; z: number } { return this.director.shake.offset; }

  onEvent(e: SimEvent, haptic: (id: string) => void, mx: number, mz: number): void {
    const r = FEEL[e.type];
    if (!r) return;
    const o = this.opts();
    const position = e.x !== undefined && e.z !== undefined ? { x: e.x, y: 1, z: e.z } : undefined;
    if (r.impact) this.director.impact(r.impact, { position });
    else if (r.shake) this.director.addTrauma(r.shake * 0.9);
    if (r.punch && e.x !== undefined && e.z !== undefined) {
      const dx = e.x - mx, dz = e.z - mz, l = Math.hypot(dx, dz) || 1;
      this.punch = { x: (dx / l) * r.punch, z: (dz / l) * r.punch, t: r.punchFrames ?? 10 };
    }
    if (r.inversionFrames) this.inversion = Math.max(this.inversion, r.inversionFrames * o.flash);
    if (r.haptic) haptic(r.haptic);
    if (e.type === "HubrisShatter") this.musicDropT = 120;
  }

  /** One presentation frame (real dt). The sim's own clock is unaffected. */
  tick(realDt: number): void {
    const o = this.opts();
    this.director.accessibility = { screenShake: o.shake, flashes: o.flash, vibration: o.vibration, reducedMotion: o.reducedMotion };
    this.director.step(realDt);
    if (this.punch.t > 0) this.punch.t--;
    if (this.inversion > 0) this.inversion--;
    if (this.musicDropT > 0) this.musicDropT--;
  }
}
