/**
 * Bark sheet. Markov: theatrical, funny, arrogant; softening across Trial 7 and the Descent; joyful in the Ascent.
 * Every line has a subtitle and a VO file key (vo.<id>) resolved through assets/manifest.json.
 */
export type Speaker = "markov" | "ishtar" | "voice" | "flame" | "giant" | "mirror" | "king" | "judge" | "prophet" | "child";
export interface Bark { id: string; speaker: Speaker; context: string; line: string; phase?: "early" | "soft" | "silent" | "joy" }

let n = 0;
const B = (context: string, line: string, speaker: Speaker = "markov", phase?: Bark["phase"]): Bark => ({ id: `${speaker}.${context}.${(n++).toString().padStart(3, "0")}`, speaker, context, line, phase });

export const BARKS: Bark[] = [
  // Cold open (scripted)
  B("coldOpenIntro", "There is no possible reason this mechanism should resist me."),
  B("coldOpenBeat", "…"),
  B("doorRude", "Fascinating. Rude, but fascinating."),
  B("doorSolved", "Heat is not the enemy. Direction is."),
  // Room clear
  B("clear", "Predictable."),
  B("clear", "Q.E.D. Obviously."),
  B("clear", "And they call that a law."),
  B("clear", "Elegant. As expected. Of me."),
  B("clear", "File it under 'trivial'."),
  B("clear", "Next."),
  B("clear", "I'd have preferred a challenge. I'll settle for applause."),
  B("clear", "A proof so clean it squeaks."),
  B("clearSoft", "…That one was hard. Good.", "markov", "soft"),
  B("clearSoft", "Done. I think I understood it, this time.", "markov", "soft"),
  B("clearJoy", "Ha! Again! Do that again!", "markov", "joy"),
  B("clearJoy", "Oh, I'd forgotten how much fun this is.", "markov", "joy"),
  // Q.E.D.
  B("qed", "Quod erat demonstrandum."),
  B("qed", "Proof complete."),
  B("qed", "And so it is written. By me."),
  B("qed", "Filed."),
  B("qed", "You were a lovely lemma."),
  B("qed", "There. Was that so hard?"),
  // Contradiction
  B("contradiction", "Your own law ends you."),
  B("contradiction", "Ah. A contradiction. My favourite."),
  B("contradiction", "You've been refuted."),
  B("contradiction", "Counterexample: you."),
  B("contradiction", "Assume you're right. See? Absurd."),
  B("contradiction", "That's what we call a reductio."),
  // Redirect / chains
  B("redirect", "I decide where that goes."),
  B("redirect", "Return to sender."),
  B("redirect", "Not today, thank you."),
  B("chain", "And again! And AGAIN!"),
  B("chain", "Geometry is a love language."),
  B("enemyByEnemy", "They did it to themselves. I merely pointed."),
  B("enemyByEnemy", "Friendly fire. Fire-ly friendly."),
  B("ringOut", "Mind the edge. Oh. Too late."),
  B("ringOut", "Gravity agrees with me."),
  // Taunt (12 cackle variants)
  B("taunt", "MWAHAHAHA!"),
  B("taunt", "Mwahaha— hm. Ahem. MWAHAHAHA!"),
  B("taunt", "Hahahaha! HAHAHA!"),
  B("taunt", "Behold! A genius at work!"),
  B("taunt", "Kneel before the obvious!"),
  B("taunt", "Is this the best the cosmos can do?"),
  B("taunt", "Ah-ha-ha-ha! Ha!"),
  B("taunt", "Tremble, axioms!"),
  B("taunt", "I am the principle you forgot!"),
  B("taunt", "Mwa. Ha. Ha. Ha. Ha."),
  B("taunt", "HAHAHA— did you see that? HA!"),
  B("taunt", "Applause is permitted. Encouraged."),
  // Embarrassed (hit during taunt)
  B("embarrassed", "That was… a demonstration. Of what not to do."),
  B("embarrassed", "I meant to do that. Pedagogically."),
  B("embarrassed", "Ow. Rude. Mid-cackle!"),
  // Hit / Shatter / low seals
  B("hit", "Hm. Noted."),
  B("hit", "A minor rounding error."),
  B("hit", "That will be in the footnotes."),
  B("shatter", "No. No, no, no, NO—"),
  B("shatter", "Pride. Fall. I've read the proverb, thank you."),
  B("lowSeals", "Careful, Markov. Careful."),
  // Insight / stillness
  B("insight", "Ah. I see."),
  B("insight", "There it is."),
  B("insight", "Quiet. Then everything."),
  // Fizzle / empty Focus
  B("fizzle", "Hm. Out of Focus. Literally."),
  B("fizzle", "Patience. Even genius recharges."),
  // Law card / arena start
  B("lawStart", "A law. How quaint."),
  B("lawStart", "Let's see what you're made of. Axioms, mostly."),
  B("lawStart", "Every law has a loophole. I am the loophole."),
  // Bosses
  B("bossFlame", "You grow when I hit you? Then I won't."),
  B("bossFlame", "Burn yourself, then."),
  B("bossGiant", "Enormous. Also: lit badly."),
  B("bossGiant", "Your shadow's the only honest thing about you."),
  B("bossMirror", "Stop copying me. Stop copying me! …Oh, very funny."),
  B("bossMirror", "If you're me, I'll simply be someone else."),
  B("bossKing", "Command them? I'll free them. Watch."),
  B("bossKing", "A crown is just a hat with ambitions."),
  B("bossJudge", "No formulas? Then I'll improvise. I'm extraordinary at it."),
  B("bossJudge", "A bell. Every morning. Mercy, on a schedule."),
  B("bossProphet", "You predict me? I'll do… nothing at all."),
  B("bossProphet", "Let's see you model this."),
  B("bossProphet", "Standing still. Absolutely devastating strategy. I hate it."),
  // The Child (hates it, softening)
  B("child", "Where are we GOING? Stop SKIPPING."),
  B("child", "This isn't a strategy, it's a stroll."),
  B("child", "I can't measure you. Hold still. Please?"),
  B("child", "Fine. Fine! I'll follow. For science."),
  B("child", "…This way? All right.", "markov", "soft"),
  B("childHand", "…Oh.", "markov", "soft"),
  // Descent: fury → bargaining → silence
  B("gate1", "Take the cackle? That's— fine. I have other gifts."),
  B("gate2", "Not Vector. Not my— give it BACK."),
  B("gate3", "Phase too. All right. All right. I can work with less."),
  B("gate4", "Order. You're taking my time. Literally.", "markov", "soft"),
  B("gate5", "Null. …I could make you a deal. I'm very good at deals.", "markov", "soft"),
  B("gate6", "Step. …I'll walk, then.", "markov", "soft"),
  B("gate7", "…", "markov", "silent"),
  B("gateClick", "…Nothing.", "markov", "soft"),
  // Ishtar
  B("ishtarIntro", "You will be like God, knowing.", "ishtar"),
  B("ishtarIntro", "It was never yours. I left the pieces where you'd find them.", "ishtar"),
  B("ishtarSiege", "Run, little genius. You were so fast once.", "ishtar"),
  B("ishtarSiege", "Every star you charted, I lit.", "ishtar"),
  B("temptation", "Take it. You were made to be like me.", "ishtar"),
  B("temptation", "It fits your hand. It always did.", "ishtar"),
  B("temptation", "Just one. What is one?", "ishtar"),
  B("temptationTaken", "There you are.", "ishtar"),
  B("temptationRefuse", "…No.", "markov", "soft"),
  B("stillness", "Be still? I've never once been still.", "markov", "soft"),
  B("stillness", "Struggle, then. It only delays you.", "ishtar"),
  B("dissolve", "…", "markov", "silent"),
  B("dawnBreaks", "No— that light isn't mine—", "ishtar"),
  // Name reveal (scripted)
  B("nameVoice", "Lazar.", "voice"),
  B("nameReply", "…That's my name.", "markov", "soft"),
  // Ascent (joy)
  B("ascent", "Oh! It's white now. It's— thank you.", "markov", "joy"),
  B("ascent", "HA! Ha-ha! Not a cackle. A laugh. There's a difference!", "markov", "joy"),
  B("ascent", "I didn't earn this. That's the point, isn't it?", "markov", "joy"),
  B("ascent", "Again! Everything, again!", "markov", "joy"),
  // Boss lines (non-Markov)
  B("bossFlame", "MORE.", "flame"),
  B("bossGiant", "SMALL THING.", "giant"),
  B("bossMirror", "Stop copying me.", "mirror"),
  B("bossKing", "Kneel.", "king"),
  B("bossJudge", "Again? Guilty.", "judge"),
  B("bossProphet", "I have seen you already.", "prophet"),
  B("child", "(giggle)", "child"),
  // Hub
  B("hub", "My Observatory. Modest. Perfect."),
  B("hub", "Seven doors. Seven laws. One me."),
  B("hubSoft", "It's brighter in here. When did that happen?", "markov", "joy"),
];

export function barksFor(context: string): Bark[] { return BARKS.filter((b) => b.context === context); }
