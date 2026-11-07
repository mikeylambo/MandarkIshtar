// UPSTREAM: SLU game-feel kit (hitstop/shake/haptic recipes). Not present in the shell at 6f08d17.
import type { SimEvent } from "../sim/events";
import { FEEL, type FeelRecipe } from "../data/feel";

/** Presentation-side feel state: screen shake, camera punches, inversion and flash envelopes. Sim owns hitstop. */
export class FeelKit {
  shake = 0;
  punch = { x: 0, z: 0, t: 0 };
  inversion = 0;
  desat = 0;
  white = 0;
  musicDropT = 0;
  constructor(private readonly opts: () => { shake: number; flash: number; rim: boolean }) {}

  recipe(e: SimEvent): FeelRecipe | undefined { return FEEL[e.type]; }

  onEvent(e: SimEvent, haptic: (id: string) => void, mx: number, mz: number): void {
    const r = FEEL[e.type];
    if (!r) return;
    const o = this.opts();
    if (r.shake) this.shake = Math.max(this.shake, r.shake * o.shake);
    if (r.punch && e.x !== undefined && e.z !== undefined) {
      const dx = e.x - mx, dz = e.z - mz, l = Math.hypot(dx, dz) || 1;
      this.punch = { x: (dx / l) * r.punch, z: (dz / l) * r.punch, t: r.punchFrames ?? 10 };
    }
    if (r.inversionFrames) this.inversion = Math.max(this.inversion, r.inversionFrames * o.flash);
    if (r.haptic) haptic(r.haptic);
    if (e.type === "HubrisShatter") this.musicDropT = 120;
  }

  tick(): void {
    this.shake *= 0.82; if (this.shake < 0.002) this.shake = 0;
    if (this.punch.t > 0) this.punch.t--;
    if (this.inversion > 0) this.inversion--;
    if (this.musicDropT > 0) this.musicDropT--;
  }
}
