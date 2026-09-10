import {
  advanceMatchShot, createInitialMatch, positionCueBall, restartMatch, startMatchShot,
} from '../domain/match.ts';
import { isFiniteVec2 } from '../domain/geometry.ts';
import { canPlaceCueBall } from '../domain/rack.ts';
import { billiardsMatchPhases, billiardsPhysics } from '../domain/registry.ts';
import { isValidShotCommand } from '../domain/shot.ts';
import type { BilliardsMatchState, BilliardsShotCommand } from '../domain/types.ts';
import {
  billiardsInteractionKinds as kinds, billiardsInteractionMessageType,
  isBilliardsInteractionMessage, normalizeBilliardsInteraction,
} from './interaction-wire-v2.ts';
import { billiardsProtocol as protocol } from './registry.ts';
import type { RestartWireCommand } from './wire.ts';

export interface BilliardsRoomClient {
  readonly sessionId: string;
  readonly send: (type: string, value?: unknown) => void;
}

export interface BilliardsRoomPort {
  readonly onMessage: (type: string, handler: (client: BilliardsRoomClient, value: unknown) => void) => void;
  readonly broadcast: (type: string, value: unknown, options?: { except: BilliardsRoomClient }) => void;
}

export const billiardsRoomTiming = {
  tickMilliseconds: billiardsPhysics.fixedStepSeconds * 1000,
  snapshotEverySteps: 4,
  maximumPlayers: 2,
  maximumPlayerNameLength: 48,
} as const;

/** Server adapter: the shared domain is the sole owner of accepted match state. */
export class AuthoritativeBilliardsRoom {
  private match: BilliardsMatchState;
  private readonly room: BilliardsRoomPort;
  private readonly players = new Map<string, 0 | 1>();
  private readonly sequences = new Map<string, number>();
  private aimLocked = false;

  public constructor(room: BilliardsRoomPort, match = createInitialMatch()) {
    this.room = room;
    this.match = match;
    room.onMessage(protocol.messages.ready, (client) => this.ready(client));
    for (const kind of [protocol.messages.shot, protocol.messages.placeCue, protocol.messages.restart]) {
      room.onMessage(kind, (client, value) => this.command(client, kind, value));
    }
    room.onMessage(billiardsInteractionMessageType, (client, value) => this.interaction(client, value));
  }

  public join(client: BilliardsRoomClient, name: string): void {
    if (this.players.has(client.sessionId)) return;
    if (this.players.size >= billiardsRoomTiming.maximumPlayers) throw new Error('Room is full.');
    const seat = [...this.players.values()].includes(0) ? 1 : 0;
    this.players.set(client.sessionId, seat);
    this.sequences.set(client.sessionId, -1);
    const names = [this.match.players[0].name, this.match.players[1].name] as [string, string];
    names[seat] = name.trim().slice(0, billiardsRoomTiming.maximumPlayerNameLength) || 'Игрок';
    this.match = { ...this.match, revision: this.match.revision + 1,
      players: [{ ...this.match.players[0], name: names[0] }, { ...this.match.players[1], name: names[1] }] };
    this.aimLocked = false;
    this.publish();
  }

  public leave(client: BilliardsRoomClient): void {
    if (!this.players.delete(client.sessionId)) return;
    this.sequences.delete(client.sessionId);
    this.match = restartMatch(this.match);
    this.aimLocked = false;
    this.publish();
  }

  public tick(): void {
    if (this.match.activeShot === null) return;
    this.match = advanceMatchShot(this.match);
    if (this.match.activeShot === null || this.match.table.step % billiardsRoomTiming.snapshotEverySteps === 0) {
      this.publish();
    }
  }

  public snapshot(): BilliardsMatchState { return this.match; }

  private ready(client: BilliardsRoomClient): void {
    const playerIndex = this.players.get(client.sessionId);
    if (playerIndex === undefined) return;
    client.send(protocol.messages.welcome, { schemaVersion: protocol.version, playerIndex });
    client.send(protocol.messages.snapshot, this.match);
  }

