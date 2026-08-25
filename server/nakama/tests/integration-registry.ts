export const nakamaIntegration = {
  server: {
    key: "slop-local-server-key",
    host: "127.0.0.1",
    port: "7350",
    useSsl: false,
    timeoutMs: 5000,
  },
  retry: {
    attempts: 40,
    delayMs: 1000,
  },
  identifiers: {
    ownerPrefix: "slop-integration-owner",
    spectatorPrefix: "slop-integration-spectator",
    sessionPrefix: "slop-integration-session",
  },
  history: {
    afterSequence: 0,
    limit: 200,
  },
} as const;

export const nakamaIntegrationMessages = {
  serverUnavailable: "Nakama did not become available before the retry budget expired.",
  missingUserId: "Authenticated Nakama session did not contain a user id.",
  malformedEnvelope: "Nakama RPC returned a malformed Slop envelope.",
  expectedSuccess: "Expected RPC success but received a domain error.",
  expectedFailure: "Expected RPC failure but received success.",
  malformedSnapshot: "RPC value is not a valid turn-session snapshot.",
  malformedReceipt: "RPC value is not a valid command receipt.",
  malformedHistory: "RPC value is not a valid history response.",
} as const;
