import {
  trafficCarStatuses,
  trafficDirections,
  trafficErrors,
  trafficEvents,
  trafficRules,
} from './registry.ts';
import type {
  TrafficCarDefinition,
  TrafficCarProgress,
  TrafficCell,
  TrafficDomainEvent,
  TrafficLevelDefinition,
  TrafficMoveResult,
  TrafficState,
} from './types.ts';

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
  if (state.completed) {
    return reject(trafficErrors.levelCompleted);
  }
  if (state.jammed) {
    return reject(trafficErrors.stateJammed);
  }

  const car = getTrafficCar(level, carId);
  if (car === null) {
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

  const bayIndex = getFirstAvailableBayIndex(level, state);
  if (bayIndex === null) {
    return reject(trafficErrors.noBayAvailable);
  }

  const mutableCars = state.cars.map((candidate) => ({ ...candidate }));
  const mutableProgress = mutableCars.find((candidate) => candidate.id === carId);
  if (mutableProgress === undefined) {
    return reject(trafficErrors.carMissing);
  }
  mutableProgress.status = trafficCarStatuses.waiting;
  mutableProgress.bayIndex = bayIndex;

  const events: Array<TrafficDomainEvent> = [
    createEvent(trafficEvents.carReleased, {
      carId,
      bayIndex,
      scoreAfter: state.score,
      coinsAfter: state.coins,
      comboAfter: state.combo,
      queueRemaining: state.passengers.length,
    }),
  ];

  const resolved = resolvePassengerQueue(level, {
    levelId: state.levelId,
    cars: mutableCars,
    passengers: [...state.passengers],
    moveCount: state.moveCount + trafficRules.cellStep,
    score: state.score,
    coins: state.coins,
    combo: state.combo,
    completed: false,
    jammed: false,
  }, events);

  const completed = resolved.passengers.length === trafficRules.emptyCollectionSize
    && resolved.cars.every((candidate) => candidate.status === trafficCarStatuses.departed);
  const stateBeforeJamCheck: TrafficState = {
    ...resolved,
    completed,
    jammed: false,
  };
  const jammed = !completed && isTrafficStateJammed(level, stateBeforeJamCheck);
  const nextState = {
    ...stateBeforeJamCheck,
    jammed,
  };

  if (completed) {
    events.push(createEvent(trafficEvents.levelCompleted, {
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
  if (getFirstAvailableBayIndex(level, state) === null) {
    return [];
  }
  return state.cars
    .filter((progress) => progress.status === trafficCarStatuses.parked)
    .filter(
      (progress) => getBlockingCarIds(level, state, progress.id).length
        === trafficRules.emptyCollectionSize,
    )
    .map((progress) => progress.id);
}

export function getBlockingCarIds(
  level: TrafficLevelDefinition,
  state: TrafficState,
  carId: string,
): ReadonlyArray<string> {
  const car = getTrafficCar(level, carId);
  if (car === null) {
    return [];
  }

  const occupied = new Map<string, string>();
  for (const progress of state.cars) {
    if (progress.id === carId || progress.status !== trafficCarStatuses.parked) {
      continue;
    }
    const candidate = getTrafficCar(level, progress.id);
    if (candidate === null) {
      continue;
    }
    for (const cell of getOccupiedCells(candidate)) {
      occupied.set(toCellKey(cell), candidate.id);
    }
  }

  const blockers = new Set<string>();
  for (const cell of getExitPathCells(car)) {
    const blockingCarId = occupied.get(toCellKey(cell));
    if (blockingCarId !== undefined) {
      blockers.add(blockingCarId);
    }
  }
  return [...blockers].sort();
}

export function getOccupiedCells(
  car: TrafficCarDefinition,
): ReadonlyArray<TrafficCell> {
  const cells: Array<TrafficCell> = [];
  for (
    let offset = trafficRules.firstCoordinate;
    offset < car.length;
    offset += trafficRules.cellStep
  ) {
    cells.push(
      car.direction === trafficDirections.left || car.direction === trafficDirections.right
        ? { x: car.x + offset, y: car.y }
        : { x: car.x, y: car.y + offset },
    );
  }
  return cells;
}

export function getExitPathCells(
  car: TrafficCarDefinition,
): ReadonlyArray<TrafficCell> {
  const cells: Array<TrafficCell> = [];
  if (car.direction === trafficDirections.right) {
    for (
      let x = car.x + car.length;
      x < trafficRules.boardColumns;
      x += trafficRules.cellStep
    ) {
      cells.push({ x, y: car.y });
    }
    return cells;
  }
  if (car.direction === trafficDirections.left) {
    for (
      let x = car.x - trafficRules.cellStep;
      x >= trafficRules.firstCoordinate;
      x -= trafficRules.cellStep
    ) {
      cells.push({ x, y: car.y });
    }
    return cells;
  }
  if (car.direction === trafficDirections.down) {
    for (
      let y = car.y + car.length;
      y < trafficRules.boardRows;
      y += trafficRules.cellStep
    ) {
      cells.push({ x: car.x, y });
    }
    return cells;
  }
  for (
    let y = car.y - trafficRules.cellStep;
    y >= trafficRules.firstCoordinate;
    y -= trafficRules.cellStep
  ) {
    cells.push({ x: car.x, y });
  }
  return cells;
}

export function getTrafficCar(
  level: TrafficLevelDefinition,
  carId: string,
): TrafficCarDefinition | null {
  return level.cars.find((car) => car.id === carId) ?? null;
}

export function getTrafficCarProgress(
  state: TrafficState,
  carId: string,
): TrafficCarProgress | null {
  return state.cars.find((car) => car.id === carId) ?? null;
}

export function getFirstAvailableBayIndex(
  level: TrafficLevelDefinition,
  state: TrafficState,
): number | null {
  const occupiedBays = new Set(
    state.cars
      .filter((car) => car.status === trafficCarStatuses.waiting)
      .flatMap((car) => car.bayIndex === null ? [] : [car.bayIndex]),
  );
  for (
    let bayIndex = trafficRules.firstIndex;
    bayIndex < level.bayCount;
    bayIndex += trafficRules.cellStep
  ) {
    if (!occupiedBays.has(bayIndex)) {
      return bayIndex;
    }
  }
  return null;
}

export function isTrafficStateJammed(
  level: TrafficLevelDefinition,
  state: TrafficState,
): boolean {
  if (state.completed) {
    return false;
  }
  if (getAvailableCarIds(level, state).length > trafficRules.emptyCollectionSize) {
    return false;
  }
  return true;
}

function resolvePassengerQueue(
  level: TrafficLevelDefinition,
  state: TrafficState,
  events: Array<TrafficDomainEvent>,
): TrafficState {
  const mutableCars = state.cars.map((candidate) => ({ ...candidate }));
  const passengers = [...state.passengers];
  let score = state.score;
  let coins = state.coins;
  let combo = state.combo;
  let boardedAnyPassenger = false;

  while (passengers.length > trafficRules.emptyCollectionSize) {
    const nextPassengerColor = passengers[trafficRules.firstIndex];
    const matchingProgress = mutableCars
      .filter((candidate) => candidate.status === trafficCarStatuses.waiting)
      .filter((candidate) => {
        const car = getTrafficCar(level, candidate.id);
        return car?.color === nextPassengerColor
          && candidate.boarded < (car?.capacity ?? trafficRules.emptyCollectionSize);
      })
      .sort((left, right) => (left.bayIndex ?? 0) - (right.bayIndex ?? 0))[trafficRules.firstIndex];

    if (matchingProgress === undefined || nextPassengerColor === undefined) {
      break;
    }
    const matchingCar = getTrafficCar(level, matchingProgress.id);
    if (matchingCar === null) {
      break;
    }

    passengers.shift();
    matchingProgress.boarded += trafficRules.cellStep;
    combo = Math.min(combo + trafficRules.cellStep, trafficRules.maximumCombo);
    const passengerPoints = trafficRules.passengerPoints * combo;
    score += passengerPoints;
    boardedAnyPassenger = true;
    events.push(createEvent(trafficEvents.passengerBoarded, {
      carId: matchingCar.id,
      bayIndex: matchingProgress.bayIndex,
      passengerColor: matchingCar.color,
      seatIndex: matchingProgress.boarded - trafficRules.cellStep,
      points: passengerPoints,
      scoreAfter: score,
      coinsAfter: coins,
      comboAfter: combo,
      queueRemaining: passengers.length,
    }));

    if (matchingProgress.boarded >= matchingCar.capacity) {
      matchingProgress.status = trafficCarStatuses.departed;
      const departureBayIndex = matchingProgress.bayIndex;
      matchingProgress.bayIndex = null;
      const departurePoints = trafficRules.departurePoints * combo;
      score += departurePoints;
      coins += trafficRules.departureCoins;
      events.push(createEvent(trafficEvents.carDeparted, {
        carId: matchingCar.id,
        bayIndex: departureBayIndex,
        passengerColor: matchingCar.color,
        points: departurePoints,
        coins: trafficRules.departureCoins,
        scoreAfter: score,
        coinsAfter: coins,
        comboAfter: combo,
        queueRemaining: passengers.length,
      }));
    }
  }

  if (!boardedAnyPassenger && combo !== trafficRules.initialCombo) {
    combo = trafficRules.initialCombo;
    events.push(createEvent(trafficEvents.comboReset, {
      scoreAfter: score,
      coinsAfter: coins,
      comboAfter: combo,
      queueRemaining: passengers.length,
    }));
  }

  return {
    ...state,
    cars: mutableCars,
    passengers,
    score,
    coins,
    combo,
  };
}

function createEvent(
  type: TrafficDomainEvent['type'],
  overrides: Partial<Omit<TrafficDomainEvent, 'type'>>,
): TrafficDomainEvent {
  return {
    type,
    carId: null,
    bayIndex: null,
    passengerColor: null,
    seatIndex: null,
    points: trafficRules.emptyCollectionSize,
    coins: trafficRules.emptyCollectionSize,
    scoreAfter: trafficRules.initialScore,
    coinsAfter: trafficRules.initialCoins,
    comboAfter: trafficRules.initialCombo,
    queueRemaining: trafficRules.emptyCollectionSize,
    ...overrides,
  };
}

function reject(error: typeof trafficErrors[keyof typeof trafficErrors]): TrafficMoveResult {
  return {
    ok: false,
    error,
    blockingCarIds: [],
  };
}

function toCellKey(cell: TrafficCell): string {
  return `${cell.x}:${cell.y}`;
}
