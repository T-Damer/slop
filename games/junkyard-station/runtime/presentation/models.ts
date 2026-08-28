import * as THREE from 'three';

import type { WorldStationVisual } from '../../../shared/world-kit/presentation/scene.ts';
import {
  junkyardStations,
  junkyardVisualKinds,
  type JunkyardStationDefinition,
} from '../definition.ts';

const junkyardPalette = {
  asphalt: 0x596268,
  asphaltDark: 0x3e474c,
  concrete: 0xb9ad93,
  cream: 0xf5e0ad,
  orange: 0xe98b35,
  red: 0xc94c3e,
  darkRed: 0x8f322c,
  steel: 0x7f8d91,
  darkSteel: 0x39474d,
  tire: 0x22282b,
  glass: 0x91c9cf,
  fuel: 0x4aa67f,
  wood: 0x8d603a,
  fence: 0xa2a8a4,
  customerShirt: 0x4e8fda,
  customerTrousers: 0x313b54,
  sign: 0xffc857,
} as const;

const junkyardGeometry = {
  roadWidth: 5.4,
  roadDepth: 17,
  roadX: 5.5,
  fenceHalfWidth: 7.8,
  fenceBackZ: 6.2,
  fencePostHeight: 1.35,
  decorativeCarCount: 7,
  barrelCount: 8,
} as const;

export function createJunkyardStationVisuals(): ReadonlyArray<WorldStationVisual> {
  return junkyardStations.map((station) => {
    const root = createStationModel(station);
    root.position.set(
      station.interaction.position.x,
      0,
      station.interaction.position.z,
    );
    return {
      interactionId: station.interaction.id,
      root,
      accentColor: station.accentColor,
      anchorHeight: station.anchorHeight,
    };
  });
}

export function decorateJunkyardWorld(root: THREE.Group, density: number): void {
  root.add(createRoad(), createStationShack(), createCanopy());
  addFence(root);
  addDecorativeCars(root, density);
  addBarrels(root, density);
  addGroundDetails(root, density);
}

function createStationModel(station: JunkyardStationDefinition): THREE.Group {
  if (station.visualKind === junkyardVisualKinds.scrapPile) {
    return createScrapPile();
  }
  if (station.visualKind === junkyardVisualKinds.crusher) {
    return createCrusher();
  }
  if (station.visualKind === junkyardVisualKinds.fuelRack) {
    return createFuelRack();
  }
  if (station.visualKind === junkyardVisualKinds.customer) {
    return createCustomerStop();
  }
  return createUpgradePad(station.accentColor);
}

function createRoad(): THREE.Mesh {
  const road = new THREE.Mesh(
    new THREE.BoxGeometry(
      junkyardGeometry.roadWidth,
      0.08,
      junkyardGeometry.roadDepth,
    ),
    standardMaterial(junkyardPalette.asphaltDark, 0.96),
  );
  road.position.set(junkyardGeometry.roadX, -0.015, -0.2);
  road.receiveShadow = true;
  return road;
}

function createStationShack(): THREE.Group {
  const root = new THREE.Group();
  root.position.set(-4.95, 0, 3.65);
  const body = box(3.25, 2.25, 2.45, junkyardPalette.cream);
  body.position.y = 1.12;
  const roof = box(3.65, 0.22, 2.85, junkyardPalette.orange);
  roof.position.y = 2.35;
  const door = box(0.8, 1.55, 0.08, junkyardPalette.darkSteel);
  door.position.set(0.72, 0.78, 1.25);
  const window = box(0.95, 0.72, 0.06, junkyardPalette.glass);
  window.position.set(-0.68, 1.2, 1.27);
  root.add(body, roof, door, window);
  return root;
}

