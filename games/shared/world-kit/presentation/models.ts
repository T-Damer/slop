import * as THREE from 'three';

const walkerGeometry = {
  bodyRadius: 0.28,
  bodyHeight: 0.58,
  headRadius: 0.22,
  limbRadius: 0.075,
  armLength: 0.48,
  legLength: 0.52,
  bodyY: 0.86,
  headY: 1.43,
  armY: 0.94,
  legY: 0.36,
  armX: 0.34,
  legX: 0.14,
  ringInnerRadius: 0.54,
  ringOuterRadius: 0.64,
} as const;

export interface WalkerVisual {
  readonly root: THREE.Group;
  readonly leftArm: THREE.Mesh;
  readonly rightArm: THREE.Mesh;
  readonly leftLeg: THREE.Mesh;
  readonly rightLeg: THREE.Mesh;
}

export function createWalkerVisual(
  shirtColor: number,
  accentColor: number,
): WalkerVisual {
  const root = new THREE.Group();
  const shirtMaterial = new THREE.MeshStandardMaterial({
    color: shirtColor,
    roughness: 0.78,
  });
  const skinMaterial = new THREE.MeshStandardMaterial({
    color: 0xf1bd91,
    roughness: 0.86,
  });
  const trouserMaterial = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.84,
  });

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(
      walkerGeometry.bodyRadius,
      walkerGeometry.bodyHeight,
      6,
      10,
    ),
    shirtMaterial,
  );
  body.position.y = walkerGeometry.bodyY;
  body.castShadow = true;
  root.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(walkerGeometry.headRadius, 14, 10),
    skinMaterial,
  );
  head.position.y = walkerGeometry.headY;
  head.castShadow = true;
  root.add(head);

  const leftArm = createLimb(skinMaterial, walkerGeometry.armLength);
  const rightArm = createLimb(skinMaterial, walkerGeometry.armLength);
  leftArm.position.set(-walkerGeometry.armX, walkerGeometry.armY, 0);
  rightArm.position.set(walkerGeometry.armX, walkerGeometry.armY, 0);
  root.add(leftArm, rightArm);

  const leftLeg = createLimb(trouserMaterial, walkerGeometry.legLength);
  const rightLeg = createLimb(trouserMaterial, walkerGeometry.legLength);
  leftLeg.position.set(-walkerGeometry.legX, walkerGeometry.legY, 0);
  rightLeg.position.set(walkerGeometry.legX, walkerGeometry.legY, 0);
  root.add(leftLeg, rightLeg);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 20),
    new THREE.MeshBasicMaterial({
      color: 0x0f1720,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  root.add(shadow);

  return { root, leftArm, rightArm, leftLeg, rightLeg };
}

export function createInteractionRing(color: number): THREE.Mesh {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(
      walkerGeometry.ringInnerRadius,
      walkerGeometry.ringOuterRadius,
      28,
    ),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.035;
  ring.visible = false;
  return ring;
}

export function setWorldObjectOpacity(object: THREE.Object3D, opacity: number): void {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) {
      material.transparent = opacity < 1;
      material.opacity = opacity;
    }
  });
}

export function disposeWorldObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }
    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) {
      material.dispose();
    }
  });
}

function createLimb(
  material: THREE.Material,
  length: number,
): THREE.Mesh {
  const limb = new THREE.Mesh(
    new THREE.CapsuleGeometry(walkerGeometry.limbRadius, length, 4, 8),
    material,
  );
  limb.castShadow = true;
  return limb;
}
