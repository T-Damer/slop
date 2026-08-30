import * as THREE from 'three';

import type {
  IslandBlueprint,
  IslandPortalPlacement,
} from '../domain/types.ts';
import {
  createActivityZone,
  createIslandAnimal,
  createIslandCharacter,
  createIslandFlower,
  createIslandHouse,
  createIslandPortal,
  createIslandRock,
  createIslandTree,
  disposeIslandObject,
  setObjectShadows,
} from './models.ts';

export interface IslandWorldHandles {
  readonly root: THREE.Group;
  readonly player: THREE.Group;
  readonly guide: THREE.Group;
  readonly animal: THREE.Group;
  readonly portals: ReadonlyMap<string, THREE.Group>;
  readonly oceanMaterial: THREE.MeshStandardMaterial;
  readonly shoreMaterial: THREE.MeshBasicMaterial;
  readonly dispose: () => void;
}

export function createIslandWorld(blueprint: IslandBlueprint): IslandWorldHandles {
  const root = new THREE.Group();
  const ocean = createOcean(blueprint);
  const shore = createShore(blueprint);
  const terrain = createTerrain(blueprint);
  const house = createIslandHouse(blueprint.house, blueprint.palette.roof);
  const player = createIslandCharacter(blueprint.palette.roof, 0xf6f0dd, 0.82);
  player.position.set(blueprint.playerSpawn.x, 0.1, blueprint.playerSpawn.z);
  const guide = createIslandCharacter(0xf2bc53, 0x315c80, 0.74);
  guide.position.set(blueprint.guideSpawn.x, 0.1, blueprint.guideSpawn.z);
  guide.rotation.y = -0.7;
  const animal = createIslandAnimal(blueprint.animal, blueprint.animal.species);
  root.add(ocean.mesh, shore.mesh, terrain, house, player, guide, animal);
  addDecorations(root, blueprint);
  const portals = addPortals(root, blueprint.portals);
  return {
    root,
    player,
    guide,
    animal,
    portals,
    oceanMaterial: ocean.material,
    shoreMaterial: shore.material,
    dispose: () => disposeIslandObject(root),
  };
}

function createTerrain(blueprint: IslandBlueprint): THREE.Group {
  const group = new THREE.Group();
  const shape = createIslandShape(blueprint.coastline);
  const sandGeometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.42,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.18,
    bevelThickness: 0.12,
    curveSegments: 2,
  });
  sandGeometry.rotateX(Math.PI / 2);
  const sand = new THREE.Mesh(
    sandGeometry,
    new THREE.MeshStandardMaterial({ color: blueprint.palette.sand, roughness: 0.98 }),
  );
  sand.position.y = -0.16;
  const grassGeometry = new THREE.ShapeGeometry(shape, 18);
  grassGeometry.rotateX(-Math.PI / 2);
  const grass = new THREE.Mesh(
    grassGeometry,
    new THREE.MeshStandardMaterial({ color: blueprint.palette.grass, roughness: 0.94 }),
  );
  grass.position.y = 0.19;
  grass.scale.setScalar(0.91);
  sand.receiveShadow = true;
  grass.receiveShadow = true;
  group.add(sand, grass);
  return group;
}

function createOcean(blueprint: IslandBlueprint): {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.MeshStandardMaterial;
} {
  const material = new THREE.MeshStandardMaterial({
    color: blueprint.palette.ocean,
    roughness: 0.38,
    metalness: 0.05,
    transparent: true,
    opacity: 0.92,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(70, 70, 1, 1), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.52;
  mesh.receiveShadow = true;
  return { mesh, material };
}

function createShore(blueprint: IslandBlueprint): {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.MeshBasicMaterial;
} {
  const meanRadius = blueprint.coastline.reduce((sum, radius) => sum + radius, 0)
    / blueprint.coastline.length;
  const material = new THREE.MeshBasicMaterial({
    color: 0xe9fbff,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(meanRadius * 0.96, meanRadius * 1.07, 72),
    material,
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.37;
  return { mesh, material };
}

function addDecorations(root: THREE.Group, blueprint: IslandBlueprint): void {
  const autumn = blueprint.season === 'autumn';
  for (const tree of blueprint.trees) {
    root.add(createIslandTree(tree, autumn));
  }
  for (const rock of blueprint.rocks) {
    root.add(createIslandRock(rock));
  }
  blueprint.flowers.forEach((flower, index) => {
    const color = blueprint.palette.flowers[index % blueprint.palette.flowers.length] ?? 0xffffff;
    root.add(createIslandFlower(flower, color));
  });
  root.add(createActivityZone(blueprint.activityZone));
}

function addPortals(
  root: THREE.Group,
  portalPlacements: ReadonlyArray<IslandPortalPlacement>,
): ReadonlyMap<string, THREE.Group> {
  const portals = new Map<string, THREE.Group>();
  for (const placement of portalPlacements) {
    const portal = createIslandPortal(placement);
    const label = createLabelSprite(placement.label, placement.color);
    label.position.set(0, 1.42, 0);
    portal.add(label);
    portals.set(placement.destinationId, portal);
    root.add(portal);
  }
  return portals;
}

function createIslandShape(coastline: ReadonlyArray<number>): THREE.Shape {
  const shape = new THREE.Shape();
  coastline.forEach((radius, index) => {
    const angle = index / coastline.length * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  });
  shape.closePath();
  return shape;
}

function createLabelSprite(text: string, color: number): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 96;
  const context = canvas.getContext('2d');
  if (context !== null) {
    context.fillStyle = 'rgba(255, 255, 255, 0.94)';
    roundRect(context, 8, 8, 368, 80, 24);
    context.fill();
    context.strokeStyle = `#${color.toString(16).padStart(6, '0')}`;
    context.lineWidth = 6;
    roundRect(context, 8, 8, 368, 80, 24);
    context.stroke();
    context.fillStyle = '#23343a';
    context.font = '700 28px system-ui, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 192, 50);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  sprite.scale.set(2.8, 0.7, 1);
  return sprite;
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}
