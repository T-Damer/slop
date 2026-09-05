import * as THREE from 'three';
import type { IslandBlueprint, IslandPlacement, IslandPoint } from '../domain/types.ts';
import { voyageResidents, type VoyageBridge, type VoyageHomeSite, type VoyageRiver } from '../domain/voyage-registry.ts';
import type { IslandAtelier } from './atelier.ts';
import { createIslandTree, placeIslandObject, createGardenFlower } from './models.ts';
import { islandArt } from './art-direction.ts';
import { voyageArt as v } from './voyage-art.ts';

export function createWildTree(a: IslandAtelier, tree: IslandPlacement, world: IslandBlueprint): THREE.Group {
  const region = world.exploration?.region;
  if (region === 'home' && tree.z > 0 && tree.x > -8) return createIslandTree(a, tree, world.season);
  const root = new THREE.Group();
  a.part(root, v.timber, [0.27, 1.65, 0.27], [0, 0.81, 0], 'cylinder');
  if (region === 'shell') {
    for (let i = 0; i < 6; i += 1) {
      const angle = i / 6 * Math.PI * 2;
      const leaf = a.part(root, v.leaves, [0.53, 0.18, 1.65], [Math.sin(angle) * 0.49, 1.8, Math.cos(angle) * 0.49]);
      leaf.rotation.set(-0.16, angle, 0);
    }
    for (const x of [-0.15, 0.15]) a.part(root, v.darkWood, [0.2, 0.22, 0.2], [x, 1.62, 0.16]);
  } else {
    for (let i = 0; i < 3; i += 1) a.part(root, i === 2 ? v.leaves : v.pine,
      [1.65 - i * 0.36, 1.1, 1.65 - i * 0.36], [0, 1.2 + i * 0.48, 0], 'cone');
  }
  return placeIslandObject(root, tree);
}
export function createShrub(a: IslandAtelier, placement: IslandPlacement, accent: number): THREE.Group {
  const root = new THREE.Group();
  for (const [x, y, z, scale] of [[-0.3, 0.28, 0.02, 0.7], [0.28, 0.3, 0.02, 0.74], [0, 0.45, -0.12, 0.82]] as const) {
    a.part(root, v.leaves, [scale, scale * 0.7, scale], [x, y, z]);
  }
  if (placement.id.endsWith('0') || placement.id.endsWith('3') || placement.id.endsWith('7')) {
    for (const side of [-1, 0, 1]) a.part(root, accent, [0.13, 0.08, 0.13], [side * 0.26, 0.52 - Math.abs(side) * 0.05, 0.32]);
  }
  return placeIslandObject(root, placement);
}
export function createBench(a: IslandAtelier, point: IslandPoint): THREE.Group {
  const root = new THREE.Group();
  for (const x of [-0.58, 0.58]) for (const z of [-0.23, 0.23]) a.part(root, v.darkWood, [0.12, 0.46, 0.12], [x, 0.23, z], 'round');
  a.part(root, v.timber, [1.55, 0.12, 0.68], [0, 0.48, 0], 'round');
  a.part(root, v.timber, [1.55, 0.42, 0.09], [0, 0.86, -0.3], 'round');
  root.position.set(point.x, islandArt.ground, point.z); return root;
}
export function createVillagerHouse(a: IslandAtelier, placement: VoyageHomeSite): THREE.Group {
  const root = new THREE.Group(); const resident = voyageResidents[placement.resident];
  a.part(root, 0xffeed2, [2.65, 1.55, 2.3], [0, 0.8, 0], 'round');
  a.part(root, v.darkWood, [2.72, 0.14, 2.38], [0, 0.14, 0], 'round');
  for (const side of [-1, 1]) {
    const roof = a.part(root, placement.roof, [1.78, 0.17, 2.75], [side * 0.7, 2.0, 0], 'round');
    roof.rotation.z = side * -0.56;
  }
  a.part(root, v.darkWood, [0.69, 1.12, 0.14], [0, 0.68, 1.18], 'round');
  a.part(root, resident.color, [0.52, 0.94, 0.08], [0, 0.68, 1.27], 'round');
  a.part(root, 0xf5d27a, [0.07, 0.07, 0.07], [0.16, 0.68, 1.34]);
  for (const side of [-1, 1]) {
    a.part(root, v.timber, [0.72, 0.62, 0.12], [side * 0.82, 1.02, 1.18], 'round');
    const glass = a.part(root, 0xffdfa3, [0.54, 0.44, 0.08], [side * 0.82, 1.02, 1.28], 'round'); glass.castShadow = false;
    a.part(root, 0xffeed2, [0.035, 0.46, 0.04], [side * 0.82, 1.02, 1.34], 'box');
  }
  a.part(root, v.timber, [1.0, 0.12, 0.48], [0, 0.08, 1.36], 'round');
  for (const side of [-1, 1]) {
    a.part(root, v.darkWood, [0.07, 0.72, 0.07], [side * 1.12, 0.36, 1.25], 'cylinder');
    a.part(root, 0x8eae72, [0.54, 0.34, 0.46], [side * 1.15, 0.25, 1.34]);
  }
  root.position.set(placement.x, islandArt.ground, placement.z); root.rotation.y = placement.rotation;
  return root;
}
export function addDistrict(a: IslandAtelier, root: THREE.Group, id: string, point: IslandPoint): void {
  const group = new THREE.Group(); group.position.set(point.x, islandArt.ground, point.z - 0.7);
  if (id === 'stones' || id === 'arch') {
    for (const side of [-1, 1]) {
      const stone = a.part(group, v.rock, [0.9, id === 'arch' ? 2.3 : 1.35, 0.75], [side * 1.3, id === 'arch' ? 1.05 : 0.62, -0.8], 'round');
      stone.rotation.z = side * 0.13;
    }
  } else if (id === 'cave') {
    a.part(group, 0x313d3c, [2.05, 1.55, 0.45], [0, 0.8, -1.2], 'round');
    for (const [x, y, s] of [[-1.25, 0.65, 1], [1.25, 0.65, 1], [-0.7, 1.45, 0.8], [0.1, 1.65, 0.9], [0.85, 1.42, 0.75]] as const) {
      a.part(group, v.rock, [s, s * 0.9, 0.75], [x, y, -0.9], 'round');
    }
    for (const side of [-1, 1]) {
      a.part(group, side < 0 ? 0xe0ba7b : 0xb8d494, [0.18, 0.12, 0.18], [side * 0.65, 0.1, -0.2]);
      a.part(group, v.cream, [0.08, 0.18, 0.08], [side * 0.65, 0.22, -0.2], 'cylinder');
    }
  } else if (id === 'village') {
    for (let i = 0; i < 12; i += 1) {
      const angle = i / 12 * Math.PI * 2;
      a.part(group, i % 2 ? 0xa7a59c : 0xb8b5aa, [0.33, 0.22, 0.33], [Math.cos(angle) * 0.78, 0.13, -0.7 + Math.sin(angle) * 0.78], 'round');
    }
    a.part(group, 0x55575a, [1.25, 0.32, 1.25], [0, 0.17, -0.7], 'cylinder');
    a.part(group, v.darkWood, [0.12, 1.55, 0.12], [-0.75, 1.1, -0.7], 'cylinder');
    a.part(group, v.darkWood, [0.12, 1.55, 0.12], [0.75, 1.1, -0.7], 'cylinder');
    const roof = a.part(group, 0xb85f5f, [1.2, 0.18, 0.9], [0, 1.78, -0.7], 'round'); roof.rotation.z = -0.08;
  } else if (id === 'beach') {
    a.part(group, 0xe6bb78, [1.45, 0.045, 0.82], [0, 0.05, -0.45], 'round');
    a.part(group, 0xf0a59a, [1.18, 0.03, 0.62], [0, 0.085, -0.45], 'round');
    a.part(group, v.timber, [0.08, 1.5, 0.08], [1.05, 0.72, -0.9], 'cylinder');
    const shade = a.part(group, 0xf2cf7c, [1.55, 0.38, 1.55], [1.05, 1.52, -0.9], 'cone'); shade.rotation.y = 0.2;
  } else if (id === 'falls') {
    a.part(group, v.rock, [2.4, 1.35, 1.2], [0, 0.58, -1.1], 'round');
    const water = a.part(group, v.water, [0.72, 1.25, 0.08], [0, 0.7, -0.42], 'round'); water.castShadow = false;
    a.part(group, v.foam, [0.95, 0.07, 0.55], [0, 0.08, -0.25], 'round');
  } else if (id === 'post') {
    a.part(group, v.timber, [0.16, 1, 0.16], [0, 0.5, 0], 'round');
    a.part(group, v.cream, [0.65, 0.4, 0.5], [0, 1, 0], 'round');
    a.part(group, v.darkWood, [0.37, 0.065, 0.03], [0, 1.04, 0.26], 'box');
  } else if (id === 'orchard') {
    group.add(createBench(a, { x: 0, z: -0.6 }));
    for (const x of [-0.75, 0.75]) {
      a.part(group, v.timber, [0.55, 0.32, 0.55], [x, 0.18, -1.3], 'round');
      for (let i = 0; i < 4; i += 1) a.part(group, 0xe78657, [0.18, 0.18, 0.18], [x + (i % 2) * 0.22 - 0.11, 0.42, -1.3 + Math.floor(i / 2) * 0.18 - 0.09]);
    }
  } else {
    group.add(createBench(a, { x: 0, z: -0.6 }));
    for (let i = 0; i < 9; i += 1) {
      const flower = createGardenFlower(a, [0xf3d99c, 0xf0b3a9, v.cream][i % 3]!);
      flower.position.set(Math.sin(i * 2.3) * 1.5, 0, -1.2 + Math.cos(i * 2.3) * 0.45); group.add(flower);
    }
  }
  root.add(group);
}
export function addPier(a: IslandAtelier, root: THREE.Group, dock: IslandPoint): void {
  for (let i = 0; i < 12; i += 1) {
    const z = dock.z + i * v.dockBoard;
    a.part(root, i % 2 ? v.timber : 0xb98d63, [v.dockWidth, 0.11, v.dockBoard - 0.025], [dock.x, 0.1, z], 'round');
  }
  for (const x of [-1, 1]) for (const z of [0, 3.3]) {
    a.part(root, v.darkWood, [0.13, 0.9, 0.13], [dock.x + x * 0.82, 0.18, dock.z + z], 'cylinder');
    a.part(root, v.cream, [0.18, 0.08, 0.18], [dock.x + x * 0.82, 0.68, dock.z + z], 'cylinder');
  }
  a.part(root, v.timber, [1.45, 0.65, 2.5], [dock.x + 1.72, -0.02, dock.z + 3.2]);
  a.part(root, v.darkWood, [1.15, 0.17, 1.92], [dock.x + 1.72, 0.25, dock.z + 3.2]);
  for (const z of [-0.46, 0.46]) a.part(root, v.cream, [1.22, 0.12, 0.24], [dock.x + 1.72, 0.37, dock.z + 3.2 + z], 'round');
  const oar = a.part(root, v.timber, [0.08, 0.08, 2.6], [dock.x + 1.45, 0.46, dock.z + 3.2], 'round'); oar.rotation.y = -0.4;
}
export function addRiver(a: IslandAtelier, root: THREE.Group, river: VoyageRiver): void {
  for (let i = 1; i < river.points.length; i += 1) {
    const from = river.points[i - 1]!; const to = river.points[i]!;
    const dx = to.x - from.x; const dz = to.z - from.z; const length = Math.hypot(dx, dz);
    const angle = -Math.atan2(dz, dx); const x = (from.x + to.x) / 2; const z = (from.z + to.z) / 2;
    const bank = a.part(root, 0x8da76f, [length + 0.75, 0.035, river.width + 0.72], [x, 0.055, z], 'round'); bank.rotation.y = angle;
    const foam = a.part(root, v.foam, [length + 0.48, 0.025, river.width + 0.34], [x, 0.066, z], 'round'); foam.rotation.y = angle; foam.castShadow = false;
    const water = a.part(root, v.water, [length + 0.34, 0.022, river.width], [x, 0.076, z], 'round'); water.rotation.y = angle; water.castShadow = false;
  }
  for (const point of river.points) {
    const water = a.part(root, v.water, [river.width, 0.022, river.width], [point.x, 0.077, point.z], 'cylinder'); water.castShadow = false;
  }
}
export function addBridge(a: IslandAtelier, root: THREE.Group, bridge: VoyageBridge): void {
  const group = new THREE.Group(); group.position.set(bridge.x, islandArt.ground, bridge.z); group.rotation.y = bridge.rotation;
  const boards = Math.max(4, Math.ceil(bridge.length / v.dockBoard));
  for (let i = 0; i < boards; i += 1) {
    const x = -bridge.length / 2 + (i + 0.5) * bridge.length / boards;
    a.part(group, i % 2 ? v.timber : 0xc29666, [bridge.length / boards - 0.025, 0.11, bridge.width], [x, 0.08, 0], 'round');
  }
  for (const side of [-1, 1]) {
    for (const x of [-bridge.length / 2 + 0.25, 0, bridge.length / 2 - 0.25]) {
      a.part(group, v.darkWood, [0.12, 0.78, 0.12], [x, 0.34, side * (bridge.width / 2 + 0.04)], 'cylinder');
    }
    a.part(group, v.timber, [bridge.length - 0.35, 0.07, 0.07], [0, 0.66, side * (bridge.width / 2 + 0.04)], 'round');
  }
  root.add(group);
}
export function addPond(a: IslandAtelier, root: THREE.Group, world: IslandBlueprint): void {
  const pond = world.exploration!.pond;
  a.part(root, v.foam, [pond.rx * 2 + 0.18, 0.016, pond.rz * 2 + 0.18], [pond.x, 0.061, pond.z], 'cylinder');
  const water = a.part(root, v.water, [pond.rx * 2, 0.018, pond.rz * 2], [pond.x, 0.075, pond.z], 'cylinder'); water.castShadow = false;
  addBridge(a, root, { id: 'pond', x: pond.x, z: pond.z, length: pond.rx * 2 + 1, width: pond.bridgeHalfWidth * 2, rotation: 0 });
}
