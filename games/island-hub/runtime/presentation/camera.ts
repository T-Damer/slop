import * as THREE from 'three';
import { islandCameraModes } from '../domain/registry.ts';
import type { IslandCameraMode, IslandPoint } from '../domain/types.ts';
import { islandArt, islandCameraProfiles } from './art-direction.ts';

/** Fixed north-facing azimuth: screen-right is +X, screen-up is -Z in every mode. */
export class IslandCamera {
  public readonly camera = new THREE.PerspectiveCamera(islandArt.camera.fov, 1,
    islandArt.camera.near, islandArt.camera.far);
  private readonly focus = new THREE.Vector3();
  private modeIndex: number = islandArt.camera.initialMode;
  private distance: number = islandCameraProfiles.cozy;
  public get mode(): IslandCameraMode { return islandCameraModes[this.modeIndex] ?? 'cozy'; }
  public cycle(): IslandCameraMode {
    this.modeIndex = (this.modeIndex + 1) % islandCameraModes.length;
    return this.mode;
  }
  public resize(width: number, height: number): void {
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }
  public update(player: IslandPoint, delta: number, immediate = false): void {
    const blend = immediate ? 1 : 1 - Math.exp(-islandArt.camera.follow * delta);
    this.focus.x += (player.x - this.focus.x) * blend;
    this.focus.y = islandArt.camera.focusHeight;
    this.focus.z += (player.z - this.focus.z) * blend;
    const targetDistance = islandCameraProfiles[this.mode]
      * (this.camera.aspect < 1 ? islandArt.camera.portraitDistance : 1);
    this.distance += (targetDistance - this.distance) * blend;
    this.camera.position.set(this.focus.x, this.focus.y + Math.sin(islandArt.camera.elevation) * this.distance,
      this.focus.z + Math.cos(islandArt.camera.elevation) * this.distance);
    this.camera.lookAt(this.focus);
  }
}
