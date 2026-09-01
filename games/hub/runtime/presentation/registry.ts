export const hubGameIds = {
  hub: 'hub',
  junkyardTycoon: 'junkyard-station',
  parkingJam: 'parking-jam',
} as const;

export type HubGameId = typeof hubGameIds[keyof typeof hubGameIds];
export type PlayableHubGameId = Exclude<HubGameId, typeof hubGameIds.hub>;

export const hubPlayableGameIds = [
  hubGameIds.junkyardTycoon,
  hubGameIds.parkingJam,
] as const satisfies ReadonlyArray<PlayableHubGameId>;

const hubPlayableGameIdSet: ReadonlySet<string> = new Set(hubPlayableGameIds);

export function isPlayableHubGameId(
  value: string | null | undefined,
): value is PlayableHubGameId {
  return value !== null
    && value !== undefined
    && hubPlayableGameIdSet.has(value);
}

export const hubLegacyGameIds = {
  junkyardTycoon: 'junkyard-tycoon',
} as const;

export const hubRouteParameters = [
  'game',
  'level',
  'seed',
  'viewport',
] as const;

export const hubParkingCompatibilityParameters = [
  'level',
  'seed',
  'viewport',
] as const;

export const hubUiIds = {
  root: 'slop-game-shell',
  style: 'slop-game-shell-style',
} as const;

export const hubUiAttributes = {
  gameId: 'data-game-id',
  action: 'data-hub-action',
} as const;

export const hubUiActions = {
  home: 'home',
} as const;

export const hubCopy = {
  islandTitle: 'Мой остров · SLOP',
  back: 'Back to game hub',
  loading: 'Loading game…',
  failed: 'The game could not be loaded.',
} as const;

export interface HubIslandGame {
  readonly id: PlayableHubGameId;
  readonly name: string;
  readonly description: string;
  readonly emoji: string;
}

export const hubIslandGames: ReadonlyArray<HubIslandGame> = [
  {
    id: hubGameIds.junkyardTycoon,
    name: 'Junkyard Station',
    description: 'Run, approach, and auto-interact with a living 3D yard.',
    emoji: '⛽',
  },
  {
    id: hubGameIds.parkingJam,
    name: 'Parking Jam',
    description: 'Untangle cars and move passenger groups through the lot.',
    emoji: '🚗',
  },
];
