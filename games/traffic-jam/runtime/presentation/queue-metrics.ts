import {
  trafficRules,
  type TrafficColor,
} from '../domain/registry.ts';
import type { TrafficState } from '../domain/types.ts';

export function countLeadingQueueColor(
  passengers: TrafficState['passengers'],
  color: TrafficColor,
): number {
  let count: number = trafficRules.emptyCollectionSize;
  while (passengers[count] === color) {
    count += trafficRules.cellStep;
  }
  return count;
}
