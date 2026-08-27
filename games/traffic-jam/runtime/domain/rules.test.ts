import assert from 'node:assert/strict';
import test from 'node:test';

import {
  trafficCarStatuses,
  trafficErrors,
  trafficEvents,
  trafficRules,
} from './registry.ts';
import { trafficLevels } from './levels.ts';
import {
  createInitialTrafficState,
  getAvailableCarIds,
  releaseTrafficCar,
} from './rules.ts';
import {
  analyzeTrafficLevel,
  solveTrafficLevel,
} from './solver.ts';

for (const level of trafficLevels) {
  test(`${level.id} is dense, valid, and solvable`, () => {
    assert.ok(level.cars.length >= 20);
    const analysis = analyzeTrafficLevel(level);
    assert.equal(analysis.valid, true, analysis.errors.join(', '));
    assert.ok(analysis.solution);
    assert.equal(analysis.solution.length, level.cars.length);
    assert.ok(analysis.visitedStates <= trafficRules.solverMaximumVisitedStates);
  });

  test(`${level.id} completes with passengers, score, and coins intact`, () => {
    const solution = solveTrafficLevel(level);
    assert.ok(solution);
    let state = createInitialTrafficState(level);
    let boardedEvents = 0;
    let departedEvents = 0;

    for (const carId of solution) {
      const result = releaseTrafficCar(level, state, carId);
      assert.equal(result.ok, true);
      if (!result.ok) {
        continue;
      }
      boardedEvents += result.events.filter(
        (event) => event.type === trafficEvents.passengerBoarded,
      ).length;
      departedEvents += result.events.filter(
        (event) => event.type === trafficEvents.carDeparted,
      ).length;
      state = result.state;
    }

    assert.equal(state.completed, true);
    assert.equal(state.jammed, false);
    assert.equal(state.passengers.length, trafficRules.emptyCollectionSize);
    assert.equal(
      state.cars.every((car) => car.status === trafficCarStatuses.departed),
      true,
    );
    assert.equal(boardedEvents, level.passengers.length);
    assert.equal(departedEvents, level.cars.length);
    assert.ok(state.score > trafficRules.initialScore);
    assert.ok(state.coins > trafficRules.initialCoins);
  });
}

test('a blocked car is rejected without mutating state', () => {
  const level = trafficLevels[trafficRules.firstIndex]!;
  const state = createInitialTrafficState(level);
  const available = new Set(getAvailableCarIds(level, state));
  const blockedCar = level.cars.find((car) => !available.has(car.id));
  assert.ok(blockedCar);

  const result = releaseTrafficCar(level, state, blockedCar.id);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error, trafficErrors.pathBlocked);
    assert.ok(result.blockingCarIds.length > trafficRules.emptyCollectionSize);
  }
  assert.deepEqual(state, createInitialTrafficState(level));
});

test('wrong colors can occupy every bay and create a recoverable jam', () => {
  const level = trafficLevels[trafficRules.firstIndex]!;
  let state = createInitialTrafficState(level);
  const firstPassengerColor = state.passengers[trafficRules.firstIndex];

  for (
    let bayIndex = trafficRules.firstIndex;
    bayIndex < level.bayCount;
    bayIndex += trafficRules.cellStep
  ) {
    const wrongCarId = getAvailableCarIds(level, state).find(
      (carId) => level.cars.find((car) => car.id === carId)?.color !== firstPassengerColor,
    );
    assert.ok(wrongCarId);
    const result = releaseTrafficCar(level, state, wrongCarId);
    assert.equal(result.ok, true);
    if (result.ok) {
      state = result.state;
    }
  }

  assert.equal(state.jammed, true);
  assert.equal(state.completed, false);
  assert.equal(state.passengers[trafficRules.firstIndex], firstPassengerColor);
});

test('the recommended first car boards passengers and departs', () => {
  const level = trafficLevels[trafficRules.firstIndex]!;
  const state = createInitialTrafficState(level);
  const firstCarId = level.expectedSolution[trafficRules.firstIndex]!;
  const result = releaseTrafficCar(level, state, firstCarId);
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }
  assert.ok(result.events.some((event) => event.type === trafficEvents.passengerBoarded));
  assert.ok(result.events.some((event) => event.type === trafficEvents.carDeparted));
  assert.ok(result.state.score > state.score);
  assert.ok(result.state.coins > state.coins);
});
