import {
  getBlockingCarIds,
  getFirstAvailableBayIndex,
  getReleasableCarIds,
  getTrafficCar,
  getTrafficCarProgress,
} from './board.ts';
import { createTrafficEvent } from './events.ts';
import {
  cloneTrafficCarProgress,
  resolvePassengerQueue,
} from './queue.ts';
import {
  trafficCarStatuses,
  trafficErrors,
  trafficEvents,
  trafficRules,
} from './registry.ts';
import type {
  TrafficDomainEvent,
  TrafficLevelDefinition,
  TrafficMoveResult,
  TrafficState,
} from './types.ts';

export {
  getBlockingCarIds,
  getExitPathCells,
  getFirstAvailableBayIndex,
  getOccupiedCells,
  getTrafficCar,
  getTrafficCarProgress,
} from './board.ts';

export function createInitialTrafficState(level: TrafficLevelDefinition): TrafficState {
  return {
    levelId: level.id,
    cars: level.cars.map((car) => ({
      id: car.id,
      status: trafficCarStatuses.parked,
      bayIndex: null,
      boarded: trafficRules.emptyCollectionSize,
    })),
    passengers: [...level.passengers],
    moveCount: trafficRules.initialMoveCount,
    score: trafficRules.initialScore,
    coins: trafficRules.initialCoins,
    combo: trafficRules.initialCombo,
    completed: false,
    jammed: false,
  };
}

export function releaseTrafficCar(
  level: TrafficLevelDefinition,
  state: TrafficState,
  carId: string,
): TrafficMoveResult {
  const rejection = validateRelease(level, state, carId);
  if (rejection !== null) {
    return rejection;
  }

  const car = getTrafficCar(level, carId);
  const bayIndex = getFirstAvailableBayIndex(level, state);
  if (car === null || bayIndex === null) {
    return reject(car === null ? trafficErrors.carMissing : trafficErrors.noBayAvailable);
  }

  const mutableCars = cloneTrafficCarProgress(state.cars);
  const mutableProgress = mutableCars.find((candidate) => candidate.id === carId);
  if (mutableProgress === undefined) {
    return reject(trafficErrors.carMissing);
  }
  mutableProgress.status = trafficCarStatuses.waiting;
  mutableProgress.bayIndex = bayIndex;

  const events: Array<TrafficDomainEvent> = [
    createTrafficEvent(trafficEvents.carReleased, {
      carId,
      bayIndex,
      scoreAfter: state.score,
      coinsAfter: state.coins,
      comboAfter: state.combo,
      queueRemaining: state.passengers.length,
    }),
  ];
  const resolved = resolvePassengerQueue(level, {
    ...state,
    cars: mutableCars,
    moveCount: state.moveCount + trafficRules.cellStep,
    completed: false,
    jammed: false,
  }, mutableCars, events);
  const completed = resolved.passengers.length === trafficRules.emptyCollectionSize
    && resolved.cars.every((candidate) => candidate.status === trafficCarStatuses.departed);
  const stateBeforeJamCheck: TrafficState = {
    ...resolved,
    completed,
    jammed: false,
  };
  const nextState: TrafficState = {
    ...stateBeforeJamCheck,
    jammed: !completed && isTrafficStateJammed(level, stateBeforeJamCheck),
  };

  if (completed) {
    events.push(createTrafficEvent(trafficEvents.levelCompleted, {
      scoreAfter: nextState.score,
      coinsAfter: nextState.coins,
      comboAfter: nextState.combo,
      queueRemaining: nextState.passengers.length,
    }));
  }

  return {
    ok: true,
    state: nextState,
    events,
  };
}

export function getAvailableCarIds(
  level: TrafficLevelDefinition,
  state: TrafficState,
): ReadonlyArray<string> {
  if (
    state.completed
    || state.jammed
    || getFirstAvailableBayIndex(level, state) === null
  ) {
    return [];
  }
  return getReleasableCarIds(level, state);
}

export function isTrafficStateJammed(
  level: TrafficLevelDefinition,
  state: TrafficState,
): boolean {
  if (state.completed) {
    return false;
  }
  return getFirstAvailableBayIndex(level, state) === null
    || getReleasableCarIds(level, state).length === trafficRules.emptyCollectionSize;
}

function validateRelease(
  level: TrafficLevelDefinition,
  state: TrafficState,
  carId: string,
): TrafficMoveResult | null {
  if (state.completed) {
    return reject(trafficErrors.levelCompleted);
  }
  if (state.jammed) {
    return reject(trafficErrors.stateJammed);
  }
  if (getTrafficCar(level, carId) === null) {
    return reject(trafficErrors.carMissing);
  }
  const progress = getTrafficCarProgress(state, carId);
  if (progress === null || progress.status !== trafficCarStatuses.parked) {
    return reject(trafficErrors.carUnavailable);
  }
  const blockingCarIds = getBlockingCarIds(level, state, carId);
  if (blockingCarIds.length > trafficRules.emptyCollectionSize) {
    return {
      ok: false,
      error: trafficErrors.pathBlocked,
      blockingCarIds,
    };
  }
  if (getFirstAvailableBayIndex(level, state) === null) {
    return reject(trafficErrors.noBayAvailable);
  }
  return null;
}

function reject(error: typeof trafficErrors[keyof typeof trafficErrors]): TrafficMoveResult {
  return {
    ok: false,
    error,
    blockingCarIds: [],
  };
}
