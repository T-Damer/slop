import * as THREE from 'three';

import type {
  WalkWorldDefinition,
  WalkWorldState,
  WorldDomainEvent,
} from '../domain/types.ts';
import { worldEventTypes } from '../domain/registry.ts';
import {
  createInteractionRing,
  createWalkerVisual,
  disposeWorldObject,
  type WalkerVisual,
} from './models.ts';
import type { WorldQualityProfile } from './quality.ts';

const worldSceneTuning = {
  cameraHeight: 9.5,
  cameraOffsetX: 7.6,
  cameraOffsetZ: 8.8,
  cameraViewHeight: 10.8,
  cameraNear: 0.1,
  cameraFar: 80,
  cameraFollow: 0.12,
  fogNear: 16,
  fogFar: 34,
  groundPadding: 8,
  playerLerp: 0.26,
  turnLerp: 0.22,
  walkingPhaseSpeed: 10,
  walkingSwing: 0.58,
  walkingBob: 0.045,
  movementEpsilon: 0.00002,
  pulseDurationSeconds: 0.5,
  pulseScale: 0.16,
  activeRingSpin: 1.8,
} as const;

export interface WorldStationVisual {
  readonly interactionId: string;
  readonly root: THREE.Object3D;
  readonly accentColor: number;
  readonly anchorHeight: number;
}

export interface WalkWorldSceneOptions {
  readonly host: HTMLElement;
  readonly definition: WalkWorldDefinition;
  readonly quality: WorldQualityProfile;
  readonly backgroundColor: number;
  readonly fogColor: number;
  readonly groundColor: number;
  readonly playerShirtColor: number;
  readonly playerAccentColor: number;
  readonly stationVisuals: ReadonlyArray<WorldStationVisual>;
  readonly decorate: (root: THREE.Group, density: number) => void;
}

export interface WorldSceneStats {
  readonly calls: number;
  readonly triangles: number;
  readonly geometries: number;
  readonly textures: number;
  readonly pixelRatio: number;
  readonly shadows: boolean;
}

export class WalkWorldScene {
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera();
  private readonly worldRoot = new THREE.Group();
  private readonly walker: WalkerVisual;
  private readonly stationVisuals = new Map<string, WorldStationVisual>();
  private readonly stationRings = new Map<string, THREE.Mesh>();
  private readonly pulseEnds = new Map<string, number>();
  private readonly previousPlayer = new THREE.Vector3();
  private readonly visualPlayer = new THREE.Vector3();
  private readonly followTarget = new THREE.Vector3();
  private readonly cameraOffset = new THREE.Vector3(
    worldSceneTuning.cameraOffsetX,
    worldSceneTuning.cameraHeight,
    worldSceneTuning.cameraOffsetZ,
  );
  private sceneTime = 0;
  private walkingPhase = 0;
  private disposed = false;

