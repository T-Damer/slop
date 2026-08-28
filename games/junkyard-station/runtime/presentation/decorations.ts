import * as THREE from 'three';

import { junkyardPalette } from './palette.ts';

const junkyardDecorationGeometry = {
  roadWidth: 5.4,
  roadDepth: 17,
  roadX: 5.5,
  fenceHalfWidth: 7.8,
  fenceBackZ: 6.2,
  fencePostHeight: 1.35,
  decorativeCarCount: 7,
  barrelCount: 8,
} as const;

export function decorateJunkyardWorld(root: THREE.Group, density: number): void {
  root.add(createRoad(), createStationShack(), createCanopy());
  addFence(root);
  addDecorativeCars(root, density);
  addBarrels(root, density);
  addGroundDetails(root, density);
}

function createRoad(): THREE.Mesh {
  const road = createBox(
    junkyardDecorationGeometry.roadWidth,
    0.08,
    junkyardDecorationGeometry.roadDepth,
    junkyardPalette.asphaltDark,
  );
  road.position.set(junkyardDecorationGeometry.roadX, -0.015, -0.2);
  road.receiveShadow = true;
  return road;
}

function createStationShack(): THREE.Group {
  const root = new THREE.Group();
  root.position.set(-4.95, 0, 3.65);
  const body = createBox(3.25, 2.25, 2.45, junkyardPalette.cream);
  body.position.y = 1.12;
  const roof = createBox(3.65, 0.22, 2.85, junkyardPalette.orange);
  roof.position.y = 2.35;
  const door = createBox(0.8, 1.55, 0.08, junkyardPalette.darkSteel);
  door.position.set(0.72, 0.78, 1.25);
  const window = createBox(0.95, 0.72, 0.06, junkyardPalette.glass);
  window.position.set(-0.68, 1.2, 1.27);
  root.add(body, roof, door, window);
  return root;
}

function createCanopy(): THREE.Group {
  const root = new THREE.Group();
  root.position.set(3.65, 0, 2.95);
  const roof = createBox(4.6, 0.22, 2.65, junkyardPalette.cream);
  roof.position.y = 2.55;
  const stripe = createBox(4.72, 0.25, 0.18, junkyardPalette.orange);
  stripe.position.set(0, 2.48, 1.36);
  root.add(roof, stripe);
  for (const x of [-1.75, 1.75]) {
    const post = createBox(0.18, 2.5, 0.18, junkyardPalette.darkSteel);
    post.position.set(x, 1.25, 0);
    root.add(post);
  }
  return root;
}

function addFence(root: THREE.Group): void {
  const material = createMaterial(junkyardPalette.fence, 0.88);
  for (const x of [
    -junkyardDecorationGeometry.fenceHalfWidth,
    junkyardDecorationGeometry.fenceHalfWidth,
  ]) {
    for (let z = -5.8; z <= 5.8; z += 1.3) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.05,
          0.06,
          junkyardDecorationGeometry.fencePostHeight,
          6,
        ),
        material,
      );
      post.position.set(
        x,
        junkyardDecorationGeometry.fencePostHeight / 2,
        z,
      );
      post.castShadow = true;
      root.add(post);
    }
  }
  const backRail = createBox(15.7, 0.12, 0.12, junkyardPalette.fence);
  backRail.position.set(0, 0.8, junkyardDecorationGeometry.fenceBackZ);
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
  const count = scaledCount(
    junkyardDecorationGeometry.decorativeCarCount,
    density,
    3,
  );
  for (let index = 0; index < count; index += 1) {
    const [x, z, rotation] = positions[index]!;
    const color = index % 2 === 0 ? junkyardPalette.steel : junkyardPalette.wood;
    const car = createBox(1.55, 0.48, 0.95, color);
    car.position.set(x, 0.35, z);
    car.rotation.y = rotation;
    root.add(car);
  }
}

function addBarrels(root: THREE.Group, density: number): void {
  const count = scaledCount(junkyardDecorationGeometry.barrelCount, density, 3);
  for (let index = 0; index < count; index += 1) {
    const color = index % 2 === 0
      ? junkyardPalette.orange
      : junkyardPalette.darkSteel;
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 0.62, 12),
      createMaterial(color, 0.82),
    );
    barrel.position.set(
      -6.4 + (index % 3) * 0.58,
      0.31,
      4.9 - Math.floor(index / 3) * 0.62,
    );
    barrel.castShadow = true;
    root.add(barrel);
  }
}

function addGroundDetails(root: THREE.Group, density: number): void {
  const count = scaledCount(11, density, 4);
  for (let index = 0; index < count; index += 1) {
    const plate = createBox(
      0.55 + index % 3 * 0.12,
      0.035,
      0.28,
      junkyardPalette.steel,
    );
    plate.position.set(
      -5.5 + (index * 2.17) % 10.4,
      0.01,
      -4.8 + (index * 3.11) % 9.6,
    );
    plate.rotation.y = index * 0.74;
    root.add(plate);
  }
}

function createBox(
  width: number,
  height: number,
  depth: number,
  color: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    createMaterial(color, 0.84),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createMaterial(
  color: number,
  roughness: number,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.02 });
}

function scaledCount(total: number, density: number, minimum: number): number {
  const normalized = Math.min(1, Math.max(0, density));
  return Math.min(total, Math.max(minimum, Math.ceil(total * normalized)));
}
