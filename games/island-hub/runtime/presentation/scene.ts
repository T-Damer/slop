import * as THREE from 'three';

import { isPointInsideIsland } from '../domain/generator.ts';
import { islandCameraModes, islandRules } from '../domain/registry.ts';
import type {
  IslandBlueprint,
  IslandCameraMode,
  IslandDestinationId,
  IslandPortalProgress,
} from '../domain/types.ts';
import { createIslandMovementInput, type IslandMovementInput } from './input.ts';
import { createIslandWorld, type IslandWorldHandles } from './world.ts';

export interface IslandSceneCallbacks {
  readonly onPortalProgress: (progress: IslandPortalProgress) => void;
  readonly onLaunchGame: (destinationId: IslandDestinationId) => void;
}

export interface IslandSceneSnapshot {
  readonly player: { readonly x: number; readonly z: number };
  readonly cameraMode: IslandCameraMode;
  readonly portal: IslandPortalProgress;
  readonly renderer: { readonly calls: number; readonly triangles: number };
}

const cameraProfiles: Record<IslandCameraMode, {
  readonly position: readonly [number, number, number];
  readonly zoom: number;
}> = {
  cozy: { position: [8.2, 9.4, 10.5], zoom: 1.28 },
  standard: { position: [10.5, 12.8, 13.4], zoom: 1 },
  overview: { position: [13.5, 17.5, 16.5], zoom: 0.78 },
};

