import {
  trafficErrors,
  trafficRules,
} from './registry.ts';
import {
  createInitialTrafficState,
  getAvailableVehicleIds,
  getOccupiedCells,
  releaseTrafficVehicle,
} from './rules.ts';
import type {
  TrafficLevelAnalysis,
  TrafficLevelDefinition,
  TrafficState,
} from './types.ts';

export function solveTrafficLevel(
  level: TrafficLevelDefinition,
): ReadonlyArray<string> | null {
  const initialState = createInitialTrafficState(level);
  const visited = new Set<string>();
  return solveState(level, initialState, visited);
}

export function analyzeTrafficLevel(level: TrafficLevelDefinition): TrafficLevelAnalysis {
  const errors = validateTrafficLevel(level);
  const solution = errors.length === trafficRules.emptyCollectionSize
    ? solveTrafficLevel(level)
    : null;
  if (solution === null && errors.length === trafficRules.emptyCollectionSize) {
    errors.push(trafficErrors.invalidLevel);
  }
  return {
    valid: errors.length === trafficRules.emptyCollectionSize && solution !== null,
    errors,
    solution,
  };
}

export function validateTrafficLevel(level: TrafficLevelDefinition): Array<string> {
  const errors: Array<string> = [];
  const occupied = new Map<string, string>();
  const ids = new Set<string>();

  for (const vehicle of level.vehicles) {
    if (ids.has(vehicle.id)) {
      errors.push(`duplicate:${vehicle.id}`);
    }
    ids.add(vehicle.id);

    if (
      vehicle.length < trafficRules.minimumVehicleLength ||
      vehicle.length > trafficRules.maximumVehicleLength
    ) {
      errors.push(`length:${vehicle.id}`);
    }

    for (const cell of getOccupiedCells(vehicle)) {
      if (
        cell.x < trafficRules.firstCoordinate ||
        cell.y < trafficRules.firstCoordinate ||
        cell.x >= trafficRules.boardColumns ||
        cell.y >= trafficRules.boardRows
      ) {
        errors.push(`bounds:${vehicle.id}`);
      }
      const key = `${cell.x}:${cell.y}`;
      const occupant = occupied.get(key);
      if (occupant !== undefined) {
        errors.push(`overlap:${occupant}:${vehicle.id}`);
      }
      occupied.set(key, vehicle.id);
    }
  }
  return errors;
}

function solveState(
  level: TrafficLevelDefinition,
  state: TrafficState,
  visited: Set<string>,
): ReadonlyArray<string> | null {
  if (state.completed) {
    return [];
  }

  const key = [...state.remainingVehicleIds].sort().join('|');
  if (visited.has(key)) {
    return null;
  }
  visited.add(key);

  for (const vehicleId of getAvailableVehicleIds(level, state)) {
    const result = releaseTrafficVehicle(level, state, vehicleId);
    if (!result.ok) {
      continue;
    }
    const suffix = solveState(level, result.state, visited);
    if (suffix !== null) {
      return [vehicleId, ...suffix];
    }
  }
  return null;
}
