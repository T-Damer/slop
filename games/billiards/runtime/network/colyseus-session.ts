import { Client } from '@colyseus/sdk/Client';
import type { Room } from '@colyseus/sdk/Room';

import { billiardsConnectionStates, billiardsProtocol } from './registry.ts';
import type {
  BilliardsSession,
  BilliardsSessionListeners,
  BilliardsSessionOptions,
} from './session.ts';
import type {
  BilliardsRejectedWireMessage,
  CuePlacementWireCommand,
  RestartWireCommand,
  ShotWireCommand,
} from './wire.ts';
import { isMatchSnapshot } from './wire.ts';

export function createColyseusBilliardsSession(
  options: BilliardsSessionOptions,
): BilliardsSession {
  if (options.endpoint === null) {
    throw new Error('A Colyseus endpoint is required.');
  }
  let room: Room | null = null;
  let listeners: BilliardsSessionListeners | null = null;

  return {
    mode: 'colyseus',
    async connect(nextListeners): Promise<void> {
      listeners = nextListeners;
      listeners.onStatus({
        state: billiardsConnectionStates.connecting,
        detail: 'Подключение к комнате…',
      });
      try {
        const client = new Client(options.endpoint ?? undefined);
        room = await client.joinOrCreate(billiardsProtocol.roomName, {
          protocolVersion: billiardsProtocol.version,
          playerName: options.playerName,
          matchmakingKey: options.matchmakingKey,
        });
        bindRoom(room, nextListeners);
        nextListeners.onStatus({
          state: billiardsConnectionStates.online,
          detail: 'Colyseus · синхронизировано',
        });
      } catch (error: unknown) {
        room = null;
        nextListeners.onStatus({
          state: billiardsConnectionStates.unavailable,
          detail: error instanceof Error ? error.message : 'Сервер недоступен',
        });
        throw error;
      }
    },
    sendShot(command): void {
      room?.send(billiardsProtocol.messages.shot, command);
    },
    sendCuePlacement(command): void {
      room?.send(billiardsProtocol.messages.placeCue, command);
    },
    sendRestart(command): void {
      room?.send(billiardsProtocol.messages.restart, command);
    },
    async close(): Promise<void> {
      listeners = null;
      if (room !== null) {
        await room.leave(true);
        room = null;
      }
    },
  };
}

function bindRoom(room: Room, listeners: BilliardsSessionListeners): void {
  room.onMessage(billiardsProtocol.messages.snapshot, (message: unknown) => {
    if (isMatchSnapshot(message)) {
      listeners.onSnapshot(message);
    }
  });
  room.onMessage(billiardsProtocol.messages.rejected, (message: unknown) => {
    if (!isRejectedMessage(message)) {
      return;
    }
    listeners.onRejected(message.reason, message.authoritativeSnapshot);
  });
  room.onLeave(() => {
    listeners.onStatus({
      state: billiardsConnectionStates.unavailable,
      detail: 'Соединение с комнатой закрыто',
    });
  });
  room.onError((_code, message) => {
    listeners.onStatus({
      state: billiardsConnectionStates.unavailable,
      detail: message || 'Ошибка Colyseus',
    });
  });
}

function isRejectedMessage(value: unknown): value is BilliardsRejectedWireMessage {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const message = value as Partial<BilliardsRejectedWireMessage>;
  return message.schemaVersion === 1
    && typeof message.clientSequence === 'number'
    && typeof message.reason === 'string'
    && isMatchSnapshot(message.authoritativeSnapshot);
}

export type BilliardsOutgoingCommand =
  | ShotWireCommand
  | CuePlacementWireCommand
  | RestartWireCommand;
