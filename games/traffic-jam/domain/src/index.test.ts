import assert from "node:assert/strict";
import test from "node:test";

import {
  SlopDomainError,
  slopErrorCodes,
  slopParticipantRoles,
  slopSessionStatuses,
  type DomainEvent,
} from "../../../../packages/contracts/src/index.js";
import { gridErrorCodes } from "../../../../packages/grid-slide/src/index.js";
import {
  createTurnSession,
  executeTurnCommand,
  joinTurnSession,
  replayTurnSession,
} from "../../../../packages/turn-engine/src/index.js";
import {
  trafficCommands,
  trafficConformanceFixture,
  trafficDefinition,
  trafficEvents,
} from "./index.js";

test("Traffic Jam fixture conforms across history and replay", () => {
  const creation = createTurnSession(
    trafficDefinition,
    "traffic-session",
    trafficConformanceFixture.seed,
    "owner",
  );
  const joined = joinTurnSession(
    creation.snapshot,
    "friend",
    slopParticipantRoles.spectator,
  );
  const blockedStep = trafficConformanceFixture.scenario[0]!;

  assert.throws(
    () =>
      executeTurnCommand(
        trafficDefinition,
        joined.snapshot,
        {
          commandId: blockedStep.commandId,
          type: trafficCommands.moveVehicle,
          actorId: "owner",
          expectedRevision: joined.snapshot.revision,
          payload: {
            vehicleId: blockedStep.vehicleId,
            delta: blockedStep.delta,
          },
        },
        null,
      ),
    (error: unknown) =>
      error instanceof SlopDomainError &&
      error.code === gridErrorCodes.pathBlocked,
  );

  assert.throws(
    () =>
      executeTurnCommand(
        trafficDefinition,
        joined.snapshot,
        {
          commandId: "spectator-attempt",
          type: trafficCommands.moveVehicle,
          actorId: "friend",
          expectedRevision: joined.snapshot.revision,
          payload: {
            vehicleId: blockedStep.vehicleId,
            delta: blockedStep.delta,
          },
        },
        null,
      ),
    (error: unknown) =>
      error instanceof SlopDomainError &&
      error.code === slopErrorCodes.spectatorCannotCommand,
  );

  let snapshot = joined.snapshot;
  const acceptedEvents: Array<DomainEvent> = [];
  let finalReceipt = null;

  for (const step of trafficConformanceFixture.scenario.slice(1)) {
    const execution = executeTurnCommand(
      trafficDefinition,
      snapshot,
      {
        commandId: step.commandId,
        type: trafficCommands.moveVehicle,
        actorId: "owner",
        expectedRevision: snapshot.revision,
        payload: {
          vehicleId: step.vehicleId,
          delta: step.delta,
        },
      },
      null,
    );
    snapshot = execution.snapshot;
    acceptedEvents.push(...execution.events);
    finalReceipt = execution.receipt;
    assert.deepEqual(
      execution.events.map((event) => event.type),
      step.expectEvents,
    );
  }

  assert.equal(snapshot.status, slopSessionStatuses.completed);
  assert.equal(snapshot.state.moveCount, trafficConformanceFixture.expected.moveCount);
  assert.equal(
    acceptedEvents.filter((event) => event.type === trafficEvents.levelCompleted)
      .length,
    1,
  );
  assert.deepEqual(
    replayTurnSession(trafficDefinition, [
      ...creation.events,
      joined.event,
      ...acceptedEvents,
    ]),
    snapshot,
  );

  assert.notEqual(finalReceipt, null);
  const lastStep = trafficConformanceFixture.scenario.at(-1)!;
  const duplicate = executeTurnCommand(
    trafficDefinition,
    snapshot,
    {
      commandId: lastStep.commandId,
      type: trafficCommands.moveVehicle,
      actorId: "owner",
      expectedRevision: snapshot.revision,
      payload: {
        vehicleId: lastStep.vehicleId,
        delta: lastStep.delta,
      },
    },
    finalReceipt,
  );
  assert.equal(duplicate.idempotent, true);
  assert.deepEqual(duplicate.snapshot, snapshot);
});
