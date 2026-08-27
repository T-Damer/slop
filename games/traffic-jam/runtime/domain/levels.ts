import {
  trafficColorOrder,
  trafficDirections,
  trafficIdPrefixes,
  trafficLevelPatterns,
  trafficPassengerGroupSizes,
  trafficRandomization,
  trafficRules,
} from './registry.ts';
import type {
  TrafficCarDefinition,
  TrafficLevelDefinition,
} from './types.ts';

interface SeededRandom {
  readonly integer: (maximumExclusive: number) => number;
  readonly boolean: () => boolean;
  readonly shuffle: <T>(values: ReadonlyArray<T>) => Array<T>;
}

type TrafficLevelPattern = typeof trafficLevelPatterns[keyof typeof trafficLevelPatterns];
type StructuralCar = Omit<TrafficCarDefinition, 'color' | 'capacity'>;

export const trafficLevelCatalog: ReadonlyArray<TrafficLevelPattern> = Object.values(
  trafficLevelPatterns,
);

export const trafficLevels: ReadonlyArray<TrafficLevelDefinition> = trafficLevelCatalog.map(
  (_, levelIndex) => createTrafficLevel(
    levelIndex,
    trafficRandomization.defaultVariantSeeds[levelIndex]
      ?? trafficRandomization.fallbackSeed,
  ),
);

export function createTrafficLevel(
  levelIndex: number,
  seed: number,
): TrafficLevelDefinition {
  const normalizedLevelIndex = normalizeLevelIndex(levelIndex);
  const pattern = trafficLevelCatalog[normalizedLevelIndex]
    ?? trafficLevelCatalog[trafficRules.firstIndex]!;
  return buildTrafficLevel(pattern, normalizeSeed(seed));
}

export function getTrafficLevelCount(): number {
  return trafficLevelCatalog.length;
}

function buildTrafficLevel(
  pattern: TrafficLevelPattern,
  seed: number,
): TrafficLevelDefinition {
  const random = createSeededRandom(seed ^ hashString(pattern.id));
  const mirrorX = random.boolean();
  const mirrorY = random.boolean();
  const location = pattern.locations[random.integer(pattern.locations.length)]
    ?? pattern.locations[trafficRules.firstIndex]!;
  const horizontalRows = random
    .shuffle(range(trafficRules.boardRows))
    .slice(trafficRules.firstIndex, pattern.horizontalRows);
  const verticalZoneStart = mirrorX
    ? trafficRules.firstCoordinate
    : trafficRules.verticalZoneStartColumn;
  const verticalColumns = random
    .shuffle(
      range(trafficRules.horizontalZoneColumns).map(
        (columnOffset) => verticalZoneStart + columnOffset,
      ),
    )
    .slice(trafficRules.firstIndex, pattern.verticalColumns);

  const structuralCars: Array<StructuralCar> = [];
  const solutionChains: Array<ReadonlyArray<string>> = [];

  for (const row of horizontalRows) {
    const outerId = `${trafficIdPrefixes.horizontalOuter}-${row}`;
    const innerId = `${trafficIdPrefixes.horizontalInner}-${row}`;
    const outerX = mirrorX
      ? trafficRules.boardColumns - trafficRules.carLength
      : trafficRules.firstCoordinate;
    const innerX = mirrorX
      ? trafficRules.boardColumns - trafficRules.carLength * 2
      : trafficRules.carLength;
    const direction = mirrorX ? trafficDirections.right : trafficDirections.left;

    structuralCars.push(
      {
        id: outerId,
        x: outerX,
        y: row,
        length: trafficRules.carLength,
        direction,
      },
      {
        id: innerId,
        x: innerX,
        y: row,
        length: trafficRules.carLength,
        direction,
      },
    );
    solutionChains.push([outerId, innerId]);
  }

  for (const column of verticalColumns) {
    const topChainLength = random.integer(
      trafficRules.verticalMaximumTopChainLength
        - trafficRules.verticalMinimumTopChainLength
        + trafficRules.cellStep,
    ) + trafficRules.verticalMinimumTopChainLength;
    const columnCarIds: Array<string> = [];

    for (
      let slot = trafficRules.firstCoordinate;
      slot < trafficRules.verticalCarsPerColumn;
      slot += trafficRules.cellStep
    ) {
      const id = `${trafficIdPrefixes.vertical}-${column}-${slot}`;
      const baseY = slot * trafficRules.carLength;
      const facesTop = slot < topChainLength;
      const directionBeforeMirror = facesTop
        ? trafficDirections.up
        : trafficDirections.down;
      const y = mirrorY
        ? trafficRules.boardRows - trafficRules.carLength - baseY
        : baseY;
      const direction = mirrorY
        ? flipVerticalDirection(directionBeforeMirror)
        : directionBeforeMirror;

      structuralCars.push({
        id,
        x: column,
        y,
        length: trafficRules.carLength,
        direction,
      });
      columnCarIds.push(id);
    }

    solutionChains.push([
      ...columnCarIds.slice(trafficRules.firstIndex, topChainLength),
      ...columnCarIds.slice(topChainLength).reverse(),
    ]);
  }

  const expectedSolution = random.shuffle(solutionChains).flat();
  const solutionIndexByCar = new Map(
    expectedSolution.map((carId, solutionIndex) => [carId, solutionIndex]),
  );
  const seedOffset = seed % trafficPassengerGroupSizes.length;
  const colorOffset = (
    pattern.colorOffset + random.integer(trafficColorOrder.length)
  ) % trafficColorOrder.length;
  const cars: Array<TrafficCarDefinition> = structuralCars.map((car) => {
    const solutionIndex = solutionIndexByCar.get(car.id) ?? trafficRules.firstIndex;
    const color = trafficColorOrder[
      (solutionIndex + colorOffset) % trafficColorOrder.length
    ]!;
    const capacity = trafficPassengerGroupSizes[
      (
        solutionIndex
        + pattern.groupSizeOffset
        + seedOffset
      ) % trafficPassengerGroupSizes.length
    ]!;
    return {
      ...car,
      color,
      capacity,
    };
  });
  const carById = new Map(cars.map((car) => [car.id, car]));
  const passengers = expectedSolution.flatMap((carId) => {
    const car = carById.get(carId);
    if (car === undefined) {
      return [];
    }
    return Array.from({ length: car.capacity }, () => car.color);
  });

  return {
    id: pattern.id,
    name: pattern.name,
    objective: pattern.objective,
    location,
    variantSeed: seed,
    bayCount: pattern.bayCount,
    cars,
    passengers,
    expectedSolution,
  };
}

