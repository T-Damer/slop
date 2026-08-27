import * as THREE from 'three';

import type {
  TrafficCarDefinition,
} from '../domain/types.ts';
import {
  parkingLayout,
  parkingSceneColors,
} from './registry.ts';

export interface CarModel extends THREE.Group {
  userData: {
    carId: string;
    wheels: ReadonlyArray<THREE.Mesh>;
    bodyMaterials: ReadonlyArray<THREE.MeshStandardMaterial>;
    originalScale: THREE.Vector3;
  };
}

export interface PersonModel extends THREE.Group {
  userData: {
    passengerIndex: number;
    queueTarget: THREE.Vector3;
    bodyMaterial: THREE.MeshStandardMaterial;
    phase: number;
    leaving: boolean;
  };
}

export function createCarModel(
  car: TrafficCarDefinition,
  bodyColor: number,
): CarModel {
  const group = new THREE.Group() as CarModel;
  group.name = `car:${car.id}`;

  const carLength = parkingLayout.cellSize * car.length - 0.13;
  const carWidth = 0.76;
  const bodyMaterial = standardMaterial(bodyColor, 0.57, 0.08);
  const trimMaterial = standardMaterial(darken(bodyColor, 0.72), 0.62, 0.04);
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: parkingSceneColors.window,
    roughness: 0.22,
    metalness: 0.18,
  });
  const tireMaterial = standardMaterial(parkingSceneColors.tire, 0.86, 0.02);
  const rimMaterial = standardMaterial(parkingSceneColors.rim, 0.38, 0.42);
  const lightMaterial = new THREE.MeshStandardMaterial({
    color: parkingSceneColors.white,
    emissive: 0xfff0c4,
    emissiveIntensity: 0.65,
    roughness: 0.35,
  });
  const rearLightMaterial = new THREE.MeshStandardMaterial({
    color: 0xd94343,
    emissive: 0x7d1515,
    emissiveIntensity: 0.55,
    roughness: 0.42,
  });

  const lowerBody = new THREE.Mesh(
    new THREE.BoxGeometry(carWidth, 0.31, carLength),
    bodyMaterial,
  );
  lowerBody.position.y = 0.31;
  lowerBody.castShadow = true;
  lowerBody.receiveShadow = true;
  group.add(lowerBody);

  const bumperFront = new THREE.Mesh(
    new THREE.BoxGeometry(carWidth * 0.9, 0.12, 0.15),
    trimMaterial,
  );
  bumperFront.position.set(0, 0.25, carLength / 2 + 0.03);
  bumperFront.castShadow = true;
  group.add(bumperFront);

  const bumperRear = bumperFront.clone();
  bumperRear.position.z = -carLength / 2 - 0.03;
  group.add(bumperRear);

  const cabinLength = Math.max(0.72, carLength * 0.46);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(carWidth * 0.78, 0.34, cabinLength),
    glassMaterial,
  );
  cabin.position.set(0, 0.61, -carLength * 0.03);
  cabin.castShadow = true;
  group.add(cabin);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(carWidth * 0.73, 0.09, cabinLength * 0.83),
    bodyMaterial,
  );
  roof.position.set(0, 0.82, -carLength * 0.03);
  roof.castShadow = true;
  group.add(roof);

  const hood = new THREE.Mesh(
    new THREE.BoxGeometry(carWidth * 0.82, 0.08, Math.max(0.34, carLength * 0.2)),
    trimMaterial,
  );
  hood.position.set(0, 0.51, carLength * 0.32);
  hood.castShadow = true;
  group.add(hood);

  const wheels: Array<THREE.Mesh> = [];
  const wheelZ = carLength * 0.31;
  for (const side of [-1, 1]) {
    for (const front of [-1, 1]) {
      const tire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 0.13, 12),
        tireMaterial,
      );
      tire.rotation.z = Math.PI / 2;
      tire.position.set(side * 0.43, 0.19, front * wheelZ);
      tire.castShadow = true;
      tire.name = 'wheel';
      group.add(tire);
      wheels.push(tire);

      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.073, 0.073, 0.136, 12),
        rimMaterial,
      );
      rim.rotation.z = Math.PI / 2;
      rim.position.copy(tire.position);
      group.add(rim);
    }
  }

  for (const side of [-1, 1]) {
    const headlight = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.08, 0.035),
      lightMaterial,
    );
    headlight.position.set(side * 0.22, 0.38, carLength / 2 + 0.085);
    group.add(headlight);

    const rearLight = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.08, 0.035),
      rearLightMaterial,
    );
    rearLight.position.set(side * 0.22, 0.38, -carLength / 2 - 0.085);
    group.add(rearLight);
  }

  const arrow = createRoofArrow();
  arrow.position.set(0, 0.885, 0.02);
  group.add(arrow);

  group.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.userData.carId = car.id;
    }
  });

  group.userData = {
    carId: car.id,
    wheels,
    bodyMaterials: [bodyMaterial, trimMaterial],
    originalScale: new THREE.Vector3(1, 1, 1),
  };
  return group;
}

