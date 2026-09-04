import {
  billiardsInteractionMessageType,
  isBilliardsInteractionMessage,
  normalizeBilliardsInteraction,
  type BilliardsInteractionMessage,
} from './interaction-wire-v2.ts';

export interface BilliardsRelayClient {
  readonly sessionId: string;
}

export interface BilliardsInteractionRelayRoom {
  readonly onMessage: (
    type: string,
    handler: (client: BilliardsRelayClient, payload: unknown) => void,
  ) => void;
  readonly broadcast: (
    type: string,
    payload: BilliardsInteractionBroadcast,
    options: { readonly except: BilliardsRelayClient },
  ) => void;
}

export interface BilliardsInteractionBroadcast {
  readonly sessionId: string;
  readonly intent: BilliardsInteractionMessage;
}

export interface BilliardsInteractionRelayPolicy {
  readonly isActivePlayer: (sessionId: string) => boolean;
  readonly currentRevision: () => number;
  readonly acceptSequence: (sessionId: string, sequence: number) => boolean;
}

export function registerBilliardsInteractionRelay(
  room: BilliardsInteractionRelayRoom,
  policy: BilliardsInteractionRelayPolicy,
): void {
  room.onMessage(billiardsInteractionMessageType, (client, payload) => {
    if (!policy.isActivePlayer(client.sessionId)) return;
    if (!isBilliardsInteractionMessage(payload)) return;
    if (payload.revision !== policy.currentRevision()) return;
    if (!policy.acceptSequence(client.sessionId, payload.clientSequence)) return;
    room.broadcast(
      billiardsInteractionMessageType,
      {
        sessionId: client.sessionId,
        intent: normalizeBilliardsInteraction(payload),
      },
      { except: client },
    );
  });
}
