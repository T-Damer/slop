import { trafficRules } from './registry.ts';
import type { TrafficDomainEvent } from './types.ts';

export function createTrafficEvent(
  type: TrafficDomainEvent['type'],
  overrides: Partial<Omit<TrafficDomainEvent, 'type'>>,
): TrafficDomainEvent {
  return {
    type,
    carId: null,
    bayIndex: null,
    passengerColor: null,
    seatIndex: null,
    passengerCount: trafficRules.emptyCollectionSize,
    points: trafficRules.emptyCollectionSize,
    coins: trafficRules.emptyCollectionSize,
    scoreAfter: trafficRules.initialScore,
    coinsAfter: trafficRules.initialCoins,
    comboAfter: trafficRules.initialCombo,
    queueRemaining: trafficRules.emptyCollectionSize,
    ...overrides,
  };
}
