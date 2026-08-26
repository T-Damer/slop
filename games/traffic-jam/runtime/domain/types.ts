import type {
  TrafficColor,
  TrafficDirection,
  TrafficErrorCode,
  TrafficEventType,
} from './registry.ts';

export interface TrafficCell {
  readonly x: number;
  readonly y: number;
}

export interface TrafficVehicleDefinition {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly length: number;
  readonly direction: TrafficDirection;
  readonly color: TrafficColor;
}

export interface TrafficLevelDefinition {
  readonly id: string;
  readonly name: string;
  readonly hint: string;
  readonly vehicles: ReadonlyArray<TrafficVehicleDefinition>;
}

export interface TrafficState {
  readonly levelId: string;
  readonly remainingVehicleIds: ReadonlyArray<string>;
  readonly moveCount: number;
  readonly completed: boolean;
}

export interface TrafficDomainEvent {
  readonly type: TrafficEventType;
  readonly vehicleId: string | null;
  readonly moveCount: number;
}

export interface TrafficMoveAccepted {
  readonly ok: true;
  readonly state: TrafficState;
  readonly events: ReadonlyArray<TrafficDomainEvent>;
}

export interface TrafficMoveRejected {
  readonly ok: false;
  readonly error: TrafficErrorCode;
  readonly blockingVehicleIds: ReadonlyArray<string>;
}

export type TrafficMoveResult = TrafficMoveAccepted | TrafficMoveRejected;

export interface TrafficLevelAnalysis {
  readonly valid: boolean;
  readonly errors: ReadonlyArray<string>;
  readonly solution: ReadonlyArray<string> | null;
}
