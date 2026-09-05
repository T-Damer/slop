export const soundDefaults = { master: 0.65, music: 0.3, ambience: 0.45, effects: 0.6 } as const;
export type SoundBus = keyof typeof soundDefaults;
export type SoundMix = Record<SoundBus, number>;
export const soundBuses = Object.keys(soundDefaults) as SoundBus[];
export function normalizeSoundMix(raw: unknown): SoundMix {
  const mix: SoundMix = { ...soundDefaults };
  if (typeof raw !== 'object' || raw === null) return mix;
  for (const bus of soundBuses) {
    const value = (raw as Record<string, unknown>)[bus];
    if (typeof value === 'number' && Number.isFinite(value)) mix[bus] = Math.max(0, Math.min(1, value));
  }
  return mix;
}
