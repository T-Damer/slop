import * as THREE from 'three';
import type { IslandAnimalId } from '../domain/types.ts';
import { islandArt } from './art-direction.ts';
import type { IslandAtelier } from './atelier.ts';

export function createResident(atelier: IslandAtelier, shirt: number): THREE.Group {
  const root = new THREE.Group();
  const p = islandArt.palette;
  const body = islandArt.character;
  atelier.part(root, shirt, body.torso, [0, body.torsoY, 0], 'round');
  atelier.part(root, p.skin, body.head, [0, body.headY, 0]);
  atelier.part(root, p.hair, [0.7, 0.4, 0.65], [0, 1.24, -0.035]);
  for (const side of [-1, 1]) {
    atelier.part(root, p.hair, [0.23, 0.28, 0.1], [side * 0.23, 1.2, 0.24]);
    atelier.part(root, p.skin, [0.13, 0.18, 0.16], [side * 0.34, 1.03, 0]);
    atelier.part(root, p.blush, [0.12, 0.065, 0.022], [side * 0.2, 0.94, 0.273]);
    createLimb(atelier, root, side, false);
    createLimb(atelier, root, side, true);
  }
  addFace(atelier, root, 1.03, 0.295, 0.12);
  atelier.part(root, p.sole, [0.075, 0.075, 0.02], [0, 0.7, 0.18]);
  return root;
}

export function createLimb(atelier: IslandAtelier, root: THREE.Group, side: number, arm: boolean, skin: number = islandArt.palette.skin): void {
  const p = islandArt.palette;
  const body = islandArt.character;
  const pivot = new THREE.Group();
  pivot.name = arm ? (side < 0 ? islandArt.names.leftArm : islandArt.names.rightArm)
    : side < 0 ? islandArt.names.leftLeg : islandArt.names.rightLeg;
  pivot.position.set(side * (arm ? body.shoulderX : body.hipX), arm ? body.shoulderY : body.hipY, 0);
  atelier.part(pivot, arm ? skin : 0x576c78, arm ? body.arm : body.leg,
    [0, arm ? -0.12 : -0.1, 0], 'round');
  if (!arm) {
    atelier.part(pivot, p.timber, body.shoe, [0, -0.28, 0.035], 'round');
    atelier.part(pivot, p.sole, [0.18, 0.035, 0.27], [0, -0.33, 0.035], 'round');
  }
  root.add(pivot);
}

export function addFace(atelier: IslandAtelier, root: THREE.Group, y: number, z: number, spacing: number): void {
  const eyes = new THREE.Group();
  eyes.name = islandArt.names.eyes;
  eyes.position.y = y;
  for (const side of [-1, 1]) {
    atelier.part(eyes, islandArt.palette.ink, [0.074, 0.108, 0.035], [side * spacing, 0.02, z]);
    atelier.part(eyes, 0xffffff, [0.025, 0.032, 0.01], [side * spacing - 0.01, 0.045, z + 0.019]);
  }
  root.add(eyes);
  atelier.part(root, islandArt.palette.skin, [0.065, 0.06, 0.06], [0, y - 0.05, z]);
  atelier.part(root, islandArt.palette.ink, [0.08, 0.018, 0.018], [0, y - 0.13, z - 0.005]);
}

const animalColors: Record<IslandAnimalId, number> = {
  cat: 0xdaa065, dog: 0xb88763, rabbit: 0xeee2d3, raccoon: 0x9a8b7c, fox: 0xd48951, duck: 0xf1d780,
};

export function createCompanion(atelier: IslandAtelier, species: IslandAnimalId): THREE.Group {
  const root = new THREE.Group();
  const color = animalColors[species];
  atelier.part(root, color, [0.55, 0.53, 0.64], [0, 0.32, 0]);
  atelier.part(root, color, [0.61, 0.53, 0.52], [0, 0.68, 0.16]);
  atelier.part(root, islandArt.palette.cream, [0.32, 0.26, 0.055], [0, 0.58, 0.406]);
  if (species === 'raccoon') atelier.part(root, 0x5b5556, [0.49, 0.15, 0.04], [0, 0.73, 0.406]);
  for (const side of [-1, 1]) {
    if (species !== 'duck') {
      const rabbit = species === 'rabbit';
      const dog = species === 'dog';
      const ear = atelier.part(root, color, [dog ? 0.16 : 0.18, rabbit ? 0.5 : dog ? 0.36 : 0.23, 0.17],
        [side * 0.21, dog ? 0.7 : rabbit ? 1.07 : 0.97, 0.15], dog || rabbit ? 'sphere' : 'cone');
      ear.rotation.z = side * (dog ? 0.25 : -0.15);
    }
    atelier.part(root, species === 'duck' ? 0xeaa457 : islandArt.palette.cream,
      [0.15, 0.1, 0.24], [side * 0.17, 0.055, 0.13]);
  }
  addFace(atelier, root, 0.7, 0.422, 0.115);
  if (species === 'duck') atelier.part(root, 0xeaa457, [0.22, 0.075, 0.16], [0, 0.64, 0.44]);
  else atelier.part(root, species === 'fox' ? color : islandArt.palette.cream,
    [0.21, 0.3, 0.42], [0.12, 0.37, -0.39]);
  return root;
}

export function animateResident(root: THREE.Group, time: number, speed: number, reduced: boolean): void {
  const motion = islandArt.motion;
  const phase = time * (speed > 3 ? motion.runFrequency : motion.walkFrequency);
  const moving = speed > 0.05;
  const swing = moving ? Math.sin(phase) * motion.stride * Math.min(1, speed) : 0;
  for (const [name, value] of [[islandArt.names.leftLeg, swing], [islandArt.names.rightLeg, -swing],
    [islandArt.names.leftArm, -swing], [islandArt.names.rightArm, swing]] as const) {
    const limb = root.getObjectByName(name);
    if (limb !== undefined) limb.rotation.x = value;
  }
  root.position.y = islandArt.ground + (moving ? Math.abs(Math.sin(phase)) * motion.bounce
    : reduced ? 0 : Math.sin(time * 2) * motion.idle);
  const eyes = root.getObjectByName(islandArt.names.eyes);
  if (eyes !== undefined) eyes.scale.y = !reduced && time % motion.blinkPeriod < motion.blinkDuration ? 0.12 : 1;
}
