import {
  trafficRandomization,
  trafficRules,
} from './registry.ts';

export interface SeededRandom {
  readonly integer: (maximumExclusive: number) => number;
  readonly boolean: () => boolean;
  readonly shuffle: <T>(values: ReadonlyArray<T>) => Array<T>;
}

export function normalizeTrafficSeed(seed: number): number {
  const normalized = Number.isFinite(seed)
    ? Math.trunc(seed) >>> trafficRules.firstCoordinate
    : trafficRandomization.fallbackSeed;
  return normalized === trafficRules.emptyCollectionSize
    ? trafficRandomization.fallbackSeed
    : normalized;
}

export function createSeededRandom(seed: number): SeededRandom {
  let state = normalizeTrafficSeed(seed);
  const next = (): number => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> trafficRules.firstCoordinate) / trafficRandomization.uint32Divisor;
  };
  const integer = (maximumExclusive: number): number => (
    maximumExclusive <= trafficRules.cellStep
      ? trafficRules.firstIndex
      : Math.floor(next() * maximumExclusive)
  );
  const shuffle = <T>(values: ReadonlyArray<T>): Array<T> => {
    const output = [...values];
    for (
      let index = output.length - trafficRules.cellStep;
      index > trafficRules.firstIndex;
      index -= trafficRules.cellStep
    ) {
      const swapIndex = integer(index + trafficRules.cellStep);
      [output[index], output[swapIndex]] = [output[swapIndex]!, output[index]!];
    }
    return output;
  };
  return {
    integer,
    boolean: () => integer(2) === trafficRules.firstIndex,
    shuffle,
  };
}

export function hashTrafficSeed(value: string): number {
  let hash: number = trafficRandomization.hashOffset;
  for (const character of value) {
    hash ^= character.charCodeAt(trafficRules.firstIndex);
    hash = Math.imul(hash, trafficRandomization.hashPrime);
  }
  return hash >>> trafficRules.firstCoordinate;
}

export function createIndexRange(length: number): Array<number> {
  return Array.from({ length }, (_, index) => index);
}
