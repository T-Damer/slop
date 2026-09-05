import * as THREE from 'three';
import { voyageResidents, type VoyageResidentId } from '../domain/voyage-registry.ts';
import { islandArt } from './art-direction.ts';
import type { IslandAtelier } from './atelier.ts';
import { addFace, createLimb } from './residents.ts';

const look = { headY: 1.12, eyeY: 1.14, eyeZ: 0.337, spacing: 0.135,
  rabbitEar: 0.57, foxEar: 0.28, head: [0.78, 0.7, 0.68], body: [0.49, 0.49, 0.39] } as const;
export function createVillager(a: IslandAtelier, id: VoyageResidentId): THREE.Group {
  const root = new THREE.Group();
  const resident = voyageResidents[id];
  const p = islandArt.palette;
  a.part(root, resident.shirt, look.body, [0, 0.63, 0], 'round');
  a.part(root, resident.color, look.head, [0, look.headY, 0]);
  for (const side of [-1, 1]) {
    createLimb(a, root, side, false, resident.color);
    createLimb(a, root, side, true, resident.color);
    const rabbit = resident.species === 'rabbit';
    a.part(root, resident.color, [rabbit ? 0.19 : 0.25, rabbit ? look.rabbitEar : look.foxEar, 0.2],
      [side * 0.25, rabbit ? 1.67 : 1.51, -0.02], rabbit || resident.species === 'raccoon' ? 'sphere' : 'cone');
    a.part(root, p.blush, [0.11, rabbit ? 0.35 : 0.13, 0.045], [side * 0.25, rabbit ? 1.69 : 1.51, 0.088]);
    if (resident.species === 'raccoon') a.part(root, p.darkWood, [0.22, 0.18, 0.038], [side * look.spacing, 1.16, 0.328]);
    a.part(root, p.blush, [0.13, 0.07, 0.025], [side * 0.25, 1.05, 0.3]);
  }
  a.part(root, p.cream, [0.38, 0.24, 0.16], [0, 1.015, 0.27]);
  addFace(a, root, look.eyeY, look.eyeZ, look.spacing);
  a.part(root, p.ink, [0.074, 0.055, 0.056], [0, 1.087, 0.364]);
  const tail = a.part(root, resident.color, [0.25, resident.species === 'rabbit' ? 0.25 : 0.5, 0.28], [0.19, 0.5, -0.32]);
  tail.rotation.z = -0.6;
  a.part(root, p.cream, [0.3, 0.13, 0.04], [0, 0.85, 0.19], 'round');
  if (id === 'lumi') {
    a.part(root, resident.shirt, [0.61, 0.13, 0.58], [0, 1.47, 0], 'round');
    a.part(root, p.cream, [0.45, 0.035, 0.24], [0, 1.415, 0.29], 'round');
  } else if (id === 'mira') {
    a.part(root, p.pollen, [0.17, 0.08, 0.17], [0.29, 1.38, 0.2]);
    a.part(root, p.leaf, [0.14, 0.05, 0.09], [0.39, 1.38, 0.18]);
  } else a.part(root, p.timber, [0.21, 0.29, 0.1], [0.2, 0.61, 0.22], 'round');
  return root;
}
