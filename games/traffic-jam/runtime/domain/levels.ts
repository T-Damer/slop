import {
  trafficColorOrder,
  trafficLevelPatterns,
  trafficPassengerGroupSizes,
  trafficRandomization,
  trafficRules,
} from './registry.ts';
import {
  createStructuralLevelLayout,
  type StructuralCar,
  type TrafficLevelPattern,
} from './level-layout.ts';
import {
  createSeededRandom,
  hashTrafficSeed,
  normalizeTrafficSeed,
  type SeededRandom,
} from './seeded-random.ts';
import type {
  TrafficCarDefinition,
  TrafficLevelDefinition,
} from './types.ts';

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
  return buildTrafficLevel(pattern, normalizeTrafficSeed(seed));
}

export function getTrafficLevelCount(): number {
  return trafficLevelCatalog.length;
}

function buildTrafficLevel(
  pattern: TrafficLevelPattern,
  seed: number,
): TrafficLevelDefinition {
  const random = createSeededRandom(seed ^ hashTrafficSeed(pattern.id));
  const layout = createStructuralLevelLayout(pattern, random);
  const expectedSolution = random.shuffle(layout.solutionChains).flat();
  const cars = assignCarDemand(
    layout.cars,
    expectedSolution,
    pattern,
    seed,
    random,
  );
  return {
    id: pattern.id,
    name: pattern.name,
    objective: pattern.objective,
    location: layout.location,
    variantSeed: seed,
    bayCount: pattern.bayCount,
    cars,
    passengers: createPassengerQueue(cars, expectedSolution),
    expectedSolution,
  };
}

function assignCarDemand(
  structuralCars: ReadonlyArray<StructuralCar>,
  expectedSolution: ReadonlyArray<string>,
  pattern: TrafficLevelPattern,
  seed: number,
  random: SeededRandom,
): ReadonlyArray<TrafficCarDefinition> {
  const solutionIndexByCar = new Map(
    expectedSolution.map((carId, solutionIndex) => [carId, solutionIndex]),
  );
  const seedOffset = seed % trafficPassengerGroupSizes.length;
  const colorOffset = (
    pattern.colorOffset + random.integer(trafficColorOrder.length)
  ) % trafficColorOrder.length;

  return structuralCars.map((car) => {
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
    return { ...car, color, capacity };
  });
}

function createPassengerQueue(
  cars: ReadonlyArray<TrafficCarDefinition>,
  expectedSolution: ReadonlyArray<string>,
): ReadonlyArray<TrafficCarDefinition['color']> {
  const carById = new Map(cars.map((car) => [car.id, car]));
  return expectedSolution.flatMap((carId) => {
    const car = carById.get(carId);
    return car === undefined
      ? []
      : Array.from({ length: car.capacity }, () => car.color);
  });
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
