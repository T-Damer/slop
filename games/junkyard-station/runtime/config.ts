import type { GameConfig } from '@modoki/engine/runtime';

export const config: GameConfig = {
  world: {
    gravity: { x: 0, y: 0, z: 0 },
    bounds: {
      min: { x: -12, y: -4, z: -12 },
      max: { x: 12, y: 12, z: 12 },
    },
  },
  scene: '/assets/scenes/main.scene.json',
};
