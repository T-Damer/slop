import {
  trafficDirections,
  trafficIdPrefixes,
  trafficLevelPatterns,
  trafficRules,
} from './registry.ts';
import type { SeededRandom } from './seeded-random.ts';
import { createIndexRange } from './seeded-random.ts';
import type {
  TrafficCarDefinition,
  TrafficLevelDefinition,
} from './types.ts';

export type TrafficLevelPattern = typeof trafficLevelPatterns[keyof typeof trafficLevelPatterns];
export type StructuralCar = Omit<TrafficCarDefinition, 'color' | 'capacity'>;

export interface StructuralLevelLayout {
  readonly cars: ReadonlyArray<StructuralCar>;
  readonly solutionChains: ReadonlyArray<ReadonlyArray<string>>;
  readonly location: TrafficLevelDefinition['location'];
}

interface GridSelection {
  readonly mirrorX: boolean;
  readonly mirrorY: boolean;
  readonly location: TrafficLevelDefinition['location'];
  readonly horizontalRows: ReadonlyArray<number>;
  readonly verticalColumns: ReadonlyArray<number>;
}

export function createStructuralLevelLayout(
  pattern: TrafficLevelPattern,
  random: SeededRandom,
): StructuralLevelLayout {
  const selection = selectGrid(pattern, random);
  const horizontal = createHorizontalLayout(selection.horizontalRows, selection.mirrorX);
  const vertical = createVerticalLayout(
    selection.verticalColumns,
    selection.mirrorY,
    random,
  );
  return {
    cars: [...horizontal.cars, ...vertical.cars],
    solutionChains: [...horizontal.solutionChains, ...vertical.solutionChains],
    location: selection.location,
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
    .shuffle(createIndexRange(trafficRules.boardRows))
    .slice(trafficRules.firstIndex, pattern.horizontalRows);
  const verticalZoneStart = mirrorX
    ? trafficRules.firstCoordinate
    : trafficRules.verticalZoneStartColumn;
  const verticalColumns = random
    .shuffle(
      createIndexRange(trafficRules.horizontalZoneColumns).map(
        (columnOffset) => verticalZoneStart + columnOffset,
      ),
    )
    .slice(trafficRules.firstIndex, pattern.verticalColumns);
  return { mirrorX, mirrorY, location, horizontalRows, verticalColumns };
}

function createHorizontalLayout(
  rows: ReadonlyArray<number>,
  mirrorX: boolean,
): Omit<StructuralLevelLayout, 'location'> {
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
): Omit<StructuralLevelLayout, 'location'> {
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

function flipVerticalDirection(
  direction: typeof trafficDirections.up | typeof trafficDirections.down,
): typeof trafficDirections.up | typeof trafficDirections.down {
  return direction === trafficDirections.up
    ? trafficDirections.down
    : trafficDirections.up;
}
