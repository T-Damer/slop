import * as THREE from 'three';
import type { IslandBlueprint } from '../domain/types.ts';
import { islandLifeRules, islandLifeTargets, type IslandJournal } from '../domain/life.ts';
import { islandArt } from './art-direction.ts';
import { IslandAtelier } from './atelier.ts';
import { createLandscape, addVillagePaths } from './landscape.ts';
import { createResident, createCompanion } from './residents.ts';
import { createIslandHouse, createIslandTree, createTreeFruit, createGardenFlower,
  createIslandPortal, createPortalLabel, placeIslandObject, disposeIslandObject } from './models.ts';

export function createIslandWorld(blueprint: IslandBlueprint) {
  const atelier = new IslandAtelier();
  const landscape = createLandscape(blueprint);
  const root = landscape.root;
  const scenery = new THREE.Group();
  scenery.add(createIslandHouse(atelier, blueprint));
  const fruits = new Map<string, THREE.Group>();
  for (const tree of blueprint.trees) {
    scenery.add(createIslandTree(atelier, tree, blueprint.season));
    const fruit = createTreeFruit(atelier, tree);
    fruits.set(islandLifeRules.fruitPrefix + tree.id, fruit);
    root.add(fruit);
  }
  for (const rock of blueprint.rocks) {
    const group = new THREE.Group();
    atelier.part(group, 0x99a9a5, [0.8, 0.47, 0.65], [0, 0.21, 0], 'round');
    scenery.add(placeIslandObject(group, rock));
  }
  blueprint.flowers.forEach((flower, index) => scenery.add(placeIslandObject(
    createGardenFlower(atelier, blueprint.palette.flowers[index % blueprint.palette.flowers.length]
      ?? islandArt.palette.cream), flower)));
  addVillagePaths(atelier, scenery, blueprint);
  const planted = new Map<string, THREE.Group>();
  for (const target of islandLifeTargets(blueprint).filter((entry) => entry.kind === 'garden')) {
    atelier.part(scenery, islandArt.palette.soil, [0.53, 0.05, 0.6],
      [target.point.x, islandArt.ground + 0.025, target.point.z], 'round');
    const flower = createGardenFlower(atelier, 0xf29fa8);
    flower.scale.setScalar(1.7);
    flower.position.set(target.point.x, islandArt.ground + 0.04, target.point.z);
    flower.visible = false;
    planted.set(target.id, flower);
    root.add(flower);
  }
  atelier.batch(scenery);
  root.add(scenery);
  const player = createResident(atelier, blueprint.palette.roof);
  player.position.set(blueprint.playerSpawn.x, islandArt.ground, blueprint.playerSpawn.z);
  const guide = createResident(atelier, 0xe4ac64);
  guide.position.set(blueprint.guideSpawn.x, islandArt.ground, blueprint.guideSpawn.z);
  guide.rotation.y = -0.4;
  const animal = placeIslandObject(createCompanion(atelier, blueprint.animal.species), blueprint.animal);
  const portals = new Map<string, THREE.Group>();
  for (const placement of blueprint.portals) {
    const portal = createIslandPortal(atelier, placement);
    portal.add(createPortalLabel(placement.label));
    portals.set(placement.destinationId, portal);
    root.add(portal);
  }
  root.add(player, guide, animal);
  return {
    root, player, guide, animal, portals, landscape,
    applyJournal(journal: IslandJournal): void {
      const completed = new Set(journal.completed);
      for (const [id, fruit] of fruits) fruit.visible = !completed.has(id);
      for (const [id, flower] of planted) flower.visible = completed.has(id);
    },
    dispose(): void { disposeIslandObject(root); },
  };
}
export type IslandWorldHandles = ReturnType<typeof createIslandWorld>;
