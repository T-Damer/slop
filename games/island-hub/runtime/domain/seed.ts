import type { IslandPreferences } from './types.ts';

export interface SeededRandom {
  readonly next: () => number;
  readonly between: (minimum: number, maximum: number) => number;
  readonly integer: (minimum: number, maximumInclusive: number) => number;
}

export function deriveIslandSeed(
  playerId: string,
  preferences: IslandPreferences,
): number {
  const input = [
    playerId,
    preferences.color,
    preferences.music,
    preferences.activity,
    preferences.weather,
    preferences.season,
    preferences.livingStyle,
    preferences.animal,
  ].join('|');
  return hashString(input);
}

export function createSeededRandom(seed: number): SeededRandom {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
  return {
    next,
    between: (minimum, maximum) => minimum + (maximum - minimum) * next(),
    integer: (minimum, maximumInclusive) => (
      minimum + Math.floor(next() * (maximumInclusive - minimum + 1))
    ),
  };
}

function hashString(value: string): number {
  let hash = 2_166_136_261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}