function createCanopy(): THREE.Group {
  const root = new THREE.Group();
  root.position.set(3.65, 0, 2.95);
  const roof = box(4.6, 0.22, 2.65, junkyardPalette.cream);
  roof.position.y = 2.55;
  const stripe = box(4.72, 0.25, 0.18, junkyardPalette.orange);
  stripe.position.set(0, 2.48, 1.36);
  root.add(roof, stripe);
  for (const x of [-1.75, 1.75]) {
    const post = box(0.18, 2.5, 0.18, junkyardPalette.darkSteel);
    post.position.set(x, 1.25, 0);
    root.add(post);
  }
  return root;
}

function createScrapPile(): THREE.Group {
  const root = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.25, 0.4, 9),
    standardMaterial(junkyardPalette.steel, 0.92),
  );
  base.position.y = 0.2;
  base.scale.z = 0.75;
  root.add(base);
  const pieces: ReadonlyArray<readonly [number, number, number, number]> = [
    [-0.55, 0.62, 0.18, 0.7],
    [0.05, 0.72, -0.1, -0.45],
    [0.55, 0.48, 0.18, 0.9],
    [-0.15, 0.95, 0.2, 0.25],
  ];
  for (const [x, y, z, rotation] of pieces) {
    const piece = box(0.68, 0.22, 0.42, junkyardPalette.darkSteel);
    piece.position.set(x, y, z);
    piece.rotation.y = rotation;
    root.add(piece);
  }
  const tire = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.13, 8, 18),
    standardMaterial(junkyardPalette.tire, 0.9),
  );
  tire.position.set(0.4, 0.78, -0.15);
  tire.rotation.x = Math.PI / 2.8;
  root.add(tire);
  return root;
}

function createCrusher(): THREE.Group {
  const root = new THREE.Group();
  const platform = box(2.25, 0.22, 1.7, junkyardPalette.darkSteel);
  platform.position.y = 0.11;
  const towerLeft = box(0.35, 2.45, 0.52, junkyardPalette.red);
  const towerRight = box(0.35, 2.45, 0.52, junkyardPalette.red);
  towerLeft.position.set(-0.86, 1.35, 0);
  towerRight.position.set(0.86, 1.35, 0);
  const beam = box(2.05, 0.42, 0.68, junkyardPalette.darkRed);
  beam.position.y = 2.45;
  const jaw = box(1.55, 0.32, 1.1, junkyardPalette.steel);
  jaw.position.y = 1.55;
  root.add(platform, towerLeft, towerRight, beam, jaw);
  return root;
}

function createFuelRack(): THREE.Group {
  const root = new THREE.Group();
  const tank = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.62, 1.8, 16),
    standardMaterial(junkyardPalette.fuel, 0.76),
  );
  tank.rotation.z = Math.PI / 2;
  tank.position.y = 1.05;
  const stand = box(1.95, 0.22, 1.25, junkyardPalette.darkSteel);
  stand.position.y = 0.11;
  const pump = box(0.62, 1.35, 0.58, junkyardPalette.cream);
  pump.position.set(0.92, 0.78, 0.15);
  const screen = box(0.38, 0.3, 0.05, junkyardPalette.glass);
  screen.position.set(0.92, 1.04, 0.46);
  root.add(stand, tank, pump, screen);
  return root;
}

function createCustomerStop(): THREE.Group {
  const root = new THREE.Group();
  const car = box(2.25, 0.62, 1.18, junkyardPalette.customerShirt);
  car.position.set(0.25, 0.52, -0.2);
  const cabin = box(1.1, 0.5, 1.02, junkyardPalette.glass);
  cabin.position.set(0.05, 1.02, -0.2);
  root.add(car, cabin);
  for (const x of [-0.62, 0.88]) {
    for (const z of [-0.67, 0.27]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, 0.18, 12),
        standardMaterial(junkyardPalette.tire, 0.9),
      );
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.32, z);
      root.add(wheel);
    }
  }
  const customer = createSimplePerson();
  customer.position.set(-1.35, 0, 0.35);
  root.add(customer);
  return root;
}

