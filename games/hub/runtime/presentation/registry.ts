export const hubGameIds = {
  hub: 'hub',
  junkyardTycoon: 'junkyard-tycoon',
  parkingJam: 'parking-jam',
} as const;

export type HubGameId = typeof hubGameIds[keyof typeof hubGameIds];

export const hubUiIds = {
  root: 'slop-game-shell',
  style: 'slop-game-shell-style',
  hub: 'slop-game-hub',
} as const;

export const hubUiAttributes = {
  gameId: 'data-game-id',
  action: 'data-hub-action',
} as const;

export const hubUiActions = {
  home: 'home',
} as const;

export const hubCopy = {
  title: 'Slop Games',
  eyebrow: 'PLAYGROUND',
  heading: 'Pick a game',
  subtitle: 'Small worlds, one shared runtime.',
  back: 'Back to game hub',
  loading: 'Loading game…',
  failed: 'The game could not be loaded.',
} as const;

export interface HubGameCard {
  readonly id: Exclude<HubGameId, 'hub'>;
  readonly name: string;
  readonly description: string;
  readonly badge: string;
  readonly icon: 'junkyard' | 'parking';
}

export const hubGames: ReadonlyArray<HubGameCard> = [
  {
    id: hubGameIds.junkyardTycoon,
    name: 'Junkyard Station',
    description: 'Run, approach, and auto-interact with a living 3D yard.',
    badge: 'BASE WORLD',
    icon: 'junkyard',
  },
  {
    id: hubGameIds.parkingJam,
    name: 'Parking Jam',
    description: 'Untangle cars and move passenger groups through the lot.',
    badge: 'PUZZLE',
    icon: 'parking',
  },
];
