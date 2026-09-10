import { bindRendererGraphics } from '../../../shared/game-shell/graphics-settings.ts';
import * as THREE from 'three';

import {
  trafficCarStatuses,
  trafficDirections,
  trafficLocations,
  trafficRules,
  type TrafficColor,
} from '../domain/registry.ts';
import {
  getAvailableCarIds,
  getTrafficCar,
} from '../domain/rules.ts';
import type {
  TrafficCarDefinition,
  TrafficDomainEvent,
  TrafficLevelDefinition,
  TrafficState,
} from '../domain/types.ts';
import {
  dampAngle,
  easeInCubic,
  easeInOutCubic,
  easeOutCubic,
  linear,
} from './animation-curves.ts';
import { createParkingLocationDecorations } from './locations.ts';
import { resolveParkingQuality } from './quality.ts';
import { countLeadingQueueColor } from './queue-metrics.ts';
import {
  createBayMarker,
  createCarModel,
  createCoinModel,
  createExitChevron,
  createLamp,
  createPersonModel,
  createTree,
  disposeObject,
  setObjectOpacity,
  setPersonPriority,
  type CarModel,
  type PersonModel,
} from './models.ts';
import {
  parkingCamera,
  parkingColorPalette,
  parkingDirectionVectors,
  parkingDirectionYaw,
  parkingLayout,
  parkingLocationThemes,
  parkingSceneColors,
  parkingUiEvents,
  parkingUiTimings,
} from './registry.ts';

export interface ParkingSceneCallbacks {
  readonly onCarSelected: (carId: string) => void;
}

interface TweenJob {
  readonly startedAt: number;
  readonly durationMs: number;
  readonly update: (progress: number) => void;
  readonly easing: (progress: number) => number;
  readonly resolve: () => void;
}

export class ParkingJamScene {
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera();
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly levelRoot = new THREE.Group();
  private readonly effectsRoot = new THREE.Group();
  private readonly carModels = new Map<string, CarModel>();
  private readonly passengerModels: Array<PersonModel> = [];
  private readonly clickableMeshes: Array<THREE.Mesh> = [];
  private readonly bayMarkers: Array<THREE.Group> = [];
  private readonly tweens: Array<TweenJob> = [];
  private readonly baseCameraPosition = new THREE.Vector3(
    parkingCamera.positionX,
    parkingCamera.positionY,
    parkingCamera.positionZ,
  );
  private readonly quality = resolveParkingQuality();
  private currentLevel: TrafficLevelDefinition | null = null;
  private currentState: TrafficState | null = null;
  private targetColor: TrafficColor | null = null;
  private targetGroupSize: number = trafficRules.emptyCollectionSize;
  private passengerSerial: number = trafficRules.firstIndex;
  private animationFrame: number = trafficRules.firstIndex;
  private lastFrameAt: number = trafficRules.firstCoordinate;
  private shakeStrength: number = trafficRules.firstCoordinate;
  private interactive = true;
  private disposed = false;
  private readonly removeGraphics: () => void;

