import * as THREE from 'three';
import type { IslandBlueprint, IslandPoint } from '../domain/types.ts';
import { islandArt } from './art-direction.ts';
import type { IslandAtelier } from './atelier.ts';

export interface IslandLandscape { readonly root: THREE.Group; readonly water: THREE.MeshStandardMaterial;
  readonly foam: THREE.MeshBasicMaterial; readonly time: { value: number } }

export function createLandscape(blueprint: IslandBlueprint): IslandLandscape {
  const root = new THREE.Group();
  const shape = islandShape(blueprint.coastline);
  const sandGeometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.4, bevelEnabled: true, bevelSegments: 3, bevelSize: 0.13, bevelThickness: 0.1,
  });
  sandGeometry.rotateX(-Math.PI / 2);
  const sand = new THREE.Mesh(sandGeometry,
    new THREE.MeshStandardMaterial({ color: blueprint.palette.sand, roughness: 1 }));
  sand.position.y = -0.46;
  sand.receiveShadow = true;
  const grassGeometry = new THREE.ShapeGeometry(shape);
  grassGeometry.rotateX(-Math.PI / 2);
  const grass = new THREE.Mesh(grassGeometry,
    new THREE.MeshStandardMaterial({ color: blueprint.palette.grass, roughness: 1 }));
  grass.position.y = islandArt.ground;
  grass.scale.set(0.91, 1, 0.91);
  grass.receiveShadow = true;
  const water = new THREE.MeshStandardMaterial({ color: blueprint.palette.ocean,
    roughness: 0.35, metalness: 0.08 });
  const time = { value: 0 };
  decorateWater(water, time);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), water);
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -0.32;
  const foam = new THREE.MeshBasicMaterial({ color: islandArt.palette.foam, transparent: true,
    opacity: 0.48, depthWrite: false, side: THREE.DoubleSide });
  const shore = new THREE.Mesh(shoreGeometry(blueprint.coastline), foam);
  shore.name = islandArt.names.shore;
  shore.position.y = -0.29;
  root.add(sea, shore, sand, grass);
  return { root, water, foam, time };
}

/** Shape coordinates use -Z because the flat shape is rotated by -PI/2. */
function islandShape(coastline: ReadonlyArray<number>): THREE.Shape {
  const points = coastline.map((radius, index) => {
    const angle = index / coastline.length * Math.PI * 2;
    return new THREE.Vector2(Math.cos(angle) * radius, -Math.sin(angle) * radius);
  });
  return new THREE.Shape(points);
}

function shoreGeometry(coastline: ReadonlyArray<number>): THREE.BufferGeometry {
  const vertices: number[] = [];
  const indices: number[] = [];
  coastline.forEach((radius, index) => {
    const angle = index / coastline.length * Math.PI * 2;
    for (const scale of [1.005, 1.065]) vertices.push(Math.cos(angle) * radius * scale, 0,
      Math.sin(angle) * radius * scale);
    const next = (index + 1) % coastline.length * 2;
    indices.push(index * 2, next, index * 2 + 1, next, next + 1, index * 2 + 1);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function decorateWater(material: THREE.MeshStandardMaterial, time: { value: number }): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.islandTime = time;
    shader.vertexShader = `varying vec2 islandWaterPosition;\n${shader.vertexShader}`
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nislandWaterPosition = position.xy;');
    shader.fragmentShader = `uniform float islandTime; varying vec2 islandWaterPosition;\n${shader.fragmentShader}`
      .replace('#include <color_fragment>', `#include <color_fragment>
        float wave = sin(islandWaterPosition.x * 2.8 + islandTime)
          * sin(islandWaterPosition.y * 4.2 - islandTime * 0.7);
        float glint = smoothstep(0.94, 1.0, wave);
        diffuseColor.rgb += glint * 0.075 + wave * 0.012;`);
  };
  material.customProgramCacheKey = () => 'island-water-v1';
}

const villagePaths = { crossroads: { x: 1.2, z: 0.8 }, houseBypass: 2.6,
  doorOffset: 1.65, step: 0.32, width: 0.83, thickness: 0.008, elevation: 0.007 } as const;

export function addVillagePaths(a: IslandAtelier, root: THREE.Group, blueprint: IslandBlueprint): void {
  const crossroads: IslandPoint = villagePaths.crossroads;
  const routes: IslandPoint[][] = [
    [crossroads, blueprint.playerSpawn],
    [crossroads, { x: blueprint.house.x + Math.sin(blueprint.house.rotation) * villagePaths.doorOffset,
      z: blueprint.house.z + Math.cos(blueprint.house.rotation) * villagePaths.doorOffset }],
    [crossroads, blueprint.activityZone],
    ...blueprint.portals.map((portal) => portal.x < blueprint.house.x
      ? [crossroads, { x: blueprint.house.x - villagePaths.houseBypass, z: crossroads.z },
        { x: blueprint.house.x - villagePaths.houseBypass, z: portal.z }, portal]
      : [crossroads, portal]),
  ];
  for (const route of routes) for (let segment = 1; segment < route.length; segment += 1) {
    const origin = route[segment - 1];
    const destination = route[segment];
    if (origin === undefined || destination === undefined) continue;
    const distance = Math.hypot(destination.x - origin.x, destination.z - origin.z);
    const count = Math.ceil(distance / villagePaths.step);
    for (let step = 0; step <= count; step += 1) {
      const t = count === 0 ? 0 : step / count;
      const x = THREE.MathUtils.lerp(origin.x, destination.x, t);
      const z = THREE.MathUtils.lerp(origin.z, destination.z, t);
      const disc = a.part(root, islandArt.palette.path, [villagePaths.width, villagePaths.thickness, villagePaths.width],
        [x, islandArt.ground + villagePaths.elevation, z], 'cylinder');
      disc.castShadow = false;
    }
  }
}
