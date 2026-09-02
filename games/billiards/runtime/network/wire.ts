import {
  billiardsBallIds,
  billiardsBallKinds,
  billiardsMatchPhases,
  billiardsPlayerGroups,
} from '../domain/registry.ts';
import type {
  BilliardsBallKind,
  BilliardsBallState,
  BilliardsMatchPhase,
  BilliardsMatchState,
  BilliardsPlayerGroup,
  BilliardsShotCommand,
  BilliardsShotTrace,
  BilliardsTableState,
  Vec2,
} from '../domain/types.ts';

export interface ShotWireCommand extends BilliardsShotCommand {
  readonly expectedRevision: number;
}

export interface CuePlacementWireCommand {
  readonly schemaVersion: 1;
  readonly clientSequence: number;
  readonly expectedRevision: number;
  readonly position: Vec2;
}

export interface RestartWireCommand {
  readonly schemaVersion: 1;
  readonly clientSequence: number;
  readonly expectedRevision: number;
}

export interface BilliardsRejectedWireMessage {
  readonly schemaVersion: 1;
  readonly clientSequence: number;
  readonly reason: string;
  readonly authoritativeSnapshot: BilliardsMatchState;
}

const validBallKinds: ReadonlySet<string> = new Set(Object.values(billiardsBallKinds));
const validPlayerGroups: ReadonlySet<string> = new Set(Object.values(billiardsPlayerGroups));
const validMatchPhases: ReadonlySet<string> = new Set(Object.values(billiardsMatchPhases));
const expectedBallIds: ReadonlySet<number> = new Set([
  billiardsBallIds.cue,
  ...billiardsBallIds.allObjects,
]);

export function isMatchSnapshot(value: unknown): value is BilliardsMatchState {
  if (!isRecord(value) || value.schemaVersion !== 1) {
    return false;
  }
  return isNonNegativeSafeInteger(value.revision)
    && isTableState(value.table)
    && isPlayerTuple(value.players)
    && (value.turnIndex === 0 || value.turnIndex === 1)
    && isMatchPhase(value.phase)
    && (value.winnerIndex === null || value.winnerIndex === 0 || value.winnerIndex === 1)
    && typeof value.ballInHand === 'boolean'
    && isShotTrace(value.activeShot)
    && typeof value.status === 'string';
}

export function cloneMatchSnapshot(match: BilliardsMatchState): BilliardsMatchState {
  return {
    ...match,
    table: {
      ...match.table,
      balls: match.table.balls.map(cloneBall),
    },
    players: [
      { ...match.players[0] },
      { ...match.players[1] },
    ],
    activeShot: match.activeShot === null ? null : {
      ...match.activeShot,
      pocketedBallIds: [...match.activeShot.pocketedBallIds],
    },
  };
}

function isTableState(value: unknown): value is BilliardsTableState {
  if (
    !isRecord(value)
    || value.schemaVersion !== 1
    || !isNonNegativeSafeInteger(value.step)
    || !Array.isArray(value.balls)
    || value.balls.length !== expectedBallIds.size
    || !value.balls.every(isBallState)
  ) {
    return false;
  }
  const ballIds = new Set(value.balls.map((ball) => ball.id));
  return ballIds.size === expectedBallIds.size
    && [...expectedBallIds].every((id) => ballIds.has(id));
}

function isBallState(value: unknown): value is BilliardsBallState {
  return isRecord(value)
    && isNonNegativeSafeInteger(value.id)
    && isBallKind(value.kind)
    && isVec2(value.position)
    && isVec2(value.velocity)
    && isFiniteNumber(value.sideSpin)
    && isFiniteNumber(value.followSpin)
    && typeof value.pocketed === 'boolean';
}

function isPlayerTuple(value: unknown): value is BilliardsMatchState['players'] {
  if (!Array.isArray(value) || value.length !== 2) {
    return false;
  }
  return isPlayer(value[0], 0) && isPlayer(value[1], 1);
}

function isPlayer(value: unknown, expectedIndex: 0 | 1): boolean {
  return isRecord(value)
    && value.index === expectedIndex
    && typeof value.name === 'string'
    && isPlayerGroup(value.group);
}

function isShotTrace(value: unknown): value is BilliardsShotTrace | null {
  if (value === null) {
    return true;
  }
  return isRecord(value)
    && typeof value.eligibleForEightAtStart === 'boolean'
    && (value.firstObjectBallId === null || isNonNegativeSafeInteger(value.firstObjectBallId))
    && Array.isArray(value.pocketedBallIds)
    && value.pocketedBallIds.every(isNonNegativeSafeInteger)
    && isNonNegativeSafeInteger(value.cushionHitsAfterContact)
    && isNonNegativeSafeInteger(value.collisionCount);
}

function isBallKind(value: unknown): value is BilliardsBallKind {
  return typeof value === 'string' && validBallKinds.has(value);
}

function isPlayerGroup(value: unknown): value is BilliardsPlayerGroup {
  return typeof value === 'string' && validPlayerGroups.has(value);
}

function isMatchPhase(value: unknown): value is BilliardsMatchPhase {
  return typeof value === 'string' && validMatchPhases.has(value);
}

function isVec2(value: unknown): value is Vec2 {
  return isRecord(value) && isFiniteNumber(value.x) && isFiniteNumber(value.y);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function cloneBall(ball: BilliardsBallState): BilliardsBallState {
  return {
    ...ball,
    position: { ...ball.position },
    velocity: { ...ball.velocity },
  };
}
