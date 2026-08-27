import * as THREE from 'three';

import {
  trafficCarStatuses,
  trafficDirections,
  trafficEvents,
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
  parkingColorPalette,
  parkingDirectionVectors,
  parkingDirectionYaw,
  parkingLayout,
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
  readonly resolve: () => void;
  readonly easing: (progress: number) => number;
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
  private readonly clickableMeshes: Array<THREE.Mesh> = [];
  private readonly passengerModels: Array<PersonModel> = [];
  private readonly bayMarkers: Array<THREE.Group> = [];
  private readonly tweens: Array<TweenJob> = [];
  private readonly baseCameraPosition = new THREE.Vector3(8.4, 11.8, 13.6);
  private animationFrame = 0;
  private currentLevel: TrafficLevelDefinition | null = null;
  private currentState: TrafficState | null = null;
  private targetColor: TrafficColor | null = null;
  private lastFrameAt = 0;
  private shakeStrength = 0;
  private interactive = true;
  private disposed = false;

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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, parkingLayout.maxPixelRatio));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene.background = new THREE.Color(parkingSceneColors.sky);
    this.scene.fog = new THREE.Fog(parkingSceneColors.fog, 16, 31);
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
    this.createEnvironment(level);

    for (const progress of state.cars) {
      if (progress.status === trafficCarStatuses.departed) {
        continue;
      }
      const car = getTrafficCar(level, progress.id);
      if (car === null) {
        continue;
      }
      const model = createCarModel(car, parkingColorPalette[car.color]);
      if (progress.status === trafficCarStatuses.parked) {
        model.position.copy(this.gridPosition(car));
        model.rotation.y = parkingDirectionYaw[car.direction];
        this.addClickableCar(model);
      } else if (progress.bayIndex !== null) {
        model.position.copy(this.bayPosition(progress.bayIndex));
        model.rotation.y = Math.PI;
      }
      this.carModels.set(car.id, model);
      this.levelRoot.add(model);
    }

    state.passengers
      .slice(trafficRules.firstIndex, parkingLayout.queueVisibleLimit)
      .forEach((color, index) => {
        const model = createPersonModel(parkingColorPalette[color], index);
        this.passengerModels.push(model);
        this.levelRoot.add(model);
      });
    this.layoutPassengerQueue(false);
    this.syncGuidance(level, state);
  }

  public syncGuidance(level: TrafficLevelDefinition, state: TrafficState): void {
    this.currentLevel = level;
    this.currentState = state;
    this.targetColor = state.passengers[trafficRules.firstIndex] ?? null;
    const availableCarIds = new Set(getAvailableCarIds(level, state));

    for (const [carId, model] of this.carModels) {
      const definition = getTrafficCar(level, carId);
      const matchesTarget = this.targetColor !== null && definition?.color === this.targetColor;
      const recommended = matchesTarget && availableCarIds.has(carId);
      model.userData.guidanceStrength = matchesTarget ? (recommended ? 1 : 0.45) : 0;
      model.userData.recommended = recommended;
      model.userData.guidanceHalo.material.color.setHex(model.userData.bodyColor);
      this.setCarEmissive(
        model,
        model.userData.bodyColor,
        matchesTarget ? (recommended ? 0.14 : 0.045) : 0,
      );
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
    const car = getTrafficCar(level, event.carId);
    const model = this.carModels.get(event.carId);
    if (car === null || model === undefined) {
      return;
    }

    this.removeClickableCar(event.carId);
    model.userData.guidanceStrength = 0;
    model.userData.recommended = false;
    model.userData.guidanceHalo.material.opacity = 0;
    const start = model.position.clone();
    const route = this.createReleaseRoute(car, start, event.bayIndex);
    const curve = new THREE.CatmullRomCurve3(route, false, 'centripetal', 0.45);
    const tangent = new THREE.Vector3();
    const point = new THREE.Vector3();

    await this.tween(parkingUiTimings.carReleaseMs, (progress) => {
      curve.getPoint(progress, point);
      curve.getTangent(Math.min(0.999, progress + 0.001), tangent);
      model.position.copy(point);
      model.position.y += Math.sin(progress * Math.PI) * 0.08;
      model.rotation.y = dampAngle(
        model.rotation.y,
        Math.atan2(tangent.x, tangent.z),
        0.18,
      );
      this.spinWheels(model, 0.18);
    }, easeInOutCubic);

    model.position.copy(this.bayPosition(event.bayIndex));
    model.rotation.y = Math.PI;
    this.shakeStrength = Math.max(this.shakeStrength, 0.045);
  }

  public async animatePassengerBoarded(event: TrafficDomainEvent): Promise<void> {
    if (event.carId === null) {
      return;
    }
    const person = this.passengerModels.shift();
    const car = this.carModels.get(event.carId);
    if (person === undefined || car === undefined) {
      return;
    }

    person.userData.leaving = true;
    setPersonPriority(person, false);
    this.layoutPassengerQueue(true);
    this.syncPassengerPriority();

    const start = person.position.clone();
    const seatSide = (event.seatIndex ?? trafficRules.firstIndex) % 2 === 0 ? -1 : 1;
    const door = car.position.clone().add(new THREE.Vector3(seatSide * 0.52, 0.12, -0.05));
    const approach = new THREE.Vector3(door.x, parkingLayout.personY, door.z - 0.72);
    const curve = new THREE.CatmullRomCurve3([
      start,
      start.clone().lerp(approach, 0.42).add(new THREE.Vector3(0, 0, -0.18)),
      approach,
      door,
    ], false, 'centripetal', 0.45);
    const point = new THREE.Vector3();
    const originalScale = person.scale.clone();

    await this.tween(parkingUiTimings.passengerWalkMs, (progress) => {
      curve.getPoint(progress, point);
      person.position.copy(point);
      person.position.y += Math.abs(Math.sin(progress * Math.PI * 5)) * 0.055;
      person.rotation.y = Math.atan2(door.x - person.position.x, door.z - person.position.z);
      const shrink = progress > 0.78 ? 1 - ((progress - 0.78) / 0.22) : 1;
      person.scale.copy(originalScale).multiplyScalar(Math.max(0.03, shrink));
      this.animatePersonLegs(person, progress * 8);
    }, easeInOutCubic);

    this.levelRoot.remove(person);
    disposeObject(person);
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
    const curve = new THREE.CatmullRomCurve3([
      start,
      start.clone().add(new THREE.Vector3(0, 0, -0.8)),
      end,
    ], false, 'centripetal', 0.35);
    const point = new THREE.Vector3();

    this.spawnCoins(event.carId, event.coins);
    await this.tween(parkingUiTimings.carDepartureMs, (progress) => {
      curve.getPoint(progress, point);
      car.position.copy(point);
      car.rotation.y = Math.PI;
      this.spinWheels(car, 0.28);
      if (progress > 0.72) {
        setObjectOpacity(car, 1 - ((progress - 0.72) / 0.28));
      }
    }, easeInCubic);

    this.levelRoot.remove(car);
    disposeObject(car);
    this.carModels.delete(event.carId);
    this.shakeStrength = Math.max(this.shakeStrength, 0.075);
  }

  public async showBlocked(
    carId: string,
    blockingCarIds: ReadonlyArray<string>,
  ): Promise<void> {
    const selected = this.carModels.get(carId);
    if (selected === undefined) {
      return;
    }
    const selectedBase = selected.position.clone();
    const definition = this.currentLevel === null ? null : getTrafficCar(this.currentLevel, carId);
    const movement = definition === null
      ? { x: 1, z: 0 }
      : parkingDirectionVectors[definition.direction];
    const blockers = blockingCarIds
      .map((id) => this.carModels.get(id))
      .filter((model): model is CarModel => model !== undefined);

    for (const blocker of blockers) {
      this.setCarEmissive(blocker, parkingSceneColors.danger, 0.58);
    }

    await this.tween(parkingUiTimings.blockedPulseMs, (progress) => {
      const shake = Math.sin(progress * Math.PI * 7) * (1 - progress) * 0.13;
      selected.position.set(
        selectedBase.x + movement.x * shake,
        selectedBase.y,
        selectedBase.z + movement.z * shake,
      );
      const pulse = 1 + Math.sin(progress * Math.PI * 3) * 0.055;
      for (const blocker of blockers) {
        blocker.scale.setScalar(pulse);
      }
    }, linear);

    selected.position.copy(selectedBase);
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
        marker.rotation.y = Math.sin(progress * Math.PI * 6) * 0.025;
      }
    }, linear);
    for (const marker of this.bayMarkers) {
      marker.scale.setScalar(1);
      marker.rotation.y = 0;
    }
  }

  public async highlightCar(carId: string): Promise<void> {
    const car = this.carModels.get(carId);
    if (car === undefined) {
      return;
    }
    this.setCarEmissive(car, parkingSceneColors.gold, 0.5);
    await this.tween(parkingUiTimings.hintPulseMs, (progress) => {
      const pulse = 1 + Math.sin(progress * Math.PI * 4) * 0.07;
      car.scale.setScalar(pulse);
      car.position.y = parkingLayout.carY + Math.abs(Math.sin(progress * Math.PI * 2)) * 0.09;
    }, easeInOutCubic);
    car.scale.copy(car.userData.originalScale);
    car.position.y = parkingLayout.carY;
    this.restoreGuidance();
  }

  public celebrate(): void {
    const colors = Object.values(parkingColorPalette);
    const pieces: Array<THREE.Mesh> = [];
    const pieceCount = 42;
    for (let index = 0; index < pieceCount; index += trafficRules.cellStep) {
      const geometry = new THREE.BoxGeometry(0.08, 0.03, 0.18);
      const material = new THREE.MeshStandardMaterial({
        color: colors[index % colors.length],
        roughness: 0.58,
        metalness: 0.03,
      });
      const piece = new THREE.Mesh(geometry, material);
      const angle = index * 2.399963;
      const radius = 0.8 + (index % 8) * 0.32;
      piece.position.set(
        Math.cos(angle) * radius,
        2.6 + (index % 5) * 0.14,
        parkingLayout.boardOffsetZ + Math.sin(angle) * radius,
      );
      piece.rotation.set(angle, angle * 0.7, angle * 1.3);
      piece.userData.velocity = new THREE.Vector3(
        Math.cos(angle) * (0.9 + (index % 3) * 0.18),
        2.4 + (index % 4) * 0.22,
        Math.sin(angle) * (0.9 + (index % 2) * 0.2),
      );
      pieces.push(piece);
      this.effectsRoot.add(piece);
    }

    this.tween(1900, (progress) => {
      const elapsed = progress * 1.9;
      for (const piece of pieces) {
        const velocity = piece.userData.velocity as THREE.Vector3;
        piece.position.x += velocity.x * 0.018;
        piece.position.z += velocity.z * 0.018;
        piece.position.y += (velocity.y - 5.4 * elapsed) * 0.018;
        piece.rotation.x += 0.11;
        piece.rotation.y += 0.08;
        if (progress > 0.72) {
          setObjectOpacity(piece, 1 - ((progress - 0.72) / 0.28));
        }
      }
    }, linear).then(() => {
      for (const piece of pieces) {
        this.effectsRoot.remove(piece);
        disposeObject(piece);
      }
    });
    this.shakeStrength = 0.11;
  }

  public screenPointForCar(carId: string): { x: number; y: number } | null {
    const car = this.carModels.get(carId);
    if (car === undefined) {
      return null;
    }
    const point = car.position.clone();
    point.y += 1.05;
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
    this.renderer.dispose();
    this.canvas.remove();
  }

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (!this.interactive || this.currentLevel === null) {
      return;
    }
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersection = this.raycaster.intersectObjects(this.clickableMeshes, false)[trafficRules.firstIndex];
    const carId = intersection?.object.userData.carId;
    if (typeof carId === 'string') {
      this.callbacks.onCarSelected(carId);
    }
  };

  private readonly handleVisibilityChange = (): void => {
    this.lastFrameAt = performance.now();
  };

  private readonly resize = (): void => {
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.host.clientHeight);
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
    const deltaSeconds = Math.min(0.05, Math.max(0, (timestamp - this.lastFrameAt) / 1000));
    this.lastFrameAt = timestamp;
    this.updateTweens(timestamp);
    this.updateIdleMotion(timestamp, deltaSeconds);
    this.updateCameraShake(timestamp);
    this.renderer.render(this.scene, this.camera);
    this.animationFrame = window.requestAnimationFrame(this.renderFrame);
  };

  private configureCamera(): void {
    this.camera.position.copy(this.baseCameraPosition);
    this.camera.lookAt(0, 0, parkingLayout.cameraLookZ);
    this.camera.near = 0.1;
    this.camera.far = 80;
    this.scene.add(this.camera);
  }

  private configureLights(): void {
    const hemisphere = new THREE.HemisphereLight(0xf8fff9, 0x567451, 2.0);
    this.scene.add(hemisphere);

    const sun = new THREE.DirectionalLight(0xfff3d5, 3.4);
    sun.position.set(-7, 13, -5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(parkingLayout.shadowMapSize, parkingLayout.shadowMapSize);
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

  private createEnvironment(level: TrafficLevelDefinition): void {
    const grassMaterial = new THREE.MeshStandardMaterial({
      color: parkingSceneColors.grass,
      roughness: 1,
      metalness: 0,
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), grassMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.08;
    ground.receiveShadow = true;
    this.levelRoot.add(ground);

    const roadMaterial = new THREE.MeshStandardMaterial({
      color: parkingSceneColors.road,
      roughness: 0.94,
      metalness: 0.01,
    });
    const road = new THREE.Mesh(new THREE.BoxGeometry(5.9, 0.12, 7.1), roadMaterial);
    road.position.set(0, -0.005, -4.75);
    road.receiveShadow = true;
    this.levelRoot.add(road);

    const roadApron = new THREE.Mesh(
      new THREE.BoxGeometry(
        parkingLayout.lotWidth + parkingLayout.roadApronMargin * 2,
        parkingLayout.roadApronHeight,
        parkingLayout.lotDepth + parkingLayout.roadApronMargin * 2,
      ),
      roadMaterial,
    );
    roadApron.position.set(0, -0.012, parkingLayout.boardOffsetZ);
    roadApron.receiveShadow = true;
    this.levelRoot.add(roadApron);

    const asphaltMaterial = new THREE.MeshStandardMaterial({
      color: parkingSceneColors.asphalt,
      roughness: 0.91,
      metalness: 0.015,
    });
    const lot = new THREE.Mesh(
      new THREE.BoxGeometry(parkingLayout.lotWidth, parkingLayout.lotHeight, parkingLayout.lotDepth),
      asphaltMaterial,
    );
    lot.position.set(0, parkingLayout.lotY, parkingLayout.boardOffsetZ);
    lot.receiveShadow = true;
    lot.castShadow = true;
    this.levelRoot.add(lot);

    const halfWidth = parkingLayout.lotWidth / 2;
    const halfDepth = parkingLayout.lotDepth / 2;
    const exitPlacements: ReadonlyArray<readonly [ReturnType<typeof createExitChevron>, number, number]> = [
      [createExitChevron(trafficDirections.up), 0, parkingLayout.boardOffsetZ + halfDepth + parkingLayout.exitChevronOffset],
      [createExitChevron(trafficDirections.down), 0, parkingLayout.boardOffsetZ - halfDepth - parkingLayout.exitChevronOffset],
      [createExitChevron(trafficDirections.right), halfWidth + parkingLayout.exitChevronOffset, parkingLayout.boardOffsetZ],
      [createExitChevron(trafficDirections.left), -halfWidth - parkingLayout.exitChevronOffset, parkingLayout.boardOffsetZ],
    ];
    for (const [marker, x, z] of exitPlacements) {
      marker.position.set(x, 0.045, z);
      this.levelRoot.add(marker);
    }

    const markingMaterial = new THREE.MeshBasicMaterial({
      color: parkingSceneColors.marking,
      transparent: true,
      opacity: 0.9,
    });
    for (let lineIndex = 1; lineIndex < trafficRules.boardColumns; lineIndex += trafficRules.cellStep) {
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(0.025, 0.012, parkingLayout.lotDepth * 0.94),
        markingMaterial,
      );
      line.position.set(
        -halfWidth + lineIndex * parkingLayout.cellSize,
        0.155,
        parkingLayout.boardOffsetZ,
      );
      line.visible = lineIndex % 2 === 0;
      this.levelRoot.add(line);
    }

    const dashedLineGeometry = new THREE.BoxGeometry(0.055, 0.014, 0.46);
    for (let z = -2.05; z > -8; z -= 0.82) {
      const dash = new THREE.Mesh(dashedLineGeometry, markingMaterial);
      dash.position.set(0, 0.07, z);
      this.levelRoot.add(dash);
    }

    for (let bayIndex = 0; bayIndex < parkingLayout.bayX.length; bayIndex += trafficRules.cellStep) {
      const marker = createBayMarker(bayIndex < level.bayCount);
      marker.position.set(parkingLayout.bayX[bayIndex], 0, parkingLayout.bayZ);
      this.bayMarkers.push(marker);
      this.levelRoot.add(marker);
    }

    const queuePlatform = new THREE.Mesh(
      new THREE.BoxGeometry(7.1, 0.1, 1.45),
      new THREE.MeshStandardMaterial({
        color: parkingSceneColors.concrete,
        roughness: 0.96,
      }),
    );
    queuePlatform.position.set(0, -0.015, -5.72);
    queuePlatform.receiveShadow = true;
    this.levelRoot.add(queuePlatform);

    const railMaterial = new THREE.MeshStandardMaterial({
      color: parkingSceneColors.concreteDark,
      roughness: 0.72,
      metalness: 0.18,
    });
    for (const z of [-5.25, -6.22]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.07, 0.07), railMaterial);
      rail.position.set(0, 0.18, z);
      rail.castShadow = true;
      this.levelRoot.add(rail);
    }

    const decorations: Array<[THREE.Object3D, number, number]> = [
      [createTree(0.95), -4.55, 4.65],
      [createTree(0.78), 4.65, 4.0],
      [createTree(0.7), -4.7, -1.8],
      [createLamp(), -4.05, 1.35],
      [createLamp(), 4.05, 1.35],
    ];
    for (const [decoration, x, z] of decorations) {
      decoration.position.set(x, 0, z);
      this.levelRoot.add(decoration);
    }
  }

  private clearLevel(): void {
    this.targetColor = null;
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

  private bayPosition(bayIndex: number): THREE.Vector3 {
    return new THREE.Vector3(
      parkingLayout.bayX[bayIndex] ?? parkingLayout.bayX[trafficRules.firstIndex],
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
    const targetBay = this.bayPosition(bayIndex);
    const side = start.x >= 0 ? 1 : -1;
    const points: Array<THREE.Vector3> = [start.clone()];

    if (car.direction === trafficDirections.down) {
      exit.z = parkingLayout.boardOffsetZ - halfDepth - parkingLayout.exitMargin;
      points.push(exit, new THREE.Vector3(start.x, parkingLayout.carY, parkingLayout.roadMergeZ));
    } else if (car.direction === trafficDirections.up) {
      exit.z = parkingLayout.boardOffsetZ + halfDepth + parkingLayout.exitMargin;
      const sideX = side * parkingLayout.outerRoadX;
      points.push(
        exit,
        new THREE.Vector3(sideX, parkingLayout.carY, exit.z + 0.18),
        new THREE.Vector3(sideX, parkingLayout.carY, parkingLayout.roadMergeZ),
      );
    } else if (car.direction === trafficDirections.right) {
      exit.x = halfWidth + parkingLayout.exitMargin;
      points.push(
        exit,
        new THREE.Vector3(parkingLayout.outerRoadX, parkingLayout.carY, parkingLayout.roadMergeZ),
      );
    } else {
      exit.x = -halfWidth - parkingLayout.exitMargin;
      points.push(
        exit,
        new THREE.Vector3(-parkingLayout.outerRoadX, parkingLayout.carY, parkingLayout.roadMergeZ),
      );
    }

    points.push(
      new THREE.Vector3(targetBay.x, parkingLayout.carY, parkingLayout.roadMergeZ - 0.2),
      targetBay,
    );
    return dedupePoints(points);
  }

  private layoutPassengerQueue(animate: boolean): void {
    for (let index = 0; index < this.passengerModels.length; index += trafficRules.cellStep) {
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
    for (let index = 0; index < this.passengerModels.length; index += trafficRules.cellStep) {
      const person = this.passengerModels[index];
      if (person !== undefined && !person.userData.leaving) {
        setPersonPriority(person, index === trafficRules.firstIndex);
      }
    }
  }

  private restoreGuidance(): void {
    if (this.currentLevel !== null && this.currentState !== null) {
      this.syncGuidance(this.currentLevel, this.currentState);
    }
  }

  private updateIdleMotion(timestamp: number, deltaSeconds: number): void {
    const time = timestamp / 1000;
    const targetPulse = 0.5 + Math.sin(time * 4.2) * 0.5;

    for (const person of this.passengerModels) {
      if (person.userData.leaving) {
        continue;
      }
      const target = person.userData.queueTarget;
      const blend = 1 - Math.pow(0.002, deltaSeconds);
      person.position.x = THREE.MathUtils.lerp(person.position.x, target.x, blend);
      person.position.z = THREE.MathUtils.lerp(person.position.z, target.z, blend);
      person.position.y = target.y + Math.sin(time * 2.2 + person.userData.phase) * 0.017;
      person.rotation.y = Math.sin(time * 0.8 + person.userData.phase) * 0.08;

      if (person.userData.priority) {
        const scale = person.userData.baseScale
          * (parkingLayout.passengerPriorityScale + targetPulse * 0.035);
        person.scale.setScalar(scale);
        person.userData.priorityRing.material.opacity = 0.42 + targetPulse * 0.38;
        person.userData.priorityMarker.position.y = 1.35 + targetPulse * 0.08;
        person.userData.priorityMarker.rotation.y += deltaSeconds * 1.6;
      } else {
        person.scale.setScalar(person.userData.baseScale);
      }
    }

    for (const model of this.carModels.values()) {
      const strength = model.userData.guidanceStrength;
      if (strength <= 0) {
        model.userData.guidanceHalo.material.opacity = 0;
        model.userData.directionBadge.scale.setScalar(1);
        continue;
      }
      const opacity = (
        parkingLayout.targetPulseMinimum
        + targetPulse * (parkingLayout.targetPulseMaximum - parkingLayout.targetPulseMinimum)
      ) * strength;
      model.userData.guidanceHalo.material.opacity = opacity;
      model.userData.directionBadge.scale.setScalar(
        model.userData.recommended
          ? 1 + targetPulse * parkingLayout.recommendedPulseScale
          : 1,
      );
    }

    for (let index = 0; index < this.bayMarkers.length; index += trafficRules.cellStep) {
      const marker = this.bayMarkers[index];
      if (marker !== undefined) {
        marker.position.y = Math.sin(time * 1.4 + index) * 0.008;
      }
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
    this.shakeStrength *= 0.88;
  }

  private updateTweens(timestamp: number): void {
    for (let index = this.tweens.length - trafficRules.cellStep; index >= trafficRules.firstIndex; index -= trafficRules.cellStep) {
      const tween = this.tweens[index];
      if (tween === undefined) {
        continue;
      }
      const rawProgress = Math.min(1, Math.max(0, (timestamp - tween.startedAt) / tween.durationMs));
      tween.update(tween.easing(rawProgress));
      if (rawProgress >= 1) {
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
        resolve,
        easing,
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

  private animatePersonLegs(person: PersonModel, phase: number): void {
    const leftLeg = person.getObjectByName('left-leg');
    const rightLeg = person.getObjectByName('right-leg');
    if (leftLeg !== undefined) {
      leftLeg.rotation.x = Math.sin(phase) * 0.5;
    }
    if (rightLeg !== undefined) {
      rightLeg.rotation.x = -Math.sin(phase) * 0.5;
    }
  }

  private setCarEmissive(car: CarModel, color: number, intensity: number): void {
    for (const material of car.userData.bodyMaterials) {
      material.emissive.setHex(color);
      material.emissiveIntensity = intensity;
    }
  }

  private spawnCoins(carId: string, count: number): void {
    const car = this.carModels.get(carId);
    if (car === undefined || count <= trafficRules.emptyCollectionSize) {
      return;
    }
    const origin = car.position.clone().add(new THREE.Vector3(0, 0.9, 0));
    const coins: Array<THREE.Mesh> = [];
    for (let index = 0; index < count; index += trafficRules.cellStep) {
      const coin = createCoinModel();
      coin.position.copy(origin);
      coin.position.x += (index - (count - 1) / 2) * 0.12;
      coins.push(coin);
      this.effectsRoot.add(coin);
    }

    this.tween(880, (progress) => {
      for (let index = 0; index < coins.length; index += trafficRules.cellStep) {
        const coin = coins[index];
        if (coin === undefined) {
          continue;
        }
        const spread = (index - (coins.length - 1) / 2) * 0.42;
        coin.position.x = origin.x + spread * Math.sin(progress * Math.PI);
        coin.position.y = origin.y + Math.sin(progress * Math.PI) * (1.15 + index * 0.06);
        coin.position.z = origin.z - progress * 0.8;
        coin.rotation.y += 0.25;
        if (progress > 0.72) {
          setObjectOpacity(coin, 1 - ((progress - 0.72) / 0.28));
        }
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

function dampAngle(current: number, target: number, amount: number): number {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + delta * amount;
}

function linear(progress: number): number {
  return progress;
}

function easeInCubic(progress: number): number {
  return progress * progress * progress;
}

function easeOutCubic(progress: number): number {
  return 1 - Math.pow(1 - progress, 3);
}

function easeInOutCubic(progress: number): number {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}
