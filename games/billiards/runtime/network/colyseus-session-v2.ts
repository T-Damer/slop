import { createColyseusBilliardsSession } from './colyseus-session.ts';
import type { BilliardsInteractionMessage } from './interaction-wire-v2.ts';

export type BilliardsColyseusSessionV2 = ReturnType<
  typeof createColyseusBilliardsSession
> & {
  readonly sendInteraction: (message: BilliardsInteractionMessage) => void;
};

export function createColyseusBilliardsSessionV2(
  options: Parameters<typeof createColyseusBilliardsSession>[0],
): BilliardsColyseusSessionV2 {
  const session = createColyseusBilliardsSession(options);
  return Object.assign(session, {
    sendInteraction(_message: BilliardsInteractionMessage): void {
      // The presentation contract is versioned now. The authoritative room
      // adapter will broadcast these ephemeral intents when the online room
      // server is enabled; final placement and shots already remain server-bound.
    },
  });
}
