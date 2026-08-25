import {
  SlopDomainError,
  slopErrorCodes,
  slopLimits,
  type CommandReceipt,
  type CreateSessionRequest,
  type DomainCommand,
  type DomainEvent,
  type HistoryRequest,
  type JoinSessionRequest,
  type SessionCommandRequest,
  type SessionSnapshot,
} from "../../../packages/contracts/src/index.js";
import {
  createTurnSession,
  executeTurnCommand,
  joinTurnSession,
} from "../../../packages/turn-engine/src/index.js";
import { getGameDefinition } from "./game-registry.js";
import {
  nakamaContextKeys,
  nakamaLimits,
  nakamaLogs,
  nakamaMessages,
  nakamaRpcIds,
  nakamaStorageCollections,
  nakamaStoragePermissions,
  nakamaStorageVersions,
} from "./registry.js";

interface HistoryResponse {
  readonly events: ReadonlyArray<DomainEvent>;
  readonly nextAfterSequence: number;
}

export function InitModule(
  _context: nkruntime.Context,
  logger: nkruntime.Logger,
  _nakama: nkruntime.Nakama,
  initializer: nkruntime.Initializer,
): void {
  initializer.registerRpc(nakamaRpcIds.createSession, createSessionRpc);
  initializer.registerRpc(nakamaRpcIds.joinSession, joinSessionRpc);
  initializer.registerRpc(nakamaRpcIds.getSession, getSessionRpc);
  initializer.registerRpc(nakamaRpcIds.submitCommand, submitCommandRpc);
  initializer.registerRpc(nakamaRpcIds.getHistory, getHistoryRpc);
  logger.info(nakamaLogs.initialized);
}

const createSessionRpc: nkruntime.RpcFunction = (context, _logger, nakama, payload) => {
  const userId = requireUser(context);
  const request = parsePayload<CreateSessionRequest>(payload);
  assertString(request.sessionId);
  assertString(request.gameId);
  assertString(request.seed);
  const definition = getGameDefinition(request.gameId);
  const creation = createTurnSession(
    definition,
    request.sessionId,
    request.seed,
    userId,
  );

  writeStorage(nakama, [
    snapshotWrite(creation.snapshot, nakamaStorageVersions.createOnly),
    ...creation.events.map(eventWrite),
  ]);
  return JSON.stringify(creation.snapshot);
};

const joinSessionRpc: nkruntime.RpcFunction = (context, _logger, nakama, payload) => {
  const userId = requireUser(context);
  const request = parsePayload<JoinSessionRequest>(payload);
  assertString(request.sessionId);
  assertString(request.role);
  const stored = readSnapshotObject(nakama, request.sessionId);
  const snapshot = stored.value as SessionSnapshot<unknown>;
  const joined = joinTurnSession(snapshot, userId, request.role);

  writeStorage(nakama, [
    snapshotWrite(joined.snapshot, stored.version),
    eventWrite(joined.event),
  ]);
  return JSON.stringify(joined.snapshot);
};

const getSessionRpc: nkruntime.RpcFunction = (context, _logger, nakama, payload) => {
  const userId = requireUser(context);
  const request = parsePayload<{ readonly sessionId: string }>(payload);
  assertString(request.sessionId);
  const stored = readSnapshotObject(nakama, request.sessionId);
  const snapshot = stored.value as SessionSnapshot<unknown>;
  assertParticipant(snapshot, userId);
  return JSON.stringify(snapshot);
};

const submitCommandRpc: nkruntime.RpcFunction = (
  context,
  _logger,
  nakama,
  payload,
) => {
  const userId = requireUser(context);
  const request = parsePayload<SessionCommandRequest<unknown>>(payload);
  assertString(request.sessionId);
  assertCommand(request.command);
  if (request.command.actorId !== userId) {
    throw new SlopDomainError(
      slopErrorCodes.unauthorized,
      nakamaMessages.authenticationRequired,
    );
  }

  const stored = readSnapshotObject(nakama, request.sessionId);
  const snapshot = stored.value as SessionSnapshot<unknown>;
  const definition = getGameDefinition(snapshot.gameId);
  const existingReceipt = readReceipt(
    nakama,
    request.sessionId,
    request.command.commandId,
  );
  const execution = executeTurnCommand(
    definition,
    snapshot,
    request.command,
    existingReceipt,
  );

  if (!execution.idempotent) {
    writeStorage(nakama, [
      snapshotWrite(execution.snapshot, stored.version),
      ...execution.events.map(eventWrite),
      receiptWrite(execution.receipt),
    ]);
  }
  return JSON.stringify(execution.receipt);
};

const getHistoryRpc: nkruntime.RpcFunction = (context, _logger, nakama, payload) => {
  const userId = requireUser(context);
  const request = parsePayload<HistoryRequest>(payload);
  assertString(request.sessionId);
  const stored = readSnapshotObject(nakama, request.sessionId);
  const snapshot = stored.value as SessionSnapshot<unknown>;
  assertParticipant(snapshot, userId);
  const afterSequence = Math.max(request.afterSequence, 0);
  const requestedLimit = Math.max(
    request.limit || slopLimits.historyPageSizeDefault,
    1,
  );
  const limit = Math.min(requestedLimit, slopLimits.historyPageSizeMaximum);
  const endSequence = Math.min(
    snapshot.lastEventSequence,
    afterSequence + limit,
  );
  const reads: Array<nkruntime.StorageReadRequest> = [];

  for (let sequence = afterSequence + 1; sequence <= endSequence; sequence += 1) {
    reads.push({
      collection: eventCollection(snapshot.sessionId),
      key: eventKey(sequence),
      userId: String(),
    });
  }

  const events = reads.length === 0
    ? []
    : nakama.storageRead(reads).map((object) => object.value as DomainEvent);
  const response: HistoryResponse = {
    events,
    nextAfterSequence:
      events.length === 0
        ? afterSequence
        : events[events.length - 1]!.sequence,
  };
  return JSON.stringify(response);
};