function normalizeLevelIndex(levelIndex: number): number {
  if (!Number.isInteger(levelIndex)) {
    return trafficRules.firstIndex;
  }
  return Math.min(
    Math.max(levelIndex, trafficRules.firstIndex),
    trafficLevelCatalog.length - trafficRules.cellStep,
  );
}

function normalizeSeed(seed: number): number {
  const normalized = Number.isFinite(seed)
    ? Math.trunc(seed) >>> trafficRules.firstCoordinate
    : trafficRandomization.fallbackSeed;
  return normalized === trafficRules.emptyCollectionSize
    ? trafficRandomization.fallbackSeed
    : normalized;
}

function createSeededRandom(seed: number): SeededRandom {
  let state = normalizeSeed(seed);

  const next = (): number => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> trafficRules.firstCoordinate) / trafficRandomization.uint32Divisor;
  };

  const integer = (maximumExclusive: number): number => {
    if (maximumExclusive <= trafficRules.cellStep) {
      return trafficRules.firstIndex;
    }
    return Math.floor(next() * maximumExclusive);
  };

  const shuffle = <T>(values: ReadonlyArray<T>): Array<T> => {
    const output = [...values];
    for (
      let index = output.length - trafficRules.cellStep;
      index > trafficRules.firstIndex;
      index -= trafficRules.cellStep
    ) {
      const swapIndex = integer(index + trafficRules.cellStep);
      const current = output[index];
      output[index] = output[swapIndex]!;
      output[swapIndex] = current!;
    }
    return output;
  };

  return {
    integer,
    boolean: () => integer(2) === trafficRules.firstIndex,
    shuffle,
  };
}

function hashString(value: string): number {
  let hash = trafficRandomization.hashOffset;
  for (const character of value) {
    hash ^= character.charCodeAt(trafficRules.firstIndex);
    hash = Math.imul(hash, trafficRandomization.hashPrime);
  }
  return hash >>> trafficRules.firstCoordinate;
}

function range(length: number): Array<number> {
  return Array.from({ length }, (_, index) => index);
}

function flipVerticalDirection(
  direction: typeof trafficDirections.up | typeof trafficDirections.down,
): typeof trafficDirections.up | typeof trafficDirections.down {
  return direction === trafficDirections.up
    ? trafficDirections.down
    : trafficDirections.up;
}
