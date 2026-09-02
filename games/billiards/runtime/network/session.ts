import type { BilliardsMatchState, Vec2 } from '../domain/types.ts';
import type { BilliardsConnectionState } from './registry.ts';
import type {
  CuePlacementWireCommand,
  RestartWireCommand,
  ShotWireCommand,
} from './wire.ts';

export interface BilliardsSessionStatus {
  readonly state: BilliardsConnectionState;
  readonly detail: string;
}

export interface BilliardsSessionListeners {
  readonly onSnapshot: (snapshot: BilliardsMatchState) => void;
  readonly onRejected: (reason: string, snapshot: BilliardsMatchState) => void;
  readonly onStatus: (status: BilliardsSessionStatus) => void;
}

export interface BilliardsSession {
  readonly mode: 'local' | 'colyseus';
  readonly connect: (listeners: BilliardsSessionListeners) => Promise<void>;
  readonly sendShot: (command: ShotWireCommand) => void;
  readonly sendCuePlacement: (command: CuePlacementWireCommand) => void;
  readonly sendRestart: (command: RestartWireCommand) => void;
  readonly close: () => Promise<void>;
}

export interface BilliardsSessionOptions {
  readonly endpoint: string | null;
  readonly playerName: string;
  readonly matchmakingKey: string;
}

export function readBilliardsSessionOptions(locationUrl: string): BilliardsSessionOptions {
  const url = new URL(locationUrl);
  return {
    endpoint: normalizeEndpoint(url.searchParams.get('billiardsServer')),
    playerName: normalizeText(url.searchParams.get('billiardsName'), 'Игрок'),
    matchmakingKey: normalizeText(url.searchParams.get('billiardsMatch'), 'public'),
  };
}

export function createShotWireCommand(
  command: Omit<ShotWireCommand, 'schemaVersion' | 'expectedRevision'>,
  expectedRevision: number,
): ShotWireCommand {
  return {
    schemaVersion: 1,
    expectedRevision,
    ...command,
  };
}

export function createCuePlacementWireCommand(
  position: Vec2,
  clientSequence: number,
  expectedRevision: number,
): CuePlacementWireCommand {
  return {
    schemaVersion: 1,
    clientSequence,
    expectedRevision,
    position,
  };
}

export function createRestartWireCommand(
  clientSequence: number,
  expectedRevision: number,
): RestartWireCommand {
  return { schemaVersion: 1, clientSequence, expectedRevision };
}

function normalizeEndpoint(value: string | null): string | null {
  if (value === null || value.trim() === '') {
    return null;
  }
  try {
    const endpoint = new URL(value);
    return endpoint.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

function normalizeText(value: string | null, fallback: string): string {
  const normalized = value?.trim();
  return normalized === undefined || normalized === ''
    ? fallback
    : normalized.slice(0, 48);
}
