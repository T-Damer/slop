import { Client } from '@colyseus/sdk/Client';
import type { Room } from '@colyseus/sdk/Room';
import { registerSerializer } from '@colyseus/sdk/serializer/Serializer';
import { NoneSerializer } from '@colyseus/sdk/serializer/NoneSerializer';
import { billiardsConnectionStates as states, billiardsProtocol as protocol } from './registry.ts';
import {
  billiardsInteractionKinds as kinds,
  billiardsInteractionMessageType,
  isBilliardsInteractionMessage,
  normalizeBilliardsInteraction,
  type BilliardsInteractionMessage,
} from './interaction-wire-v2.ts';
import type { BilliardsSession, BilliardsSessionListeners, BilliardsSessionOptions } from './session.ts';
import { isMatchSnapshot } from './wire.ts';
import type { BilliardsRejectedWireMessage } from './wire.ts';

// Subpath imports deliberately avoid unused schema machinery. Register the
// SDK's own message-only serializer, normally installed by its barrel entry.
registerSerializer('none', NoneSerializer);

export function createColyseusBilliardsSession(options: BilliardsSessionOptions): BilliardsSession {
  if (options.endpoint === null) throw new Error('A Colyseus endpoint is required.');
  return new ColyseusBilliardsSession(options.endpoint, options);
}

/** Owns one room and its subscriptions; never intercepts the SDK prototype. */
class ColyseusBilliardsSession implements BilliardsSession {
  public readonly mode = 'colyseus' as const;
  private room: Room | null = null;
  private listeners: BilliardsSessionListeners | null = null;
  private closed = false;
  private queued: BilliardsInteractionMessage | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly receivedSequences = new Map<string, number>();

  private readonly endpoint: string;
  private readonly options: BilliardsSessionOptions;
  public constructor(endpoint: string, options: BilliardsSessionOptions) {
    this.endpoint = endpoint;
    this.options = options;
  }

  public async connect(listeners: BilliardsSessionListeners): Promise<void> {
    if (this.closed) return;
    this.listeners = listeners;
    listeners.onStatus({ state: states.connecting, detail: 'Подключение к комнате…' });
    const room = await new Client(this.endpoint).joinOrCreate(protocol.roomName, {
      protocolVersion: protocol.version,
      playerName: this.options.playerName,
      matchmakingKey: this.options.matchmakingKey,
    });
    if (this.closed) { await room.leave(true); return; }
    this.room = room;
    this.bindRoom(room);
    // Request initial state after installing handlers: no lost join-time welcome.
    room.send(protocol.messages.ready);
  }

  public sendInteraction(message: BilliardsInteractionMessage): void {
    if (this.closed || this.room === null) return;
    const transient = message.kind === kinds.aimPreview
      || message.kind === kinds.cuePlacementPreview || message.kind === kinds.manualStroke;
    this.queued = message;
    if (!transient) this.flush();
    else if (this.timer === null) this.timer = setTimeout(() => this.flush(), protocol.interactionIntervalMs);
  }

  public sendShot: BilliardsSession['sendShot'] = (command) => this.send(protocol.messages.shot, command);
  public sendCuePlacement: BilliardsSession['sendCuePlacement'] = (command) => this.send(protocol.messages.placeCue, command);
  public sendRestart: BilliardsSession['sendRestart'] = (command) => this.send(protocol.messages.restart, command);

  public async close(): Promise<void> {
    this.closed = true;
    this.listeners = null;
    this.queued = null;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    const room = this.room;
    this.room = null;
    this.receivedSequences.clear();
    if (room !== null) await room.leave(true);
  }

  private flush(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    if (!this.closed && this.queued !== null) this.room?.send(billiardsInteractionMessageType, this.queued);
    this.queued = null;
  }

  private send(type: string, command: unknown): void {
    this.flush(); // Shared sequence numbers must stay ordered across both channels.
    if (!this.closed) this.room?.send(type, command);
  }

  private bindRoom(room: Room): void {
    room.onMessage(protocol.messages.welcome, (value: unknown) => {
      if (!isWelcome(value)) return;
      this.listeners?.onStatus({ state: states.online, playerIndex: value.playerIndex,
        detail: 'Colyseus · сервер управляет партией' });
    });
    room.onMessage(protocol.messages.snapshot, (value: unknown) => {
      if (isMatchSnapshot(value)) this.listeners?.onSnapshot(value);
    });
    room.onMessage(protocol.messages.rejected, (value: unknown) => {
      if (isRejected(value)) this.listeners?.onRejected(value.reason, value.authoritativeSnapshot);
    });
    room.onMessage(billiardsInteractionMessageType, (value: unknown) => this.receiveInteraction(value));
    room.onLeave(() => {
      this.room = null;
      if (this.timer !== null) clearTimeout(this.timer);
      this.timer = null;
      this.queued = null;
      this.listeners?.onStatus({ state: states.unavailable, detail: 'Соединение закрыто. Перезайдите в комнату.' });
    });
    room.onError((_code: number, message?: string) => this.listeners?.onStatus({
      state: states.unavailable, detail: message || 'Ошибка Colyseus',
    }));
  }

  private receiveInteraction(value: unknown): void {
    if (!isRecord(value) || typeof value.sessionId !== 'string'
      || !isBilliardsInteractionMessage(value.intent)) return;
    const previous = this.receivedSequences.get(value.sessionId) ?? -1;
    if (value.intent.clientSequence <= previous) return;
    this.receivedSequences.set(value.sessionId, value.intent.clientSequence);
    this.listeners?.onInteraction?.(normalizeBilliardsInteraction(value.intent));
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isWelcome(value: unknown): value is { playerIndex: 0 | 1 } {
  return isRecord(value) && value.schemaVersion === protocol.version
    && (value.playerIndex === 0 || value.playerIndex === 1);
}

function isRejected(value: unknown): value is BilliardsRejectedWireMessage {
  return isRecord(value) && value.schemaVersion === protocol.version
    && Number.isSafeInteger(value.clientSequence) && typeof value.reason === 'string'
    && isMatchSnapshot(value.authoritativeSnapshot);
}
