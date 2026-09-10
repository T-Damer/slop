import type { GameDefinition } from '@modoki/engine/runtime';

export const game: GameDefinition = {
  id: 'slop-arcade',
  name: 'Slop Games',
  loadConfig: () => import('./runtime/config').then((module) => module.config),
  registerSystems: () => import('./runtime/setup').then((module) => module.registerGameSystems()),
  unregisterSystems: () => import('./runtime/setup').then((module) => module.unregisterGameSystems()),
};
