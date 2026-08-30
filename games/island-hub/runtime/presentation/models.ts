import * as THREE from 'three';

import type {
  IslandActivityId,
  IslandAnimalId,
  IslandPlacement,
  IslandPortalPlacement,
} from '../domain/types.ts';

export function createIslandCharacter(
  primaryColor: number,
  secondaryColor: number,
  scale = 1,
): THREE.Group {
  const group = new THREE.Group();
  const skin = material(0xf2c7a2, 0.82);
  const shirt = material(primaryColor, 0.7);
  const trousers = material(secondaryColor, 0.82);
  const hair = material(0x5a3825, 0.9);
  const body = mesh(new THREE.CapsuleGeometry(0.24, 0.44, 4, 8), shirt);
  body.position.y = 0.67;
  const head = mesh(new THREE.SphereGeometry(0.24, 12, 9), skin);
  head.position.y = 1.28;
  const hairCap = mesh(
    new THREE.SphereGeometry(0.247, 12, 7, 0, Math.PI * 2, 0, Math.PI * 0.52),
    hair,
  );
  hairCap.position.y = 1.34;
  const leftLeg = limb('left-leg', trousers, -0.12);
  const rightLeg = limb('right-leg', trousers, 0.12);
  const leftArm = arm('left-arm', skin, -0.31);
  const rightArm = arm('right-arm', skin, 0.31);
  group.add(body, head, hairCap, leftLeg, rightLeg, leftArm, rightArm);
  group.scale.setScalar(scale);
  return group;
}

export function createIslandHouse(
  placement: IslandPlacement,
  roofColor: number,
): THREE.Group {
  const group = new THREE.Group();
  const base = mesh(
    new THREE.BoxGeometry(2.5, 1.55, 2.1),
    material(0xfff0d3, 0.92),
  );
  base.position.y = 0.78;
  const roof = mesh(
    new THREE.ConeGeometry(2.05, 1.2, 4),
    material(roofColor, 0.68),
  );
  roof.position.y = 2.02;
  roof.rotation.y = Math.PI / 4;
  const door = mesh(
    new THREE.BoxGeometry(0.58, 1.05, 0.08),
    material(0x9a6542, 0.82),
  );
  door.position.set(0, 0.55, 1.09);
  const windowMaterial = material(0x8fd8ee, 0.32, 0.18);
  for (const x of [-0.72, 0.72]) {
    const window = mesh(new THREE.BoxGeometry(0.48, 0.48, 0.07), windowMaterial);
    window.position.set(x, 0.94, 1.1);
    group.add(window);
  }
  group.add(base, roof, door);
  applyPlacement(group, placement);
  return group;
}

export function createIslandTree(
  placement: IslandPlacement,
  autumn: boolean,
): THREE.Group {
  const group = new THREE.Group();
  const trunk = mesh(
    new THREE.CylinderGeometry(0.15, 0.21, 1.35, 8),
    material(0x7a4d2d, 0.94),
  );
  trunk.position.y = 0.67;
  const leafColor = autumn ? 0xd98b42 : 0x4eaf66;
  const crown = mesh(
    new THREE.IcosahedronGeometry(0.78, 1),
    material(leafColor, 0.88),
  );
  crown.position.y = 1.58;
  crown.scale.set(1, 1.12, 1);
  group.add(trunk, crown);
  applyPlacement(group, placement);
  return group;
}

export function createIslandRock(placement: IslandPlacement): THREE.Mesh {
  const rock = mesh(
    new THREE.DodecahedronGeometry(0.36, 0),
    material(0x8c9697, 0.98),
  );
  rock.scale.set(1.2, 0.72, 0.9);
  rock.position.set(placement.x, 0.25, placement.z);
  rock.rotation.set(0.1, placement.rotation, -0.08);
  rock.scale.multiplyScalar(placement.scale);
  return rock;
}

