import * as THREE from 'three';

import {
  trafficLocations,
  type TrafficLocation,
} from '../domain/registry.ts';
import {
  parkingLayout,
  parkingLocationThemes,
  parkingSceneColors,
} from './registry.ts';

const parkingLocationGeometry = {
  cityBuildingPositions: [
    [-5.6, 5.4, 1.4, 2.4, 1.8],
    [-5.7, 2.7, 1.7, 3.1, 1.5],
    [-5.7, -0.2, 1.5, 2.1, 1.7],
    [5.7, 5.2, 1.5, 2.8, 1.7],
    [5.7, 2.2, 1.8, 3.4, 1.5],
    [5.7, -0.9, 1.4, 2.4, 1.8],
    [-3.5, 7.4, 2.1, 2.9, 1.4],
    [0, 7.7, 2.2, 3.6, 1.7],
    [3.6, 7.4, 2.0, 2.7, 1.5],
  ],
  beachPalmPositions: [
    [-5.2, 5.8, 0.92],
    [-5.4, 2.2, 0.78],
    [5.4, 5.1, 0.86],
    [5.4, 1.6, 0.74],
    [-4.7, -1.8, 0.72],
    [4.8, -1.9, 0.72],
    [0, 7.5, 0.82],
  ],
  beachUmbrellaPositions: [
    [-4.3, 6.2, 0],
    [-2.1, 7.3, 1],
    [1.8, 7.5, 2],
    [4.2, 6.1, 3],
    [5.1, 3.4, 0],
  ],
  oceanWidth: 30,
  oceanDepth: 9,
  oceanZ: 11.2,
  oceanY: -0.035,
  waveCount: 8,
  waveSpacing: 0.72,
  waveWidth: 18,
  waveDepth: 0.08,
  buildingWindowColumns: 3,
  buildingWindowRows: 4,
  buildingWindowInset: 0.012,
  buildingWindowWidthRatio: 0.17,
  buildingWindowHeight: 0.18,
  buildingWindowSpacingX: 0.25,
  buildingWindowSpacingY: 0.42,
} as const;

export function createParkingLocationDecorations(
  location: TrafficLocation,
): THREE.Group {
  return location === trafficLocations.beach
    ? createBeachDecorations()
    : createCityDecorations();
}

function createCityDecorations(): THREE.Group {
  const root = new THREE.Group();
  parkingLocationGeometry.cityBuildingPositions.forEach(
    ([x, z, width, height, depth], index) => {
      const color = parkingSceneColors.cityBuildingPalette[
        index % parkingSceneColors.cityBuildingPalette.length
      ]!;
      const building = createBuilding(width, height, depth, color);
      building.position.set(x, 0, z);
      root.add(building);
    },
  );

  const sidewalkMaterial = new THREE.MeshStandardMaterial({
    color: parkingLocationThemes[trafficLocations.city].concrete,
    roughness: 0.96,
  });
  const sideWalks = [
    new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 13.4), sidewalkMaterial),
    new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 13.4), sidewalkMaterial),
    new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.08, 1.25), sidewalkMaterial),
  ];
  sideWalks[0]!.position.set(-4.95, 0.01, 2.2);
  sideWalks[1]!.position.set(4.95, 0.01, 2.2);
  sideWalks[2]!.position.set(0, 0.01, 7.0);
  for (const sidewalk of sideWalks) {
    sidewalk.receiveShadow = true;
    root.add(sidewalk);
  }
  return root;
}