  public constructor(
    private readonly host: HTMLElement,
    private readonly callbacks: ParkingSceneCallbacks,
  ) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'parking-canvas';
    this.canvas.setAttribute('aria-label', '3D parking lot');
    this.host.append(this.canvas);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality.maximumPixelRatio));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = parkingCamera.toneMappingExposure;
    this.renderer.shadowMap.enabled = this.quality.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.removeGraphics = bindRendererGraphics(this.renderer);

    this.scene.add(this.levelRoot, this.effectsRoot);
    this.configureLights();
    this.configureCamera();
    this.resize();

    this.canvas.addEventListener(parkingUiEvents.pointerUp, this.handlePointerUp);
    window.addEventListener(parkingUiEvents.resize, this.resize);
    document.addEventListener(parkingUiEvents.visibilityChange, this.handleVisibilityChange);
    this.animationFrame = window.requestAnimationFrame(this.renderFrame);
  }

  public setInteractive(interactive: boolean): void {
    this.interactive = interactive;
    this.canvas.classList.toggle('is-busy', !interactive);
  }

  public load(level: TrafficLevelDefinition, state: TrafficState): void {
    this.currentLevel = level;
    this.currentState = state;
    this.clearLevel();
    this.applyLocationTheme(level);
    this.createEnvironment(level);

    for (const progress of state.cars) {
      if (progress.status === trafficCarStatuses.departed) {
        continue;
      }
      const definition = getTrafficCar(level, progress.id);
      if (definition === null) {
        continue;
      }
      const color = parkingColorPalette[definition.color];
      const model = createCarModel(definition, color);
      this.attachIdentityRing(model, color);
      if (progress.status === trafficCarStatuses.parked) {
        model.position.copy(this.gridPosition(definition));
        model.rotation.y = parkingDirectionYaw[definition.direction];
        this.addClickableCar(model);
      } else if (progress.bayIndex !== null) {
        model.position.copy(this.bayPosition(progress.bayIndex));
        model.rotation.y = Math.PI;
      }
      this.carModels.set(definition.id, model);
      this.levelRoot.add(model);
    }

    this.rebuildPassengerQueue(state.passengers);
    this.syncGuidance(level, state);
  }

  public syncGuidance(level: TrafficLevelDefinition, state: TrafficState): void {
    this.currentLevel = level;
    this.currentState = state;
    this.targetColor = state.passengers[trafficRules.firstIndex] ?? null;
    this.targetGroupSize = this.targetColor === null
      ? trafficRules.emptyCollectionSize
      : countLeadingQueueColor(state.passengers, this.targetColor);
    this.replenishPassengerQueue(state.passengers);
    const available = new Set(getAvailableCarIds(level, state));

    for (const [carId, model] of this.carModels) {
      const definition = getTrafficCar(level, carId);
      const matches = this.targetColor !== null && definition?.color === this.targetColor;
      const recommended = matches && available.has(carId);
      model.userData.guidanceStrength = matches ? (recommended ? 1 : 0.42) : 0;
      model.userData.recommended = recommended;
      model.userData.guidanceHalo.material.color.setHex(model.userData.bodyColor);
      this.setCarEmissive(model, model.userData.bodyColor, matches ? (recommended ? 0.18 : 0.06) : 0.02);
    }
    this.syncPassengerPriority();
  }

  public async animateCarReleased(
    level: TrafficLevelDefinition,
    event: TrafficDomainEvent,
  ): Promise<void> {
    if (event.carId === null || event.bayIndex === null) {
      return;
    }
    const definition = getTrafficCar(level, event.carId);
    const model = this.carModels.get(event.carId);
    if (definition === null || model === undefined) {
      return;
    }

    this.removeClickableCar(event.carId);
    model.userData.guidanceStrength = trafficRules.emptyCollectionSize;
    model.userData.guidanceHalo.material.opacity = trafficRules.emptyCollectionSize;
    const curve = new THREE.CatmullRomCurve3(
      this.createReleaseRoute(definition, model.position.clone(), event.bayIndex),
      false,
      'centripetal',
      0.45,
    );
    const point = new THREE.Vector3();
    const tangent = new THREE.Vector3();

    await this.tween(parkingUiTimings.carReleaseMs, (progress) => {
      curve.getPoint(progress, point);
      curve.getTangent(Math.min(0.999, progress + 0.001), tangent);
      model.position.copy(point);
      model.position.y += Math.sin(progress * Math.PI) * 0.075;
      model.rotation.y = dampAngle(model.rotation.y, Math.atan2(tangent.x, tangent.z), 0.28);
      this.spinWheels(model, 0.34);
    }, easeInOutCubic);

    model.position.copy(this.bayPosition(event.bayIndex));
    model.rotation.y = Math.PI;
    this.shakeStrength = Math.max(this.shakeStrength, 0.055);
  }

  public async animatePassengerGroupBoarded(event: TrafficDomainEvent): Promise<void> {
    if (event.carId === null || event.passengerCount <= trafficRules.emptyCollectionSize) {
      return;
    }
    const car = this.carModels.get(event.carId);
    if (car === undefined) {
      return;
    }

    const count = Math.min(event.passengerCount, this.passengerModels.length);
    const people = this.passengerModels.splice(trafficRules.firstIndex, count);
    for (const person of people) {
      person.userData.leaving = true;
      setPersonPriority(person, false);
    }
    this.layoutPassengerQueue(true);

    await Promise.all(
      people.map((person, index) => this.animatePersonToCar(
        person,
        car,
        (event.seatIndex ?? trafficRules.firstIndex) + index,
        index,
        people.length,
      )),
    );

    this.spawnBoardingImpact(car, event.passengerColor, people.length);
    this.shakeStrength = Math.max(this.shakeStrength, 0.09);
    await this.pause(parkingUiTimings.passengerGapMs);
  }

  public async animateCarDeparted(event: TrafficDomainEvent): Promise<void> {
    if (event.carId === null) {
      return;
    }
    const car = this.carModels.get(event.carId);
    if (car === undefined) {
      return;
    }

    const start = car.position.clone();
    const end = start.clone();
    end.z = parkingLayout.departureZ;
    const curve = new THREE.CatmullRomCurve3(
      [start, start.clone().add(new THREE.Vector3(0, 0, -1)), end],
      false,
      'centripetal',
      0.35,
    );
    const point = new THREE.Vector3();
    this.spawnCoins(event.carId, event.coins);

    await this.tween(parkingUiTimings.carDepartureMs, (progress) => {
      curve.getPoint(progress, point);
      car.position.copy(point);
      car.rotation.y = Math.PI;
      car.scale.setScalar(1 + Math.sin(progress * Math.PI) * 0.035);
      this.spinWheels(car, 0.5);
      if (progress > 0.74) {
        setObjectOpacity(car, 1 - ((progress - 0.74) / 0.26));
      }
    }, easeInCubic);

    this.levelRoot.remove(car);
    disposeObject(car);
    this.carModels.delete(event.carId);
    this.shakeStrength = Math.max(this.shakeStrength, 0.085);
  }

  public async showBlocked(carId: string, blockingCarIds: ReadonlyArray<string>): Promise<void> {
    const selected = this.carModels.get(carId);
    if (selected === undefined) {
      return;
    }
    const definition = this.currentLevel === null ? null : getTrafficCar(this.currentLevel, carId);
    const movement = definition === null ? { x: 1, z: 0 } : parkingDirectionVectors[definition.direction];
    const start = selected.position.clone();
    const blockers = blockingCarIds
      .map((id) => this.carModels.get(id))
      .filter((model): model is CarModel => model !== undefined);
    for (const blocker of blockers) {
      this.setCarEmissive(blocker, parkingSceneColors.danger, 0.62);
    }

    await this.tween(parkingUiTimings.blockedPulseMs, (progress) => {
      const offset = Math.sin(progress * Math.PI * 7) * (1 - progress) * 0.13;
      selected.position.set(start.x + movement.x * offset, start.y, start.z + movement.z * offset);
      const pulse = 1 + Math.sin(progress * Math.PI * 3) * 0.055;
      for (const blocker of blockers) {
        blocker.scale.setScalar(pulse);
      }
    }, linear);

    selected.position.copy(start);
    for (const blocker of blockers) {
      blocker.scale.copy(blocker.userData.originalScale);
    }
    this.restoreGuidance();
  }

  public async showNoBay(): Promise<void> {
    await this.tween(parkingUiTimings.blockedPulseMs, (progress) => {
      const pulse = 1 + Math.sin(progress * Math.PI * 4) * 0.085;
      for (const marker of this.bayMarkers) {
        marker.scale.setScalar(pulse);
      }
    }, linear);
    for (const marker of this.bayMarkers) {
      marker.scale.setScalar(1);
    }
  }

  public async highlightCar(carId: string): Promise<void> {
    const car = this.carModels.get(carId);
    if (car === undefined) {
      return;
    }
    this.setCarEmissive(car, parkingSceneColors.gold, 0.52);
    await this.tween(parkingUiTimings.hintPulseMs, (progress) => {
      car.scale.setScalar(1 + Math.sin(progress * Math.PI * 4) * 0.07);
      car.position.y = parkingLayout.carY + Math.abs(Math.sin(progress * Math.PI * 2)) * 0.09;
    }, easeInOutCubic);
    car.scale.copy(car.userData.originalScale);
    car.position.y = parkingLayout.carY;
    this.restoreGuidance();
  }

  public celebrate(): void {
    const colors = Object.values(parkingColorPalette);
    const particles: Array<THREE.Mesh> = [];
    for (
      let index = trafficRules.firstIndex;
      index < parkingLayout.celebrationPieceCount;
      index += trafficRules.cellStep
    ) {
      const particle = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.03, 0.18),
        new THREE.MeshStandardMaterial({
          color: colors[index % colors.length],
          transparent: true,
          roughness: 0.55,
        }),
      );
      const angle = index * 2.399963;
      const radius = 0.8 + (index % 8) * 0.32;
      particle.position.set(
        Math.cos(angle) * radius,
        2.5 + (index % 5) * 0.15,
        parkingLayout.boardOffsetZ + Math.sin(angle) * radius,
      );
      particle.userData.velocity = new THREE.Vector3(
        Math.cos(angle) * 1.1,
        2.4 + (index % 4) * 0.2,
        Math.sin(angle) * 1.1,
      );
      particles.push(particle);
      this.effectsRoot.add(particle);
    }

    this.tween(1700, (progress) => {
      const elapsed = progress * 1.7;
      for (const particle of particles) {
        const velocity = particle.userData.velocity as THREE.Vector3;
        particle.position.x += velocity.x * 0.018;
        particle.position.z += velocity.z * 0.018;
        particle.position.y += (velocity.y - 5.4 * elapsed) * 0.018;
        particle.rotation.x += 0.11;
        particle.rotation.y += 0.08;
        setObjectOpacity(particle, 1 - progress);
      }
    }, linear).then(() => {
      for (const particle of particles) {
        this.effectsRoot.remove(particle);
        disposeObject(particle);
      }
    });
    this.shakeStrength = 0.12;
  }

  public screenPointForCar(carId: string): { x: number; y: number } | null {
    const car = this.carModels.get(carId);
    if (car === undefined) {
      return null;
    }
    const point = car.position.clone().add(new THREE.Vector3(0, 1.05, 0));
    point.project(this.camera);
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (point.x * 0.5 + 0.5) * rect.width + rect.left,
      y: (-point.y * 0.5 + 0.5) * rect.height + rect.top,
    };
  }

  public destroy(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    window.cancelAnimationFrame(this.animationFrame);
    this.canvas.removeEventListener(parkingUiEvents.pointerUp, this.handlePointerUp);
    window.removeEventListener(parkingUiEvents.resize, this.resize);
    document.removeEventListener(parkingUiEvents.visibilityChange, this.handleVisibilityChange);
    this.clearLevel();
    disposeObject(this.effectsRoot);
    this.removeGraphics();
    this.renderer.dispose();
    this.canvas.remove();
  }

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (!this.interactive) {
      return;
    }
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.clickableMeshes, false)[trafficRules.firstIndex];
    const carId = hit?.object.userData.carId;
    if (typeof carId === 'string') {
      this.callbacks.onCarSelected(carId);
    }
  };

  private readonly handleVisibilityChange = (): void => {
    this.lastFrameAt = performance.now();
  };

  private readonly resize = (): void => {
    const width = Math.max(trafficRules.cellStep, this.host.clientWidth);
    const height = Math.max(trafficRules.cellStep, this.host.clientHeight);
    const aspect = width / height;
    const halfHeight = Math.max(
      parkingLayout.cameraHeightSpan / 2,
      parkingLayout.cameraMinimumWidth / (2 * aspect),
    );
    this.camera.left = -halfHeight * aspect;
    this.camera.right = halfHeight * aspect;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  };

  private readonly renderFrame = (timestamp: number): void => {
    if (this.disposed) {
      return;
    }
    const delta = Math.min(0.05, Math.max(0, (timestamp - this.lastFrameAt) / 1000));
    this.lastFrameAt = timestamp;
    this.updateTweens(timestamp);
    this.updateIdleMotion(timestamp, delta);
    this.updateCameraShake(timestamp);
    this.renderer.render(this.scene, this.camera);
    this.animationFrame = window.requestAnimationFrame(this.renderFrame);
  };

  private configureCamera(): void {
    this.camera.position.copy(this.baseCameraPosition);
    this.camera.lookAt(0, 0, parkingLayout.cameraLookZ);
    this.camera.near = parkingCamera.near;
    this.camera.far = parkingCamera.far;
    this.scene.add(this.camera);
  }

  private configureLights(): void {
    this.scene.add(new THREE.HemisphereLight(0xf8fff9, 0x567451, 2));
    const sun = new THREE.DirectionalLight(0xfff3d5, 3.4);
    sun.position.set(-7, 13, -5);
    sun.castShadow = this.quality.shadows;
    sun.shadow.mapSize.set(this.quality.shadowMapSize, this.quality.shadowMapSize);
    sun.shadow.camera.left = -10;
    sun.shadow.camera.right = 10;
    sun.shadow.camera.top = 10;
    sun.shadow.camera.bottom = -10;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 32;
    sun.shadow.bias = -0.00035;
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0x9ec7ff, 0.72);
    fill.position.set(8, 7, 10);
    this.scene.add(fill);
  }

  private applyLocationTheme(level: TrafficLevelDefinition): void {
    const theme = parkingLocationThemes[level.location];
    this.scene.background = new THREE.Color(theme.sky);
    this.scene.fog = new THREE.Fog(theme.fog, parkingCamera.fogNear, parkingCamera.fogFar);
  }

  private createEnvironment(level: TrafficLevelDefinition): void {
    const theme = parkingLocationThemes[level.location];
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(70, 70),
      new THREE.MeshStandardMaterial({ color: theme.ground, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.08;
    ground.receiveShadow = true;
    this.levelRoot.add(ground);

    const roadMaterial = new THREE.MeshStandardMaterial({ color: theme.road, roughness: 0.94 });
    const apron = new THREE.Mesh(
      new THREE.BoxGeometry(
        parkingLayout.lotWidth + parkingLayout.roadApronMargin * 2,
        parkingLayout.roadApronHeight,
        parkingLayout.lotDepth + parkingLayout.roadApronMargin * 2,
      ),
      roadMaterial,
    );
    apron.position.set(0, -0.012, parkingLayout.boardOffsetZ);
    apron.receiveShadow = true;
    this.levelRoot.add(apron);

    const exitRoad = new THREE.Mesh(new THREE.BoxGeometry(5.9, 0.12, 7.1), roadMaterial);
    exitRoad.position.set(0, -0.005, -4.75);
    exitRoad.receiveShadow = true;
    this.levelRoot.add(exitRoad);

    const lot = new THREE.Mesh(
      new THREE.BoxGeometry(parkingLayout.lotWidth, parkingLayout.lotHeight, parkingLayout.lotDepth),
      new THREE.MeshStandardMaterial({ color: theme.asphalt, roughness: 0.91 }),
    );
    lot.position.set(0, parkingLayout.lotY, parkingLayout.boardOffsetZ);
    lot.castShadow = true;
    lot.receiveShadow = true;
    this.levelRoot.add(lot);

    const halfWidth = parkingLayout.lotWidth / 2;
    const halfDepth = parkingLayout.lotDepth / 2;
    const exits: ReadonlyArray<readonly [THREE.Group, number, number]> = [
      [createExitChevron(trafficDirections.up), 0, parkingLayout.boardOffsetZ + halfDepth + parkingLayout.exitChevronOffset],
      [createExitChevron(trafficDirections.down), 0, parkingLayout.boardOffsetZ - halfDepth - parkingLayout.exitChevronOffset],
      [createExitChevron(trafficDirections.right), halfWidth + parkingLayout.exitChevronOffset, parkingLayout.boardOffsetZ],
      [createExitChevron(trafficDirections.left), -halfWidth - parkingLayout.exitChevronOffset, parkingLayout.boardOffsetZ],
    ];
    for (const [marker, x, z] of exits) {
      marker.position.set(x, 0.045, z);
      this.levelRoot.add(marker);
    }

    const markingMaterial = new THREE.MeshBasicMaterial({ color: theme.marking, transparent: true, opacity: 0.9 });
    for (let line = trafficRules.cellStep; line < trafficRules.boardColumns; line += trafficRules.cellStep) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.025, 0.012, parkingLayout.lotDepth * 0.94),
        markingMaterial,
      );
      stripe.position.set(-halfWidth + line * parkingLayout.cellSize, 0.155, parkingLayout.boardOffsetZ);
      stripe.visible = line % 2 === trafficRules.emptyCollectionSize;
      this.levelRoot.add(stripe);
    }

    for (let bay = trafficRules.firstIndex; bay < parkingLayout.bayX.length; bay += trafficRules.cellStep) {
      const marker = createBayMarker(bay < level.bayCount);
      marker.position.set(parkingLayout.bayX[bay]!, 0, parkingLayout.bayZ);
      this.bayMarkers.push(marker);
      this.levelRoot.add(marker);
    }

    const queuePlatform = new THREE.Mesh(
      new THREE.BoxGeometry(7.1, 0.1, 1.72),
      new THREE.MeshStandardMaterial({ color: theme.concrete, roughness: 0.96 }),
    );
    queuePlatform.position.set(0, -0.015, -5.66);
    queuePlatform.receiveShadow = true;
    this.levelRoot.add(queuePlatform);

    const railMaterial = new THREE.MeshStandardMaterial({ color: theme.concreteDark, roughness: 0.72 });
    for (const z of [-5.15, -6.24]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.07, 0.07), railMaterial);
      rail.position.set(0, 0.18, z);
      this.levelRoot.add(rail);
    }

    this.levelRoot.add(createParkingLocationDecorations(
      level.location,
      this.quality.decorationDensity,
    ));
    if (level.location === trafficLocations.city) {
      const decorations: Array<[THREE.Object3D, number, number]> = [
        [createTree(0.78), -4.6, 4.2],
        [createTree(0.7), 4.65, 4.0],
        [createLamp(), -4.05, 1.35],
        [createLamp(), 4.05, 1.35],
      ];
      for (const [object, x, z] of decorations) {
        object.position.set(x, 0, z);
        this.levelRoot.add(object);
      }
    }
  }

  private clearLevel(): void {
    this.targetColor = null;
    this.targetGroupSize = trafficRules.emptyCollectionSize;
    this.clickableMeshes.length = trafficRules.emptyCollectionSize;
    this.carModels.clear();
    this.passengerModels.length = trafficRules.emptyCollectionSize;
    this.bayMarkers.length = trafficRules.emptyCollectionSize;
    while (this.levelRoot.children.length > trafficRules.emptyCollectionSize) {
      const child = this.levelRoot.children[trafficRules.firstIndex];
      if (child !== undefined) {
        this.levelRoot.remove(child);
        disposeObject(child);
      }
    }
  }

  private rebuildPassengerQueue(passengers: TrafficState['passengers']): void {
    this.passengerModels.length = trafficRules.emptyCollectionSize;
    this.replenishPassengerQueue(passengers, false);
  }

  private replenishPassengerQueue(passengers: TrafficState['passengers'], animate = true): void {
    const desired = Math.min(passengers.length, this.quality.queueVisibleLimit);
    while (this.passengerModels.length < desired) {
      const index = this.passengerModels.length;
      const color = passengers[index];
      if (color === undefined) {
        break;
      }
      const person = createPersonModel(parkingColorPalette[color], this.passengerSerial);
      this.passengerSerial += trafficRules.cellStep;
      person.position.set(
        parkingLayout.queueStartX,
        parkingLayout.personY,
        parkingLayout.queueStartZ - 2 * parkingLayout.queueSpacingZ,
      );
      this.passengerModels.push(person);
      this.levelRoot.add(person);
    }
    this.layoutPassengerQueue(animate);
  }

  private layoutPassengerQueue(animate: boolean): void {
    for (let index = trafficRules.firstIndex; index < this.passengerModels.length; index += trafficRules.cellStep) {
      const person = this.passengerModels[index];
      if (person === undefined || person.userData.leaving) {
        continue;
      }
      const column = index % parkingLayout.queueColumns;
      const row = Math.floor(index / parkingLayout.queueColumns);
      const target = new THREE.Vector3(
        parkingLayout.queueStartX + column * parkingLayout.queueSpacingX,
        parkingLayout.personY,
        parkingLayout.queueStartZ - row * parkingLayout.queueSpacingZ,
      );
      person.userData.queueTarget.copy(target);
      if (!animate) {
        person.position.copy(target);
      }
    }
  }

  private syncPassengerPriority(): void {
    for (let index = trafficRules.firstIndex; index < this.passengerModels.length; index += trafficRules.cellStep) {
      const person = this.passengerModels[index];
      if (person === undefined || person.userData.leaving) {
        continue;
      }
      const priority = index < this.targetGroupSize;
      setPersonPriority(person, priority);
      person.userData.priorityMarker.visible = priority && index === trafficRules.firstIndex;
    }
  }

  private addClickableCar(car: CarModel): void {
    car.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        this.clickableMeshes.push(object);
      }
    });
  }

  private removeClickableCar(carId: string): void {
    for (let index = this.clickableMeshes.length - trafficRules.cellStep; index >= trafficRules.firstIndex; index -= trafficRules.cellStep) {
      if (this.clickableMeshes[index]?.userData.carId === carId) {
        this.clickableMeshes.splice(index, trafficRules.cellStep);
      }
    }
  }

  private attachIdentityRing(car: CarModel, color: number): void {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(
        parkingLayout.identityRingInnerRadius,
        parkingLayout.identityRingOuterRadius,
        28,
      ),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = parkingLayout.identityRingY;
    ring.userData.carId = car.userData.carId;
    car.add(ring);
  }

  private gridPosition(car: TrafficCarDefinition): THREE.Vector3 {
    const horizontal = car.direction === trafficDirections.left || car.direction === trafficDirections.right;
    const centerX = horizontal ? car.x + (car.length - trafficRules.cellStep) / 2 : car.x;
    const centerY = horizontal ? car.y : car.y + (car.length - trafficRules.cellStep) / 2;
    return new THREE.Vector3(
      (centerX - (trafficRules.boardColumns - trafficRules.cellStep) / 2) * parkingLayout.cellSize,
      parkingLayout.carY,
      ((trafficRules.boardRows - trafficRules.cellStep) / 2 - centerY) * parkingLayout.cellSize + parkingLayout.boardOffsetZ,
    );
  }

  private bayPosition(index: number): THREE.Vector3 {
    return new THREE.Vector3(
      parkingLayout.bayX[index] ?? parkingLayout.bayX[trafficRules.firstIndex],
      parkingLayout.carY,
      parkingLayout.bayZ,
    );
  }

  private createReleaseRoute(
    car: TrafficCarDefinition,
    start: THREE.Vector3,
    bayIndex: number,
  ): Array<THREE.Vector3> {
    const halfWidth = parkingLayout.lotWidth / 2;
    const halfDepth = parkingLayout.lotDepth / 2;
    const exit = start.clone();
    const target = this.bayPosition(bayIndex);
    const side = start.x >= trafficRules.firstCoordinate ? 1 : -1;
    const points: Array<THREE.Vector3> = [start.clone()];

    if (car.direction === trafficDirections.down) {
      exit.z = parkingLayout.boardOffsetZ - halfDepth - parkingLayout.exitMargin;
      points.push(exit, new THREE.Vector3(start.x, parkingLayout.carY, parkingLayout.roadMergeZ));
    } else if (car.direction === trafficDirections.up) {
      exit.z = parkingLayout.boardOffsetZ + halfDepth + parkingLayout.exitMargin;
      points.push(
        exit,
        new THREE.Vector3(side * parkingLayout.outerRoadX, parkingLayout.carY, exit.z + 0.18),
        new THREE.Vector3(side * parkingLayout.outerRoadX, parkingLayout.carY, parkingLayout.roadMergeZ),
      );
    } else if (car.direction === trafficDirections.right) {
      exit.x = halfWidth + parkingLayout.exitMargin;
      points.push(exit, new THREE.Vector3(parkingLayout.outerRoadX, parkingLayout.carY, parkingLayout.roadMergeZ));
    } else {
      exit.x = -halfWidth - parkingLayout.exitMargin;
      points.push(exit, new THREE.Vector3(-parkingLayout.outerRoadX, parkingLayout.carY, parkingLayout.roadMergeZ));
    }
    points.push(new THREE.Vector3(target.x, parkingLayout.carY, parkingLayout.roadMergeZ - 0.2), target);
    return dedupePoints(points);
  }

  private async animatePersonToCar(
    person: PersonModel,
    car: CarModel,
    seatIndex: number,
    groupIndex: number,
    groupSize: number,
  ): Promise<void> {
    if (groupIndex > trafficRules.firstIndex) {
      await this.pause(groupIndex * parkingUiTimings.passengerStaggerMs);
    }
    const start = person.position.clone();
    const side = seatIndex % 2 === trafficRules.emptyCollectionSize ? -1 : 1;
    const spread = groupIndex - (groupSize - trafficRules.cellStep) / 2;
    const door = car.position.clone().add(new THREE.Vector3(
      side * parkingLayout.passengerDoorOffset,
      0.12,
      spread * parkingLayout.passengerCrowdSpread,
    ));
    const approach = new THREE.Vector3(
      door.x + spread * parkingLayout.passengerCrowdSpread,
      parkingLayout.personY,
      door.z - parkingLayout.passengerApproachZ,
    );
    const curve = new THREE.CatmullRomCurve3([
      start,
      start.clone().lerp(approach, 0.4).add(new THREE.Vector3(spread * 0.08, 0, -0.16)),
      approach,
      door,
    ], false, 'centripetal', 0.45);
    const point = new THREE.Vector3();
    const scale = person.scale.clone();

    await this.tween(parkingUiTimings.passengerGroupWalkMs, (progress) => {
      curve.getPoint(progress, point);
      person.position.copy(point);
      person.position.y += Math.abs(Math.sin(progress * Math.PI * 6)) * 0.055;
      person.rotation.y = Math.atan2(door.x - person.position.x, door.z - person.position.z);
      const shrink = progress > 0.78 ? 1 - ((progress - 0.78) / 0.22) : 1;
      person.scale.copy(scale).multiplyScalar(Math.max(0.03, shrink));
      this.animateLegs(person, progress * 10 + groupIndex);
    }, easeInOutCubic);

    this.levelRoot.remove(person);
    disposeObject(person);
  }

  private updateIdleMotion(timestamp: number, delta: number): void {
    const time = timestamp / 1000;
    const pulse = 0.5 + Math.sin(time * 4.2) * 0.5;
    for (const person of this.passengerModels) {
      if (person.userData.leaving) {
        continue;
      }
      const target = person.userData.queueTarget;
      const blend = 1 - Math.pow(0.002, delta);
      person.position.x = THREE.MathUtils.lerp(person.position.x, target.x, blend);
      person.position.z = THREE.MathUtils.lerp(person.position.z, target.z, blend);
      person.position.y = target.y + Math.sin(time * 2.2 + person.userData.phase) * 0.017;
      if (person.userData.priority) {
        const lead = person.userData.priorityMarker.visible;
        const scale = person.userData.baseScale * (
          lead
            ? parkingLayout.passengerPriorityScale + pulse * 0.035
            : parkingLayout.passengerGroupPriorityScale + pulse * 0.018
        );
        person.scale.setScalar(scale);
        person.userData.priorityRing.material.opacity = 0.3 + pulse * 0.38;
      } else {
        person.scale.setScalar(person.userData.baseScale);
      }
    }

    for (const car of this.carModels.values()) {
      const strength = car.userData.guidanceStrength;
      car.userData.guidanceHalo.material.opacity = strength <= 0
        ? 0
        : (parkingLayout.targetPulseMinimum
          + pulse * (parkingLayout.targetPulseMaximum - parkingLayout.targetPulseMinimum)) * strength;
      car.userData.directionBadge.scale.setScalar(
        car.userData.recommended ? 1 + pulse * parkingLayout.recommendedPulseScale : 1,
      );
    }
  }

  private updateCameraShake(timestamp: number): void {
    if (this.shakeStrength <= 0.0001) {
      this.camera.position.copy(this.baseCameraPosition);
      this.camera.lookAt(0, 0, parkingLayout.cameraLookZ);
      return;
    }
    const x = Math.sin(timestamp * 0.051) * this.shakeStrength;
    const y = Math.cos(timestamp * 0.067) * this.shakeStrength * 0.65;
    this.camera.position.copy(this.baseCameraPosition).add(new THREE.Vector3(x, y, -x * 0.45));
    this.camera.lookAt(0, 0, parkingLayout.cameraLookZ);
    this.shakeStrength *= 0.86;
  }

  private updateTweens(timestamp: number): void {
    for (let index = this.tweens.length - trafficRules.cellStep; index >= trafficRules.firstIndex; index -= trafficRules.cellStep) {
      const tween = this.tweens[index];
      if (tween === undefined) {
        continue;
      }
      const raw = Math.min(1, Math.max(0, (timestamp - tween.startedAt) / tween.durationMs));
      tween.update(tween.easing(raw));
      if (raw >= 1) {
        this.tweens.splice(index, trafficRules.cellStep);
        tween.resolve();
      }
    }
  }

  private tween(
    durationMs: number,
    update: (progress: number) => void,
    easing: (progress: number) => number,
  ): Promise<void> {
    return new Promise((resolve) => {
      this.tweens.push({
        startedAt: performance.now(),
        durationMs,
        update,
        easing,
        resolve,
      });
    });
  }

  private pause(durationMs: number): Promise<void> {
    return this.tween(durationMs, () => {}, linear);
  }

  private spinWheels(car: CarModel, amount: number): void {
    for (const wheel of car.userData.wheels) {
      wheel.rotation.x += amount;
    }
  }

  private animateLegs(person: PersonModel, phase: number): void {
    const left = person.getObjectByName('left-leg');
    const right = person.getObjectByName('right-leg');
    if (left !== undefined) {
      left.rotation.x = Math.sin(phase) * 0.5;
    }
    if (right !== undefined) {
      right.rotation.x = -Math.sin(phase) * 0.5;
    }
  }

  private setCarEmissive(car: CarModel, color: number, intensity: number): void {
    for (const material of car.userData.bodyMaterials) {
      material.emissive.setHex(color);
      material.emissiveIntensity = intensity;
    }
  }

  private restoreGuidance(): void {
    if (this.currentLevel !== null && this.currentState !== null) {
      this.syncGuidance(this.currentLevel, this.currentState);
    }
  }

  private spawnBoardingImpact(car: CarModel, color: TrafficColor | null, people: number): void {
    const impactColor = color === null ? car.userData.bodyColor : parkingColorPalette[color];
    const count = Math.max(
      parkingLayout.boardingParticleMinimum,
      people * parkingLayout.boardingParticleMultiplier,
    );
    const origin = car.position.clone().add(new THREE.Vector3(0, 0.72, 0));
    const particles: Array<THREE.Mesh> = [];
    for (let index = trafficRules.firstIndex; index < count; index += trafficRules.cellStep) {
      const particle = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.055 + (index % 3) * 0.012, 0),
        new THREE.MeshBasicMaterial({
          color: index % 4 === trafficRules.firstIndex ? parkingSceneColors.gold : impactColor,
          transparent: true,
          opacity: 0.95,
        }),
      );
      const angle = index * 2.399963;
      particle.position.copy(origin);
      particle.userData.direction = new THREE.Vector3(
        Math.cos(angle) * (0.8 + (index % 4) * 0.13),
        0.9 + (index % 5) * 0.14,
        Math.sin(angle) * (0.8 + (index % 3) * 0.12),
      );
      particles.push(particle);
      this.effectsRoot.add(particle);
    }
    const originalScale = car.scale.clone();
    this.tween(parkingUiTimings.groupImpactMs, (progress) => {
      car.scale.copy(originalScale).multiplyScalar(1 + Math.sin(progress * Math.PI) * 0.08);
      for (const particle of particles) {
        const direction = particle.userData.direction as THREE.Vector3;
        particle.position.set(
          origin.x + direction.x * progress,
          origin.y + direction.y * Math.sin(progress * Math.PI),
          origin.z + direction.z * progress,
        );
        setObjectOpacity(particle, 1 - progress);
      }
    }, easeOutCubic).then(() => {
      car.scale.copy(originalScale);
      for (const particle of particles) {
        this.effectsRoot.remove(particle);
        disposeObject(particle);
      }
    });
  }

  private spawnCoins(carId: string, count: number): void {
    const car = this.carModels.get(carId);
    if (car === undefined || count <= trafficRules.emptyCollectionSize) {
      return;
    }
    const origin = car.position.clone().add(new THREE.Vector3(0, 0.9, 0));
    const coins: Array<THREE.Mesh> = [];
    for (let index = trafficRules.firstIndex; index < count; index += trafficRules.cellStep) {
      const coin = createCoinModel();
      coin.position.copy(origin);
      coins.push(coin);
      this.effectsRoot.add(coin);
    }
    this.tween(760, (progress) => {
      for (let index = trafficRules.firstIndex; index < coins.length; index += trafficRules.cellStep) {
        const coin = coins[index];
        if (coin === undefined) {
          continue;
        }
        const spread = (index - (coins.length - trafficRules.cellStep) / 2) * 0.42;
        coin.position.set(
          origin.x + spread * Math.sin(progress * Math.PI),
          origin.y + Math.sin(progress * Math.PI) * (1.15 + index * 0.06),
          origin.z - progress * 0.8,
        );
        coin.rotation.y += 0.25;
        setObjectOpacity(coin, 1 - progress);
      }
    }, easeOutCubic).then(() => {
      for (const coin of coins) {
        this.effectsRoot.remove(coin);
        disposeObject(coin);
      }
    });
  }
}


function dedupePoints(points: ReadonlyArray<THREE.Vector3>): Array<THREE.Vector3> {
  const output: Array<THREE.Vector3> = [];
  for (const point of points) {
    const previous = output[output.length - trafficRules.cellStep];
    if (previous === undefined || previous.distanceToSquared(point) > 0.01) {
      output.push(point);
    }
  }
  return output;
}

