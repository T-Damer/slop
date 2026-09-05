import * as THREE from 'three';
import type { HomeItemKind } from '../domain/home-registry.ts';
import type { IslandAtelier } from './atelier.ts';

export const homeLook = {
  wood: 0xaa7954, darkWood: 0x77573f, cream: 0xf4e3bd, cushion: 0x86a68d,
  blanket: 0x7894ad, leaf: 0x669266, pot: 0xc58d6b, brass: 0xc4a26d,
  wall: 0xe7dcc5, floor: [0xd1aa7a, 0xc7a073], window: 0xc8e6df,
  floorY: 0.06, roomHeight: 2.25, wallThickness: 0.15, lampIntensity: 2.8,
  lampRange: 5, roomDistance: 11.7, portraitDistance: 1.25, transitionSeconds: 0.45,
  notes: { table: 'Место для завтрака, книг и маленьких планов.',
    plant: 'Немного зелени делает дом уютнее.' },
} as const;

export function createHomeFurniture(a: IslandAtelier, kind: HomeItemKind): THREE.Group {
  const group = new THREE.Group();
  const builders = { chair, table, lamp, bed, plant, cabinet };
  builders[kind](a, group);
  return group;
}
function feet(a: IslandAtelier, group: THREE.Group, width: number, depth: number, height: number): void {
  for (const x of [-width, width]) for (const z of [-depth, depth]) {
    a.part(group, homeLook.darkWood, [0.09, height, 0.09], [x, height / 2, z], 'round');
  }
}
function chair(a: IslandAtelier, group: THREE.Group): void {
  feet(a, group, 0.24, 0.24, 0.44);
  a.part(group, homeLook.wood, [0.68, 0.13, 0.67], [0, 0.4, 0], 'round');
  a.part(group, homeLook.cushion, [0.58, 0.14, 0.54], [0, 0.49, 0.015], 'round');
  a.part(group, homeLook.wood, [0.67, 0.54, 0.13], [0, 0.76, -0.27], 'round');
  a.part(group, homeLook.cushion, [0.56, 0.36, 0.12], [0, 0.8, -0.2], 'round');
  for (const x of [-0.31, 0.31]) a.part(group, homeLook.wood, [0.08, 0.12, 0.56], [x, 0.65, 0], 'round');
}
function table(a: IslandAtelier, group: THREE.Group): void {
  feet(a, group, 0.38, 0.28, 0.62);
  a.part(group, homeLook.wood, [1, 0.12, 0.8], [0, 0.65, 0], 'round');
  a.part(group, homeLook.cream, [0.3, 0.025, 0.35], [-0.16, 0.725, 0.02], 'box');
  a.part(group, homeLook.cushion, [0.13, 0.13, 0.13], [0.22, 0.78, 0], 'cylinder');
}
function lamp(a: IslandAtelier, group: THREE.Group): void {
  a.part(group, homeLook.brass, [0.35, 0.07, 0.35], [0, 0.04, 0], 'cylinder');
  a.part(group, homeLook.darkWood, [0.06, 1.2, 0.06], [0, 0.63, 0], 'cylinder');
  const shade = a.part(group, homeLook.cream, [0.44, 0.36, 0.44], [0, 1.31, 0], 'cylinder');
  shade.name = 'home-lampshade';
  shade.material = a.material(homeLook.cream).clone();
  const light = new THREE.PointLight(0xffdf9e, homeLook.lampIntensity, homeLook.lampRange, 2);
  light.name = 'home-lamplight'; light.position.y = 1.1; group.add(light);
}
function bed(a: IslandAtelier, group: THREE.Group): void {
  feet(a, group, 0.4, 0.75, 0.3);
  a.part(group, homeLook.wood, [1, 0.18, 1.8], [0, 0.26, 0], 'round');
  a.part(group, homeLook.cream, [0.91, 0.24, 1.66], [0, 0.46, 0], 'round');
  a.part(group, homeLook.blanket, [0.93, 0.13, 1.04], [0, 0.56, 0.25], 'round');
  a.part(group, homeLook.cream, [0.72, 0.15, 0.37], [0, 0.61, -0.52], 'round');
  a.part(group, homeLook.wood, [1, 0.82, 0.12], [0, 0.57, -0.83], 'round');
}
function plant(a: IslandAtelier, group: THREE.Group): void {
  a.part(group, homeLook.pot, [0.38, 0.4, 0.38], [0, 0.2, 0], 'cylinder');
  a.part(group, homeLook.darkWood, [0.3, 0.025, 0.3], [0, 0.405, 0], 'cylinder');
  a.part(group, homeLook.leaf, [0.04, 0.68, 0.04], [0, 0.69, 0], 'cylinder');
  for (let index = 0; index < 5; index += 1) {
    const angle = index / 5 * Math.PI * 2;
    const leaf = a.part(group, homeLook.leaf, [0.28, 0.11, 0.22],
      [Math.cos(angle) * 0.12, 0.6 + index * 0.08, Math.sin(angle) * 0.12]);
    leaf.rotation.z = Math.cos(angle) * 0.3;
  }
}
function cabinet(a: IslandAtelier, group: THREE.Group): void {
  feet(a, group, 0.38, 0.2, 0.2);
  a.part(group, homeLook.wood, [1, 0.8, 0.58], [0, 0.56, 0], 'round');
  for (const y of [0.34, 0.61, 0.85]) {
    a.part(group, homeLook.cream, [0.88, 0.21, 0.07], [0, y, 0.3], 'round');
    a.part(group, homeLook.brass, [0.09, 0.05, 0.08], [0, y, 0.35]);
  }
}
