/**
 * Sim → presentation events. The sim only emits; VFX, audio, HUD, camera and haptics subscribe.
 * Payload is a flat bag so events can be serialized for replays/telemetry.
 */
export const SIM_EVENT_TYPES = [
  "OpCast", "OpFizzle", "OpHoldStart", "CompoundCast", "Redirect", "Contradiction", "Broken", "Recovered", "QED", "QEDMissed",
  "RingOut", "Defeated", "LawDeclared", "LawTierChanged", "SealLost", "HubrisChanged", "HubrisTaunt", "HubrisShatter",
  "StillnessProgress", "InsightStart", "InsightEnd", "RegaliaLost", "RegaliaReturned", "RegaliaClick", "ArenaClear", "TrialClear",
  "DawnProgress", "StepCast", "StepStutter", "StrikeSwing", "StrikeHit", "PhaseIn", "PhaseOut", "DelayStamp", "ReverseStart",
  "NullImplode", "PropertyPeel", "OrbitStart", "OrbitContact", "Clash", "ProjectileSpawn", "ProjectileDie", "WallImpact",
  "Telegraph", "EnemyAttack", "EnemySpawn", "Bark", "Sentence", "MorningBell", "Prophecy", "ProphetStall", "ChildGiggle",
  "ChildProgress", "Collapse", "Temptation", "TemptationTaken", "PhaseChange", "BossIntro", "WaveStart", "Flourish", "Freed",
  "MiniLaw", "MiniLawFailed", "PrismPass", "Stomp", "Shockwave", "Kneel", "Copy", "NameReveal", "Credits", "DoorHum", "Interact",
  "Hitstop", "Echo", "Erase", "SlowMoTeach", "GlyphHint", "EncounterLost", "EncounterStart",
] as const;
export type SimEventType = (typeof SIM_EVENT_TYPES)[number];

export interface SimEvent {
  type: SimEventType;
  frame: number;
  x?: number;
  z?: number;
  id?: number;
  target?: number;
  op?: string;
  value?: number;
  kind?: string;
  text?: string;
  dx?: number;
  dz?: number;
}
