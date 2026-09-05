/** Project-authored note data and sound recipes; no third-party recordings or melodies. */
export const islandScore = {
  beatsPerMinute: 82, beatsPerBar: 4, barsPerPhrase: 16, secondsPerMinute: 60,
  lookAheadSeconds: 0.18, maximumCatchupBeats: 2, voiceLimit: 24,
  stepDistance: 0.68, noiseSeconds: 3, fadeSeconds: 0.35, silence: 0.0001,
  melody: [0, 4, 7, 11, 9, 7, 4, 2, 0, 7, 9, 4, 2, 4, 7, 2],
  roots: [48, 53, 50, 55, 48, 57, 53, 55, 52, 53, 50, 55, 57, 53, 55, 48],
  chord: [0, 4, 7, 11],
  indoorMelody: [7, 4, 2, 0, 4, 9, 7, 4, 2, 0, 7, 9, 4, 2, 4, 0],
  themes: { morning: { transpose: 0, spacing: 2 }, day: { transpose: 2, spacing: 1 },
    evening: { transpose: -2, spacing: 2 }, night: { transpose: -5, spacing: 4 } },
  surfaces: { grass: { frequency: 620, duration: 0.095, gain: 0.11 },
    sand: { frequency: 1100, duration: 0.14, gain: 0.09 },
    path: { frequency: 220, duration: 0.065, gain: 0.12 },
    wood: { frequency: 340, duration: 0.09, gain: 0.13 } },
  effects: { door: [130, 0.2, 0.16], furniture: [260, 0.12, 0.13],
    lamp: [880, 0.06, 0.055], harvest: [740, 0.25, 0.075], planting: [420, 0.16, 0.09],
    ui: [560, 0.07, 0.035], voice: [290, 0.11, 0.06] },
} as const;
export type IslandSoundEvent = keyof typeof islandScore.effects;
export function scoreTheme(hour: number): keyof typeof islandScore.themes {
  return hour < 5 || hour >= 22 ? 'night' : hour < 11 ? 'morning' : hour < 17 ? 'day' : 'evening';
}
export function noteFrequency(note: number): number { return 440 * 2 ** ((note - 69) / 12); }
