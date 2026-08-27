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
  getTrafficCar,
  releaseTrafficCar,
} from './rules.ts';
import type {
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
  const visited = new Set<string>();
  const result = solveState(level, state, visited);
  return result.solution;
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
  const visited = new Set<string>();
  const result = solveState(level, createInitialTrafficState(level), visited);
  if (result.limitReached) {
    errors.push(trafficErrors.solverLimit);
  } else if (result.solution === null) {
    errors.push(trafficErrors.invalidLevel);
  }
  return {
    valid: errors.length === trafficRules.emptyCollectionSize && result.solution !== null,
    errors,
    solution: result.solution,
    visitedStates: visited.size,
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

  if (level.bayCount <= trafficRules.emptyCollectionSize) {
    errors.push('bay-count');
  }
  if (level.expectedSolution.length !== level.cars.length) {
    errors.push('expected-solution-size');
  }
  for (const carId of level.expectedSolution) {
    if (getTrafficCar(level, carId) === null) {
      errors.push(`expected-solution-car:${carId}`);
    }
  }
  return errors;
}

interface SolverResult {
  readonly solution: ReadonlyArray<string> | null;
  readonly limitReached: boolean;
}

function solveState(
  level: TrafficLevelDefinition,
  state: TrafficState,
  visited: Set<string>,
): SolverResult {
  if (state.completed) {
    return { solution: [], limitReached: false };
  }
  if (state.jammed) {
    return { solution: null, limitReached: false };
  }
  if (visited.size >= trafficRules.solverMaximumVisitedStates) {
    return { solution: null, limitReached: true };
  }

  const key = toStateKey(state);
  if (visited.has(key)) {
    return { solution: null, limitReached: false };
  }
  visited.add(key);

  const nextPassengerColor = state.passengers[trafficRules.firstIndex];
  const candidates = [...getAvailableCarIds(level, state)].sort((leftId, rightId) => {
    const leftMatches = getTrafficCar(level, leftId)?.color === nextPassengerColor;
    const rightMatches = getTrafficCar(level, rightId)?.color === nextPassengerColor;
    if (leftMatches === rightMatches) {
      const leftExpectedIndex = level.expectedSolution.indexOf(leftId);
      const rightExpectedIndex = level.expectedSolution.indexOf(rightId);
      return leftExpectedIndex - rightExpectedIndex;
    }
    return leftMatches ? -trafficRules.cellStep : trafficRules.cellStep;
  });

  for (const carId of candidates) {
    const result = releaseTrafficCar(level, state, carId);
    if (!result.ok) {
      continue;
    }
    const suffix = solveState(level, result.state, visited);
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

function toStateKey(state: TrafficState): string {
  const cars = state.cars
    .filter((car) => car.status !== trafficCarStatuses.departed)
    .map((car) => `${car.id}:${car.status}:${car.bayIndex ?? '-'}:${car.boarded}`)
    .sort()
    .join('|');
  return `${cars}#${state.passengers.join(',')}`;
}
