import type {
  TrafficCarStatus,
  TrafficColor,
  TrafficDirection,
  TrafficErrorCode,
  TrafficEventType,
  TrafficLocation,
} from './registry.ts';

export interface TrafficCell {
  readonly x: number;
  readonly y: number;
}

export interface TrafficCarDefinition {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly length: number;
  readonly direction: TrafficDirection;
  readonly color: TrafficColor;
  readonly capacity: number;
}

export interface TrafficLevelDefinition {
  readonly id: string;
  readonly name: string;
  readonly objective: string;
  readonly location: TrafficLocation;
  readonly variantSeed: number;
  readonly bayCount: number;
  readonly cars: ReadonlyArray<TrafficCarDefinition>;
  readonly passengers: ReadonlyArray<TrafficColor>;
  readonly expectedSolution: ReadonlyArray<string>;
}

export interface TrafficCarProgress {
  readonly id: string;
  readonly status: TrafficCarStatus;
  readonly bayIndex: number | null;
  readonly boarded: number;
}

export interface TrafficState {
  readonly levelId: string;
  readonly cars: ReadonlyArray<TrafficCarProgress>;
  readonly passengers: ReadonlyArray<TrafficColor>;
  readonly moveCount: number;
  readonly score: number;
  readonly coins: number;
  readonly combo: number;
  readonly completed: boolean;
  readonly jammed: boolean;
}

export interface TrafficDomainEvent {
  readonly type: TrafficEventType;
  readonly carId: string | null;
  readonly bayIndex: number | null;
  readonly passengerColor: TrafficColor | null;
  readonly seatIndex: number | null;
  readonly passengerCount: number;
  readonly points: number;
  readonly coins: number;
  readonly scoreAfter: number;
  readonly coinsAfter: number;
  readonly comboAfter: number;
  readonly queueRemaining: number;
}

export interface TrafficMoveAccepted {
  readonly ok: true;
  readonly state: TrafficState;
  readonly events: ReadonlyArray<TrafficDomainEvent>;
}

export interface TrafficMoveRejected {
  readonly ok: false;
  readonly error: TrafficErrorCode;
  readonly blockingCarIds: ReadonlyArray<string>;
}

export type TrafficMoveResult = TrafficMoveAccepted | TrafficMoveRejected;

export interface TrafficLevelAnalysis {
  readonly valid: boolean;
  readonly errors: ReadonlyArray<string>;
  readonly solution: ReadonlyArray<string> | null;
  readonly visitedStates: number;
}
