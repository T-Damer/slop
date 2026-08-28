import * as THREE from 'three';

import type { WalkWorldDefinition } from '../domain/types.ts';
import type { WorldQualityProfile } from './quality.ts';

const worldEnvironmentTuning = {
  groundPadding: 8,
  fogNear: 16,
  fogFar: 34,
  hemisphereSky: 0xfff3d4,
  hemisphereGround: 0x50636d,
  hemisphereIntensity: 2.1,
  sunColor: 0xffdfaa,
  sunIntensity: 3.2,
  sunX: -7,
  sunY: 12,
  sunZ: 5,
  shadowExtent: 12,
  shadowNear: 1,
  shadowFar: 34,
  shadowBias: -0.0004,
  groundY: -0.04,
} as const;

export interface WorldEnvironmentOptions {
  readonly scene: THREE.Scene;
  readonly root: THREE.Group;
  readonly definition: WalkWorldDefinition;
  readonly quality: WorldQualityProfile;
  readonly backgroundColor: number;
  readonly fogColor: number;
  readonly groundColor: number;
  readonly decorate: (root: THREE.Group, density: number) => void;
}

export function configureWorldEnvironment(
  options: WorldEnvironmentOptions,
): void {
  options.scene.background = new THREE.Color(options.backgroundColor);
  options.scene.fog = new THREE.Fog(
    options.fogColor,
    worldEnvironmentTuning.fogNear,
    worldEnvironmentTuning.fogFar,
  );
  options.scene.add(options.root);
  options.root.add(createGround(options));
  options.scene.add(createHemisphereLight(), createSun(options.quality));
  options.decorate(options.root, options.quality.decorationDensity);
}

function createGround(options: WorldEnvironmentOptions): THREE.Mesh {
  const bounds = options.definition.bounds;
  const width = bounds.maximumX - bounds.minimumX
    + worldEnvironmentTuning.groundPadding;
  const depth = bounds.maximumZ - bounds.minimumZ
    + worldEnvironmentTuning.groundPadding;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshStandardMaterial({
      color: options.groundColor,
      roughness: 0.98,
    }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = worldEnvironmentTuning.groundY;
  ground.receiveShadow = true;
  return ground;
}

function createHemisphereLight(): THREE.HemisphereLight {
  return new THREE.HemisphereLight(
    worldEnvironmentTuning.hemisphereSky,
    worldEnvironmentTuning.hemisphereGround,
    worldEnvironmentTuning.hemisphereIntensity,
  );
}

function createSun(quality: WorldQualityProfile): THREE.DirectionalLight {
  const sun = new THREE.DirectionalLight(
    worldEnvironmentTuning.sunColor,
    worldEnvironmentTuning.sunIntensity,
  );
  sun.position.set(
    worldEnvironmentTuning.sunX,
    worldEnvironmentTuning.sunY,
    worldEnvironmentTuning.sunZ,
  );
  sun.castShadow = quality.shadows;
  sun.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
  sun.shadow.camera.left = -worldEnvironmentTuning.shadowExtent;
  sun.shadow.camera.right = worldEnvironmentTuning.shadowExtent;
  sun.shadow.camera.top = worldEnvironmentTuning.shadowExtent;
  sun.shadow.camera.bottom = -worldEnvironmentTuning.shadowExtent;
  sun.shadow.camera.near = worldEnvironmentTuning.shadowNear;
  sun.shadow.camera.far = worldEnvironmentTuning.shadowFar;
  sun.shadow.bias = worldEnvironmentTuning.shadowBias;
  return sun;
}
