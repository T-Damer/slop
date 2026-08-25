import {
  slopParticipantRoles,
  slopSessionStatuses,
  type ValueOf,
} from "./registry.js";

export * from "./protocol.generated.js";
export * from "./registry.js";

export type SessionStatus = ValueOf<typeof slopSessionStatuses>;
export type ParticipantRole = ValueOf<typeof slopParticipantRoles>;

export interface Participant {
  readonly userId: string;
  readonly role: ParticipantRole;
  readonly joinedAtRevision: number;
}

export interface DomainCommand<TPayload = unknown> {
  readonly commandId: string;
  readonly type: string;
  readonly actorId: string;
  readonly expectedRevision: number;
  readonly payload: TPayload;
}

export interface PendingDomainEvent<TPayload = unknown> {
  readonly type: string;
  readonly actorId: string;
  readonly payload: TPayload;
}

export interface DomainEvent<TPayload = unknown> {
  readonly id: string;
  readonly sessionId: string;
  readonly gameId: string;
  readonly sequence: number;
  readonly revision: number;
  readonly type: string;
  readonly actorId: string;
  readonly commandId: string | null;
  readonly payload: TPayload;
}

export interface SessionSnapshot<TState = unknown> {
  readonly schemaVersion: number;
  readonly sessionId: string;
  readonly gameId: string;
  readonly status: SessionStatus;
  readonly revision: number;
  readonly lastEventSequence: number;
  readonly participants: ReadonlyArray<Participant>;
  readonly state: TState;
}

export interface CommandReceipt<TState = unknown> {
  readonly commandId: string;
  readonly sessionId: string;
  readonly acceptedRevision: number;
  readonly eventIds: ReadonlyArray<string>;
  readonly snapshot: SessionSnapshot<TState>;
}

export interface SessionCreation<TState = unknown> {
  readonly snapshot: SessionSnapshot<TState>;
  readonly events: ReadonlyArray<DomainEvent>;
}

export interface CommandExecution<TState = unknown> {
  readonly snapshot: SessionSnapshot<TState>;
  readonly events: ReadonlyArray<DomainEvent>;
  readonly receipt: CommandReceipt<TState>;
  readonly idempotent: boolean;
}

export interface EventSourcedGameDefinition<TState, TPayload = unknown> {
  readonly gameId: string;
  createInitialState(seed: string): TState;
  execute(
    state: TState,
    command: DomainCommand<TPayload>,
  ): ReadonlyArray<PendingDomainEvent>;
  reduce(state: TState, event: PendingDomainEvent): TState;
  isCompleted(state: TState): boolean;
}

export interface CreateSessionRequest {
  readonly sessionId: string;
  readonly gameId: string;
  readonly seed: string;
}

export interface JoinSessionRequest {
  readonly sessionId: string;
  readonly role: ParticipantRole;
}

export interface SessionCommandRequest<TPayload = unknown> {
  readonly sessionId: string;
  readonly command: DomainCommand<TPayload>;
}

export interface HistoryRequest {
  readonly sessionId: string;
  readonly afterSequence: number;
  readonly limit: number;
}

export interface HistoryResponse {
  readonly events: ReadonlyArray<DomainEvent>;
  readonly nextAfterSequence: number;
}

export interface RpcErrorPayload {
  readonly code: string;
  readonly message: string;
}

export type RpcEnvelope<TValue = unknown> =
  | {
      readonly ok: true;
      readonly value: TValue;
    }
  | {
      readonly ok: false;
      readonly error: RpcErrorPayload;
    };

export class SlopDomainError extends Error {
  public readonly code: string;

  public constructor(code: string, message: string) {
    super(message);
    this.name = "SlopDomainError";
    this.code = code;
  }
}