export class PersonalIslandScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera();
  private readonly world: IslandWorldHandles;
  private readonly input: IslandMovementInput;
  private animationFrame = 0;
  private lastFrameAt = 0;
  private cameraModeIndex = 1;
  private activePortal: IslandDestinationId | null = null;
  private portalProgress = 0;
  private disposed = false;

  public constructor(
    host: HTMLElement,
    inputRoot: HTMLElement,
    private readonly blueprint: IslandBlueprint,
    private readonly callbacks: IslandSceneCallbacks,
  ) {
    const canvas = document.createElement('canvas');
    canvas.className = 'island-canvas';
    canvas.setAttribute('aria-label', 'Личный остров SLOP');
    host.append(canvas);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene.background = new THREE.Color(blueprint.palette.sky);
    this.scene.fog = new THREE.Fog(blueprint.palette.sky, 22, 48);
    this.world = createIslandWorld(blueprint);
    this.scene.add(this.world.root);
    this.input = createIslandMovementInput(inputRoot);
    this.configureLights();
    this.applyCameraProfile(true);
    this.resize();
    window.addEventListener('resize', this.resize);
    this.animationFrame = window.requestAnimationFrame(this.renderFrame);
  }

  public cycleCamera(): IslandCameraMode {
    this.cameraModeIndex = (this.cameraModeIndex + 1) % islandCameraModes.length;
    this.applyCameraProfile(false);
    return this.cameraMode;
  }

  public snapshot(): IslandSceneSnapshot {
    return {
      player: { x: this.world.player.position.x, z: this.world.player.position.z },
      cameraMode: this.cameraMode,
      portal: { destinationId: this.activePortal, progress: this.portalProgress },
      renderer: {
        calls: this.renderer.info.render.calls,
        triangles: this.renderer.info.render.triangles,
      },
    };
  }

  public destroy(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    window.cancelAnimationFrame(this.animationFrame);
    window.removeEventListener('resize', this.resize);
    this.input.destroy();
    this.world.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private get cameraMode(): IslandCameraMode {
    return islandCameraModes[this.cameraModeIndex] ?? 'standard';
  }

  private readonly resize = (): void => {
    const canvas = this.renderer.domElement;
    const host = canvas.parentElement;
    if (host === null) {
      return;
    }
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    const aspect = width / height;
    const span = 15;
    this.camera.left = -span * aspect / 2;
    this.camera.right = span * aspect / 2;
    this.camera.top = span / 2;
    this.camera.bottom = -span / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  };

  private readonly renderFrame = (timestamp: number): void => {
    if (this.disposed) {
      return;
    }
    const deltaSeconds = Math.min(0.05, Math.max(0, (timestamp - this.lastFrameAt) / 1000));
    this.lastFrameAt = timestamp;
    this.updatePlayer(deltaSeconds, timestamp);
    this.updatePortals(deltaSeconds, timestamp);
    this.updateWorldMotion(timestamp);
    this.updateCamera(deltaSeconds);
    this.renderer.render(this.scene, this.camera);
    this.animationFrame = window.requestAnimationFrame(this.renderFrame);
  };

  private updatePlayer(deltaSeconds: number, timestamp: number): void {
    const movement = this.input.read();
    const moving = Math.hypot(movement.x, movement.z) > 0.01;
    if (moving) {
      const candidate = {
        x: this.world.player.position.x + movement.x * islandRules.playerSpeed * deltaSeconds,
        z: this.world.player.position.z + movement.z * islandRules.playerSpeed * deltaSeconds,
      };
      if (isPointInsideIsland(candidate, this.blueprint, 0.72)) {
        this.world.player.position.x = candidate.x;
        this.world.player.position.z = candidate.z;
      }
      this.world.player.rotation.y = Math.atan2(movement.x, movement.z);
    }
    animateCharacter(this.world.player, timestamp, moving);
    animateCharacter(this.world.guide, timestamp + 520, false);
    this.world.animal.position.y = 0.04 + Math.sin(timestamp * 0.0022) * 0.025;
  }

  private updatePortals(deltaSeconds: number, timestamp: number): void {
    const nearest = this.findNearestPortal();
    if (nearest === null || nearest.distance > islandRules.portalRadius) {
      this.setPortalProgress(null, 0);
    } else {
      const progress = Math.min(1, this.portalProgress + deltaSeconds / islandRules.portalHoldSeconds);
      this.setPortalProgress(nearest.destinationId, progress);
      if (progress >= 1) {
        this.portalProgress = 0;
        this.callbacks.onLaunchGame(nearest.destinationId);
      }
    }
    for (const [destinationId, portal] of this.world.portals) {
      const ring = portal.userData.ring;
      if (ring instanceof THREE.Object3D) {
        ring.rotation.z = timestamp * 0.0014;
        const active = destinationId === this.activePortal;
        const pulse = active ? 1 + Math.sin(timestamp * 0.012) * 0.11 : 1;
        ring.scale.setScalar(pulse);
      }
    }
  }

  private updateWorldMotion(timestamp: number): void {
    this.world.oceanMaterial.opacity = 0.88 + Math.sin(timestamp * 0.0011) * 0.035;
    this.world.shoreMaterial.opacity = 0.34 + Math.sin(timestamp * 0.0024) * 0.12;
    const scale = 1 + Math.sin(timestamp * 0.0017) * 0.014;
    const shore = this.world.root.children.find((child) => (
      child instanceof THREE.Mesh && child.material === this.world.shoreMaterial
    ));
    shore?.scale.setScalar(scale);
  }

  private updateCamera(deltaSeconds: number): void {
    const profile = cameraProfiles[this.cameraMode];
    const player = this.world.player.position;
    const target = new THREE.Vector3(
      player.x + profile.position[0],
      profile.position[1],
      player.z + profile.position[2],
    );
    const blend = 1 - Math.pow(0.008, deltaSeconds);
    this.camera.position.lerp(target, blend);
    this.camera.lookAt(player.x, 0.2, player.z);
  }

  private applyCameraProfile(immediate: boolean): void {
    const profile = cameraProfiles[this.cameraMode];
    this.camera.zoom = profile.zoom;
    this.camera.near = 0.1;
    this.camera.far = 90;
    this.camera.updateProjectionMatrix();
    if (immediate) {
      this.camera.position.set(...profile.position);
      this.camera.lookAt(0, 0.2, 0);
    }
    this.scene.add(this.camera);
  }

  private configureLights(): void {
    const hemisphere = new THREE.HemisphereLight(0xffffff, 0x5e8a74, 2.25);
    const sun = new THREE.DirectionalLight(0xfff1cc, 3.15);
    sun.position.set(-8, 15, -6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -14;
    sun.shadow.camera.right = 14;
    sun.shadow.camera.top = 14;
    sun.shadow.camera.bottom = -14;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 36;
    this.scene.add(hemisphere, sun);
  }

  private findNearestPortal(): {
    readonly destinationId: IslandDestinationId;
    readonly distance: number;
  } | null {
    let nearest: { destinationId: IslandDestinationId; distance: number } | null = null;
    for (const portal of this.blueprint.portals) {
      const distance = Math.hypot(
        this.world.player.position.x - portal.x,
        this.world.player.position.z - portal.z,
      );
      if (nearest === null || distance < nearest.distance) {
        nearest = { destinationId: portal.destinationId, distance };
      }
    }
    return nearest;
  }

  private setPortalProgress(destinationId: IslandDestinationId | null, progress: number): void {
    if (destinationId === this.activePortal && progress === this.portalProgress) {
      return;
    }
    this.activePortal = destinationId;
    this.portalProgress = progress;
    this.callbacks.onPortalProgress({ destinationId, progress });
  }
}

function animateCharacter(character: THREE.Group, timestamp: number, moving: boolean): void {
  const phase = timestamp * (moving ? 0.012 : 0.003);
  const amplitude = moving ? 0.46 : 0.04;
  const leftLeg = character.getObjectByName('left-leg');
  const rightLeg = character.getObjectByName('right-leg');
  const leftArm = character.getObjectByName('left-arm');
  const rightArm = character.getObjectByName('right-arm');
  if (leftLeg !== undefined) leftLeg.rotation.x = Math.sin(phase) * amplitude;
  if (rightLeg !== undefined) rightLeg.rotation.x = -Math.sin(phase) * amplitude;
  if (leftArm !== undefined) leftArm.rotation.x = -Math.sin(phase) * amplitude * 0.55;
  if (rightArm !== undefined) rightArm.rotation.x = Math.sin(phase) * amplitude * 0.55;
  character.position.y = 0.1 + Math.abs(Math.sin(phase * 0.5)) * (moving ? 0.045 : 0.012);
}
