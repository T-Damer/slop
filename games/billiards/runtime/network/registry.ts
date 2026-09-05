export const billiardsProtocol = {
  version: 1,
  roomName: 'slop-billiards-v1',
  query: {
    endpoint: 'billiardsServer',
    playerName: 'billiardsName',
    matchmakingKey: 'billiardsMatch',
  },
  interactionIntervalMs: 50,
  messages: {
    ready: 'ready',
    welcome: 'welcome',
    snapshot: 'snapshot',
    shot: 'shot',
    placeCue: 'place-cue',
    restart: 'restart',
    rejected: 'rejected',
  },
} as const;

export const billiardsConnectionStates = {
  local: 'local',
  connecting: 'connecting',
  online: 'online',
  unavailable: 'unavailable',
} as const;

export type BilliardsConnectionState = typeof billiardsConnectionStates[
  keyof typeof billiardsConnectionStates
];
