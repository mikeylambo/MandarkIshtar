/** Accessibility module defaults. */
export interface GameAccessibility {
  compoundAssist: boolean;
  gameSpeed: number;
  subtitles: boolean;
  subtitleSize: "S" | "M" | "L";
  subtitleBg: number;
  highContrastTelegraphs: boolean;
  screenShake: number;
  flashIntensity: number;
  inversionAsRim: boolean;
  reducedMotion: boolean;
  textScale: number;
  autoAim: number;
  holdToToggle: boolean;
  deadzoneLeft: number;
  deadzoneRight: number;
}
export const DEFAULT_ACCESSIBILITY: GameAccessibility = {
  compoundAssist: false,
  gameSpeed: 1,
  subtitles: true,
  subtitleSize: "M",
  subtitleBg: 0.6,
  highContrastTelegraphs: false,
  screenShake: 1,
  flashIntensity: 1,
  inversionAsRim: false,
  reducedMotion: false,
  textScale: 1,
  autoAim: 0.5,
  holdToToggle: false,
  deadzoneLeft: 0.18,
  deadzoneRight: 0.22,
};
export const GAME_SPEEDS = [0.7, 0.8, 0.9, 1] as const;
