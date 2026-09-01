import { createTrafficEvent } from './events.ts';
import {
  trafficCarStatuses,
  trafficEvents,
  trafficRules,
} from './registry.ts';
import type {
  TrafficCarDefinition,
  TrafficCarProgress,
  TrafficDomainEvent,
  TrafficLevelDefinition,
  TrafficState,
} from './types.ts';

export type MutableTrafficCarProgress = {
  -readonly [Key in keyof TrafficCarProgress]: TrafficCarProgress[Key];
};

interface QueueLedger {
  passengerOffset: number;
  score: number;
  coins: number;
  combo: number;
  boardedAnyGroup: boolean;
}

interface WaitingCarMatch {
  readonly car: TrafficCarDefinition;
  readonly progress: MutableTrafficCarProgress;
}

export function cloneTrafficCarProgress(
  cars: ReadonlyArray<TrafficCarProgress>,
): Array<MutableTrafficCarProgress> {
  return cars.map((car) => ({ ...car }));
}

export function resolvePassengerQueue(
  level: TrafficLevelDefinition,
  state: TrafficState,
  mutableCars: Array<MutableTrafficCarProgress>,
  events: Array<TrafficDomainEvent>,
): TrafficState {
  const carById = new Map(level.cars.map((car) => [car.id, car]));
  const ledger = createQueueLedger(state);
  while (ledger.passengerOffset < state.passengers.length) {
    const nextPassengerColor = state.passengers[ledger.passengerOffset];
    if (nextPassengerColor === undefined) {
      break;
    }
    const match = findMatchingWaitingCar(mutableCars, carById, nextPassengerColor);
    if (match === null) {
      break;
    }
    const passengerCount = countLeadingPassengers(
      state.passengers,
      ledger.passengerOffset,
      nextPassengerColor,
      match.car.capacity - match.progress.boarded,
    );
    if (passengerCount === trafficRules.emptyCollectionSize) {
      break;
    }
    boardPassengerGroup(match, passengerCount, state.passengers.length, ledger, events);
  }
  resetComboAfterIdleRelease(state.passengers.length, ledger, events);
  return {
    ...state,
    cars: mutableCars,
    passengers: state.passengers.slice(ledger.passengerOffset),
    score: ledger.score,
    coins: ledger.coins,
    combo: ledger.combo,
  };
}

function createQueueLedger(state: TrafficState): QueueLedger {
  return {
    passengerOffset: trafficRules.firstIndex,
    score: state.score,
    coins: state.coins,
    combo: state.combo,
    boardedAnyGroup: false,
  };
}

function boardPassengerGroup(
  match: WaitingCarMatch,
  passengerCount: number,
  passengerTotal: number,
  ledger: QueueLedger,
  events: Array<TrafficDomainEvent>,
): void {
  const firstSeatIndex = match.progress.boarded;
  ledger.passengerOffset += passengerCount;
  match.progress.boarded += passengerCount;
  ledger.combo = Math.min(
    ledger.combo + trafficRules.cellStep,
    trafficRules.maximumCombo,
  );
  const passengerPoints = trafficRules.passengerPoints * passengerCount * ledger.combo;
  ledger.score += passengerPoints;
  ledger.boardedAnyGroup = true;
  events.push(createTrafficEvent(trafficEvents.passengerGroupBoarded, {
    carId: match.car.id,
    bayIndex: match.progress.bayIndex,
    passengerColor: match.car.color,
    seatIndex: firstSeatIndex,
    passengerCount,
    points: passengerPoints,
    scoreAfter: ledger.score,
    coinsAfter: ledger.coins,
    comboAfter: ledger.combo,
    queueRemaining: passengerTotal - ledger.passengerOffset,
  }));
  departFullCar(match, passengerTotal, ledger, events);
}

function departFullCar(
  match: WaitingCarMatch,
  passengerTotal: number,
  ledger: QueueLedger,
  events: Array<TrafficDomainEvent>,
): void {
  if (match.progress.boarded < match.car.capacity) {
    return;
  }
  match.progress.status = trafficCarStatuses.departed;
  const departureBayIndex = match.progress.bayIndex;
  match.progress.bayIndex = null;
  const departurePoints = trafficRules.departurePoints * ledger.combo;
  ledger.score += departurePoints;
  ledger.coins += trafficRules.departureCoins;
  events.push(createTrafficEvent(trafficEvents.carDeparted, {
    carId: match.car.id,
    bayIndex: departureBayIndex,
    passengerColor: match.car.color,
    passengerCount: match.car.capacity,
    points: departurePoints,
    coins: trafficRules.departureCoins,
    scoreAfter: ledger.score,
    coinsAfter: ledger.coins,
    comboAfter: ledger.combo,
    queueRemaining: passengerTotal - ledger.passengerOffset,
  }));
}

function resetComboAfterIdleRelease(
  passengerTotal: number,
  ledger: QueueLedger,
  events: Array<TrafficDomainEvent>,
): void {
  if (ledger.boardedAnyGroup || ledger.combo === trafficRules.initialCombo) {
    return;
  }
  ledger.combo = trafficRules.initialCombo;
  events.push(createTrafficEvent(trafficEvents.comboReset, {
    scoreAfter: ledger.score,
    coinsAfter: ledger.coins,
    comboAfter: ledger.combo,
    queueRemaining: passengerTotal - ledger.passengerOffset,
  }));
}

function findMatchingWaitingCar(
  cars: ReadonlyArray<MutableTrafficCarProgress>,
  carById: ReadonlyMap<string, TrafficCarDefinition>,
  passengerColor: TrafficCarDefinition['color'],
): WaitingCarMatch | null {
  let match: WaitingCarMatch | null = null;
  let matchBayIndex = Number.POSITIVE_INFINITY;
  for (const progress of cars) {
    if (progress.status !== trafficCarStatuses.waiting) {
      continue;
    }
    const car = carById.get(progress.id);
    if (
      car === undefined
      || car.color !== passengerColor
      || progress.boarded >= car.capacity
    ) {
      continue;
    }
    const bayIndex = progress.bayIndex ?? trafficRules.firstIndex;
    if (match === null || bayIndex < matchBayIndex) {
      match = { car, progress };
      matchBayIndex = bayIndex;
    }
  }
  return match;
}

function countLeadingPassengers(
  passengers: ReadonlyArray<TrafficCarDefinition['color']>,
  startIndex: number,
  color: TrafficCarDefinition['color'],
  maximumCount: number,
): number {
  let count = trafficRules.emptyCollectionSize;
  while (count < maximumCount && passengers[startIndex + count] === color) {
    count += trafficRules.cellStep;
  }
  return count;
}
