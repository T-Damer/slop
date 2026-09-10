import {
  trafficCarStatuses,
  trafficErrors,
  trafficPassengerGroupSizes,
  trafficRules,
} from './registry.ts';
import {
  createInitialTrafficState,
  getAvailableCarIds,
  getOccupiedCells,
  releaseTrafficCar,
} from './rules.ts';
import type {
  TrafficCarDefinition,
  TrafficLevelAnalysis,
  TrafficLevelDefinition,
  TrafficState,
} from './types.ts';

export function solveTrafficLevel(
  level: TrafficLevelDefinition,
): ReadonlyArray<string> | null {
  return solveTrafficState(level, createInitialTrafficState(level));
}

export function solveTrafficState(
  level: TrafficLevelDefinition,
  state: TrafficState,
): ReadonlyArray<string> | null {
  const context = createSolverContext(level);
  return solveState(context, state).solution;
}

export function analyzeTrafficLevel(level: TrafficLevelDefinition): TrafficLevelAnalysis {
  const errors = validateTrafficLevel(level);
  if (errors.length > trafficRules.emptyCollectionSize) {
    return {
      valid: false,
      errors,
      solution: null,
      visitedStates: trafficRules.emptyCollectionSize,
    };
  }
  const context = createSolverContext(level);
  const result = solveState(context, createInitialTrafficState(level));
  if (result.limitReached) {
    errors.push(trafficErrors.solverLimit);
  } else if (result.solution === null) {
    errors.push(trafficErrors.invalidLevel);
  }
  return {
    valid: errors.length === trafficRules.emptyCollectionSize && result.solution !== null,
    errors,
    solution: result.solution,
    visitedStates: context.visited.size,
  };
}

export function validateTrafficLevel(level: TrafficLevelDefinition): Array<string> {
  const errors: Array<string> = [];
  const occupied = new Map<string, string>();
  const ids = new Set<string>();
  const passengerCountByColor = new Map<string, number>();
  const capacityByColor = new Map<string, number>();
  const allowedCapacities = new Set<number>(trafficPassengerGroupSizes);

  for (const passengerColor of level.passengers) {
    passengerCountByColor.set(
      passengerColor,
      (passengerCountByColor.get(passengerColor) ?? trafficRules.emptyCollectionSize)
        + trafficRules.cellStep,
    );
  }

  for (const car of level.cars) {
    if (ids.has(car.id)) {
      errors.push(`duplicate:${car.id}`);
    }
    ids.add(car.id);
    capacityByColor.set(
      car.color,
      (capacityByColor.get(car.color) ?? trafficRules.emptyCollectionSize) + car.capacity,
    );

    if (car.length !== trafficRules.carLength) {
      errors.push(`length:${car.id}`);
    }
    if (!allowedCapacities.has(car.capacity)) {
      errors.push(`capacity:${car.id}`);
    }

    for (const cell of getOccupiedCells(car)) {
      if (
        cell.x < trafficRules.firstCoordinate
        || cell.y < trafficRules.firstCoordinate
        || cell.x >= trafficRules.boardColumns
        || cell.y >= trafficRules.boardRows
      ) {
        errors.push(`bounds:${car.id}`);
      }
      const key = `${cell.x}:${cell.y}`;
      const occupant = occupied.get(key);
      if (occupant !== undefined) {
        errors.push(`overlap:${occupant}:${car.id}`);
      }
      occupied.set(key, car.id);
    }
  }

  validatePassengerCapacity(passengerCountByColor, capacityByColor, errors);
  if (level.bayCount <= trafficRules.emptyCollectionSize) {
    errors.push('bay-count');
  }
  if (level.expectedSolution.length !== level.cars.length) {
    errors.push('expected-solution-size');
  }
  for (const carId of level.expectedSolution) {
    if (!ids.has(carId)) {
      errors.push(`expected-solution-car:${carId}`);
    }
  }
  return errors;
}

interface SolverContext {
  readonly level: TrafficLevelDefinition;
  readonly carById: ReadonlyMap<string, TrafficCarDefinition>;
  readonly expectedIndexByCarId: ReadonlyMap<string, number>;
  readonly visited: Set<string>;
}

interface SolverResult {
  readonly solution: ReadonlyArray<string> | null;
  readonly limitReached: boolean;
}

function createSolverContext(level: TrafficLevelDefinition): SolverContext {
  return {
    level,
    carById: new Map(level.cars.map((car) => [car.id, car])),
    expectedIndexByCarId: new Map(
      level.expectedSolution.map((carId, index) => [carId, index]),
    ),
    visited: new Set<string>(),
  };
}

function solveState(
  context: SolverContext,
  state: TrafficState,
): SolverResult {
  if (state.completed) {
    return { solution: [], limitReached: false };
  }
  if (state.jammed) {
    return { solution: null, limitReached: false };
  }
  if (context.visited.size >= trafficRules.solverMaximumVisitedStates) {
    return { solution: null, limitReached: true };
  }

  const key = toStateKey(state);
  if (context.visited.has(key)) {
    return { solution: null, limitReached: false };
  }
  context.visited.add(key);

  const candidates = [...getAvailableCarIds(context.level, state)];
  candidates.sort((leftId, rightId) => compareSolverCandidates(
    context,
    state.passengers[trafficRules.firstIndex],
    leftId,
    rightId,
  ));

  for (const carId of candidates) {
    const result = releaseTrafficCar(context.level, state, carId);
    if (!result.ok) {
      continue;
    }
    const suffix = solveState(context, result.state);
    if (suffix.limitReached) {
      return suffix;
    }
    if (suffix.solution !== null) {
      return {
        solution: [carId, ...suffix.solution],
        limitReached: false,
      };
    }
  }
  return { solution: null, limitReached: false };
}

function compareSolverCandidates(
  context: SolverContext,
  nextPassengerColor: TrafficCarDefinition['color'] | undefined,
  leftId: string,
  rightId: string,
): number {
  const leftMatches = context.carById.get(leftId)?.color === nextPassengerColor;
  const rightMatches = context.carById.get(rightId)?.color === nextPassengerColor;
  if (leftMatches !== rightMatches) {
    return leftMatches ? -trafficRules.cellStep : trafficRules.cellStep;
  }
  return getExpectedIndex(context, leftId) - getExpectedIndex(context, rightId);
}

function getExpectedIndex(context: SolverContext, carId: string): number {
  return context.expectedIndexByCarId.get(carId) ?? Number.MAX_SAFE_INTEGER;
}

function validatePassengerCapacity(
  passengerCountByColor: ReadonlyMap<string, number>,
  capacityByColor: ReadonlyMap<string, number>,
  errors: Array<string>,
): void {
  for (const [color, passengerCount] of passengerCountByColor) {
    if (capacityByColor.get(color) !== passengerCount) {
      errors.push(`passenger-capacity:${color}`);
    }
  }
  for (const [color, capacity] of capacityByColor) {
    if (passengerCountByColor.get(color) !== capacity) {
      errors.push(`capacity-passenger:${color}`);
    }
  }
}

function toStateKey(state: TrafficState): string {
  const cars: Array<string> = [];
  for (const car of state.cars) {
    if (car.status !== trafficCarStatuses.departed) {
      cars.push(`${car.id}:${car.status}:${car.bayIndex ?? '-'}:${car.boarded}`);
    }
  }
  cars.sort();
  return `${cars.join('|')}#${state.passengers.join(',')}`;
}
