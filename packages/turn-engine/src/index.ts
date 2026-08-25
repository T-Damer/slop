import {
  SlopDomainError,
  slopErrorCodes,
  slopEventTypes,
  slopIdParts,
  slopInitialSequences,
  slopParticipantRoles,
  slopSchemaVersions,
  slopSessionStatuses,
  type CommandExecution,
  type CommandReceipt,
  type DomainCommand,
  type DomainEvent,
  type EventSourcedGameDefinition,
  type ParticipantRole,
  type PendingDomainEvent,
  type SessionCreation,
  type SessionSnapshot,
} from "../../contracts/src/index.js";

interface SessionCreatedPayload {
  readonly seed: string;
}

interface ParticipantJoinedPayload {
  readonly userId: string;
  readonly role: ParticipantRole;
}

export function createTurnSession<TState>(
  definition: EventSourcedGameDefinition<TState>,
  sessionId: string,
  seed: string,
  ownerId: string,
): SessionCreation<TState> {
  const initialState = definition.createInitialState(seed);
  const createdEvent = createEvent(
    sessionId,
    definition.gameId,
    slopInitialSequences.sessionCreated,
    slopInitialSequences.sessionCreated,
    slopEventTypes.sessionCreated,
    ownerId,
    null,
    { seed } satisfies SessionCreatedPayload,
  );
  const ownerEvent = createEvent(
    sessionId,
    definition.gameId,
    slopInitialSequences.ownerJoined,
    slopInitialSequences.ownerJoined,
    slopEventTypes.participantJoined,
    ownerId,
    null,
    {
      userId: ownerId,
      role: slopParticipantRoles.player,
    } satisfies ParticipantJoinedPayload,
  );
  const snapshot: SessionSnapshot<TState> = {
    schemaVersion: slopSchemaVersions.turnSession,
    sessionId,
    gameId: definition.gameId,
    status: definition.isCompleted(initialState)
      ? slopSessionStatuses.completed
      : slopSessionStatuses.active,
    revision: slopInitialSequences.ownerJoined,
    lastEventSequence: slopInitialSequences.ownerJoined,
    participants: [
      {
        userId: ownerId,
        role: slopParticipantRoles.player,
        joinedAtRevision: slopInitialSequences.ownerJoined,
      },
    ],
    state: initialState,
  };

  return {
    snapshot,
    events: [createdEvent, ownerEvent],
  };
}

export function joinTurnSession<TState>(
  snapshot: SessionSnapshot<TState>,
  userId: string,
  role: ParticipantRole,
): {
  readonly snapshot: SessionSnapshot<TState>;
  readonly event: DomainEvent<ParticipantJoinedPayload>;
} {
  if (snapshot.participants.some((participant) => participant.userId === userId)) {
    throw new SlopDomainError(
      slopErrorCodes.duplicateParticipant,
      "Participant already belongs to the session.",
    );
  }

  const nextRevision = snapshot.revision + 1;
  const nextSequence = snapshot.lastEventSequence + 1;
  const event = createEvent(
    snapshot.sessionId,
    snapshot.gameId,
    nextSequence,
    nextRevision,
    slopEventTypes.participantJoined,
    userId,
    null,
    { userId, role } satisfies ParticipantJoinedPayload,
  );

  return {
    snapshot: {
      ...snapshot,
      revision: nextRevision,
      lastEventSequence: nextSequence,
      participants: [
        ...snapshot.participants,
        { userId, role, joinedAtRevision: nextRevision },
      ],
    },
    event,
  };
}

