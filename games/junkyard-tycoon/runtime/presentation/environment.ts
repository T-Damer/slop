import * as THREE from 'three';

import {
  junkyardSceneColors,
  junkyardSceneLayout,
} from './registry.ts';

const environmentGeometry = {
  fencePostCount: 15,
  fencePostSpacing: 0.85,
  fenceHeight: 0.76,
  fenceRailLength: 12.4,
  fenceZ: 5.6,
  sideFenceX: -6,
  barrelCount: 5,
  crateCount: 5,
} as const;

export function createJunkyardEnvironment(
  decorationDensity: number,
): THREE.Group {
  const root = new THREE.Group();
  root.add(createGround(), createRoad(), createFences());
  addLaneMarkings(root);
  addDecoration(root, decorationDensity);
  return root;
}

function createGround(): THREE.Mesh {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(
      junkyardSceneLayout.groundSize,
      junkyardSceneLayout.groundSize,
    ),
    new THREE.MeshStandardMaterial({
      color: junkyardSceneColors.sand,
      roughness: 1,
    }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.04;
  ground.receiveShadow = true;
  return ground;
}

function createRoad(): THREE.Mesh {
  const road = new THREE.Mesh(
    new THREE.BoxGeometry(
      junkyardSceneLayout.roadWidth,
      0.08,
      junkyardSceneLayout.roadDepth,
    ),
    new THREE.MeshStandardMaterial({
      color: junkyardSceneColors.road,
      roughness: 0.96,
    }),
  );
  road.position.set(junkyardSceneLayout.roadX, 0, 0);
  road.receiveShadow = true;
  return road;
}

function createFences(): THREE.Group {
  const root = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: junkyardSceneColors.fence,
    roughness: 0.92,
  });
  for (let index = 0; index < environmentGeometry.fencePostCount; index += 1) {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, environmentGeometry.fenceHeight, 0.12),
      material,
    );
    post.position.set(
      -5.9 + index * environmentGeometry.fencePostSpacing,
      environmentGeometry.fenceHeight / 2,
      environmentGeometry.fenceZ,
    );
    post.castShadow = true;
    root.add(post);
  }
  for (const y of [0.28, 0.62]) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(
        environmentGeometry.fenceRailLength,
        0.1,
        0.1,
      ),
      material,
    );
    rail.position.set(0, y, environmentGeometry.fenceZ);
    rail.castShadow = true;
    root.add(rail);
  }
  return root;
}

function addLaneMarkings(root: THREE.Group): void {
  const material = new THREE.MeshBasicMaterial({
    color: junkyardSceneColors.roadMarking,
  });
  for (let index = 0; index < junkyardSceneLayout.laneMarkCount; index += 1) {
    const marking = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.014, 0.9),
      material,
    );
    marking.position.set(
      junkyardSceneLayout.roadX,
      0.052,
      -8.2 + index * junkyardSceneLayout.laneMarkSpacing,
    );
    root.add(marking);
  }
}

function addDecoration(root: THREE.Group, density: number): void {
  const barrelMaterial = new THREE.MeshStandardMaterial({
    color: junkyardSceneColors.junkRust,
    roughness: 0.9,
  });
  const crateMaterial = new THREE.MeshStandardMaterial({
    color: junkyardSceneColors.crate,
    roughness: 0.94,
  });
  const barrelCount = scaledCount(environmentGeometry.barrelCount, density);
  const crateCount = scaledCount(environmentGeometry.crateCount, density);
  for (let index = 0; index < barrelCount; index += 1) {
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.3, 0.72, 12),
      barrelMaterial,
    );
    barrel.position.set(-5.2 + index * 0.64, 0.36, 4.8);
    barrel.rotation.z = index % 2 === 0 ? 0 : 0.08;
    barrel.castShadow = true;
    root.add(barrel);
  }
  for (let index = 0; index < crateCount; index += 1) {
    const crate = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.58, 0.58),
      crateMaterial,
    );
    crate.position.set(-5.15 + index * 0.7, 0.29, 3.95);
    crate.rotation.y = index * 0.16;
    crate.castShadow = true;
    root.add(crate);
  }
}

function scaledCount(total: number, density: number): number {
  return Math.max(1, Math.min(total, Math.ceil(total * density)));
}