function createUpgradePad(color: number): THREE.Group {
  const root = new THREE.Group();
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.18, 0.16, 24),
    standardMaterial(color, 0.66, 0.08),
  );
  pad.position.y = 0.08;
  const arrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.35, 0.75, 4),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  );
  arrow.position.y = 0.62;
  arrow.rotation.y = Math.PI / 4;
  root.add(pad, arrow);
  return root;
}

function createSimplePerson(): THREE.Group {
  const root = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.22, 0.58, 5, 9),
    standardMaterial(junkyardPalette.customerShirt, 0.82),
  );
  body.position.y = 0.84;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.19, 12, 8),
    standardMaterial(0xe9b78f, 0.86),
  );
  head.position.y = 1.4;
  const legs = box(0.34, 0.52, 0.26, junkyardPalette.customerTrousers);
  legs.position.y = 0.28;
  root.add(body, head, legs);
  return root;
}

function addFence(root: THREE.Group): void {
  const material = standardMaterial(junkyardPalette.fence, 0.88);
  for (const x of [-junkyardGeometry.fenceHalfWidth, junkyardGeometry.fenceHalfWidth]) {
    for (let z = -5.8; z <= 5.8; z += 1.3) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.06, junkyardGeometry.fencePostHeight, 6),
        material,
      );
      post.position.set(x, junkyardGeometry.fencePostHeight / 2, z);
      root.add(post);
    }
  }
  const backRail = box(15.7, 0.12, 0.12, junkyardPalette.fence);
  backRail.position.set(0, 0.8, junkyardGeometry.fenceBackZ);
  root.add(backRail);
}

function addDecorativeCars(root: THREE.Group, density: number): void {
  const positions: ReadonlyArray<readonly [number, number, number]> = [
    [-6.0, -4.7, 0.2],
    [-5.8, -3.2, -0.35],
    [-5.9, -1.7, 0.12],
    [6.25, 4.6, 0.25],
    [6.25, 3.2, -0.2],
    [6.2, -4.8, 0.1],
    [1.7, 5.2, -0.25],
  ];
  const count = scaledCount(junkyardGeometry.decorativeCarCount, density, 3);
  for (let index = 0; index < count; index += 1) {
    const [x, z, rotation] = positions[index]!;
    const car = box(1.55, 0.48, 0.95, index % 2 === 0 ? junkyardPalette.steel : junkyardPalette.wood);
    car.position.set(x, 0.35, z);
    car.rotation.y = rotation;
    root.add(car);
  }
}

function addBarrels(root: THREE.Group, density: number): void {
  const count = scaledCount(junkyardGeometry.barrelCount, density, 3);
  for (let index = 0; index < count; index += 1) {
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 0.62, 12),
      standardMaterial(index % 2 === 0 ? junkyardPalette.orange : junkyardPalette.darkSteel, 0.82),
    );
    barrel.position.set(-6.4 + (index % 3) * 0.58, 0.31, 4.9 - Math.floor(index / 3) * 0.62);
    barrel.castShadow = true;
    root.add(barrel);
  }
}

function addGroundDetails(root: THREE.Group, density: number): void {
  const count = scaledCount(11, density, 4);
  for (let index = 0; index < count; index += 1) {
    const plate = box(0.55 + index % 3 * 0.12, 0.035, 0.28, junkyardPalette.steel);
    plate.position.set(-5.5 + (index * 2.17) % 10.4, 0.01, -4.8 + (index * 3.11) % 9.6);
    plate.rotation.y = index * 0.74;
    root.add(plate);
  }
}

function box(
  width: number,
  height: number,
  depth: number,
  color: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    standardMaterial(color, 0.84),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function standardMaterial(
  color: number,
  roughness: number,
  metalness = 0.02,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function scaledCount(total: number, density: number, minimum: number): number {
  return Math.min(total, Math.max(minimum, Math.ceil(total * Math.min(1, Math.max(0, density)))));
}
