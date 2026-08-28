import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createTrafficLevel,
  getTrafficLevelCount,
} from './levels.ts';
import {
  createInitialTrafficState,
  releaseTrafficCar,
} from './rules.ts';
import {
  analyzeTrafficLevel,
  solveTrafficLevel,
} from './solver.ts';
import {
  trafficCarStatuses,
  trafficRules,
} from './registry.ts';
import type {
  TrafficLevelDefinition,
  TrafficState,
} from './types.ts';

const generationSweep = {
  firstSeed: 1,
  seedsPerLevel: 32,
  seedStep: 7919,
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
      assert.equal(
        analysis.valid,
        true,
        `Seed ${seed}: ${analysis.errors.join(', ')}`,
      );
      assert.ok(analysis.solution, `Seed ${seed} must have a solution.`);
      assert.ok(
        ana