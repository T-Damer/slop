import * as THREE from 'three';
import type { IslandBlueprint, IslandPlacement, IslandPoint } from '../domain/types.ts';
import type { IslandAtelier } from './atelier.ts';
import { createIslandTree, placeIslandObject, createGardenFlower } from './models.ts';
import { islandArt } from './art-direction.ts';
import { voyageArt as v } from './voyage-art.ts';

export function createWildTree(a: IslandAtelier, tree: IslandPlacement, world: IslandBlueprint): THREE.Group {
  const region = world.exploration?.region;
  if (region === 'home' && tree.z > 0) return createIslandTree(a, tree, world.season);
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
export function createBench(a: IslandAtelier, point: IslandPoint): THREE.Group {
  const root = new THREE.Group();
  for (const x of [-0.58, 0.58]) for (const z of [-0.23, 0.23]) a.part(root, v.darkWood, [0.12, 0.46, 0.12], [x, 0.23, z], 'round');
  a.part(root, v.timber, [1.55, 0.12, 0.68], [0, 0.48, 0], 'round');
  a.part(root, v.timber, [1.55, 0.42, 0.09], [0, 0.86, -0.3], 'round');
  root.position.set(point.x, islandArt.ground, point.z); return root;
}
export function addDistrict(a: IslandAtelier, root: THREE.Group, id: string, point: IslandPoint): void {
  const group = new THREE.Group(); group.position.set(point.x, islandArt.ground, point.z - 0.7);
  // Small, visibly different compositions; approach points stay in front of the props.
  if (id === 'stones' || id === 'arch') {
    for (const side of [-1, 1]) {
      const stone = a.part(group, v.rock, [0.9, id === 'arch' ? 2.3 : 1.35, 0.75], [side * 1.3, id === 'arch' ? 1.05 : 0.62, -0.8], 'round');
      stone.rotation.z = side * 0.13;
    }
  } else if (id === 'post') {
    a.part(group, v.timber, [0.16, 1, 0.16], [0, 0.5, 0], 'round');
    a.part(group, v.cream, [0.65, 0.4, 0.5], [0, 1, 0], 'round');
    a.part(group, v.darkWood, [0.37, 0.065, 0.03], [0, 1.04, 0.26], 'box');
  } else {
    group.add(createBench(a, { x: 0, z: -0.6 }));
    for (let i = 0; i < 7; i += 1) {
      const flower = createGardenFlower(a, [0xf3d99c, 0xf0b3a9, v.cream][i % 3]!);
      flower.position.set(Math.sin(i * 2.3) * 1.3, 0, -1.2 + Math.cos(i * 2.3) * 0.35); group.add(flower);
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
  // Hull and seats are project-authored and share the world's geometry pool.
  a.part(root, v.timber, [1.45, 0.65, 2.5], [dock.x + 1.72, -0.02, dock.z + 3.2]);
  a.part(root, v.darkWood, [1.15, 0.17, 1.92], [dock.x + 1.72, 0.25, dock.z + 3.2]);
  for (const z of [-0.46, 0.46]) a.part(root, v.cream, [1.22, 0.12, 0.24], [dock.x + 1.72, 0.37, dock.z + 3.2 + z], 'round');
  const oar = a.part(root, v.timber, [0.08, 0.08, 2.6], [dock.x + 1.45, 0.46, dock.z + 3.2], 'round'); oar.rotation.y = -0.4;
}
export function addPond(a: IslandAtelier, root: THREE.Group, world: IslandBlueprint): void {
  const pond = world.exploration!.pond;
  a.part(root, v.foam, [pond.rx * 2 + 0.18, 0.016, pond.rz * 2 + 0.18], [pond.x, 0.061, pond.z], 'cylinder');
  const water = a.part(root, v.water, [pond.rx * 2, 0.018, pond.rz * 2], [pond.x, 0.075, pond.z], 'cylinder'); water.castShadow = false;
  const steps = Math.ceil((pond.rx * 2 + 1) / v.dockBoard);
  for (let i = 0; i <= steps; i += 1) a.part(root, v.timber, [v.dockBoard - 0.02, 0.06, pond.bridgeHalfWidth * 2],
    [pond.x - pond.rx - 0.5 + i * v.dockBoard, islandArt.ground, pond.z], 'round');
  for (const z of [-1, 1]) {
    for (const x of [-1, 1]) a.part(root, v.darkWood, [0.12, 0.68, 0.12], [pond.x + x * (pond.rx + 0.32), 0.34, pond.z + z * 0.72], 'cylinder');
    a.part(root, v.timber, [pond.rx * 2 + 0.6, 0.07, 0.07], [pond.x, 0.62, pond.z + z * 0.72], 'round');
  }
}