function requireUser(context: nkruntime.Context): string {
  const userId = context[nakamaContextKeys.userId];
  if (typeof userId !== "string" || userId.length === 0) {
    throw new SlopDomainError(
      slopErrorCodes.unauthorized,
      nakamaMessages.authenticationRequired,
    );
  }
  return userId;
}

function parsePayload<T>(payload: string): T {
  try {
    return JSON.parse(payload) as T;
  } catch (_error) {
    throw new SlopDomainError(
      slopErrorCodes.invalidPayload,
      nakamaMessages.invalidJson,
    );
  }
}

function assertString(value: unknown): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    throw new SlopDomainError(
      slopErrorCodes.invalidPayload,
      nakamaMessages.invalidPayload,
    );
  }
}

function assertCommand(value: unknown): asserts value is DomainCommand<unknown> {
  if (typeof value !== "object" || value === null) {
    throw new SlopDomainError(
      slopErrorCodes.invalidPayload,
      nakamaMessages.invalidPayload,
    );
  }
  const candidate = value as Partial<DomainCommand<unknown>>;
  assertString(candidate.commandId);
  assertString(candidate.type);
  assertString(candidate.actorId);
  if (typeof candidate.expectedRevision !== "number") {
    throw new SlopDomainError(
      slopErrorCodes.invalidPayload,
      nakamaMessages.invalidPayload,
    );
  }
}

function assertParticipant(
  snapshot: SessionSnapshot<unknown>,
  userId: string,
): void {
  if (!snapshot.participants.some((participant) => participant.userId === userId)) {
    throw new SlopDomainError(
      slopErrorCodes.unauthorized,
      nakamaMessages.authenticationRequired,
    );
  }
}

function readSnapshotObject(
  nakama: nkruntime.Nakama,
  sessionId: string,
): nkruntime.StorageObject {
  const objects = nakama.storageRead([
    {
      collection: nakamaStorageCollections.snapshots,
      key: sessionId,
      userId: String(),
    },
  ]);
  const stored = objects[0];
  if (stored === undefined) {
    throw new SlopDomainError(
      slopErrorCodes.sessionMissing,
      nakamaMessages.snapshotMissing,
    );
  }
  return stored;
}

function readReceipt(
  nakama: nkruntime.Nakama,
  sessionId: string,
  commandId: string,
): CommandReceipt<unknown> | null {
  const objects = nakama.storageRead([
    {
      collection: receiptCollection(sessionId),
      key: commandId,
      userId: String(),
    },
  ]);
  return objects[0] === undefined
    ? null
    : (objects[0].value as CommandReceipt<unknown>);
}

function snapshotWrite(
  snapshot: SessionSnapshot<unknown>,
  version: string,
): nkruntime.StorageWriteRequest {
  return {
    collection: nakamaStorageCollections.snapshots,
    key: snapshot.sessionId,
    userId: String(),
    value: snapshot,
    version,
    permissionRead: nakamaStoragePermissions.serverRead,
    permissionWrite: nakamaStoragePermissions.serverWrite,
  };
}

function eventWrite(event: DomainEvent): nkruntime.StorageWriteRequest {
  return {
    collection: eventCollection(event.sessionId),
    key: eventKey(event.sequence),
    userId: String(),
    value: event,
    version: nakamaStorageVersions.createOnly,
    permissionRead: nakamaStoragePermissions.serverRead,
    permissionWrite: nakamaStoragePermissions.serverWrite,
  };
}

function receiptWrite(
  receipt: CommandReceipt<unknown>,
): nkruntime.StorageWriteRequest {
  return {
    collection: receiptCollection(receipt.sessionId),
    key: receipt.commandId,
    userId: String(),
    value: receipt,
    version: nakamaStorageVersions.createOnly,
    permissionRead: nakamaStoragePermissions.serverRead,
    permissionWrite: nakamaStoragePermissions.serverWrite,
  };
}

function eventCollection(sessionId: string): string {
  return `${nakamaStorageCollections.events}_${sessionId}`;
}

function receiptCollection(sessionId: string): string {
  return `${nakamaStorageCollections.receipts}_${sessionId}`;
}

function eventKey(sequence: number): string {
  let value = String(sequence);
  while (value.length < nakamaLimits.eventSequencePadding) {
    value = String(0) + value;
  }
  return value;
}

function writeStorage(
  nakama: nkruntime.Nakama,
  writes: ReadonlyArray<nkruntime.StorageWriteRequest>,
): void {
  try {
    nakama.storageWrite(writes);
  } catch (_error) {
    throw new SlopDomainError(
      slopErrorCodes.storageConflict,
      nakamaMessages.storageConflict,
    );
  }
}