export function executeTurnCommand<TState, TPayload>(
  definition: EventSourcedGameDefinition<TState, TPayload>,
  snapshot: SessionSnapshot<TState>,
  command: DomainCommand<TPayload>,
  existingReceipt: CommandReceipt<TState> | null,
): CommandExecution<TState> {
  if (existingReceipt !== null) {
    return {
      snapshot: existingReceipt.snapshot,
      events: [],
      receipt: existingReceipt,
      idempotent: true,
    };
  }

  assertCommandAllowed(snapshot, command);

  const pendingEvents = definition.execute(snapshot.state, command);
  let state = snapshot.state;
  let revision = snapshot.revision;
  let sequence = snapshot.lastEventSequence;
  const events: Array<DomainEvent> = [];

  for (const pendingEvent of pendingEvents) {
    revision += 1;
    sequence += 1;
    state = definition.reduce(state, pendingEvent);
    events.push(
      createEvent(
        snapshot.sessionId,
        snapshot.gameId,
        sequence,
        revision,
        pendingEvent.type,
        command.actorId,
        command.commandId,
        pendingEvent.payload,
      ),
    );
  }

  const nextSnapshot: SessionSnapshot<TState> = {
    ...snapshot,
    status: definition.isCompleted(state)
      ? slopSessionStatuses.completed
      : snapshot.status,
    revision,
    lastEventSequence: sequence,
    state,
  };
  const receipt: CommandReceipt<TState> = {
    commandId: command.commandId,
    sessionId: snapshot.sessionId,
    acceptedRevision: revision,
    eventIds: events.map((event) => event.id),
    snapshot: nextSnapshot,
  };

  return {
    snapshot: nextSnapshot,
    events,
    receipt,
    idempotent: false,
  };
}

export function replayTurnSession<TState>(
  definition: EventSourcedGameDefinition<TState>,
  events: ReadonlyArray<DomainEvent>,
): SessionSnapshot<TState> {
  const firstEvent = events[0];
  if (firstEvent === undefined || firstEvent.type !== slopEventTypes.sessionCreated) {
    throw new SlopDomainError(
      slopErrorCodes.invalidPayload,
      "History must begin with a session-created event.",
    );
  }

  const creation = firstEvent.payload as SessionCreatedPayload;
  let state = definition.createInitialState(creation.seed);
  const participants: Array<SessionSnapshot<TState>["participants"][number]> = [];
  let revision = 0;
  let lastEventSequence = 0;

  for (const event of events) {
    revision = event.revision;
    lastEventSequence = event.sequence;

    if (event.type === slopEventTypes.sessionCreated) {
      continue;
    }

    if (event.type === slopEventTypes.participantJoined) {
      const joined = event.payload as ParticipantJoinedPayload;
      participants.push({
        userId: joined.userId,
        role: joined.role,
        joinedAtRevision: event.revision,
      });
      continue;
    }

    state = definition.reduce(state, {
      type: event.type,
      actorId: event.actorId,
      payload: event.payload,
    });
  }

  return {
    schemaVersion: slopSchemaVersions.turnSession,
    sessionId: firstEvent.sessionId,
    gameId: firstEvent.gameId,
    status: definition.isCompleted(state)
      ? slopSessionStatuses.completed
      : slopSessionStatuses.active,
    revision,
    lastEventSequence,
    participants,
    state,
  };
}

function assertCommandAllowed<TState, TPayload>(
  snapshot: SessionSnapshot<TState>,
  command: DomainCommand<TPayload>,
): void {
  if (snapshot.status !== slopSessionStatuses.active) {
    throw new SlopDomainError(
      slopErrorCodes.sessionCompleted,
      "The session no longer accepts gameplay commands.",
    );
  }

  if (command.expectedRevision !== snapshot.revision) {
    throw new SlopDomainError(
      slopErrorCodes.staleRevision,
      "The command was created from an outdated revision.",
    );
  }

  const participant = snapshot.participants.find(
    (candidate) => candidate.userId === command.actorId,
  );
  if (participant === undefined) {
    throw new SlopDomainError(
      slopErrorCodes.participantMissing,
      "The actor is not a session participant.",
    );
  }

  if (participant.role !== slopParticipantRoles.player) {
    throw new SlopDomainError(
      slopErrorCodes.spectatorCannotCommand,
      "Spectators cannot alter authoritative state.",
    );
  }
}

function createEvent<TPayload>(
  sessionId: string,
  gameId: string,
  sequence: number,
  revision: number,
  type: string,
  actorId: string,
  commandId: string | null,
  payload: TPayload,
): DomainEvent<TPayload> {
  return {
    id: `${sessionId}${slopIdParts.event}${sequence}`,
    sessionId,
    gameId,
    sequence,
    revision,
    type,
    actorId,
    commandId,
    payload,
  };
}

export type { PendingDomainEvent };
