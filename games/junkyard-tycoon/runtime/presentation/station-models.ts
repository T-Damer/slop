import * as THREE from 'three';

import { junkyardSceneColors } from './registry.ts';

const stationGeometry = {
  wheelRadius: 0.24,
  wheelWidth: 0.18,
  carWidth: 1.18,
  carHeight: 0.42,
  carDepth: 2.08,
  pumpWidth: 0.58,
  pumpHeight: 1.32,
  pumpDepth: 0.5,
} as const;

export interface FuelPumpModel {
  readonly root: THREE.Group;
  readonly nozzle: THREE.Mesh;
}

export interface CustomerCarModel {
  readonly root: THREE.Group;
  readonly body: THREE.Mesh;
}

export function createJunkCrates(): THREE.Group {
  const root = new THREE.Group();
  const crateMaterial = material(junkyardSceneColors.crate, 0.88);
  for (const [x, y, z, scale] of [
    [-0.34, 0.26, 0.08, 0.72],
    [0.28, 0.22, -0.16, 0.62],
    [0.05, 0.6, 0.12, 0.52],
  ] as const) {
    const crate = shadowMesh(
      new THREE.BoxGeometry(scale, scale, scale),
      crateMaterial,
    );
    crate.position.set(x, y, z);
    crate.rotation.y = x * 0.4;
    root.add(crate);
  }
  return root;
}

export function createJunkTires(): THREE.Group {
  const root = new THREE.Group();
  const tireMaterial = material(junkyardSceneColors.tire, 0.96);
  for (let index = 0; index < 4; index += 1) {
    const tire = shadowMesh(
      new THREE.TorusGeometry(0.35, 0.12, 8, 18),
      tireMaterial,
    );
    tire.position.set(
      (index % 2) * 0.42 - 0.2,
      0.18 + Math.floor(index / 2) * 0.26,
      Math.floor(index / 2) * 0.12,
    );
    tire.rotation.x = Math.PI / 2;
    tire.rotation.z = index * 0.22;
    root.add(tire);
  }
  return root;
}

export function createJunkWreck(): THREE.Group {
  const root = createCustomerCar(junkyardSceneColors.junkRust).root;
  root.scale.setScalar(0.76);
  root.rotation.y = -0.42;
  return root;
}

export function createFuelPump(): FuelPumpModel {
  const root = new THREE.Group();
  const body = shadowMesh(
    new THREE.BoxGeometry(
      stationGeometry.pumpWidth,
      stationGeometry.pumpHeight,
      stationGeometry.pumpDepth,
    ),
    material(junkyardSceneColors.pumpRed, 0.72),
  );
  body.position.y = stationGeometry.pumpHeight / 2;
  root.add(body);

  const cap = shadowMesh(
    new THREE.BoxGeometry(0.64, 0.2, 0.56),
    material(junkyardSceneColors.pumpWhite, 0.8),
  );
  cap.position.y = 1.38;
  root.add(cap);

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 0.25),
    new THREE.MeshBasicMaterial({ color: junkyardSceneColors.pumpScreen }),
  );
  screen.position.set(0, 0.93, 0.256);
  root.add(screen);

  const nozzle = shadowMesh(
    new THREE.BoxGeometry(0.12, 0.38, 0.12),
    material(junkyardSceneColors.shadow, 0.62),
  );
  nozzle.position.set(0.39, 0.88, 0);
  nozzle.rotation.z = 0.22;
  root.add(nozzle);
  return { root, nozzle };
}

export function createCustomerCar(
  color = junkyardSceneColors.carBody,
): CustomerCarModel {
  const root = new THREE.Group();
  const body = shadowMesh(
    new THREE.BoxGeometry(
      stationGeometry.carWidth,
      stationGeometry.carHeight,
      stationGeometry.carDepth,
    ),
    material(color, 0.68),
  );
  body.position.y = 0.42;
  root.add(body);

  const roof = shadowMesh(
    new THREE.BoxGeometry(0.92, 0.42, 0.95),
    material(junkyardSceneColors.carRoof, 0.72),
  );
  roof.position.set(0, 0.78, -0.05);
  root.add(roof);

  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(0.94, 0.3, 0.72),
    material(junkyardSceneColors.carGlass, 0.34, 0.16),
  );
  glass.position.set(0, 0.81, -0.13);
  root.add(glass);
  addCarWheels(root);
  return { root, body };
}

export function createRegisterBuilding(): THREE.Group {
  const root = new THREE.Group();
  const booth = shadowMesh(
    new THREE.BoxGeometry(2.2, 1.55, 1.7),
    material(junkyardSceneColors.register, 0.84),
  );
  booth.position.y = 0.78;
  root.add(booth);

  const awning = shadowMesh(
    new THREE.BoxGeometry(2.4, 0.16, 1.9),
    material(junkyardSceneColors.pumpWhite, 0.82),
  );
  awning.position.y = 1.62;
  root.add(awning);

  const counter = shadowMesh(
    new THREE.BoxGeometry(0.82, 0.72, 0.38),
    material(junkyardSceneColors.fence, 0.9),
  );
  counter.position.set(0.48, 0.36, 1.02);
  root.add(counter);
  return root;
}

export function createCashStack(): THREE.Group {
  const root = new THREE.Group();
  const cashMaterial = material(junkyardSceneColors.cash, 0.75);
  for (let index = 0; index < 4; index += 1) {
    const bundle = shadowMesh(
      new THREE.BoxGeometry(0.42, 0.08, 0.24),
      cashMaterial,
    );
    bundle.position.set(
      (index % 2) * 0.22 - 0.11,
      0.08 + Math.floor(index / 2) * 0.09,
      Math.floor(index / 2) * 0.08,
    );
    bundle.rotation.y = index * 0.12;
    root.add(bundle);
  }
  return root;
}

export function createBuildPad(): THREE.Group {
  const root = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.72, 0.93, 30),
    new THREE.MeshBasicMaterial({
      color: junkyardSceneColors.blueprint,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.025;
  root.add(ring);

  const markerMaterial = material(junkyardSceneColors.blueprint, 0.8);
  markerMaterial.transparent = true;
  markerMaterial.opacity = 0.5;
  const marker = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.08, 0.5),
    markerMaterial,
  );
  marker.position.y = 0.06;
  root.add(marker);
  return root;
}

export function createInteractionAnchor(): THREE.Object3D {
  return new THREE.Object3D();
}

function addCarWheels(root: THREE.Group): void {
  const wheelMaterial = material(junkyardSceneColors.tire, 0.9);
  for (const x of [-0.67, 0.67]) {
    for (const z of [-0.68, 0.68]) {
      const wheel = shadowMesh(
        new THREE.CylinderGeometry(
          stationGeometry.wheelRadius,
          stationGeometry.wheelRadius,
          stationGeometry.wheelWidth,
          12,
        ),
        wheelMaterial,
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.29, z);
      root.add(wheel);
    }
  }
}

function material(
  color: number,
  roughness: number,
  metalness = 0,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function shadowMesh(
  geometry: THREE.BufferGeometry,
  meshMaterial: THREE.Material,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, meshMaterial);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
