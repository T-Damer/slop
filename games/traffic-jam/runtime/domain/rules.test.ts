import assert from 'node:assert/strict';
import test from 'node:test';

import { trafficLevels } from './levels.ts';
import {
  createInitialTrafficState,
  getAvailableVehicleIds,
  releaseTrafficVehicle,
} from './rules.ts';
import {
  analyzeTrafficLevel,
  solveTrafficLevel,
} from './solver.ts';

for (const level of trafficLevels) {
  test(`${level.id} is valid and solvable`, () => {
    const analysis = analyzeTrafficLevel(level);
    assert.equal(analysis.valid, true, analysis.errors.join(', '));
    assert.ok(analysis.solution);
    assert.equal(analysis.solution.length, level.vehicles.length);
  });

  test(`${level.id} solution completes without losing state`, () => {
    const solution = solveTrafficLevel(level);
    assert.ok(solution);
    let state = createInitialTrafficState(level);

    for (const vehicleId of solution) {
      const result = releaseTrafficVehicle(level, state, vehicleId);
      assert.equal(result.ok, true);
      if (result.ok) {
        state = result.state;
      }
    }

    assert.equal(state.completed, true);
    assert.equal(state.remainingVehicleIds.length, 0);
    assert.equal(state.moveCount, level.vehicles.length);
  });
}

test('blocked moves are rejected without mutating the state', () => {
  const level = trafficLevels[0];
  assert.ok(level);
  const state = createInitialTrafficState(level);
  const availableVehicleIds = new Set(getAvailableVehicleIds(level, state));
  const blockedVehicle = level.vehicles.find((vehicle) => !availableVehicleIds.has(vehicle.id));
  assert.ok(blockedVehicle);

  const result = releaseTrafficVehicle(level, state, blockedVehicle.id);
  assert.equal(result.ok, false);
  assert.deepEqual(state, createInitialTrafficState(level));
});
