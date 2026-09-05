import * as THREE from 'three';
import type { IslandBlueprint, IslandPlacement, IslandPortalPlacement } from '../domain/types.ts';
import type { IslandAtelier } from './atelier.ts';
import { islandArt } from './art-direction.ts';

export function placeIslandObject(group: THREE.Group, placement: IslandPlacement): THREE.Group {
  group.position.set(placement.x, islandArt.ground, placement.z);
  group.rotation.y = placement.rotation;
  group.scale.setScalar(placement.scale);
  return group;
}

export function createIslandHouse(a: IslandAtelier, blueprint: IslandBlueprint): THREE.Group {
  const root = new THREE.Group();
  const p = islandArt.palette;
  a.part(root, p.cream, [2.5, 1.65, 2.1], [0, 0.84, 0], 'round');
  a.part(root, p.timber, [2.58, 0.16, 2.18], [0, 0.15, 0], 'round');
  for (const side of [-1, 1]) {
    a.part(root, p.timber, [0.13, 1.55, 0.12], [side * 1.18, 0.88, 1.045], 'round');
    const roof = a.part(root, blueprint.palette.roof, [1.72, 0.16, 2.65], [side * 0.68, 2, 0], 'round');
    roof.rotation.z = side * -0.57;
    for (let tile = 0; tile < 7; tile += 1) {
      const seam = a.part(root, blueprint.palette.roof, [1.74, 0.07, 0.11],
        [side * 0.68, 2.09, (tile - 3) * 0.37], 'round');
      seam.rotation.z = side * -0.57;
    }
    a.part(root, p.timber, [0.65, 0.7, 0.11], [side * 0.77, 1.02, 1.08], 'round');
    const glass = a.part(root, p.window, [0.49, 0.53, 0.12], [side * 0.77, 1.03, 1.13], 'round');
    const material = a.material(p.window);
    material.emissive.setHex(p.window);
    material.emissiveIntensity = 0.5;
    glass.castShadow = false;
    a.part(root, p.cream, [0.035, 0.54, 0.04], [side * 0.77, 1.03, 1.205], 'box');
    a.part(root, p.cream, [0.5, 0.035, 0.04], [side * 0.77, 1.03, 1.207], 'box');
    a.part(root, p.timber, [0.74, 0.16, 0.3], [side * 0.77, 0.64, 1.2], 'round');
  }
  a.part(root, p.darkWood, [0.66, 1.17, 0.13], [0, 0.68, 1.12], 'round');
  a.part(root, p.timber, [0.5, 1.01, 0.07], [0, 0.69, 1.2], 'round');
  a.part(root, p.pollen, [0.065, 0.065, 0.065], [0.15, 0.66, 1.25]);
  a.part(root, p.cream, [0.88, 0.14, 0.5], [0, 0.08, 1.23], 'round');
  a.part(root, p.timber, [0.36, 0.68, 0.4], [0.78, 2.25, -0.6], 'round');
  a.part(root, p.darkWood, [0.46, 0.13, 0.5], [0.78, 2.61, -0.6], 'round');
  addGables(a, root);
  return placeIslandObject(root, blueprint.house);
}

function addGables(a: IslandAtelier, root: THREE.Group): void {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -1.25, 1.55, 1.04, 1.25, 1.55, 1.04, 0, 2.44, 1.04,
    1.25, 1.55, -1.04, -1.25, 1.55, -1.04, 0, 2.44, -1.04,
  ], 3));
  geometry.computeVertexNormals();
  const gables = new THREE.Mesh(geometry, a.material(islandArt.palette.cream));
  gables.castShadow = true;
  root.add(gables);
}

export function createIslandTree(a: IslandAtelier, placement: IslandPlacement, season: string): THREE.Group {
  const root = new THREE.Group();
  const p = islandArt.palette;
  const winter = season === 'winter';
  const color = season === 'autumn' ? p.leafAutumn : winter ? 0xc7dac7 : p.leafLight;
  a.part(root, p.timber, [0.29, 1.32, 0.29], [0, 0.69, 0], 'cylinder');
  for (const side of [-1, 1]) {
    const branch = a.part(root, p.timber, [0.13, 0.75, 0.13], [side * 0.2, 1.07, 0], 'cylinder');
    branch.rotation.z = side * -0.62;
    a.part(root, color, [1.2, 1.12, 1.24], [side * 0.39, 1.66, 0]);
  }
  a.part(root, color, [1.34, 1.27, 1.3], [0, 2.14, 0]);
  a.part(root, winter ? 0xeaf0de : color, [1.06, 0.96, 1.13], [0, 1.74, 0.38]);
  return placeIslandObject(root, placement);
}

export function createTreeFruit(a: IslandAtelier, placement: IslandPlacement): THREE.Group {
  const root = new THREE.Group();
  for (const [x, y, z] of [[-0.55, 1.6, 0.45], [0.5, 1.82, 0.42], [0.07, 2.28, 0.55]]) {
    a.part(root, islandArt.palette.apple, [0.24, 0.25, 0.24], [x ?? 0, y ?? 0, z ?? 0]);
  }
  return placeIslandObject(root, placement);
}

export function createGardenFlower(a: IslandAtelier, color: number): THREE.Group {
  const root = new THREE.Group();
  a.part(root, islandArt.palette.leaf, [0.035, 0.32, 0.035], [0, 0.16, 0], 'cylinder');
  a.part(root, islandArt.palette.leafLight, [0.22, 0.065, 0.1], [0.07, 0.13, 0]);
  for (let petal = 0; petal < 5; petal += 1) {
    const angle = petal / 5 * Math.PI * 2;
    a.part(root, color, [0.16, 0.07, 0.16], [Math.cos(angle) * 0.085, 0.34, Math.sin(angle) * 0.085]);
  }
  a.part(root, islandArt.palette.pollen, [0.085, 0.065, 0.085], [0, 0.37, 0]);
  return root;
}

export function createIslandPortal(a: IslandAtelier, portal: IslandPortalPlacement): THREE.Group {
  const root = new THREE.Group();
  const p = islandArt.palette;
  a.part(root, p.path, [1.65, 0.12, 1.65], [0, 0, 0], 'cylinder');
  a.part(root, p.timber, [0.11, 1.02, 0.11], [0, 0.5, -0.48], 'round');
  a.part(root, p.cream, [1.45, 0.62, 0.15], [0, 1.04, -0.48], 'round');
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.025, 6, 48),
    new THREE.MeshStandardMaterial({ color: portal.color, emissive: portal.color, emissiveIntensity: 1.2 }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.08;
  root.add(ring);
  root.userData.ring = ring;
  root.position.set(portal.x, islandArt.ground, portal.z);
  return root;
}

export function createPortalLabel(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (context !== null) {
    context.fillStyle = '#504c3e';
    context.font = '700 38px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width - 16);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthWrite: false }));
  sprite.scale.set(1.42, 0.355, 1);
  sprite.position.set(0, 1.06, -0.34);
  return sprite;
}

/** Release sprites and canvas textures as well as geometry, once per resource. */
export function disposeIslandObject(root: THREE.Object3D): void {
  const resources = new Set<{ dispose(): void }>();
  root.traverse((object) => {
    if (object instanceof THREE.InstancedMesh) resources.add(object);
    if (object instanceof THREE.Mesh) resources.add(object.geometry);
    if (!(object instanceof THREE.Mesh) && !(object instanceof THREE.Sprite)) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      resources.add(material);
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) resources.add(value);
    }
  });
  for (const resource of resources) resource.dispose();
}
