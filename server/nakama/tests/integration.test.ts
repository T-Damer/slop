import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import {
  Client,
  type RpcResponse,
  type Session,
} from "@heroiclabs/nakama-js";

import {
  slopErrorCodes,
  slopParticipantRoles,
  slopProtocol,
  type CommandReceipt,
  type HistoryResponse,
  type RpcEnvelope,
  type SessionSnapshot,
} from "../../../packages/contracts/src/index.js";
import { gridErrorCodes } from "../../../packages/grid-slide/src/index.js";
import { replayTurnSession } from "../../../packages/turn-engine/src/index.js";
import {
  trafficCommands,
  trafficConformanceFixture,
  trafficDefinition,
  type TrafficState,
} from "../../../games/traffic-jam/domain/src/index.js";
import {
  nakamaIntegration,
  nakamaIntegrationMessages,
} from "./integration-registry.js";

test("Nakama preserves authoritative Traffic Jam history for multiple users", async () => {
  const client = new Client(
    nakamaIntegration.server.key,
    nakamaIntegration.server.host,
    nakamaIntegration.server.port,
    nakamaIntegration.server.useSsl,
    nakamaIntegration.server.timeoutMs,
  );
  const owner = await authenticateWithRetry(
    client,
    `${nakamaIntegration.identifiers.ownerPrefix}-${randomUUID()}`,
  );
  const spectator = await authenticateWithRetry(
    client,
    `${nakamaIntegration.identifiers.spectatorPrefix}-${randomUUID()}`,
  );
  const ownerId = requireUserId(owner);
  const spectatorId = requireUserId(spectator);
  const sessionId = `${nakamaIntegration.identifiers.sessionPrefix}-${randomUUID()}`;

  let snapshot = expectSnapshot(
    await expectRpcSuccess(
      client,
      owner,
      slopProtocol.rpc_ids.create_session,
      {
        [slopProtocol.fields.session_id]: sessionId,
        [slopProtocol.fields.game_id]: trafficDefinition.gameId,
        [slopProtocol.fields.seed]: trafficConformanceFixture.seed,
      },
    ),
  );
  assert.equal(snapshot.participants[0]?.userId, ownerId);

  snapshot = expectSnapshot(
    await expectRpcSuccess(
      client,
      spectator,
      slopProtocol.rpc_ids.join_session,
      {
        [slopProtocol.fields.session_id]: sessionId,
        [slopProtocol.fields.role]: slopParticipantRoles.spectator,
      },
    ),
  );
  assert.equal(
    snapshot.participants.find((participant) => participant.userId === spectatorId)
      ?.role,
    slopParticipantRoles.spectator,
  );

  const blockedStep = trafficConformanceFixture.scenario[0];
  assert.ok(blockedStep !== undefined && "expectError" in blockedStep);
  const spectatorFailure = await expectRpcFailure(
    client,
    spectator,
    slopProtocol.rpc_ids.submit_command,
    createCommandRequest(
      sessionId,
      spectatorId,
      snapshot.revision,
      blockedStep,
    ),
  );
  assert.equal(spectatorFailure.code, slopErrorCodes.spectatorCannotCommand);

  const blockedFailure = await expectRpcFailure(
    client,
    owner,
    slopProtocol.rpc_ids.submit_command,
    createCommandRequest(sessionId, ownerId, snapshot.revision, blockedStep),
  );
  assert.equal(blockedFailure.code, gridErrorCodes.pathBlocked);

  let finalReceipt: CommandReceipt<TrafficState> | null = null;
  for (const step of trafficConformanceFixture.scenario) {
    if (!("expectEvents" in step)) {
      continue;
    }
    finalReceipt = expectReceipt(
      await expectRpcSuccess(
        client,
        owner,
        slopProtocol.rpc_ids.submit_command,
        createCommandRequest(sessionId, ownerId, snapshot.revision, step),
      ),
    );
    snapshot = finalReceipt.snapshot;
  }

  assert.notEqual(finalReceipt, null);
  const finalStep =
    trafficConformanceFixture.scenario[
      trafficConformanceFixture.scenario.length - 1
    ];
  assert.ok(finalStep !== undefined && "expectEvents" in finalStep);
  const duplicateReceipt = expectReceipt(
    await expectRpcSuccess(
      client,
      owner,
      slopProtocol.rpc_ids.submit_command,
      createCommandRequest(sessionId, ownerId, snapshot.revision, finalStep),
    ),
  );
  assert.deepEqual(duplicateReceipt, finalReceipt);

  const history = expectHistory(
    await expectRpcSuccess(
      client,
      owner,
      slopProtocol.rpc_ids.get_history,
      {
        [slopProtocol.fields.session_id]: sessionId,
        [slopProtocol.fields.after_sequence]:
          nakamaIntegration.history.afterSequence,
        [slopProtocol.fields.limit]: nakamaIntegration.history.limit,
      },
    ),
  );
  assert.equal(history.events.length, snapshot.lastEventSequence);
  assert.equal(history.nextAfterSequence, snapshot.lastEventSequence);
  assert.deepEqual(replayTurnSession(trafficDefinition, history.events), snapshot);
});

