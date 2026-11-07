import type { Behavior } from "../Behavior";

/** Cold-open door. Strike hums; a fireball redirected into its sigil is a Contradiction. */
export const door: Behavior = {
  stats: () => ({ certainty: 30, radius: 1.4, boss: true, armored: true, immovable: true }),
  init(w) { w.director.scripted = true; },
  update() {},
  onStrike(w, a) {
    w.emit("DoorHum", { x: a.pos.x, z: a.pos.z });
    if (!a.d.struck) {
      a.d.struck = 1;
      w.emit("Bark", { kind: "doorRude" });
      // The teach: the wall sconce wakes and spits a slow fireball.
      for (const p of w.props) if (p.type === "sconce" && p.d.off) { p.d.off = 0; p.d.offset = (p.d.every ?? 200) - (p.t % (p.d.every ?? 200)) - 50; }
      w.emit("GlyphHint", { kind: "vector" });
    }
    return "handled";
  },
  onOp(w, a) { w.emit("DoorHum", { x: a.pos.x, z: a.pos.z }); return "handled"; },
  onProjectile(w, a, p) {
    if (p.redirected) w.ledger.exploit(w, a, 1, { kind: "exploit", label: "door" });
    return "handled";
  },
  onRemoved(w) { w.emit("Bark", { kind: "doorSolved" }); w.director.complete(); },
};