export function createPersonModel(
  shirtColor: number,
  passengerIndex: number,
): PersonModel {
  const group = new THREE.Group() as PersonModel;
  const skinMaterial = standardMaterial(parkingSceneColors.skin, 0.84, 0);
  const bodyMaterial = standardMaterial(shirtColor, 0.72, 0.01);
  const pantsMaterial = standardMaterial(darken(shirtColor, 0.46), 0.82, 0.01);
  const hairSeed = (passengerIndex * 37) % 5;
  const hairColor = darken(parkingSceneColors.hair, 0.78 + hairSeed * 0.035);
  const hairMaterial = standardMaterial(hairColor, 0.9, 0);

  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.17, 0.21, 0.42, 9),
    bodyMaterial,
  );
  torso.position.y = 0.53;
  torso.castShadow = true;
  group.add(torso);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.145, 12, 8),
    skinMaterial,
  );
  head.position.y = 0.86;
  head.castShadow = true;
  group.add(head);

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.151, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.52),
    hairMaterial,
  );
  hair.position.y = 0.89;
  hair.castShadow = true;
  group.add(hair);

  const leftLeg = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.065, 0.32, 7),
    pantsMaterial,
  );
  leftLeg.position.set(-0.085, 0.19, 0);
  leftLeg.castShadow = true;
  leftLeg.name = 'left-leg';
  group.add(leftLeg);

  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.085;
  rightLeg.name = 'right-leg';
  group.add(rightLeg);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.24, 16),
    new THREE.MeshBasicMaterial({
      color: 0x17231c,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  group.add(shadow);

  group.scale.setScalar(0.68);
  group.userData = {
    passengerIndex,
    queueTarget: new THREE.Vector3(),
    bodyMaterial,
    phase: passengerIndex * 0.61,
    leaving: false,
  };
  return group;
}

export function createBayMarker(active: boolean): THREE.Group {
  const group = new THREE.Group();
  const padMaterial = standardMaterial(
    active ? parkingSceneColors.concrete : parkingSceneColors.concreteDark,
    0.92,
    0.01,
  );
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(parkingLayout.bayWidth, 0.12, parkingLayout.bayDepth),
    padMaterial,
  );
  pad.receiveShadow = true;
  pad.position.y = 0.03;
  group.add(pad);

  const stripeMaterial = new THREE.MeshBasicMaterial({
    color: active ? parkingSceneColors.pickup : parkingSceneColors.pickupInactive,
  });
  for (const x of [-parkingLayout.bayWidth / 2 + 0.08, parkingLayout.bayWidth / 2 - 0.08]) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 0.018, parkingLayout.bayDepth * 0.9),
      stripeMaterial,
    );
    stripe.position.set(x, 0.105, 0);
    group.add(stripe);
  }
  const endStripe = new THREE.Mesh(
    new THREE.BoxGeometry(parkingLayout.bayWidth * 0.9, 0.018, 0.055),
    stripeMaterial,
  );
  endStripe.position.set(0, 0.105, -parkingLayout.bayDepth / 2 + 0.16);
  group.add(endStripe);

  const sign = createPickupSign(active);
  sign.position.set(0, 0.13, 0.18);
  group.add(sign);
  group.userData.baseScale = 1;
  return group;
}