function createCommandRequest(
  sessionId: string,
  actorId: string,
  expectedRevision: number,
  step: {
    readonly commandId: string;
    readonly vehicleId: string;
    readonly delta: number;
  },
): Record<string, unknown> {
  return {
    [slopProtocol.fields.session_id]: sessionId,
    [slopProtocol.fields.command]: {
      [slopProtocol.fields.command_id]: step.commandId,
      [slopProtocol.fields.type]: trafficCommands.moveVehicle,
      [slopProtocol.fields.actor_id]: actorId,
      [slopProtocol.fields.expected_revision]: expectedRevision,
      [slopProtocol.fields.payload]: {
        vehicleId: step.vehicleId,
        delta: step.delta,
      },
    },
  };
}

async function authenticateWithRetry(
  client: Client,
  deviceId: string,
): Promise<Session> {
  let lastError: unknown;
  for (
    let attempt = 0;
    attempt < nakamaIntegration.retry.attempts;
    attempt += 1
  ) {
    try {
      return await client.authenticateDevice(deviceId, true);
    } catch (error) {
      lastError = error;
      if (attempt + 1 < nakamaIntegration.retry.attempts) {
        await delay(nakamaIntegration.retry.delayMs);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(nakamaIntegrationMessages.serverUnavailable);
}

function requireUserId(session: Session): string {
  assert.equal(typeof session.user_id, "string");
  assert.notEqual(session.user_id, String());
  if (session.user_id === undefined) {
    throw new Error(nakamaIntegrationMessages.missingUserId);
  }
  return session.user_id;
}

async function expectRpcSuccess(
  client: Client,
  session: Session,
  rpcId: string,
  request: object,
): Promise<unknown> {
  const envelope = await callRpc(client, session, rpcId, request);
  if (!envelope.ok) {
    assert.fail(
      `${nakamaIntegrationMessages.expectedSuccess} ${envelope.error.code}`,
    );
  }
  return envelope.value;
}

async function expectRpcFailure(
  client: Client,
  session: Session,
  rpcId: string,
  request: object,
): Promise<{ readonly code: string; readonly message: string }> {
  const envelope = await callRpc(client, session, rpcId, request);
  if (envelope.ok) {
    assert.fail(nakamaIntegrationMessages.expectedFailure);
  }
  return envelope.error;
}

async function callRpc(
  client: Client,
  session: Session,
  rpcId: string,
  request: object,
): Promise<RpcEnvelope> {
  const response: RpcResponse = await client.rpc(session, rpcId, request);
  const payload: unknown = response.payload;
  return parseEnvelope(payload);
}

function parseEnvelope(payload: unknown): RpcEnvelope {
  const decoded = typeof payload === "string" ? JSON.parse(payload) : payload;
  if (!isRecord(decoded)) {
    throw new Error(nakamaIntegrationMessages.malformedEnvelope);
  }
  if (decoded[slopProtocol.envelope.ok] === true) {
    return {
      ok: true,
      value: decoded[slopProtocol.envelope.value],
    };
  }
  const error = decoded[slopProtocol.envelope.error];
  if (decoded[slopProtocol.envelope.ok] !== false || !isRecord(error)) {
    throw new Error(nakamaIntegrationMessages.malformedEnvelope);
  }
  const errorCode = error[slopProtocol.envelope.code];
  const errorMessage = error[slopProtocol.envelope.message];
  if (typeof errorCode !== "string" || typeof errorMessage !== "string") {
    throw new Error(nakamaIntegrationMessages.malformedEnvelope);
  }
  return {
    ok: false,
    error: {
      code: errorCode,
      message: errorMessage,
    },
  };
}

function expectSnapshot(value: unknown): SessionSnapshot<TrafficState> {
  if (!isRecord(value)) {
    throw new Error(nakamaIntegrationMessages.malformedSnapshot);
  }
  const state = value[slopProtocol.fields.state];
  const participants = value[slopProtocol.fields.participants];
  if (
    typeof value[slopProtocol.fields.session_id] !== "string" ||
    typeof value[slopProtocol.fields.revision] !== "number" ||
    typeof value[slopProtocol.fields.last_event_sequence] !== "number" ||
    !Array.isArray(participants) ||
    !isRecord(state)
  ) {
    throw new Error(nakamaIntegrationMessages.malformedSnapshot);
  }
  return value as unknown as SessionSnapshot<TrafficState>;
}

function expectReceipt(value: unknown): CommandReceipt<TrafficState> {
  if (!isRecord(value)) {
    throw new Error(nakamaIntegrationMessages.malformedReceipt);
  }
  const snapshot = expectSnapshot(value[slopProtocol.fields.snapshot]);
  if (typeof value[slopProtocol.fields.command_id] !== "string") {
    throw new Error(nakamaIntegrationMessages.malformedReceipt);
  }
  return {
    ...(value as unknown as CommandReceipt<TrafficState>),
    snapshot,
  };
}

function expectHistory(value: unknown): HistoryResponse {
  if (!isRecord(value)) {
    throw new Error(nakamaIntegrationMessages.malformedHistory);
  }
  const events = value[slopProtocol.fields.events];
  const nextAfterSequence = value[slopProtocol.fields.next_after_sequence];
  if (!Array.isArray(events) || typeof nextAfterSequence !== "number") {
    throw new Error(nakamaIntegrationMessages.malformedHistory);
  }
  return value as unknown as HistoryResponse;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, milliseconds);
  });
}
