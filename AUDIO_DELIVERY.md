# AUDIO_DELIVERY — Mandark Ishtar

Engine: shell `AudioMixer` (buses master/music/sfx/ui/voice/ambience) over a game WebAudio `AudioEngine` + adaptive `ResolutionMusic` (src/audio). All sounds are synthesized placeholders behind manifest keys; a delivered OGG at the listed path overrides its key.
Specs: 48 kHz OGG/Opus, VO normalized −16 LUFS, trimmed. Music: per-layer stems with loop-point markers and BPM/key metadata.
Mix rules: VO ducks music −6 dB; Null ducks all SFX −18 dB for 6f; Contradiction and Q.E.D. always cut through; max 24 voices, priority threat telegraphs > Markov ops > enemy SFX > ambience.
**Voice of Markov: Michael.** ElevenLabs placeholders for Ishtar/bosses are optional (none generated in this build).

## Music cues (audio as proof: motifs unresolved → harmonic steps per Contradiction → cadence on Q.E.D.)
| Cue | BPM | Key | Loop | Stems | Harmonic layers | Notes |
|---|---|---|---|---|---|---|
| observatory | 72 | A lydian | 16 bars (loop 0 → end of bar 16) | harpsichord, pad | — | Sparse harpsichord + pad, Markov's theme fragment |
| law.reflection | 104 | D minor | 8 bars (loop 0 → end of bar 8) | pad, bass, arp, motif, perc, choir, bells | 4 harmonic-step layers (step 1–4 pull the progression to the tonic) + V→I cadence sting | Motif A, unresolved (ends on the 7th) |
| law.shadow | 92 | C minor | 8 bars (loop 0 → end of bar 8) | pad, bass, arp, motif, perc, choir, bells | 4 harmonic-step layers (step 1–4 pull the progression to the tonic) + V→I cadence sting | Motif B |
| law.recurrence | 112 | E minor | 8 bars (loop 0 → end of bar 8) | pad, bass, arp, motif, perc, choir, bells | 4 harmonic-step layers (step 1–4 pull the progression to the tonic) + V→I cadence sting | Motif C; canon at one bar |
| law.dominion | 96 | A phrygian | 8 bars (loop 0 → end of bar 8) | pad, bass, arp, motif, perc, choir, bells | 4 harmonic-step layers (step 1–4 pull the progression to the tonic) + V→I cadence sting | Motif D |
| law.judgment | 100 | B minor | 8 bars (loop 0 → end of bar 8) | pad, bass, arp, motif, perc, choir, bells | 4 harmonic-step layers (step 1–4 pull the progression to the tonic) + V→I cadence sting | Motif E; bell on beat 1 |
| law.prophecy | 108 | F lydian | 8 bars (loop 0 → end of bar 8) | pad, bass, arp, motif, perc, choir, bells | 4 harmonic-step layers (step 1–4 pull the progression to the tonic) + V→I cadence sting | Motif F |
| law.innocence | 84 | C major | 8 bars (loop 0 → end of bar 8) | musicbox, pad, motif | 4 harmonic-step layers (step 1–4 pull the progression to the tonic) + V→I cadence sting | Motif G (music box) |
| descent | 76 | A minor | 8 bars (loop 0 → end of bar 8) | pad, bass, arp, motif, perc, choir, bells | Stems removed one per gate (7 → 0) | Each gate removes one instrument (7 → 0) |
| ishtar | 66 | C# phrygian | 8 bars (loop 0 → end of bar 8) | choir, pad | Phase 3 near-silence → dawn chord stem | Choir; phase 3 = near-silence → dawn chord |
| ascent | 120 | C major | 8 bars (loop 0 → end of bar 8) | pad, bass, arp, motif, perc, choir, bells | — | Markov's theme, fully resolved, major |
| title | 60 | A lydian | 8 bars (loop 0 → end of bar 8) | pad | — | Title drone |

