import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createTrafficLevel,
  getTrafficLevelCount,
} from './levels.ts';
import {
  trafficCarStatuses,
  trafficRules,
  type TrafficColor,
} from './registry.ts';
import {
  createInitialTrafficState,
  releaseTrafficCar,
} from './rules.ts';
import {
  analyzeTrafficLevel,
  solveTrafficLevel,
} from './solver.ts';
import type {
  TrafficLevelDefinition,
  TrafficState,
} from './types.ts';

const generationSweep = {
  firstSeed: 1,
  seedsPerLevel: 32,
  seedStep: 7919,
  minimumDistinctSignatures: 12,
} as const;

for (
  let levelIndex = trafficRules.firstIndex;
  levelIndex < getTrafficLevelCount();
  levelIndex += trafficRules.cellStep
) {
  test(`generated level ${levelIndex} is deterministic and valid across the PR seed sweep`, () => {
    const signatures = new Set<string>();

    for (
      let seedIndex = trafficRules.firstIndex;
      seedIndex < generationSweep.seedsPerLevel;
      seedIndex += trafficRules.cellStep
    ) {
      const seed = generationSweep.firstSeed + seedIndex * generationSweep.seedStep;
      const left = createTrafficLevel(levelIndex, seed);
      const right = createTrafficLevel(levelIndex, seed);
      assert.deepEqual(right, left, `Seed ${seed} must reproduce the exact level.`);

      const analysis = analyzeTrafficLevel(left);
      assert.equal(analysis.valid, true, `Seed ${seed}: ${analysis.errors.join(', ')}`);
      const solution = requireValue(
        analysis.solution,
        `Seed ${seed} must have a solution.`,
      );
      assert.ok(
        analysis.visitedStates <= trafficRules.solverMaximumVisitedStates,
        `Seed ${seed} exceeded the solver state budget.`,
      );

      assert.deepEqual(
        countPassengerDemand(left),
        countVehicleCapacity(left),
        `Seed ${seed} must conserve passenger demand by color.`,
      );

      const finalState = playSolution(left, solution);
      assert.equal(finalState.completed, true);
      assert.equal(finalState.jammed, false);
      assert.equal(finalState.passengers.length, trafficRules.emptyCollectionSize);
      assert.equal(
        finalState.cars.every((car) => car.status === trafficCarStatuses.departed),
        true,
      );
      signatures.add(createLevelSignature(left));
    }

    assert.ok(
      signatures.size >= generationSweep.minimumDistinctSignatures,
      `Level ${levelIndex} produced only ${signatures.size} distinct layouts.`,
    );
  });
}

function playSolution(
  level: TrafficLevelDefinition,
  solution: ReadonlyArray<string>,
): TrafficState {
  let state = createInitialTrafficState(level);
  for (const carId of solution) {
    const result = releaseTrafficCar(level, state, carId);
    assert.equal(result.ok, true, `Solver emitted an invalid move for ${carId}.`);
    if (result.ok) {
      state = result.state;
    }
  }
  return state;
}

function countPassengerDemand(
  level: TrafficLevelDefinition,
): ReadonlyArray<readonly [TrafficColor, number]> {
  const counts = new Map<TrafficColor, number>();
  for (const color of level.passengers) {
    counts.set(color, (counts.get(color) ?? trafficRules.emptyCollectionSize) + trafficRules.cellStep);
  }
  return [...counts.entries()].sort(([left], [right]) => left.localeCompare(right));
}

function countVehicleCapacity(
  level: TrafficLevelDefinition,
): ReadonlyArray<readonly [TrafficColor, number]> {
  const counts = new Map<TrafficColor, number>();
  for (const car of level.cars) {
    counts.set(car.color, (counts.get(car.color) ?? trafficRules.emptyCollectionSize) + car.capacity);
  }
  return [...counts.entries()].sort(([left], [right]) => left.localeCompare(right));
}

function createLevelSignature(level: TrafficLevelDefinition): string {
  return level.cars
    .map((car) => `${car.id}:${car.x}:${car.y}:${car.direction}:${car.color}:${car.capacity}`)
    .sort()
    .join('|');
}

function requireValue<T>(
  value: T | null | undefined,
  message: string,
): T {
  assert.ok(value !== null && value !== undefined, message);
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value;
}
