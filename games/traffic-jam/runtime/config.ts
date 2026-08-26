import type { GameConfig } from '@modoki/engine/runtime';

export const config: GameConfig = {
  world: {
    gravity: { x: 0, y: 0, z: 0 },
    bounds: {
      min: { x: -10, y: -10, z: -10 },
      max: { x: 10, y: 10, z: 10 },
    },
  },
  scene: '/assets/scenes/main.scene.json',
};
