import assert from "node:assert/strict";
import test from "node:test";

import {
  SlopDomainError,
  slopErrorCodes,
  slopParticipantRoles,
  type EventSourcedGameDefinition,
} from "../../contracts/src/index.js";
import {
  createTurnSession,
  executeTurnCommand,
  joinTurnSession,
  replayTurnSession,
} from "./index.js";

interface CounterState {
  readonly value: number;
}

interface CounterPayload {
  readonly amount: number;
}

const counterRegistry = {
  gameId: "counter",
  command: "counter.increment",
  event: "counter.incremented",
  completionValue: 3,
} as const;

const counterDefinition: EventSourcedGameDefinition<CounterState, CounterPayload> = {
  gameId: counterRegistry.gameId,
  createInitialState: () => ({ value: 0 }),
  execute: (_state, command) => [
    {
      type: counterRegistry.event,
      actorId: command.actorId,
      payload: command.payload,
    },
  ],
  reduce: (state, event) => {
    if (event.type !== counterRegistry.event) {
      return state;
    }
    const payload = event.payload as CounterPayload;
    return { value: state.value + payload.amount };
  },
  isCompleted: (state) => state.value >= counterRegistry.completionValue,
};

test("turn sessions are idempotent, role-aware, and replayable", () => {
  const creation = createTurnSession(
    counterDefinition,
    "session-a",
    "seed-a",
    "owner-a",
  );
  const joined = joinTurnSession(
    creation.snapshot,
    "spectator-a",
    slopParticipantRoles.spectator,
  );
  const command = {
    commandId: "command-a",
    type: counterRegistry.command,
    actorId: "owner-a",
    expectedRevision: joined.snapshot.revision,
    payload: { amount: counterRegistry.completionValue },
  } as const;
  const execution = executeTurnCommand(
    counterDefinition,
    joined.snapshot,
    command,
    null,
  );
  const duplicate = executeTurnCommand(
    counterDefinition,
    joined.snapshot,
    command,
    execution.receipt,
  );
  const history = [
    ...creation.events,
    joined.event,
    ...execution.events,
  ];

  assert.equal(execution.snapshot.state.value, counterRegistry.completionValue);
  assert.equal(duplicate.idempotent, true);
  assert.deepEqual(duplicate.snapshot, execution.snapshot);
  assert.deepEqual(replayTurnSession(counterDefinition, history), execution.snapshot);

  assert.throws(
    () =>
      executeTurnCommand(
        counterDefinition,
        joined.snapshot,
        {
          ...command,
          commandId: "spectator-command",
          actorId: "spectator-a",
        },
        null,
      ),
    (error: unknown) =>
      error instanceof SlopDomainError &&
      error.code === slopErrorCodes.spectatorCannotCommand,
  );

  assert.throws(
    () =>
      executeTurnCommand(
        counterDefinition,
        joined.snapshot,
        {
          ...command,
          commandId: "stale-command",
          expectedRevision: creation.snapshot.revision,
        },
        null,
      ),
    (error: unknown) =>
      error instanceof SlopDomainError &&
      error.code === slopErrorCodes.staleRevision,
  );
});