  private command(client: BilliardsRoomClient, kind: string, value: unknown): void {
    if (!isCommandBase(value)) return this.reject(client, -1, 'Недопустимая команда');
    if (!this.acceptSequence(client, value.clientSequence)) return this.reject(client, value.clientSequence, 'Повтор команды');
    if (!this.isActivePlayer(client) || value.expectedRevision !== this.match.revision) {
      return this.reject(client, value.clientSequence, 'Не ваш ход или устаревшее состояние');
    }
    if (kind === protocol.messages.restart) {
      this.match = restartMatch(this.match);
    } else {
      const result = kind === protocol.messages.shot && isShot(value)
        ? startMatchShot(this.match, value)
        : kind === protocol.messages.placeCue && isPosition(value.position)
          ? positionCueBall(this.match, value.position) : null;
      if (result === null || !result.accepted) {
        return this.reject(client, value.clientSequence, result?.reason ?? 'Недопустимые параметры');
      }
      this.match = result.match;
    }
    this.aimLocked = false;
    this.publish();
  }

  private interaction(client: BilliardsRoomClient, value: unknown): void {
    if (!isBilliardsInteractionMessage(value) || !this.isActivePlayer(client)
      || value.revision !== this.match.revision || this.match.activeShot !== null
      || this.match.phase === billiardsMatchPhases.finished
      || !this.acceptSequence(client, value.clientSequence)) return;
    let intent = normalizeBilliardsInteraction(value);
    if (intent.kind === kinds.cuePlacementPreview) {
      if (!this.match.ballInHand) return;
      intent = { ...intent, valid: canPlaceCueBall(this.match.table, intent.position) };
    } else {
      if (this.match.ballInHand) return;
      if (intent.kind === kinds.manualStroke && !this.aimLocked) return;
      if (intent.kind === kinds.aimLocked) this.aimLocked = true;
      else if (intent.kind !== kinds.manualStroke) this.aimLocked = false;
    }
    this.room.broadcast(billiardsInteractionMessageType, { sessionId: client.sessionId, intent }, { except: client });
  }

  private isActivePlayer(client: BilliardsRoomClient): boolean {
    return this.players.get(client.sessionId) === this.match.turnIndex;
  }

  private acceptSequence(client: BilliardsRoomClient, sequence: number): boolean {
    const previous = this.sequences.get(client.sessionId);
    if (previous === undefined || sequence <= previous) return false;
    this.sequences.set(client.sessionId, sequence);
    return true;
  }

  private reject(client: BilliardsRoomClient, clientSequence: number, reason: string): void {
    client.send(protocol.messages.rejected, { schemaVersion: protocol.version,
      clientSequence, reason, authoritativeSnapshot: this.match });
  }

  private publish(): void { this.room.broadcast(protocol.messages.snapshot, this.match); }
}

function isCommandBase(value: unknown): value is RestartWireCommand & Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return record.schemaVersion === protocol.version && Number.isSafeInteger(record.clientSequence)
    && Number(record.clientSequence) >= 0 && Number.isSafeInteger(record.expectedRevision)
    && Number(record.expectedRevision) >= 0;
}

function isPosition(value: unknown): value is { x: number; y: number } {
  return typeof value === 'object' && value !== null && 'x' in value && 'y' in value
    && typeof value.x === 'number' && typeof value.y === 'number' && isFiniteVec2({ x: value.x, y: value.y });
}

function isShot(value: RestartWireCommand & Record<string, unknown>): value is BilliardsShotCommand & RestartWireCommand & Record<string, unknown> {
  return typeof value.angleRadians === 'number' && typeof value.power === 'number'
    && typeof value.sideSpin === 'number' && typeof value.followSpin === 'number'
    && isValidShotCommand({ schemaVersion: protocol.version, clientSequence: value.clientSequence,
      angleRadians: value.angleRadians, power: value.power, sideSpin: value.sideSpin, followSpin: value.followSpin });
}
