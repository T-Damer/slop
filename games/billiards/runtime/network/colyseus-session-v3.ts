import { Client } from '@colyseus/sdk';

import { createColyseusBilliardsSession } from './colyseus-session.ts';
import {
  billiardsInteractionMessageType,
  isBilliardsInteractionMessage,
  normalizeBilliardsInteraction,
  type BilliardsInteractionMessage,
} from './interaction-wire-v2.ts';

interface ColyseusInteractionEnvelope {
  readonly sessionId: string;
  readonly intent: BilliardsInteractionMessage;
}

interface ColyseusRoomBridge {
  readonly send: (type: string, payload: unknown) => void;
  readonly onMessage: (
    type: string,
    callback: (payload: unknown) => void,
  ) => unknown;
}

type BaseSession = ReturnType<typeof createColyseusBilliardsSession>;
type InteractionListener = (
  interaction: BilliardsInteractionMessage,
  sessionId: string | null,
) => void;

export interface BilliardsColyseusSessionV3 extends BaseSession {
  readonly sendInteraction: (message: BilliardsInteractionMessage) => void;
  readonly setInteractionListener: (listener: InteractionListener | null) => void;
}

let roomCaptureActive = false;

export function createColyseusBilliardsSessionV3(
  options: Parameters<typeof createColyseusBilliardsSession>[0],
): BilliardsColyseusSessionV3 {
  const base = createColyseusBilliardsSession(options);
  let room: ColyseusRoomBridge | null = null;
  let interactionListener: InteractionListener | null = null;

  return {
    ...base,
    async connect(listeners): Promise<void> {
      room = await connectAndCaptureRoom(
        () => base.connect(listeners),
      );
      room?.onMessage(billiardsInteractionMessageType, (payload) => {
        const envelope = readInteractionEnvelope(payload);
        if (envelope !== null) {
          interactionListener?.(envelope.intent, envelope.sessionId);
          return;
        }
        if (isBilliardsInteractionMessage(payload)) {
          interactionListener?.(normalizeBilliardsInteraction(payload), null);
        }
      });
    },
    sendInteraction(message): void {
      room?.send(
        billiardsInteractionMessageType,
        normalizeBilliardsInteraction(message),
      );
    },
    setInteractionListener(listener): void {
      interactionListener = listener;
    },
    async close(): Promise<void> {
      interactionListener = null;
      room = null;
      await base.close();
    },
  };
}

async function connectAndCaptureRoom(
  connect: () => Promise<void>,
): Promise<ColyseusRoomBridge | null> {
  if (roomCaptureActive) {
    await connect();
    return null;
  }
  const descriptor = Object.getOwnPropertyDescriptor(
    Client.prototype,
    'joinOrCreate',
  );
  const original = descriptor?.value;
  if (typeof original !== 'function') {
    await connect();
    return null;
  }

  let captured: ColyseusRoomBridge | null = null;
  roomCaptureActive = true;
  Object.defineProperty(Client.prototype, 'joinOrCreate', {
    ...descriptor,
    value: function patchedJoinOrCreate(
      this: Client,
      ...args: unknown[]
    ): Promise<unknown> {
      const result = Reflect.apply(original, this, args);
      return Promise.resolve(result).then((value: unknown) => {
        if (isRoomBridge(value)) captured = value;
        return value;
      });
    },
  });
  try {
    await connect();
    return captured;
  } finally {
    Object.defineProperty(Client.prototype, 'joinOrCreate', descriptor);
    roomCaptureActive = false;
  }
}

function readInteractionEnvelope(
  value: unknown,
): ColyseusInteractionEnvelope | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.sessionId !== 'string'
    || !isBilliardsInteractionMessage(value.intent)
  ) {
    return null;
  }
  return {
    sessionId: value.sessionId,
    intent: normalizeBilliardsInteraction(value.intent),
  };
}

function isRoomBridge(value: unknown): value is ColyseusRoomBridge {
  if (!isRecord(value)) return false;
  return typeof value.send === 'function' && typeof value.onMessage === 'function';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
