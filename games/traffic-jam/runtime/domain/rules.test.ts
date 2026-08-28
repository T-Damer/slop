import assert from 'node:assert/strict';
import test from 'node:test';

import {
  trafficCarStatuses,
  trafficErrors,
  trafficEvents,
  trafficLocations,
  trafficRules,
} from './registry.ts';
import {
  createTrafficLevel,
  getTrafficLevelCount,
  trafficLevels,
} from './levels.ts';
import {
  createInitialTrafficState,
  getAvailableCarIds,
  releaseTrafficCar,
} from './rules.ts';
import {
  analyzeTrafficLevel,
  solveTrafficLevel,
} from './solver.ts';

const variantSeeds = [17, 2026, 9001] as const;

for (
  let levelIndex = trafficRules.firstIndex;
  levelIndex < getTrafficLevelCount();
  levelIndex += trafficRules.cellStep
) {
  for (const seed of variantSeeds) {
    const level = createTrafficLevel(levelIndex, seed);

    test(`${level.id} seed ${seed} is dense, grouped, valid, and solvable`, () => {
      assert.ok(level.cars.length >= 20);
      assert.ok(level.passengers.length > level.cars.length);
      assert.ok(level.cars.every((car) => car.capacity > trafficRules.cellStep));
      const analysis = analyzeTrafficLevel(level);
      assert.equal(analysis.valid, true, analysis.errors.join(', '));
      const solution = requireValue(analysis.solution, 'Expected a valid solution.');
      assert.equal(solution.length, level.cars.length);
      assert.ok(analysis.visitedStates <= trafficRules.solverMaximumVisitedStates);
    });

    test(`${level.id} seed ${seed} completes with crowd events and rewards intact`, () => {
      const solution = requireValue(
        solveTrafficLevel(level),
        `Expected ${level.id} seed ${seed} to be solvable.`,
      );
      let state = createInitialTrafficState(level);
      let boardedPassengerCount: number = trafficRules.emptyCollectionSize;
      let boardedGroupCount: number = trafficRules.emptyCollectionSize;
      let departedEvents: number = trafficRules.emptyCollectionSize;

      for (const carId of solution) {
        const result = releaseTrafficCar(level, state, carId);
        assert.equal(result.ok, true);
        if (!result.ok) {
          continue;
        }
        const groupEvents = result.events.filter(
          (event) => event.type === trafficEvents.passengerGroupBoarded,
        );
        boardedGroupCount += groupEvents.length;
        boardedPassengerCount += groupEvents.reduce<number>(
          (total, event) => total + event.passengerCount,
          trafficRules.emptyCollectionSize,
        );
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
      assert.equal(boardedPassengerCount, level.passengers.length);
      assert.equal(boardedGroupCount, level.cars.length);
      assert.equal(departedEvents, level.cars.length);
      assert.ok(state.score > trafficRules.initialScore);
      assert.ok(state.coins > trafficRules.initialCoins);
    });
  }
}

test('reload seeds produce different solvable grids', () => {
  const signatures = new Set(
    variantSeeds.map((seed) => createTrafficLevel(trafficRules.firstIndex, seed).cars
      .map((car) => `${car.x}:${car.y}:${car.direction}:${car.capacity}`)
      .sort()
      .join('|')),
  );
  assert.ok(signatures.size > trafficRules.cellStep);
});

test('the catalog includes city and beach locations', () => {
  const locations = new Set(trafficLevels.map((level) => level.location));
  assert.equal(locations.has(trafficLocations.city), true);
  assert.equal(locations.has(trafficLocations.beach), true);
});

test('a blocked car is rejected without mutating state', () => {
  const level = trafficLevels[trafficRules.firstIndex]!;
  const state = createInitialTrafficState(level);
  const available = new Set(getAvailableCarIds(level, state));
  const blockedCar = requireValue(
    level.cars.find((car) => !available.has(car.id)),
    'Expected at least one blocked car.',
  );

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
  const firstPassengerColor = requireValue(
    state.passengers[trafficRules.firstIndex],
    'Expected a passenger queue.',
  );

  for (
    let bayIndex = trafficRules.firstIndex;
    bayIndex < level.bayCount;
    bayIndex += trafficRules.cellStep
  ) {
    const wrongCarId = requireValue(
      getAvailableCarIds(level, state).find(
        (carId) => level.cars.find((car) => car.id === carId)?.color !== firstPassengerColor,
      ),
      `Expected a wrong-color car for bay ${bayIndex}.`,
    );
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

test('the recommended first car boards a whole group and departs', () => {
  const level = trafficLevels[trafficRules.firstIndex]!;
  const state = createInitialTrafficState(level);
  const firstCarId = requireValue(
    level.expectedSolution[trafficRules.firstIndex],
    'Expected a recommended first car.',
  );
  const firstCar = requireValue(
    level.cars.find((car) => car.id === firstCarId),
    'Expected the recommended car definition.',
  );

  const result = releaseTrafficCar(level, state, firstCarId);
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }
  const groupEvent = requireValue(
    result.events.find((event) => event.type === trafficEvents.passengerGroupBoarded),
    'Expected a passenger-group event.',
  );
  assert.equal(groupEvent.passengerCount, firstCar.capacity);
  assert.ok(result.events.some((event) => event.type === trafficEvents.carDeparted));
  assert.ok(result.state.score > state.score);
  assert.ok(result.state.coins > state.coins);
});

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