export function createTree(scale = 1): THREE.Group {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12 * scale, 0.16 * scale, 0.78 * scale, 7),
    standardMaterial(parkingSceneColors.treeTrunk, 0.95, 0),
  );
  trunk.position.y = 0.39 * scale;
  trunk.castShadow = true;
  group.add(trunk);

  const crown = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.55 * scale, 1),
    standardMaterial(parkingSceneColors.treeLeaves, 0.88, 0),
  );
  crown.position.y = 1.1 * scale;
  crown.scale.y = 1.18;
  crown.castShadow = true;
  group.add(crown);
  return group;
}

export function createLamp(): THREE.Group {
  const group = new THREE.Group();
  const material = standardMaterial(parkingSceneColors.lamp, 0.5, 0.35);
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.055, 1.75, 8),
    material,
  );
  pole.position.y = 0.875;
  pole.castShadow = true;
  group.add(pole);

  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.055, 0.055), material);
  arm.position.set(0.19, 1.7, 0);
  arm.castShadow = true;
  group.add(arm);

  const lightMaterial = new THREE.MeshStandardMaterial({
    color: 0xfff2c7,
    emissive: 0xffd768,
    emissiveIntensity: 1.2,
    roughness: 0.35,
  });
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.16), lightMaterial);
  lamp.position.set(0.42, 1.66, 0);
  group.add(lamp);
  return group;
}

export function createCoinModel(): THREE.Mesh {
  const material = new THREE.MeshStandardMaterial({
    color: parkingSceneColors.gold,
    emissive: 0x6f4a00,
    emissiveIntensity: 0.22,
    roughness: 0.35,
    metalness: 0.58,
  });
  const coin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 0.045, 16),
    material,
  );
  coin.rotation.z = Math.PI / 2;
  coin.castShadow = true;
  return coin;
}

export function setObjectOpacity(object: THREE.Object3D, opacity: number): void {
  object.traverse((candidate) => {
    if (!(candidate instanceof THREE.Mesh)) {
      return;
    }
    const materials = Array.isArray(candidate.material)
      ? candidate.material
      : [candidate.material];
    for (const material of materials) {
      material.transparent = opacity < 1;
      material.opacity = opacity;
      material.needsUpdate = true;
    }
  });
}

export function disposeObject(object: THREE.Object3D): void {
  object.traverse((candidate) => {
    if (!(candidate instanceof THREE.Mesh)) {
      return;
    }
    candidate.geometry.dispose();
    const materials = Array.isArray(candidate.material)
      ? candidate.material
      : [candidate.material];
    for (const material of materials) {
      material.dispose();
    }
  });
}

function createRoofArrow(): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(-0.12, -0.26);
  shape.lineTo(0.12, -0.26);
  shape.lineTo(0.12, 0.02);
  shape.lineTo(0.23, 0.02);
  shape.lineTo(0, 0.31);
  shape.lineTo(-0.23, 0.02);
  shape.lineTo(-0.12, 0.02);
  shape.closePath();

  const mesh = new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshBasicMaterial({
      color: parkingSceneColors.white,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = Math.PI;
  mesh.scale.setScalar(0.72);
  return mesh;
}

function createPickupSign(active: boolean): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(-0.26, -0.12);
  shape.lineTo(0.26, -0.12);
  shape.lineTo(0.26, 0.04);
  shape.lineTo(0.38, 0.04);
  shape.lineTo(0, 0.33);
  shape.lineTo(-0.38, 0.04);
  shape.lineTo(-0.26, 0.04);
  shape.closePath();

  const mesh = new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshBasicMaterial({
      color: active ? parkingSceneColors.pickup : parkingSceneColors.pickupInactive,
      transparent: true,
      opacity: active ? 0.96 : 0.55,
      side: THREE.DoubleSide,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = Math.PI;
  return mesh;
}

function standardMaterial(
  color: number,
  roughness: number,
  metalness: number,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function darken(color: number, factor: number): number {
  const source = new THREE.Color(color);
  source.multiplyScalar(factor);
  return source.getHex();
}