## SFX (58)
| Key | Category | Description | File | Status |
|---|---|---|---|---|
| op.cast | markov | Fingertip glyph spark: glassy tick | sfx/op.cast.ogg | synth stand-in |
| op.vector | markov | Click + rising tone | sfx/op.vector.ogg | synth stand-in |
| op.orbit | markov | Tether set: clockwork ratchet | sfx/op.orbit.ogg | synth stand-in |
| op.orbitChime | markov | Metallic chime per orbit contact | sfx/op.orbitChime.ogg | synth stand-in |
| op.phaseIn | markov | Reversed cymbal whoosh-in | sfx/op.phaseIn.ogg | synth stand-in |
| op.phaseOut | markov | Re-solidify chime | sfx/op.phaseOut.ogg | synth stand-in |
| op.delay | markov | Clock-stamp: wood block + pitch drop | sfx/op.delay.ogg | synth stand-in |
| op.reverse | markov | Tape-rewind whirr | sfx/op.reverse.ogg | synth stand-in |
| op.null | markov | Silence used as a sound: soft 'tk' after a 6f hole | sfx/op.null.ogg | synth stand-in |
| op.strip | markov | Property peel: glass flake shatter | sfx/op.strip.ogg | synth stand-in |
| op.compound | markov | Two-note glass fusion | sfx/op.compound.ogg | synth stand-in |
| op.echo | markov | Afterimage echo: delayed tick | sfx/op.echo.ogg | synth stand-in |
| op.clash | markov | Clash: two glass taps | sfx/op.clash.ogg | synth stand-in |
| op.fizzle | markov | Dry tick; the glyph fizzles grey | sfx/op.fizzle.ogg | synth stand-in |
| step.fsst | markov | Air-cut 'fsst' | sfx/step.fsst.ogg | synth stand-in |
| step.thud | markov | Out of charges: dull thud | sfx/step.thud.ogg | synth stand-in |
| strike.swing | markov | Contemptuous hand-pulse | sfx/strike.swing.ogg | synth stand-in |
| strike.tik | markov | Small gold pulse 'tik' | sfx/strike.tik.ogg | synth stand-in |
| hubris.choir | markov | Cackle choir swell | sfx/hubris.choir.ogg | synth stand-in |
| hubris.shatter | break | Meter shatters like glass | sfx/hubris.shatter.ogg | synth stand-in |
| markov.hit | threat | Seal cracks out | sfx/markov.hit.ogg | synth stand-in |
| break.contradiction | break | Low choir stab + glass crack | sfx/break.contradiction.ogg | synth stand-in |
| break.broken | break | Certainty gives: hollow knock | sfx/break.broken.ogg | synth stand-in |
| break.qed | break | Finger snap + resolving gold fold | sfx/break.qed.ogg | synth stand-in |
| break.plink | break | Missed finisher: mocking plink | sfx/break.plink.ogg | synth stand-in |
| ui.flourish | ui | Room clear inversion pulse | sfx/ui.flourish.ogg | synth stand-in |
| ui.click.dull | ui | Lost regalia: dull click, no effect | sfx/ui.click.dull.ogg | synth stand-in |
| ui.move | ui | Menu move | sfx/ui.move.ogg | synth stand-in |
| ui.confirm | ui | Menu confirm | sfx/ui.confirm.ogg | synth stand-in |
| ui.back | ui | Menu back | sfx/ui.back.ogg | synth stand-in |
| insight.start | markov | Ah. I see. Glass bloom | sfx/insight.start.ogg | synth stand-in |
| law.slam | threat | Law card slam: stone + choir | sfx/law.slam.ogg | synth stand-in |
| law.mini | threat | Herald mini-Law declared | sfx/law.mini.ogg | synth stand-in |
| gate.take | threat | A regalia is taken: slow low fade | sfx/gate.take.ogg | synth stand-in |
| gate.give | markov | A regalia returned in white | sfx/gate.give.ogg | synth stand-in |
| dawn.chord | break | Dawn chord | sfx/dawn.chord.ogg | synth stand-in |
| enemy.shock | threat | Shockwave: stone thump | sfx/enemy.shock.ogg | synth stand-in |
| enemy.telegraph | threat | Telegraph: low choral swell | sfx/enemy.telegraph.ogg | synth stand-in |
| enemy.attack | enemy | Stone release | sfx/enemy.attack.ogg | synth stand-in |
| enemy.spawn | enemy | Theorem resolves into being | sfx/enemy.spawn.ogg | synth stand-in |
| judge.sentence | threat | Sentence: gavel crack | sfx/judge.sentence.ogg | synth stand-in |
| judge.bell | ambience | Morning bell | sfx/judge.bell.ogg | synth stand-in |
| prophet.ring | threat | Prophecy ring hum | sfx/prophet.ring.ogg | synth stand-in |
| prophet.stall | enemy | The model stalls: '…' | sfx/prophet.stall.ogg | synth stand-in |
| child.giggle | enemy | Soft giggle: music-box triplet | sfx/child.giggle.ogg | synth stand-in |
| child.collapse | threat | Ground gives way | sfx/child.collapse.ogg | synth stand-in |
| ishtar.take | threat | Temptation taken: counterfeit shimmer | sfx/ishtar.take.ogg | synth stand-in |
| world.impact | ambience | Wall impact: stone tock | sfx/world.impact.ogg | synth stand-in |
| world.prism | markov | Prism pass: crystalline chime | sfx/world.prism.ogg | synth stand-in |
| king.freed | markov | A subject freed: gold unlock | sfx/king.freed.ogg | synth stand-in |
| king.kneel | threat | Kneel zone | sfx/king.kneel.ogg | synth stand-in |
| giant.stomp | threat | Giant stomp | sfx/giant.stomp.ogg | synth stand-in |
| mirror.copy | enemy | Mirror copy: inverted tick | sfx/mirror.copy.ogg | synth stand-in |
| door.hum | ambience | The door hums and does nothing | sfx/door.hum.ogg | synth stand-in |
| boss.phase | threat | Boss phase checkpoint | sfx/boss.phase.ogg | synth stand-in |
| boss.intro | threat | Boss intro swell | sfx/boss.intro.ogg | synth stand-in |
| music.cadence | break | Key-matched resolution sting (rendered by ResolutionMusic) | sfx/music.cadence.ogg | synth stand-in |
| voice.blip | ui | Placeholder VO contour under subtitles | sfx/voice.blip.ogg | synth stand-in |

