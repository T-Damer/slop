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

interface StructuralLayout {
  readonly cars: ReadonlyArray<StructuralCar>;
  readonly solutionChains: ReadonlyArray<ReadonlyArray<string>>;
}

interface GridSelection {
  readonly mirrorX: boolean;
  readonly mirrorY: boolean;
  readonly location: TrafficLevelDefinition['location'];
  readonly horizontalRows: ReadonlyArray<number>;
  readonly verticalColumns: ReadonlyArray<number>;
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
  const selection = selectGrid(pattern, random);
  const horizontal = createHorizontalLayout(selection.horizontalRows, selection.mirrorX);
  const vertical = createVerticalLayout(
    selection.verticalColumns,
    selection.mirrorY,
    random,
  );
  const structuralCars = [...horizontal.cars, ...vertical.cars];
  const expectedSolution = random.shuffle([
    ...horizontal.solutionChains,
    ...vertical.solutionChains,
  ]).flat();
  const cars = assignCarDemand(
    structuralCars,
    expectedSolution,
    pattern,
    seed,
    random,
  );

  return {
    id: pattern.id,
    name: pattern.name,
    objective: pattern.objective,
    location: selection.location,
    variantSeed: seed,
    bayCount: pattern.bayCount,
    cars,
    passengers: createPassengerQueue(cars, expectedSolution),
    expectedSolution,
  };
}

function selectGrid(
  pattern: TrafficLevelPattern,
  random: SeededRandom,
): GridSelection {
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

  return {
    mirrorX,
    mirrorY,
    location,
    horizontalRows,
    verticalColumns,
  };
}

function createHorizontalLayout(
  rows: ReadonlyArray<number>,
  mirrorX: boolean,
): StructuralLayout {
  const cars: Array<StructuralCar> = [];
  const solutionChains: Array<ReadonlyArray<string>> = [];
  const outerX = mirrorX
    ? trafficRules.boardColumns - trafficRules.carLength
    : trafficRules.firstCoordinate;
  const innerX = mirrorX
    ? trafficRules.boardColumns - trafficRules.carLength * 2
    : trafficRules.carLength;
  const direction = mirrorX ? trafficDirections.right : trafficDirections.left;

  for (const row of rows) {
    const outerId = `${trafficIdPrefixes.horizontalOuter}-${row}`;
    const innerId = `${trafficIdPrefixes.horizontalInner}-${row}`;
    cars.push(
      createStructuralCar(outerId, outerX, row, direction),
      createStructuralCar(innerId, innerX, row, direction),
    );
    solutionChains.push([outerId, innerId]);
  }
  return { cars, solutionChains };
}

function createVerticalLayout(
  columns: ReadonlyArray<number>,
  mirrorY: boolean,
  random: SeededRandom,
): StructuralLayout {
  const cars: Array<StructuralCar> = [];
  const solutionChains: Array<ReadonlyArray<string>> = [];

  for (const column of columns) {
    const topChainLength = createTopChainLength(random);
    const columnCarIds: Array<string> = [];
    for (
      let slot = trafficRules.firstCoordinate;
      slot < trafficRules.verticalCarsPerColumn;
      slot += trafficRules.cellStep
    ) {
      const car = createVerticalCar(column, slot, topChainLength, mirrorY);
      cars.push(car);
      columnCarIds.push(car.id);
    }
    solutionChains.push([
      ...columnCarIds.slice(trafficRules.firstIndex, topChainLength),
      ...columnCarIds.slice(topChainLength).reverse(),
    ]);
  }
  return { cars, solutionChains };
}

function createVerticalCar(
  column: number,
  slot: number,
  topChainLength: number,
  mirrorY: boolean,
): StructuralCar {
  const id = `${trafficIdPrefixes.vertical}-${column}-${slot}`;
  const baseY = slot * trafficRules.carLength;
  const directionBeforeMirror = slot < topChainLength
    ? trafficDirections.up
    : trafficDirections.down;
  const y = mirrorY
    ? trafficRules.boardRows - trafficRules.carLength - baseY
    : baseY;
  const direction = mirrorY
    ? flipVerticalDirection(directionBeforeMirror)
    : directionBeforeMirror;
  return createStructuralCar(id, column, y, direction);
}

function createStructuralCar(
  id: string,
  x: number,
  y: number,
  direction: StructuralCar['direction'],
): StructuralCar {
  return {
    id,
    x,
    y,
    length: trafficRules.carLength,
    direction,
  };
}

function createTopChainLength(random: SeededRandom): number {
  const possibleLengths = trafficRules.verticalMaximumTopChainLength
    - trafficRules.verticalMinimumTopChainLength
    + trafficRules.cellStep;
  return random.integer(possibleLengths) + trafficRules.verticalMinimumTopChainLength;
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
