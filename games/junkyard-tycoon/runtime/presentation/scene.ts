import { bindRendererGraphics } from '../../../shared/game-shell/graphics-settings.ts';
import * as THREE from 'three';

import { junkyardLevel } from '../domain/level.ts';
import {
  type JunkyardInteractionDefinition,
  type JunkyardState,
} from '../domain/types.ts';
import { animateCharacter } from './character-animation.ts';
import { createJunkyardEnvironment } from './environment.ts';
import {
  createJunkyardSceneObjects,
  type JunkyardSceneObjects,
} from './scene-objects.ts';
import { updateJunkyardSceneObjects } from './scene-state.ts';
import {
  junkyardSceneColors,
  junkyardSceneLayout,
  type JunkyardQualityProfile,
} from './registry.ts';

export interface JunkyardScreenPoint {
  readonly x: number;
  readonly y: number;
  readonly visible: boolean;
}

export interface JunkyardRendererStats {
  readonly calls: number;
  readonly triangles: number;
  readonly geometries: number;
  readonly textures: number;
  readonly pixelRatio: number;
}

export class JunkyardScene {
  private readonly canvas = document.createElement('canvas');
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera();
  private readonly objects: JunkyardSceneObjects;
  private readonly resizeObserver: ResizeObserver;
  private readonly lastPlayerPosition = new THREE.Vector3();
  private elapsedSeconds = 0;
  private disposed = false;
  private readonly removeGraphics: () => void;

  public constructor(
    private readonly host: HTMLElement,
    private readonly quality: JunkyardQualityProfile,
  ) {
    this.canvas.className = 'junkyard-canvas';
    this.canvas.setAttribute('aria-label', '3D junkyard station');
    this.host.append(this.canvas);
    this.renderer = this.createRenderer();
    this.removeGraphics = bindRendererGraphics(this.renderer);
    this.scene.background = new THREE.Color(junkyardSceneColors.sky);
    this.scene.fog = new THREE.Fog(
      junkyardSceneColors.fog,
      junkyardSceneLayout.fogNear,
      junkyardSceneLayout.fogFar,
    );
    this.configureLights();
    this.scene.add(createJunkyardEnvironment(quality.decorationDensity));
    this.objects = createJunkyardSceneObjects(this.scene);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.host);
    this.resize();
  }

  public update(state: JunkyardState, deltaSeconds: number): void {
    this.elapsedSeconds += deltaSeconds;
    const playerPosition = state.world.playerPosition;
    const nextPosition = new THREE.Vector3(
      playerPosition.x,
      0,
      playerPosition.z,
    );
    const moving =
      this.lastPlayerPosition.distanceToSquared(nextPosition) > 0.0001;
    const activeDefinition = this.findInteraction(
      state.world.activeInteractionId,
    );
    this.objects.player.root.position.set(
      playerPosition.x,
      junkyardSceneLayout.playerY,
      playerPosition.z,
    );
    this.objects.player.root.rotation.y = Math.atan2(
      state.world.facing.x,
      state.world.facing.z,
    );
    animateCharacter(
      this.objects.player,
      this.elapsedSeconds,
      moving,
      activeDefinition?.kind ?? null,
    );
    this.objects.player.root.position.y += this.playerBob(
      moving,
      activeDefinition !== undefined,
    );
    this.lastPlayerPosition.copy(nextPosition);
    updateJunkyardSceneObjects(
      this.objects,
      state,
      activeDefinition?.kind ?? null,
      this.elapsedSeconds,
    );
    this.followPlayer(playerPosition.x, playerPosition.z);
  }

  public render(): void {
    if (!this.disposed) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  public getInteractionScreenPoint(
    interactionId: string,
  ): JunkyardScreenPoint | null {
    const anchor = this.objects.interactionAnchors.get(interactionId);
    if (anchor === undefined) {
      return null;
    }
    const position = new THREE.Vector3();
    anchor.getWorldPosition(position);
    position.project(this.camera);
    const rect = this.host.getBoundingClientRect();
    return {
      x: (position.x * 0.5 + 0.5) * rect.width,
      y: (-position.y * 0.5 + 0.5) * rect.height,
      visible:
        position.z >= -1
        && position.z <= 1
        && position.x >= -1.1
        && position.x <= 1.1
        && position.y >= -1.1
        && position.y <= 1.1,
    };
  }

  public getRendererStats(): JunkyardRendererStats {
    return {
      calls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
      pixelRatio: this.renderer.getPixelRatio(),
    };
  }

  public destroy(): void {
    this.disposed = true;
    this.resizeObserver.disconnect();
    this.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh) && !(object instanceof THREE.Line)) {
        return;
      }
      object.geometry.dispose();
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      for (const material of materials) {
        material.dispose();
      }
    });
    this.removeGraphics();
    this.renderer.dispose();
    this.canvas.remove();
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, this.quality.maximumPixelRatio),
    );
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = this.quality.shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    return renderer;
  }

  private configureLights(): void {
    this.scene.add(new THREE.HemisphereLight(0xfff4d8, 0x7b6a5d, 2.1));
    const sun = new THREE.DirectionalLight(0xffefd1, 3.2);
    sun.position.set(-8, 13, 7);
    sun.castShadow = this.quality.shadows;
    sun.shadow.mapSize.set(
      junkyardSceneLayout.shadowMapSize,
      junkyardSceneLayout.shadowMapSize,
    );
    sun.shadow.camera.left = -10;
    sun.shadow.camera.right = 10;
    sun.shadow.camera.top = 10;
    sun.shadow.camera.bottom = -10;
    this.scene.add(sun);
  }

  private playerBob(moving: boolean, acting: boolean): number {
    if (moving) {
      return Math.abs(Math.sin(this.elapsedSeconds * 9))
        * junkyardSceneLayout.playerMoveBob;
    }
    if (acting) {
      return Math.abs(Math.sin(this.elapsedSeconds * 7))
        * junkyardSceneLayout.playerActionBob;
    }
    return 0;
  }

  private followPlayer(playerX: number, playerZ: number): void {
    const target = new THREE.Vector3(
      playerX + junkyardSceneLayout.cameraOffsetX,
      junkyardSceneLayout.cameraOffsetY,
      playerZ + junkyardSceneLayout.cameraOffsetZ,
    );
    this.camera.position.lerp(target, junkyardSceneLayout.cameraFollow);
    this.camera.lookAt(
      playerX,
      0,
      playerZ + junkyardSceneLayout.cameraLookAheadZ,
    );
  }

  private resize(): void {
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.host.clientHeight);
    const aspect = width / height;
    const frustum = junkyardSceneLayout.cameraFrustumHeight;
    this.camera.left = -frustum * aspect / 2;
    this.camera.right = frustum * aspect / 2;
    this.camera.top = frustum / 2;
    this.camera.bottom = -frustum / 2;
    this.camera.near = 0.1;
    this.camera.far = 60;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(
      junkyardSceneLayout.cameraOffsetX,
      junkyardSceneLayout.cameraOffsetY,
      junkyardSceneLayout.cameraOffsetZ,
    );
    this.renderer.setSize(width, height, false);
  }

  private findInteraction(
    interactionId: string | null,
  ): JunkyardInteractionDefinition | undefined {
    if (interactionId === null) {
      return undefined;
    }
    return junkyardLevel.world.interactions.find(
      (interaction) => interaction.id === interactionId,
    );
  }
}
