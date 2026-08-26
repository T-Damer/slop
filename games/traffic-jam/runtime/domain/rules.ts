import {
  trafficDirections,
  trafficErrors,
  trafficEvents,
  trafficRules,
} from './registry.ts';
import type {
  TrafficCell,
  TrafficDomainEvent,
  TrafficLevelDefinition,
  TrafficMoveResult,
  TrafficState,
  TrafficVehicleDefinition,
} from './types.ts';

export function createInitialTrafficState(level: TrafficLevelDefinition): TrafficState {
  return {
    levelId: level.id,
    remainingVehicleIds: level.vehicles.map((vehicle) => vehicle.id),
    moveCount: trafficRules.initialMoveCount,
    completed: false,
  };
}

export function releaseTrafficVehicle(
  level: TrafficLevelDefinition,
  state: TrafficState,
  vehicleId: string,
): TrafficMoveResult {
  if (state.completed) {
    return reject(trafficErrors.levelCompleted);
  }

  const vehicle = getTrafficVehicle(level, vehicleId);
  if (vehicle === null) {
    return reject(trafficErrors.vehicleMissing);
  }

  if (!state.remainingVehicleIds.includes(vehicleId)) {
    return reject(trafficErrors.vehicleAlreadyReleased);
  }

  const blockers = getBlockingVehicleIds(level, state, vehicleId);
  if (blockers.length > trafficRules.emptyCollectionSize) {
    return {
      ok: false,
      error: trafficErrors.pathBlocked,
      blockingVehicleIds: blockers,
    };
  }

  const remainingVehicleIds = state.remainingVehicleIds.filter((id) => id !== vehicleId);
  const moveCount = state.moveCount + trafficRules.cellStep;
  const completed = remainingVehicleIds.length === trafficRules.emptyCollectionSize;
  const events: Array<TrafficDomainEvent> = [
    {
      type: trafficEvents.vehicleReleased,
      vehicleId,
      moveCount,
    },
  ];

  if (completed) {
    events.push({
      type: trafficEvents.levelCompleted,
      vehicleId: null,
      moveCount,
    });
  }

  return {
    ok: true,
    state: {
      levelId: state.levelId,
      remainingVehicleIds,
      moveCount,
      completed,
    },
    events,
  };
}

export function getAvailableVehicleIds(
  level: TrafficLevelDefinition,
  state: TrafficState,
): ReadonlyArray<string> {
  return state.remainingVehicleIds.filter(
    (vehicleId) => getBlockingVehicleIds(level, state, vehicleId).length === trafficRules.emptyCollectionSize,
  );
}

export function getBlockingVehicleIds(
  level: TrafficLevelDefinition,
  state: TrafficState,
  vehicleId: string,
): ReadonlyArray<string> {
  const vehicle = getTrafficVehicle(level, vehicleId);
  if (vehicle === null) {
    return [];
  }

  const occupied = new Map<string, string>();
  for (const candidate of level.vehicles) {
    if (candidate.id === vehicle.id || !state.remainingVehicleIds.includes(candidate.id)) {
      continue;
    }
    for (const cell of getOccupiedCells(candidate)) {
      occupied.set(toCellKey(cell), candidate.id);
    }
  }

  const blockingVehicleIds = new Set<string>();
  for (const cell of getExitPathCells(vehicle)) {
    const blockingVehicleId = occupied.get(toCellKey(cell));
    if (blockingVehicleId !== undefined) {
      blockingVehicleIds.add(blockingVehicleId);
    }
  }
  return [...blockingVehicleIds].sort();
}

export function getOccupiedCells(
  vehicle: TrafficVehicleDefinition,
): ReadonlyArray<TrafficCell> {
  const cells: Array<TrafficCell> = [];
  for (
    let offset = trafficRules.firstCoordinate;
    offset < vehicle.length;
    offset += trafficRules.cellStep
  ) {
    cells.push(
      vehicle.direction === trafficDirections.left || vehicle.direction === trafficDirections.right
        ? { x: vehicle.x + offset, y: vehicle.y }
        : { x: vehicle.x, y: vehicle.y + offset },
    );
  }
  return cells;
}

export function getExitPathCells(
  vehicle: TrafficVehicleDefinition,
): ReadonlyArray<TrafficCell> {
  const cells: Array<TrafficCell> = [];

  if (vehicle.direction === trafficDirections.right) {
    for (
      let x = vehicle.x + vehicle.length;
      x < trafficRules.boardColumns;
      x += trafficRules.cellStep
    ) {
      cells.push({ x, y: vehicle.y });
    }
    return cells;
  }

  if (vehicle.direction === trafficDirections.left) {
    for (
      let x = vehicle.x - trafficRules.cellStep;
      x >= trafficRules.firstCoordinate;
      x -= trafficRules.cellStep
    ) {
      cells.push({ x, y: vehicle.y });
    }
    return cells;
  }

  if (vehicle.direction === trafficDirections.down) {
    for (
      let y = vehicle.y + vehicle.length;
      y < trafficRules.boardRows;
      y += trafficRules.cellStep
    ) {
      cells.push({ x: vehicle.x, y });
    }
    return cells;
  }

  for (
    let y = vehicle.y - trafficRules.cellStep;
    y >= trafficRules.firstCoordinate;
    y -= trafficRules.cellStep
  ) {
    cells.push({ x: vehicle.x, y });
  }
  return cells;
}

export function getTrafficVehicle(
  level: TrafficLevelDefinition,
  vehicleId: string,
): TrafficVehicleDefinition | null {
  return level.vehicles.find((vehicle) => vehicle.id === vehicleId) ?? null;
}

function reject(error: typeof trafficErrors[keyof typeof trafficErrors]): TrafficMoveResult {
  return {
    ok: false,
    error,
    blockingVehicleIds: [],
  };
}

function toCellKey(cell: TrafficCell): string {
  return `${cell.x}:${cell.y}`;
}
