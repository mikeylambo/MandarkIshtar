import type { ActorType, Owner, ProjectileShape, PropType, Vec } from "./types";

export const HISTORY_LEN = 90;

/** Ring buffer of past positions, used by Order Reverse. */
export class PosHistory {
  readonly xs = new Float64Array(HISTORY_LEN);
  readonly zs = new Float64Array(HISTORY_LEN);
  count = 0;
  head = 0;
  push(p: Vec): void {
    this.xs[this.head] = p.x;
    this.zs[this.head] = p.z;
    this.head = (this.head + 1) % HISTORY_LEN;
    if (this.count < HISTORY_LEN) this.count++;
  }
  /** Most recent first; i=0 is the latest sample. */
  get(i: number): Vec {
    const idx = (this.head - 1 - i + HISTORY_LEN * 2) % HISTORY_LEN;
    return { x: this.xs[idx]!, z: this.zs[idx]! };
  }
  pop(): Vec | null {
    if (this.count === 0) return null;
    this.head = (this.head - 1 + HISTORY_LEN) % HISTORY_LEN;
    this.count--;
    return { x: this.xs[this.head]!, z: this.zs[this.head]! };
  }
  clear(): void { this.count = 0; this.head = 0; }
}

export type ActorState = "spawn" | "idle" | "approach" | "telegraph" | "act" | "recover" | "broken" | "stun" | "rewind" | "custom" | "dead";

export interface Actor {
  id: number;
  type: ActorType;
  pos: Vec;
  vel: Vec;
  facing: Vec;
  radius: number;
  certainty: number;
  maxCertainty: number;
  alive: boolean;
  state: ActorState;
  stateT: number;
  /** Local-time accumulator in frames (respects Order Delay). */
  age: number;
  localScale: number;
  delayT: number;
  hitstop: number;
  elite: boolean;
  boss: boolean;
  /** Can never take Certainty damage (Child, Ishtar, Giant body). */
  invulnerable: boolean;
  /** Ignores knockback unless stripped (Constants, bosses). */
  armored: boolean;
  immovable: boolean;
  stripT: number;
  buffT: number;
  buffedBy: number;
  commandedBy: number;
  linkId: number;
  shadowed: boolean;
  spectral: boolean;
  phasedT: number;
  thrownT: number;
  thrownBy: Owner | null;
  thrownSpeed: number;
  brokenT: number;
  brokenBy: string;
  rewindT: number;
  orbitT: number;
  orbitAngle: number;
  neutral: boolean;
  token: boolean;
  history: PosHistory;
  aim: Vec;
  /** Behavior scratch (numbers only so state hashes stay cheap). */
  d: Record<string, number>;
  contactCd: Map<number, number>;
  lastHitFrame: number;
  defeatedBy: string;
  waveIndex: number;
}

export interface Projectile {
  id: number;
  pos: Vec;
  vel: Vec;
  radius: number;
  owner: Owner;
  shooterId: number;
  shape: ProjectileShape;
  life: number;
  alive: boolean;
  bounces: number;
  chain: number;
  redirected: boolean;
  reversed: boolean;
  localScale: number;
  delayT: number;
  phasedT: number;
  ghost: boolean;
  cleanLine: boolean;
  compound: string;
  prisms: number[];
  origin: Vec;
  history: PosHistory;
  orbitT: number;
  orbitAngle: number;
  spawnFrame: number;
  homingTo: number;
  certDmg: number;
  /** Frames during which it ignores its own shooter. */
  graceT: number;
  /** Set for Recurrence law repeats so they are not repeated again. */
  echo: boolean;
  damageScale: number;
}

export interface Prop {
  id: number;
  type: PropType;
  pos: Vec;
  vel: Vec;
  radius: number;
  movable: boolean;
  alive: boolean;
  home: Vec;
  t: number;
  d: Record<string, number>;
  tag: string;
}

export type HazardShape = "circle" | "line" | "ring";
export interface Hazard {
  id: number;
  kind: string;
  shape: HazardShape;
  pos: Vec;
  end: Vec;
  radius: number;
  width: number;
  telegraphT: number;
  telegraphTotal: number;
  activeT: number;
  ownerId: number;
  alive: boolean;
  /** Hit Markov at most once. */
  spent: boolean;
  grow: number;
}

export type TargetKind = "actor" | "projectile" | "prop";
export interface TargetRef { kind: TargetKind; id: number }
