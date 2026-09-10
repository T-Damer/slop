import * as THREE from 'three';

import { junkyardSceneColors } from './registry.ts';

const characterGeometry = {
  headRadius: 0.24,
  bodyWidth: 0.5,
  bodyHeight: 0.64,
  bodyDepth: 0.34,
  limbRadius: 0.09,
  armLength: 0.56,
  legLength: 0.5,
} as const;

export interface CharacterModel {
  readonly root: THREE.Group;
  readonly body: THREE.Mesh;
  readonly head: THREE.Mesh;
  readonly leftArm: THREE.Group;
  readonly rightArm: THREE.Group;
  readonly leftLeg: THREE.Group;
  readonly rightLeg: THREE.Group;
}

export function createPlayerModel(): CharacterModel {
  return createCharacter(
    junkyardSceneColors.playerShirt,
    junkyardSceneColors.playerOveralls,
    junkyardSceneColors.playerCap,
  );
}

export function createMechanicModel(): CharacterModel {
  const mechanic = createCharacter(
    junkyardSceneColors.mechanicShirt,
    junkyardSceneColors.mechanicOveralls,
    junkyardSceneColors.fence,
  );
  mechanic.root.scale.setScalar(0.96);
  return mechanic;
}

function createCharacter(
  shirtColor: number,
  overallColor: number,
  capColor: number,
): CharacterModel {
  const root = new THREE.Group();
  const body = createShadowMesh(
    new THREE.BoxGeometry(
      characterGeometry.bodyWidth,
      characterGeometry.bodyHeight,
      characterGeometry.bodyDepth,
    ),
    material(overallColor, 0.78),
  );
  body.position.y = 1.02;
  root.add(body);

  const shirt = createShadowMesh(
    new THREE.BoxGeometry(0.56, 0.34, 0.38),
    material(shirtColor, 0.76),
  );
  shirt.position.y = 1.27;
  root.add(shirt);

  const head = createShadowMesh(
    new THREE.SphereGeometry(characterGeometry.headRadius, 14, 10),
    material(junkyardSceneColors.playerSkin, 0.74),
  );
  head.position.y = 1.66;
  root.add(head);

  const cap = createShadowMesh(
    new THREE.CylinderGeometry(0.25, 0.27, 0.13, 14),
    material(capColor, 0.76),
  );
  cap.position.y = 1.88;
  cap.rotation.z = 0.04;
  root.add(cap);

  const leftArm = createLimb(-0.35, 1.35, characterGeometry.armLength);
  const rightArm = createLimb(0.35, 1.35, characterGeometry.armLength);
  const leftLeg = createLimb(-0.16, 0.62, characterGeometry.legLength);
  const rightLeg = createLimb(0.16, 0.62, characterGeometry.legLength);
  root.add(leftArm, rightArm, leftLeg, rightLeg);
  return { root, body, head, leftArm, rightArm, leftLeg, rightLeg };
}

function createLimb(x: number, y: number, length: number): THREE.Group {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, 0);
  const limb = createShadowMesh(
    new THREE.CapsuleGeometry(characterGeometry.limbRadius, length, 4, 8),
    material(junkyardSceneColors.playerSkin, 0.8),
  );
  limb.position.y = -length / 2;
  pivot.add(limb);
  return pivot;
}

function material(
  color: number,
  roughness: number,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness });
}

function createShadowMesh(
  geometry: THREE.BufferGeometry,
  meshMaterial: THREE.Material,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, meshMaterial);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
