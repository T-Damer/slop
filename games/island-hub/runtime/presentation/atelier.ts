import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { islandArt } from './art-direction.ts';

type Triple = readonly [number, number, number];
type Shape = 'round' | 'sphere' | 'cylinder' | 'cone' | 'box';

/** Per-world resource pool: no geometry/material is allocated in the animation loop. */
export class IslandAtelier {
  private readonly geometries = new Map<Shape, THREE.BufferGeometry>();
  private readonly materials = new Map<number, THREE.MeshStandardMaterial>();

  public part(parent: THREE.Object3D, color: number, size: Triple, position: Triple,
    shape: Shape = 'sphere'): THREE.Mesh {
    const mesh = new THREE.Mesh(this.geometry(shape), this.material(color));
    mesh.scale.set(...size);
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  public material(color: number): THREE.MeshStandardMaterial {
    let material = this.materials.get(color);
    if (material === undefined) {
      material = new THREE.MeshStandardMaterial({ color, roughness: 0.86 });
      this.materials.set(color, material);
    }
    return material;
  }

  public batch(group: THREE.Group): void {
    group.updateMatrixWorld(true);
    const batches = new Map<string, THREE.Mesh[]>();
    group.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || Array.isArray(object.material)) return;
      const key = object.geometry.uuid + object.material.uuid;
      const batch = batches.get(key) ?? [];
      batch.push(object);
      batches.set(key, batch);
    });
    for (const meshes of batches.values()) {
      const first = meshes[0];
      if (first === undefined) continue;
      const instances = new THREE.InstancedMesh(first.geometry, first.material, meshes.length);
      meshes.forEach((mesh, index) => {
        instances.setMatrixAt(index, mesh.matrixWorld);
        mesh.removeFromParent();
      });
      instances.castShadow = meshes.some((mesh) => mesh.castShadow);
      instances.receiveShadow = true;
      instances.computeBoundingSphere();
      group.add(instances);
    }
  }

  private geometry(shape: Shape): THREE.BufferGeometry {
    const cached = this.geometries.get(shape);
    if (cached !== undefined) return cached;
    const detail = islandArt.shape;
    const geometry = shape === 'sphere'
      ? new THREE.SphereGeometry(0.5, detail.sphereSegments, detail.sphereRows)
      : shape === 'cylinder' ? new THREE.CylinderGeometry(0.5, 0.5, 1, detail.cylinderSegments)
        : shape === 'cone' ? new THREE.ConeGeometry(0.5, 1, detail.cylinderSegments)
          : shape === 'round' ? new RoundedBoxGeometry(1, 1, 1, detail.roundSegments, detail.roundRadius)
            : new THREE.BoxGeometry(1, 1, 1);
    this.geometries.set(shape, geometry);
    return geometry;
  }
}
