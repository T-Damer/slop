import {
  trafficCarStatuses,
  trafficDirections,
  trafficRules,
} from './registry.ts';
import type {
  TrafficCarDefinition,
  TrafficCarProgress,
  TrafficCell,
  TrafficLevelDefinition,
  TrafficState,
} from './types.ts';

type TrafficOccupancy = ReadonlyMap<number, string>;

export function getOccupiedCells(
  car: TrafficCarDefinition,
): ReadonlyArray<TrafficCell> {
  const cells: Array<TrafficCell> = [];
  for (
    let offset = trafficRules.firstCoordinate;
    offset < car.length;
    offset += trafficRules.cellStep
  ) {
    cells.push(
      car.direction === trafficDirections.left || car.direction === trafficDirections.right
        ? { x: car.x + offset, y: car.y }
        : { x: car.x, y: car.y + offset },
    );
  }
  return cells;
}

export function getExitPathCells(
  car: TrafficCarDefinition,
): ReadonlyArray<TrafficCell> {
  const cells: Array<TrafficCell> = [];
  if (car.direction === trafficDirections.right) {
    for (
      let x = car.x + car.length;
      x < trafficRules.boardColumns;
      x += trafficRules.cellStep
    ) {
      cells.push({ x, y: car.y });
    }
    return cells;
  }
  if (car.direction === trafficDirections.left) {
    for (
      let x = car.x - trafficRules.cellStep;
      x >= trafficRules.firstCoordinate;
      x -= trafficRules.cellStep
    ) {
      cells.push({ x, y: car.y });
    }
    return cells;
  }
  if (car.direction === trafficDirections.down) {
    for (
      let y = car.y + car.length;
      y < trafficRules.boardRows;
      y += trafficRules.cellStep
    ) {
      cells.push({ x: car.x, y });
    }
    return cells;
  }
  for (
    let y = car.y - trafficRules.cellStep;
    y >= trafficRules.firstCoordinate;
    y -= trafficRules.cellStep
  ) {
    cells.push({ x: car.x, y });
  }
  return cells;
}

export function getTrafficCar(
  level: TrafficLevelDefinition,
  carId: string,
): TrafficCarDefinition | null {
  return level.cars.find((car) => car.id === carId) ?? null;
}

export function getTrafficCarProgress(
  state: TrafficState,
  carId: string,
): TrafficCarProgress | null {
  return state.cars.find((car) => car.id === carId) ?? null;
}

export function getFirstAvailableBayIndex(
  level: TrafficLevelDefinition,
  state: TrafficState,
): number | null {
  const occupiedBays = new Uint8Array(level.bayCount);
  for (const car of state.cars) {
    if (
      car.status === trafficCarStatuses.waiting
      && car.bayIndex !== null
      && car.bayIndex >= trafficRules.firstIndex
      && car.bayIndex < level.bayCount
    ) {
      occupiedBays[car.bayIndex] = trafficRules.cellStep;
    }
  }
  for (
    let bayIndex = trafficRules.firstIndex;
    bayIndex < level.bayCount;
    bayIndex += trafficRules.cellStep
  ) {
    if (occupiedBays[bayIndex] === trafficRules.emptyCollectionSize) {
      return bayIndex;
    }
  }
  return null;
}

export function getBlockingCarIds(
  level: TrafficLevelDefinition,
  state: TrafficState,
  carId: string,
): ReadonlyArray<string> {
  const car = getTrafficCar(level, carId);
  if (car === null) {
    return [];
  }
  return getBlockingCarIdsFromOccupancy(
    car,
    createTrafficOccupancy(level, state),
  );
}

export function getReleasableCarIds(
  level: TrafficLevelDefinition,
  state: TrafficState,
): ReadonlyArray<string> {
  const carById = new Map(level.cars.map((car) => [car.id, car]));
  const occupancy = createTrafficOccupancy(level, state, carById);
  const available: Array<string> = [];
  for (const progress of state.cars) {
    if (progress.status !== trafficCarStatuses.parked) {
      continue;
    }
    const car = carById.get(progress.id);
    if (car !== undefined && !hasBlockingCarInOccupancy(car, occupancy)) {
      available.push(progress.id);
    }
  }
  return available;
}

function createTrafficOccupancy(
  level: TrafficLevelDefinition,
  state: TrafficState,
  carById: ReadonlyMap<string, TrafficCarDefinition> = new Map(
    level.cars.map((car) => [car.id, car]),
  ),
): TrafficOccupancy {
  const occupied = new Map<number, string>();
  for (const progress of state.cars) {
    if (progress.status !== trafficCarStatuses.parked) {
      continue;
    }
    const car = carById.get(progress.id);
    if (car === undefined) {
      continue;
    }
    for (const cell of getOccupiedCells(car)) {
      occupied.set(toCellIndex(cell), car.id);
    }
  }
  return occupied;
}

function hasBlockingCarInOccupancy(
  car: TrafficCarDefinition,
  occupancy: TrafficOccupancy,
): boolean {
  for (const cell of getExitPathCells(car)) {
    const blockingCarId = occupancy.get(toCellIndex(cell));
    if (blockingCarId !== undefined && blockingCarId !== car.id) {
      return true;
    }
  }
  return false;
}

function getBlockingCarIdsFromOccupancy(
  car: TrafficCarDefinition,
  occupancy: TrafficOccupancy,
): ReadonlyArray<string> {
  const blockers = new Set<string>();
  for (const cell of getExitPathCells(car)) {
    const blockingCarId = occupancy.get(toCellIndex(cell));
    if (blockingCarId !== undefined && blockingCarId !== car.id) {
      blockers.add(blockingCarId);
    }
  }
  return [...blockers].sort();
}

function toCellIndex(cell: TrafficCell): number {
  return cell.y * trafficRules.boardColumns + cell.x;
}
