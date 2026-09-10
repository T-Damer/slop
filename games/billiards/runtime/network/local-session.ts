import { billiardsConnectionStates } from './registry.ts';
import type { BilliardsSession } from './session.ts';

export function createLocalBilliardsSession(): BilliardsSession {
  return {
    mode: 'local',
    async connect(listeners): Promise<void> {
      listeners.onStatus({
        state: billiardsConnectionStates.local,
        detail: 'Локальная тренировка',
      });
    },
    sendInteraction(): void {},
    sendShot(): void {},
    sendCuePlacement(): void {},
    sendRestart(): void {},
    async close(): Promise<void> {},
  };
}
