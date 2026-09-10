import type { GameDefinition } from '@modoki/engine/runtime';

export const game: GameDefinition = {
  id: 'junkyard-station',
  name: 'Junkyard Station',
  loadConfig: () => import('./runtime/config').then((module) => module.config),
  registerSystems: () => import('./runtime/setup').then((module) => module.registerGameSystems()),
  unregisterSystems: () => import('./runtime/setup').then((module) => module.unregisterGameSystems()),
};
