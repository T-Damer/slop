import type {
  billiardsBallKinds,
  billiardsCollisionKinds,
  billiardsMatchPhases,
  billiardsPlayerGroups,
} from './registry.ts';

type ObjectValue<T> = T[keyof T];

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export type BilliardsBallKind = ObjectValue<typeof billiardsBallKinds>;
export type BilliardsPlayerGroup = ObjectValue<typeof billiardsPlayerGroups>;
export type BilliardsMatchPhase = ObjectValue<typeof billiardsMatchPhases>;
export type BilliardsCollisionKind = ObjectValue<typeof billiardsCollisionKinds>;

export interface BilliardsBallState {
  readonly id: number;
  readonly kind: BilliardsBallKind;
  readonly position: Vec2;
  readonly velocity: Vec2;
  readonly sideSpin: number;
  readonly followSpin: number;
  readonly pocketed: boolean;
}

export interface BilliardsTableState {
  readonly schemaVersion: 1;
  readonly step: number;
  readonly balls: ReadonlyArray<BilliardsBallState>;
}

export interface BilliardsPocket {
  readonly id: string;
  readonly center: Vec2;
  readonly radius: number;
}

export interface BilliardsCushionLine {
  readonly id: string;
  readonly start: Vec2;
  readonly end: Vec2;
  readonly inwardNormal: Vec2;
}

export interface BilliardsJawPoint {
  readonly id: string;
  readonly point: Vec2;
}

interface TimedCollision {
  readonly time: number;
  readonly kind: BilliardsCollisionKind;
}

export interface BallBallCollision extends TimedCollision {
  readonly kind: 'ball-ball';
  readonly leftBallId: number;
  readonly rightBallId: number;
}

export interface BallCushionCollision extends TimedCollision {
  readonly kind: 'ball-cushion';
  readonly ballId: number;
  readonly cushionId: string;
}

export interface BallJawCollision extends TimedCollision {
  readonly kind: 'ball-jaw';
  readonly ballId: number;
  readonly jawId: string;
}

export interface BallPocketCollision extends TimedCollision {
  readonly kind: 'ball-pocket';
  readonly ballId: number;
  readonly pocketId: string;
}

export type BilliardsCollisionEvent =
  | BallBallCollision
  | BallCushionCollision
  | BallJawCollision
  | BallPocketCollision;

export interface BilliardsSimulationStep {
  readonly table: BilliardsTableState;
  readonly events: ReadonlyArray<BilliardsCollisionEvent>;
}

export interface BilliardsShotCommand {
  readonly schemaVersion: 1;
  readonly angleRadians: number;
  readonly power: number;
  readonly sideSpin: number;
  readonly followSpin: number;
  readonly clientSequence: number;
}

export interface BilliardsShotPreview {
  readonly cuePath: ReadonlyArray<Vec2>;
  readonly objectPath: ReadonlyArray<Vec2>;
  readonly firstCollision: BilliardsCollisionEvent | null;
}

export interface BilliardsShotTrace {
  readonly eligibleForEightAtStart: boolean;
  readonly firstObjectBallId: number | null;
  readonly pocketedBallIds: ReadonlyArray<number>;
  readonly cushionHitsAfterContact: number;
  readonly collisionCount: number;
}

export interface BilliardsPlayerState {
  readonly index: number;
  readonly name: string;
  readonly group: BilliardsPlayerGroup;
}

export interface BilliardsMatchState {
  readonly schemaVersion: 1;
  readonly revision: number;
  readonly table: BilliardsTableState;
  readonly players: readonly [BilliardsPlayerState, BilliardsPlayerState];
  readonly turnIndex: 0 | 1;
  readonly phase: BilliardsMatchPhase;
  readonly winnerIndex: 0 | 1 | null;
  readonly ballInHand: boolean;
  readonly activeShot: BilliardsShotTrace | null;
  readonly status: string;
}

export interface BilliardsCommandAccepted {
  readonly accepted: true;
  readonly match: BilliardsMatchState;
}

export interface BilliardsCommandRejected {
  readonly accepted: false;
  readonly reason: string;
  readonly match: BilliardsMatchState;
}

export type BilliardsCommandResult = BilliardsCommandAccepted | BilliardsCommandRejected;