function createBeachDecorations(): THREE.Group {
  const root = new THREE.Group();
  const theme = parkingLocationThemes[trafficLocations.beach];

  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(
      parkingLocationGeometry.oceanWidth,
      parkingLocationGeometry.oceanDepth,
    ),
    new THREE.MeshStandardMaterial({
      color: theme.water,
      roughness: 0.34,
      metalness: 0.04,
      transparent: true,
      opacity: 0.9,
    }),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(
    0,
    parkingLocationGeometry.oceanY,
    parkingLocationGeometry.oceanZ,
  );
  ocean.receiveShadow = true;
  root.add(ocean);

  const foamMaterial = new THREE.MeshBasicMaterial({
    color: parkingSceneColors.beachFoam,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  for (
    let waveIndex = 0;
    waveIndex < parkingLocationGeometry.waveCount;
    waveIndex += 1
  ) {
    const wave = new THREE.Mesh(
      new THREE.PlaneGeometry(
        parkingLocationGeometry.waveWidth - waveIndex * 0.55,
        parkingLocationGeometry.waveDepth,
      ),
      foamMaterial,
    );
    wave.rotation.x = -Math.PI / 2;
    wave.position.set(
      Math.sin(waveIndex * 1.7) * 0.45,
      parkingLocationGeometry.oceanY + 0.012,
      parkingLocationGeometry.oceanZ
        - parkingLocationGeometry.oceanDepth / 2
        + waveIndex * parkingLocationGeometry.waveSpacing,
    );
    root.add(wave);
  }

  for (const [x, z, scale] of parkingLocationGeometry.beachPalmPositions) {
    const palm = createPalmTree(scale);
    palm.position.set(x, 0, z);
    root.add(palm);
  }

  for (const [x, z, paletteIndex] of parkingLocationGeometry.beachUmbrellaPositions) {
    const color = parkingSceneColors.beachUmbrellaPalette[
      paletteIndex % parkingSceneColors.beachUmbrellaPalette.length
    ]!;
    const umbrella = createBeachUmbrella(color);
    umbrella.position.set(x, 0, z);
    root.add(umbrella);
  }

  return root;
}

function createBuilding(
  width: number,
  height: number,
  depth: number,
  color: number,
): THREE.Group {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.88,
      metalness: 0.01,
    }),
  );
  body.position.y = height / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.08, 0.12, depth + 0.08),
    new THREE.MeshStandardMaterial({
      color: darken(color, 0.76),
      roughness: 0.92,
    }),
  );
  roof.position.y = height + 0.06;
  roof.castShadow = true;
  group.add(roof);

  const windowMaterial = new THREE.MeshBasicMaterial({
    color: parkingSceneColors.cityWindow,
    transparent: true,
    opacity: 0.76,
  });
  for (
    let row = 0;
    row < parkingLocationGeometry.buildingWindowRows;
    row += 1
  ) {
    for (
      let column = 0;
      column < parkingLocationGeometry.buildingWindowColumns;
      column += 1
    ) {
      const window = new THREE.Mesh(
        new THREE.PlaneGeometry(
          width * parkingLocationGeometry.buildingWindowWidthRatio,
          parkingLocationGeometry.buildingWindowHeight,
        ),
        windowMaterial,
      );
      window.position.set(
        (column - 1) * width * parkingLocationGeometry.buildingWindowSpacingX,
        0.48 + row * parkingLocationGeometry.buildingWindowSpacingY,
        depth / 2 + parkingLocationGeometry.buildingWindowInset,
      );
      group.add(window);
    }
  }
  return group;
}

function createPalmTree(scale: number): THREE.Group {
  const group = new THREE.Group();
  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: parkingSceneColors.beachPalmTrunk,
    roughness: 0.93,
  });
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(
      0.1 * scale,
      0.17 * scale,
      1.8 * scale,
      8,
    ),
    trunkMaterial,
  );
  trunk.position.y = 0.9 * scale;
  trunk.rotation.z = 0.08;
  trunk.castShadow = true;
  group.add(trunk);

  const leafMaterial = new THREE.MeshStandardMaterial({
    color: parkingSceneColors.beachPalmLeaves,
    roughness: 0.86,
    side: THREE.DoubleSide,
  });
  for (let leafIndex = 0; leafIndex < 7; leafIndex += 1) {
    const leaf = new THREE.Mesh(
      new THREE.ConeGeometry(0.22 * scale, 1.25 * scale, 4),
      leafMaterial,
    );
    leaf.position.y = 1.82 * scale;
    leaf.rotation.z = Math.PI / 2.65;
    leaf.rotation.y = leafIndex * (Math.PI * 2 / 7);
    leaf.castShadow = true;
    group.add(leaf);
  }
  return group;
}

function createBeachUmbrella(color: number): THREE.Group {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.035, 1.12, 8),
    new THREE.MeshStandardMaterial({
      color: 0xe8dfc7,
      roughness: 0.76,
    }),
  );
  pole.position.y = 0.56;
  pole.castShadow = true;
  group.add(pole);

  const canopy = new THREE.Mesh(
    new THREE.ConeGeometry(0.62, 0.28, 12, 1, true),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.74,
      side: THREE.DoubleSide,
    }),
  );
  canopy.position.y = 1.15;
  canopy.rotation.y = 0.18;
  canopy.castShadow = true;
  group.add(canopy);
  return group;
}

function darken(color: number, factor: number): number {
  const source = new THREE.Color(color);
  source.multiplyScalar(factor);
  return source.getHex();
}