## Bark sheet (122 lines; 104 Markov)
| File key | Speaker | Context | Line | File |
|---|---|---|---|---|
| markov.coldOpenIntro.000 | markov | coldOpenIntro | There is no possible reason this mechanism should resist me. | vo/markov.coldOpenIntro.000.ogg |
| markov.coldOpenBeat.001 | markov | coldOpenBeat | … | vo/markov.coldOpenBeat.001.ogg |
| markov.doorRude.002 | markov | doorRude | Fascinating. Rude, but fascinating. | vo/markov.doorRude.002.ogg |
| markov.doorSolved.003 | markov | doorSolved | Heat is not the enemy. Direction is. | vo/markov.doorSolved.003.ogg |
| markov.clear.004 | markov | clear | Predictable. | vo/markov.clear.004.ogg |
| markov.clear.005 | markov | clear | Q.E.D. Obviously. | vo/markov.clear.005.ogg |
| markov.clear.006 | markov | clear | And they call that a law. | vo/markov.clear.006.ogg |
| markov.clear.007 | markov | clear | Elegant. As expected. Of me. | vo/markov.clear.007.ogg |
| markov.clear.008 | markov | clear | File it under 'trivial'. | vo/markov.clear.008.ogg |
| markov.clear.009 | markov | clear | Next. | vo/markov.clear.009.ogg |
| markov.clear.010 | markov | clear | I'd have preferred a challenge. I'll settle for applause. | vo/markov.clear.010.ogg |
| markov.clear.011 | markov | clear | A proof so clean it squeaks. | vo/markov.clear.011.ogg |
| markov.clearSoft.012 | markov | clearSoft (soft) | …That one was hard. Good. | vo/markov.clearSoft.012.ogg |
| markov.clearSoft.013 | markov | clearSoft (soft) | Done. I think I understood it, this time. | vo/markov.clearSoft.013.ogg |
| markov.clearJoy.014 | markov | clearJoy (joy) | Ha! Again! Do that again! | vo/markov.clearJoy.014.ogg |
| markov.clearJoy.015 | markov | clearJoy (joy) | Oh, I'd forgotten how much fun this is. | vo/markov.clearJoy.015.ogg |
| markov.qed.016 | markov | qed | Quod erat demonstrandum. | vo/markov.qed.016.ogg |
| markov.qed.017 | markov | qed | Proof complete. | vo/markov.qed.017.ogg |
| markov.qed.018 | markov | qed | And so it is written. By me. | vo/markov.qed.018.ogg |
| markov.qed.019 | markov | qed | Filed. | vo/markov.qed.019.ogg |
| markov.qed.020 | markov | qed | You were a lovely lemma. | vo/markov.qed.020.ogg |
| markov.qed.021 | markov | qed | There. Was that so hard? | vo/markov.qed.021.ogg |
| markov.contradiction.022 | markov | contradiction | Your own law ends you. | vo/markov.contradiction.022.ogg |
| markov.contradiction.023 | markov | contradiction | Ah. A contradiction. My favourite. | vo/markov.contradiction.023.ogg |
| markov.contradiction.024 | markov | contradiction | You've been refuted. | vo/markov.contradiction.024.ogg |
| markov.contradiction.025 | markov | contradiction | Counterexample: you. | vo/markov.contradiction.025.ogg |
| markov.contradiction.026 | markov | contradiction | Assume you're right. See? Absurd. | vo/markov.contradiction.026.ogg |
| markov.contradiction.027 | markov | contradiction | That's what we call a reductio. | vo/markov.contradiction.027.ogg |
| markov.redirect.028 | markov | redirect | I decide where that goes. | vo/markov.redirect.028.ogg |
| markov.redirect.029 | markov | redirect | Return to sender. | vo/markov.redirect.029.ogg |
| markov.redirect.030 | markov | redirect | Not today, thank you. | vo/markov.redirect.030.ogg |
| markov.chain.031 | markov | chain | And again! And AGAIN! | vo/markov.chain.031.ogg |
| markov.chain.032 | markov | chain | Geometry is a love language. | vo/markov.chain.032.ogg |
| markov.enemyByEnemy.033 | markov | enemyByEnemy | They did it to themselves. I merely pointed. | vo/markov.enemyByEnemy.033.ogg |
| markov.enemyByEnemy.034 | markov | enemyByEnemy | Friendly fire. Fire-ly friendly. | vo/markov.enemyByEnemy.034.ogg |
| markov.ringOut.035 | markov | ringOut | Mind the edge. Oh. Too late. | vo/markov.ringOut.035.ogg |
| markov.ringOut.036 | markov | ringOut | Gravity agrees with me. | vo/markov.ringOut.036.ogg |
| markov.taunt.037 | markov | taunt | MWAHAHAHA! | vo/markov.taunt.037.ogg |
| markov.taunt.038 | markov | taunt | Mwahaha— hm. Ahem. MWAHAHAHA! | vo/markov.taunt.038.ogg |
| markov.taunt.039 | markov | taunt | Hahahaha! HAHAHA! | vo/markov.taunt.039.ogg |
| markov.taunt.040 | markov | taunt | Behold! A genius at work! | vo/markov.taunt.040.ogg |
| markov.taunt.041 | markov | taunt | Kneel before the obvious! | vo/markov.taunt.041.ogg |
| markov.taunt.042 | markov | taunt | Is this the best the cosmos can do? | vo/markov.taunt.042.ogg |
| markov.taunt.043 | markov | taunt | Ah-ha-ha-ha! Ha! | vo/markov.taunt.043.ogg |
| markov.taunt.044 | markov | taunt | Tremble, axioms! | vo/markov.taunt.044.ogg |
| markov.taunt.045 | markov | taunt | I am the principle you forgot! | vo/markov.taunt.045.ogg |
| markov.taunt.046 | markov | taunt | Mwa. Ha. Ha. Ha. Ha. | vo/markov.taunt.046.ogg |
| markov.taunt.047 | markov | taunt | HAHAHA— did you see that? HA! | vo/markov.taunt.047.ogg |
| markov.taunt.048 | markov | taunt | Applause is permitted. Encouraged. | vo/markov.taunt.048.ogg |
| markov.embarrassed.049 | markov | embarrassed | That was… a demonstration. Of what not to do. | vo/markov.embarrassed.049.ogg |
| markov.embarrassed.050 | markov | embarrassed | I meant to do that. Pedagogically. | vo/markov.embarrassed.050.ogg |
| markov.embarrassed.051 | markov | embarrassed | Ow. Rude. Mid-cackle! | vo/markov.embarrassed.051.ogg |
| markov.hit.052 | markov | hit | Hm. Noted. | vo/markov.hit.052.ogg |
| markov.hit.053 | markov | hit | A minor rounding error. | vo/markov.hit.053.ogg |
| markov.hit.054 | markov | hit | That will be in the footnotes. | vo/markov.hit.054.ogg |
| markov.shatter.055 | markov | shatter | No. No, no, no, NO— | vo/markov.shatter.055.ogg |
| markov.shatter.056 | markov | shatter | Pride. Fall. I've read the proverb, thank you. | vo/markov.shatter.056.ogg |
| markov.lowSeals.057 | markov | lowSeals | Careful, Markov. Careful. | vo/markov.lowSeals.057.ogg |
| markov.insight.058 | markov | insight | Ah. I see. | vo/markov.insight.058.ogg |
| markov.insight.059 | markov | insight | There it is. | vo/markov.insight.059.ogg |
| markov.insight.060 | markov | insight | Quiet. Then everything. | vo/markov.insight.060.ogg |
| markov.fizzle.061 | markov | fizzle | Hm. Out of Focus. Literally. | vo/markov.fizzle.061.ogg |
| markov.fizzle.062 | markov | fizzle | Patience. Even genius recharges. | vo/markov.fizzle.062.ogg |
| markov.lawStart.063 | markov | lawStart | A law. How quaint. | vo/markov.lawStart.063.ogg |
| markov.lawStart.064 | markov | lawStart | Let's see what you're made of. Axioms, mostly. | vo/markov.lawStart.064.ogg |
| markov.lawStart.065 | markov | lawStart | Every law has a loophole. I am the loophole. | vo/markov.lawStart.065.ogg |
| markov.bossFlame.066 | markov | bossFlame | You grow when I hit you? Then I won't. | vo/markov.bossFlame.066.ogg |
| markov.bossFlame.067 | markov | bossFlame | Burn yourself, then. | vo/markov.bossFlame.067.ogg |
| markov.bossGiant.068 | markov | bossGiant | Enormous. Also: lit badly. | vo/markov.bossGiant.068.ogg |
| markov.bossGiant.069 | markov | bossGiant | Your shadow's the only honest thing about you. | vo/markov.bossGiant.069.ogg |
| markov.bossMirror.070 | markov | bossMirror | Stop copying me. Stop copying me! …Oh, very funny. | vo/markov.bossMirror.070.ogg |
| markov.bossMirror.071 | markov | bossMirror | If you're me, I'll simply be someone else. | vo/markov.bossMirror.071.ogg |
| markov.bossKing.072 | markov | bossKing | Command them? I'll free them. Watch. | vo/markov.bossKing.072.ogg |
| markov.bossKing.073 | markov | bossKing | A crown is just a hat with ambitions. | vo/markov.bossKing.073.ogg |
| markov.bossJudge.074 | markov | bossJudge | No formulas? Then I'll improvise. I'm extraordinary at it. | vo/markov.bossJudge.074.ogg |
| markov.bossJudge.075 | markov | bossJudge | A bell. Every morning. Mercy, on a schedule. | vo/markov.bossJudge.075.ogg |
| markov.bossProphet.076 | markov | bossProphet | You predict me? I'll do… nothing at all. | vo/markov.bossProphet.076.ogg |
| markov.bossProphet.077 | markov | bossProphet | Let's see you model this. | vo/markov.bossProphet.077.ogg |
| markov.bossProphet.078 | markov | bossProphet | Standing still. Absolutely devastating strategy. I hate it. | vo/markov.bossProphet.078.ogg |
| markov.child.079 | markov | child | Where are we GOING? Stop SKIPPING. | vo/markov.child.079.ogg |
| markov.child.080 | markov | child | This isn't a strategy, it's a stroll. | vo/markov.child.080.ogg |
| markov.child.081 | markov | child | I can't measure you. Hold still. Please? | vo/markov.child.081.ogg |
| markov.child.082 | markov | child | Fine. Fine! I'll follow. For science. | vo/markov.child.082.ogg |
| markov.child.083 | markov | child (soft) | …This way? All right. | vo/markov.child.083.ogg |
| markov.childHand.084 | markov | childHand (soft) | …Oh. | vo/markov.childHand.084.ogg |
| markov.gate1.085 | markov | gate1 | Take the cackle? That's— fine. I have other gifts. | vo/markov.gate1.085.ogg |
| markov.gate2.086 | markov | gate2 | Not Vector. Not my— give it BACK. | vo/markov.gate2.086.ogg |
| markov.gate3.087 | markov | gate3 | Phase too. All right. All right. I can work with less. | vo/markov.gate3.087.ogg |
| markov.gate4.088 | markov | gate4 (soft) | Order. You're taking my time. Literally. | vo/markov.gate4.088.ogg |
| markov.gate5.089 | markov | gate5 (soft) | Null. …I could make you a deal. I'm very good at deals. | vo/markov.gate5.089.ogg |
| markov.gate6.090 | markov | gate6 (soft) | Step. …I'll walk, then. | vo/markov.gate6.090.ogg |
| markov.gate7.091 | markov | gate7 (silent) | … | vo/markov.gate7.091.ogg |
| markov.gateClick.092 | markov | gateClick (soft) | …Nothing. | vo/markov.gateClick.092.ogg |
| ishtar.ishtarIntro.093 | ishtar | ishtarIntro | You will be like God, knowing. | vo/ishtar.ishtarIntro.093.ogg |
| ishtar.ishtarIntro.094 | ishtar | ishtarIntro | It was never yours. I left the pieces where you'd find them. | vo/ishtar.ishtarIntro.094.ogg |
| ishtar.ishtarSiege.095 | ishtar | ishtarSiege | Run, little genius. You were so fast once. | vo/ishtar.ishtarSiege.095.ogg |
| ishtar.ishtarSiege.096 | ishtar | ishtarSiege | Every star you charted, I lit. | vo/ishtar.ishtarSiege.096.ogg |
| ishtar.temptation.097 | ishtar | temptation | Take it. You were made to be like me. | vo/ishtar.temptation.097.ogg |
| ishtar.temptation.098 | ishtar | temptation | It fits your hand. It always did. | vo/ishtar.temptation.098.ogg |
| ishtar.temptation.099 | ishtar | temptation | Just one. What is one? | vo/ishtar.temptation.099.ogg |
| ishtar.temptationTaken.100 | ishtar | temptationTaken | There you are. | vo/ishtar.temptationTaken.100.ogg |
| markov.temptationRefuse.101 | markov | temptationRefuse (soft) | …No. | vo/markov.temptationRefuse.101.ogg |
| markov.stillness.102 | markov | stillness (soft) | Be still? I've never once been still. | vo/markov.stillness.102.ogg |
| ishtar.stillness.103 | ishtar | stillness | Struggle, then. It only delays you. | vo/ishtar.stillness.103.ogg |
| markov.dissolve.104 | markov | dissolve (silent) | … | vo/markov.dissolve.104.ogg |
| ishtar.dawnBreaks.105 | ishtar | dawnBreaks | No— that light isn't mine— | vo/ishtar.dawnBreaks.105.ogg |
| voice.nameVoice.106 | voice | nameVoice | Lazar. | vo/voice.nameVoice.106.ogg |
| markov.nameReply.107 | markov | nameReply (soft) | …That's my name. | vo/markov.nameReply.107.ogg |
| markov.ascent.108 | markov | ascent (joy) | Oh! It's white now. It's— thank you. | vo/markov.ascent.108.ogg |
| markov.ascent.109 | markov | ascent (joy) | HA! Ha-ha! Not a cackle. A laugh. There's a difference! | vo/markov.ascent.109.ogg |
| markov.ascent.110 | markov | ascent (joy) | I didn't earn this. That's the point, isn't it? | vo/markov.ascent.110.ogg |
| markov.ascent.111 | markov | ascent (joy) | Again! Everything, again! | vo/markov.ascent.111.ogg |
| flame.bossFlame.112 | flame | bossFlame | MORE. | vo/flame.bossFlame.112.ogg |
| giant.bossGiant.113 | giant | bossGiant | SMALL THING. | vo/giant.bossGiant.113.ogg |
| mirror.bossMirror.114 | mirror | bossMirror | Stop copying me. | vo/mirror.bossMirror.114.ogg |
| king.bossKing.115 | king | bossKing | Kneel. | vo/king.bossKing.115.ogg |
| judge.bossJudge.116 | judge | bossJudge | Again? Guilty. | vo/judge.bossJudge.116.ogg |
| prophet.bossProphet.117 | prophet | bossProphet | I have seen you already. | vo/prophet.bossProphet.117.ogg |
| child.child.118 | child | child | (giggle) | vo/child.child.118.ogg |
| markov.hub.119 | markov | hub | My Observatory. Modest. Perfect. | vo/markov.hub.119.ogg |
| markov.hub.120 | markov | hub | Seven doors. Seven laws. One me. | vo/markov.hub.120.ogg |
| markov.hubSoft.121 | markov | hubSoft (joy) | It's brighter in here. When did that happen? | vo/markov.hubSoft.121.ogg |