export function createIslandFlower(
  placement: IslandPlacement,
  color: number,
): THREE.Group {
  const group = new THREE.Group();
  const stem = mesh(
    new THREE.CylinderGeometry(0.025, 0.035, 0.28, 6),
    material(0x4b9e55, 0.9),
  );
  stem.position.y = 0.14;
  const blossom = mesh(
    new THREE.SphereGeometry(0.09, 8, 6),
    material(color, 0.68),
  );
  blossom.position.y = 0.32;
  group.add(stem, blossom);
  applyPlacement(group, placement);
  return group;
}

export function createIslandAnimal(
  placement: IslandPlacement,
  species: IslandAnimalId,
): THREE.Group {
  const colors: Record<IslandAnimalId, number> = {
    cat: 0xe3a95d,
    dog: 0xc28a54,
    rabbit: 0xe9e5df,
    raccoon: 0x7d8586,
    fox: 0xd97843,
    duck: 0xf0d85e,
  };
  const group = new THREE.Group();
  const bodyMaterial = material(colors[species], 0.84);
  const body = mesh(new THREE.SphereGeometry(0.34, 10, 8), bodyMaterial);
  body.position.y = 0.38;
  body.scale.set(1, 0.9, 1.25);
  const head = mesh(new THREE.SphereGeometry(0.27, 10, 8), bodyMaterial);
  head.position.set(0, 0.75, 0.2);
  const eyes = material(0x2e3434, 0.62);
  for (const x of [-0.09, 0.09]) {
    const eye = mesh(new THREE.SphereGeometry(0.025, 6, 5), eyes);
    eye.position.set(x, 0.8, 0.45);
    group.add(eye);
  }
  group.add(body, head);
  applyPlacement(group, placement);
  return group;
}

export function createIslandPortal(portal: IslandPortalPlacement): THREE.Group {
  const group = new THREE.Group();
  const ring = mesh(
    new THREE.TorusGeometry(0.72, 0.12, 10, 28),
    emissiveMaterial(portal.color),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.15;
  const pad = mesh(
    new THREE.CylinderGeometry(0.9, 1.05, 0.18, 24),
    material(0xf2e4c2, 0.92),
  );
  pad.position.y = 0.06;
  group.add(pad, ring);
  group.position.set(portal.x, 0, portal.z);
  group.userData.destinationId = portal.destinationId;
  group.userData.ring = ring;
  return group;
}

export function createActivityZone(
  placement: IslandPlacement & { readonly activity: IslandActivityId },
): THREE.Group {
  const group = new THREE.Group();
  const base = mesh(
    new THREE.CylinderGeometry(1.15, 1.22, 0.12, 24),
    material(0xdccca3, 0.96),
  );
  base.position.y = 0.04;
  group.add(base);
  const symbolByActivity: Record<IslandActivityId, string> = {
    gardening: '🌱',
    fishing: '🎣',
    picnic: '🧺',
    crafting: '🛠️',
    exploring: '🧭',
    social: '🎉',
  };
  group.userData.symbol = symbolByActivity[placement.activity];
  applyPlacement(group, placement);
  return group;
}

export function setObjectShadows(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

export function disposeIslandObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }
    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const entry of materials) {
      entry.dispose();
    }
  });
}

function limb(name: string, entry: THREE.Material, x: number): THREE.Mesh {
  const leg = mesh(new THREE.CapsuleGeometry(0.07, 0.28, 3, 6), entry);
  leg.name = name;
  leg.position.set(x, 0.25, 0);
  return leg;
}

function arm(name: string, entry: THREE.Material, x: number): THREE.Mesh {
  const result = mesh(new THREE.CapsuleGeometry(0.055, 0.28, 3, 6), entry);
  result.name = name;
  result.position.set(x, 0.68, 0);
  result.rotation.z = x < 0 ? -0.1 : 0.1;
  return result;
}

function mesh(geometry: THREE.BufferGeometry, entry: THREE.Material): THREE.Mesh {
  return new THREE.Mesh(geometry, entry);
}

function material(color: number, roughness: number, metalness = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function emissiveMaterial(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.72,
    roughness: 0.42,
  });
}

function applyPlacement(object: THREE.Object3D, placement: IslandPlacement): void {
  object.position.set(placement.x, 0, placement.z);
  object.rotation.y = placement.rotation;
  object.scale.multiplyScalar(placement.scale);
  setObjectShadows(object);
}
