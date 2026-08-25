export type ValueOf<T> = T[keyof T];

export const slopSessionStatuses = {
  active: "active",
  completed: "completed",
  abandoned: "abandoned",
} as const;

export const slopParticipantRoles = {
  player: "player",
  spectator: "spectator",
} as const;

export const slopEventTypes = {
  sessionCreated: "slop.session.created",
  participantJoined: "slop.participant.joined",
} as const;

export const slopErrorCodes = {
  staleRevision: "slop.stale_revision",
  duplicateParticipant: "slop.duplicate_participant",
  participantMissing: "slop.participant_missing",
  spectatorCannotCommand: "slop.spectator_cannot_command",
  sessionCompleted: "slop.session_completed",
  invalidPayload: "slop.invalid_payload",
  sessionMissing: "slop.session_missing",
  unauthorized: "slop.unauthorized",
  storageConflict: "slop.storage_conflict",
} as const;

export const slopIdParts = {
  event: ":event:",
  command: ":command:",
} as const;

export const slopSchemaVersions = {
  turnSession: 1,
} as const;

export const slopInitialSequences = {
  sessionCreated: 1,
  ownerJoined: 2,
} as const;

export const slopLimits = {
  historyPageSizeDefault: 50,
  historyPageSizeMaximum: 200,
} as const;
