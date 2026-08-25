import { slopProtocol } from "../../../packages/contracts/src/index.js";

export const nakamaRpcIds = {
  createSession: slopProtocol.rpc_ids.create_session,
  joinSession: slopProtocol.rpc_ids.join_session,
  getSession: slopProtocol.rpc_ids.get_session,
  submitCommand: slopProtocol.rpc_ids.submit_command,
  getHistory: slopProtocol.rpc_ids.get_history,
} as const;

export const nakamaStorageCollections = {
  snapshots: "slop_session_snapshots",
  events: "slop_session_events",
  receipts: "slop_command_receipts",
} as const;

export const nakamaStorageVersions = {
  createOnly: "*",
} as const;

export const nakamaStoragePermissions = {
  serverRead: 0,
  serverWrite: 0,
} as const;

export const nakamaContextKeys = {
  userId: "userId",
} as const;

export const nakamaLimits = {
  eventSequencePadding: 12,
} as const;

export const nakamaLogs = {
  initialized: "Slop Nakama module initialized.",
} as const;

export const nakamaMessages = {
  authenticationRequired: "Authentication is required.",
  invalidJson: "The RPC payload is not valid JSON.",
  invalidPayload: "The RPC payload is missing required fields.",
  unsupportedGame: "The requested game is not registered.",
  snapshotMissing: "The requested session does not exist.",
  storageConflict: "The session changed while the command was processed.",
} as const;