  public constructor(private readonly options: WalkWorldSceneOptions) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'junkyard-canvas';
    this.canvas.setAttribute('aria-label', '3D walkable junkyard');
    options.host.append(this.canvas);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: options.quality.id !== 'low',
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, options.quality.maximumPixelRatio),
    );
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = options.quality.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene.background = new THREE.Color(options.backgroundColor);
    this.scene.fog = new THREE.Fog(
      options.fogColor,
      worldSceneTuning.fogNear,
      worldSceneTuning.fogFar,
    );
    this.scene.add(this.worldRoot);
    this.configureWorld();

    this.walker = createWalkerVisual(
      options.playerShirtColor,
      options.playerAccentColor,
    );
    this.walker.root.position.set(
      options.definition.spawn.x,
      0,
      options.definition.spawn.z,
    );
    this.previousPlayer.copy(this.walker.root.position);
    this.visualPlayer.copy(this.walker.root.position);
    this.worldRoot.add(this.walker.root);

    for (const station of options.stationVisuals) {
      this.stationVisuals.set(station.interactionId, station);
      this.worldRoot.add(station.root);
      const ring = createInteractionRing(station.accentColor);
      ring.position.x = station.root.position.x;
      ring.position.z = station.root.position.z;
      this.stationRings.set(station.interactionId, ring);
      this.worldRoot.add(ring);
    }

    window.addEventListener('resize', this.resize);
    this.resize();
  }

  public update(state: WalkWorldState, deltaSeconds: number): void {
    this.sceneTime += Math.max(0, deltaSeconds);
    const target = new THREE.Vector3(state.player.x, 0, state.player.z);
    this.visualPlayer.lerp(target, worldSceneTuning.playerLerp);
    this.walker.root.position.copy(this.visualPlayer);
    this.updateWalkerAnimation(target, deltaSeconds);
    this.updateCamera();
    this.updateStations(state, deltaSeconds);
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public markEvent(event: WorldDomainEvent): void {
    if (
      event.type === worldEventTypes.interactionStarted
      || event.type === worldEventTypes.interactionCompleted
      || event.type === worldEventTypes.interactionBlocked
    ) {
      this.pulseEnds.set(
        event.interactionId,
        this.sceneTime + worldSceneTuning.pulseDurationSeconds,
      );
    }
  }

  public projectInteraction(interactionId: string): { x: number; y: number; visible: boolean } | null {
    const station = this.stationVisuals.get(interactionId);
    if (station === undefined) {
      return null;
    }
    const point = new THREE.Vector3(
      station.root.position.x,
      station.anchorHeight,
      station.root.position.z,
    );
    point.project(this.camera);
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: rect.left + (point.x + 1) * rect.width / 2,
      y: rect.top + (1 - point.y) * rect.height / 2,
      visible: point.z >= -1 && point.z <= 1,
    };
  }

  public getStats(): WorldSceneStats {
    return {
      calls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
      pixelRatio: this.renderer.getPixelRatio(),
      shadows: this.renderer.shadowMap.enabled,
    };
  }

  public destroy(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    window.removeEventListener('resize', this.resize);
    disposeWorldObject(this.worldRoot);
    this.renderer.dispose();
    this.canvas.remove();
  }

  private configureWorld(): void {
    const definition = this.options.definition;
    const width = definition.bounds.maximumX - definition.bounds.minimumX
      + worldSceneTuning.groundPadding;
    const depth = definition.bounds.maximumZ - definition.bounds.minimumZ
      + worldSceneTuning.groundPadding;
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(width, depth),
      new THREE.MeshStandardMaterial({
        color: this.options.groundColor,
        roughness: 0.98,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.04;
    ground.receiveShadow = true;
    this.worldRoot.add(ground);

    const hemisphere = new THREE.HemisphereLight(0xfff3d4, 0x50636d, 2.1);
    this.scene.add(hemisphere);
    const sun = new THREE.DirectionalLight(0xffdfaa, 3.2);
    sun.position.set(-7, 12, 5);
    sun.castShadow = this.options.quality.shadows;
    sun.shadow.mapSize.set(
      this.options.quality.shadowMapSize,
      this.options.quality.shadowMapSize,
    );
    sun.shadow.camera.left = -12;
    sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 12;
    sun.shadow.camera.bottom = -12;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 34;
    sun.shadow.bias = -0.0004;
    this.scene.add(sun);

    this.options.decorate(this.worldRoot, this.options.quality.decorationDensity);
  }

  private updateWalkerAnimation(target: THREE.Vector3, deltaSeconds: number): void {
    const deltaX = target.x - this.previousPlayer.x;
    const deltaZ = target.z - this.previousPlayer.z;
    const moving = deltaX * deltaX + deltaZ * deltaZ > worldSceneTuning.movementEpsilon;
    if (moving) {
      const facing = Math.atan2(deltaX, deltaZ);
      this.walker.root.rotation.y = dampAngle(
        this.walker.root.rotation.y,
        facing,
        worldSceneTuning.turnLerp,
      );
      this.walkingPhase += deltaSeconds * worldSceneTuning.walkingPhaseSpeed;
    }
    const swing = moving
      ? Math.sin(this.walkingPhase) * worldSceneTuning.walkingSwing
      : 0;
    this.walker.leftArm.rotation.x = swing;
    this.walker.rightArm.rotation.x = -swing;
    this.walker.leftLeg.rotation.x = -swing;
    this.walker.rightLeg.rotation.x = swing;
    this.walker.root.position.y = moving
      ? Math.abs(Math.sin(this.walkingPhase * 2)) * worldSceneTuning.walkingBob
      : 0;
    this.previousPlayer.copy(target);
  }

  private updateCamera(): void {
    this.followTarget.lerp(this.visualPlayer, worldSceneTuning.cameraFollow);
    this.camera.position.copy(this.followTarget).add(this.cameraOffset);
    this.camera.lookAt(this.followTarget);
    this.camera.updateMatrixWorld();
  }

  private updateStations(state: WalkWorldState, deltaSeconds: number): void {
    for (const [interactionId, station] of this.stationVisuals) {
      const ring = this.stationRings.get(interactionId);
      const active = state.activeInteraction?.interactionId === interactionId;
      const nearby = state.proximityId === interactionId;
      if (ring !== undefined) {
        ring.visible = active || nearby;
        ring.rotation.z += active ? deltaSeconds * worldSceneTuning.activeRingSpin : 0;
        ring.scale.setScalar(active ? 1.12 : 1);
      }
      const pulseEnd = this.pulseEnds.get(interactionId) ?? 0;
      const pulse = pulseEnd > this.sceneTime
        ? 1 + Math.sin((pulseEnd - this.sceneTime) * Math.PI * 5)
          * worldSceneTuning.pulseScale
        : 1;
      station.root.scale.setScalar(pulse);
    }
  }

  private readonly resize = (): void => {
    const width = Math.max(1, this.options.host.clientWidth);
    const height = Math.max(1, this.options.host.clientHeight);
    const aspect = width / height;
    const halfHeight = worldSceneTuning.cameraViewHeight / 2;
    this.camera.left = -halfHeight * aspect;
    this.camera.right = halfHeight * aspect;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.near = worldSceneTuning.cameraNear;
    this.camera.far = worldSceneTuning.cameraFar;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  };
}

function dampAngle(current: number, target: number, amount: number): number {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + delta * amount;
}
