#!/usr/bin/env bash
set -euo pipefail

mkdir -p games/junkyard-station/runtime/assets/scenes
cp games/traffic-jam/runtime/assets/scenes/main.scene.json \
  games/junkyard-station/runtime/assets/scenes/main.scene.json

cat > games/hub/catalog.js <<'EOF'
export const hubGameIds = {
  parkingJam: 'parking-jam',
  junkyardStation: 'junkyard-station',
};

export const hubGameCatalog = [
  {
    id: hubGameIds.junkyardStation,
    title: 'Junkyard Station',
    description: 'Walk, collect, process, serve customers, and improve a roadside junkyard.',
    path: './games/junkyard-station/',
    icon: 'junkyard',
    badge: 'World-kit base',
  },
  {
    id: hubGameIds.parkingJam,
    title: 'Parking Jam',
    description: 'Release the right cars, board passenger groups, and keep the pickup bays moving.',
    path: './games/parking-jam/',
    icon: 'parking',
    badge: 'Puzzle',
  },
];
EOF

cat > games/hub/index.html <<'EOF'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#e9c982" />
    <meta name="description" content="A compact hub for original Slop browser games." />
    <link
      rel="icon"
      href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='18' fill='%23e4793e'/%3E%3Cpath d='M43 18c-4-3-9-5-14-5-8 0-14 4-14 11 0 8 7 10 14 12 5 1 8 2 8 5 0 3-3 5-8 5-5 0-10-2-14-6l-5 8c5 5 12 8 20 8 10 0 17-5 17-14 0-8-6-11-15-13-5-1-7-2-7-5 0-2 2-4 6-4 4 0 8 2 11 5z' fill='%23fff5d9'/%3E%3C/svg%3E"
    />
    <title>Slop Games</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <main id="slop-game-hub">
      <div class="hub-landscape" aria-hidden="true"></div>
      <div class="hub-shell">
        <header class="hub-heading">
          <div class="hub-heading__copy">
            <span class="hub-kicker">Small worlds · one tap away</span>
            <h1>Slop Games</h1>
            <p>
              Pick a compact game. Each one runs as an independent build while sharing
              the same quality gates and reusable gameplay foundations.
            </p>
          </div>
          <div class="hub-mark" aria-hidden="true">S</div>
        </header>
        <section class="game-grid" data-game-list aria-label="Available games"></section>
        <p class="hub-note">Original prototypes. No copied store assets or source code.</p>
      </div>
    </main>
    <script type="module" src="./app.js"></script>
  </body>
</html>
EOF

cat > games/shared/game-shell/navigation.ts <<'EOF'
const gameNavigationUi = {
  styleId: 'slop-game-navigation-style',
  className: 'slop-game-nav',
  labelPrefix: 'Back to game hub from',
  arrow: '←',
} as const;

const gameNavigationPlacements: Readonly<Record<string, 'top' | 'bottom'>> = {
  'parking-jam': 'bottom',
  'junkyard-station': 'top',
};

const gameNavigationStyles = `
  .slop-game-nav {
    position: fixed;
    left: max(12px, env(safe-area-inset-left));
    z-index: 10000;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border: 0;
    border-radius: 16px;
    background: #fff8e6;
    color: #263238;
    box-shadow: 0 8px 20px rgb(39 48 54 / 24%);
    font: 800 24px/1 system-ui, sans-serif;
    text-decoration: none;
    -webkit-tap-highlight-color: transparent;
  }

  .slop-game-nav[data-placement="top"] {
    top: max(12px, env(safe-area-inset-top));
  }

  .slop-game-nav[data-placement="bottom"] {
    bottom: max(12px, env(safe-area-inset-bottom));
  }

  .slop-game-nav:hover,
  .slop-game-nav:focus-visible {
    transform: translateY(-1px);
    background: #ffffff;
    outline: 3px solid #ffbf47;
    outline-offset: 2px;
  }
`;

export function mountGameNavigation(
  parent: HTMLElement,
  gameName: string,
  gameId: string,
): () => void {
  installGameNavigationStyles();
  const link = document.createElement('a');
  link.className = gameNavigationUi.className;
  link.href = resolveHubUrl();
  link.textContent = gameNavigationUi.arrow;
  link.dataset.gameId = gameId;
  link.dataset.placement = gameNavigationPlacements[gameId] ?? 'bottom';
  link.setAttribute('aria-label', `${gameNavigationUi.labelPrefix} ${gameName}`);
  parent.append(link);
  return () => link.remove();
}

function resolveHubUrl(): string {
  const url = new URL('../../', window.location.href);
  url.search = '';
  url.hash = '';
  return url.toString();
}

function installGameNavigationStyles(): void {
  if (document.getElementById(gameNavigationUi.styleId) !== null) {
    return;
  }
  const style = document.createElement('style');
  style.id = gameNavigationUi.styleId;
  style.textContent = gameNavigationStyles;
  document.head.append(style);
}
EOF

cat > games/traffic-jam/runtime/setup.ts <<'EOF'
import { mountGameNavigation } from '../../shared/game-shell/navigation.ts';
import {
  mountParkingJam,
  unmountParkingJam,
} from './presentation/app.ts';

let registered = false;
let unmountNavigation: (() => void) | null = null;

export function registerGameSystems(): void {
  if (registered || typeof document === 'undefined') {
    return;
  }
  registered = true;
  mountParkingJam(document.body);
  unmountNavigation = mountGameNavigation(
    document.body,
    'Parking Jam',
    'parking-jam',
  );
}

export function unregisterGameSystems(): void {
  if (!registered || typeof document === 'undefined') {
    return;
  }
  registered = false;
  unmountNavigation?.();
  unmountNavigation = null;
  unmountParkingJam();
}
EOF

cat > games/junkyard-station/runtime/setup.ts <<'EOF'
import { mountGameNavigation } from '../../shared/game-shell/navigation.ts';
import {
  mountJunkyardStation,
  unmountJunkyardStation,
} from './presentation/app.ts';

let registered = false;
let unmountNavigation: (() => void) | null = null;

export function registerGameSystems(): void {
  if (registered || typeof document === 'undefined') {
    return;
  }
  registered = true;
  mountJunkyardStation(document.body);
  unmountNavigation = mountGameNavigation(
    document.body,
    'Junkyard Station',
    'junkyard-station',
  );
}

export function unregisterGameSystems(): void {
  if (!registered || typeof document === 'undefined') {
    return;
  }
  registered = false;
  unmountNavigation?.();
  unmountNavigation = null;
  unmountJunkyardStation();
}
EOF

cat > games/shared/world-kit/domain/simulation.ts <<'EOF'
import {
  applyWorldResourceEffect,
  getMissingWorldResources,
  sanitizeWorldResources,
} from './resource-ledger.ts';
import {
  worldEventTypes,
  worldInteractionModes,
  worldSimulationRules,
} from './registry.ts';
import type {
  WalkWorldDefinition,
  WalkWorldInput,
  WalkWorldState,
  WalkWorldStepResult,
  WorldActiveInteraction,
  WorldDomainEvent,
  WorldInteractionDefinition,
  WorldPoint,
} from './types.ts';

export function createWalkWorldState(
  definition: WalkWorldDefinition,
  initialResources: Readonly<Record<string, number>> = {},
): WalkWorldState {
  const cooldownsMs: Record<string, number> = {};
  for (const interaction of definition.interactions) {
    cooldownsMs[interaction.id] = worldSimulationRules.zero;
  }
  return {
    player: { ...definition.spawn },
    resources: sanitizeWorldResources(initialResources),
    cooldownsMs,
    proximityId: findNearestInteractionId(definition, definition.spawn),
    activeInteraction: null,
    revision: worldSimulationRules.firstRevision,
  };
}

export function advanceWalkWorld(
  definition: WalkWorldDefinition,
  state: WalkWorldState,
  input: WalkWorldInput,
  deltaMs: number,
): WalkWorldStepResult {
  const stepMs = clamp(
    deltaMs,
    worldSimulationRules.zero,
    worldSimulationRules.maximumStepMs,
  );
  const events: Array<WorldDomainEvent> = [];
  let nextState = tickCooldowns(state, stepMs);
  if (nextState.activeInteraction !== null) {
    const interaction = getWorldInteraction(
      definition,
      nextState.activeInteraction.interactionId,
    );
    nextState = advanceActiveInteraction(definition, nextState, stepMs, events);
    if (nextState.activeInteraction === null || interaction?.lockMovement !== false) {
      return { state: nextState, events };
    }
  }
  nextState = moveAndMeasureProximity(
    definition,
    nextState,
    input,
    stepMs,
    events,
  );
  return tryStartInteraction(definition, nextState, input, events);
}

export function findNearestInteractionId(
  definition: WalkWorldDefinition,
  point: WorldPoint,
): string | null {
  let nearest: WorldInteractionDefinition | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const interaction of definition.interactions) {
    const distance = squaredDistance(point, interaction.position);
    if (distance > interaction.radius * interaction.radius) {
      continue;
    }
    const closer = distance < nearestDistance - worldSimulationRules.distanceTieEpsilon;
    const tied = Math.abs(distance - nearestDistance)
      <= worldSimulationRules.distanceTieEpsilon;
    if (closer || (tied && interaction.id < (nearest?.id ?? interaction.id))) {
      nearest = interaction;
      nearestDistance = distance;
    }
  }
  return nearest?.id ?? null;
}

export function getWorldInteraction(
  definition: WalkWorldDefinition,
  interactionId: string,
): WorldInteractionDefinition | null {
  return definition.interactions.find(
    (interaction) => interaction.id === interactionId,
  ) ?? null;
}

export function getWorldResource(
  state: WalkWorldState,
  resourceId: string,
): number {
  return state.resources[resourceId] ?? worldSimulationRules.zero;
}

function moveAndMeasureProximity(
  definition: WalkWorldDefinition,
  state: WalkWorldState,
  input: WalkWorldInput,
  stepMs: number,
  events: Array<WorldDomainEvent>,
): WalkWorldState {
  const player = movePlayer(definition, state.player, input, stepMs);
  const proximityId = findNearestInteractionId(definition, player);
  if (proximityId !== state.proximityId) {
    events.push({
      type: worldEventTypes.proximityChanged,
      interactionId: proximityId,
    });
  }
  if (
    player.x === state.player.x
    && player.z === state.player.z
    && proximityId === state.proximityId
  ) {
    return state;
  }
  return updateState(state, { player, proximityId });
}

function tryStartInteraction(
  definition: WalkWorldDefinition,
  state: WalkWorldState,
  input: WalkWorldInput,
  events: Array<WorldDomainEvent>,
): WalkWorldStepResult {
  const interaction = state.proximityId === null
    ? null
    : getWorldInteraction(definition, state.proximityId);
  if (interaction === null || !shouldStartInteraction(interaction, input)) {
    return { state, events };
  }
  if ((state.cooldownsMs[interaction.id] ?? worldSimulationRules.zero) > 0) {
    return { state, events };
  }
  const missing = getMissingWorldResources(
    state.resources,
    interaction.effect.costs,
  );
  if (missing.length > worldSimulationRules.zero) {
    if (input.interact) {
      events.push({
        type: worldEventTypes.interactionBlocked,
        interactionId: interaction.id,
        missing,
      });
    }
    return { state, events };
  }
  const durationMs = Math.max(
    worldSimulationRules.minimumInteractionDurationMs,
    interaction.durationMs,
  );
  const activeInteraction: WorldActiveInteraction = {
    interactionId: interaction.id,
    remainingMs: durationMs,
    totalMs: durationMs,
  };
  events.push({
    type: worldEventTypes.interactionStarted,
    interactionId: interaction.id,
    durationMs,
  });
  return {
    state: updateState(state, { activeInteraction }),
    events,
  };
}

function advanceActiveInteraction(
  definition: WalkWorldDefinition,
  state: WalkWorldState,
  stepMs: number,
  events: Array<WorldDomainEvent>,
): WalkWorldState {
  const active = state.activeInteraction;
  if (active === null) {
    return state;
  }
  const remainingMs = Math.max(
    worldSimulationRules.zero,
    active.remainingMs - stepMs,
  );
  if (remainingMs > worldSimulationRules.zero) {
    return updateState(state, {
      activeInteraction: { ...active, remainingMs },
    });
  }
  const interaction = getWorldInteraction(definition, active.interactionId);
  if (interaction === null) {
    return updateState(state, { activeInteraction: null });
  }
  const missing = getMissingWorldResources(
    state.resources,
    interaction.effect.costs,
  );
  if (missing.length > worldSimulationRules.zero) {
    events.push({
      type: worldEventTypes.interactionBlocked,
      interactionId: interaction.id,
      missing,
    });
    return updateState(state, { activeInteraction: null });
  }
  const resources = applyWorldResourceEffect(
    state.resources,
    interaction.effect.costs,
    interaction.effect.rewards,
  );
  const cooldownsMs = {
    ...state.cooldownsMs,
    [interaction.id]: Math.max(worldSimulationRules.zero, interaction.cooldownMs),
  };
  events.push({
    type: worldEventTypes.interactionCompleted,
    interactionId: interaction.id,
    costs: interaction.effect.costs,
    rewards: interaction.effect.rewards,
  });
  return updateState(state, {
    resources,
    cooldownsMs,
    activeInteraction: null,
  });
}

function movePlayer(
  definition: WalkWorldDefinition,
  point: WorldPoint,
  input: WalkWorldInput,
  stepMs: number,
): WorldPoint {
  const magnitude = Math.hypot(input.moveX, input.moveZ);
  if (magnitude <= worldSimulationRules.movementEpsilon || stepMs <= 0) {
    return point;
  }
  const normalization = magnitude > 1 ? 1 / magnitude : 1;
  const distance = definition.movementSpeedPerSecond * stepMs / 1000;
  return {
    x: clamp(
      point.x + input.moveX * normalization * distance,
      definition.bounds.minimumX,
      definition.bounds.maximumX,
    ),
    z: clamp(
      point.z + input.moveZ * normalization * distance,
      definition.bounds.minimumZ,
      definition.bounds.maximumZ,
    ),
  };
}

function tickCooldowns(state: WalkWorldState, stepMs: number): WalkWorldState {
  let changed = false;
  const cooldownsMs: Record<string, number> = {};
  for (const [interactionId, remainingMs] of Object.entries(state.cooldownsMs)) {
    const nextRemaining = Math.max(worldSimulationRules.zero, remainingMs - stepMs);
    cooldownsMs[interactionId] = nextRemaining;
    changed ||= nextRemaining !== remainingMs;
  }
  return changed ? updateState(state, { cooldownsMs }) : state;
}

function shouldStartInteraction(
  interaction: WorldInteractionDefinition,
  input: WalkWorldInput,
): boolean {
  return interaction.mode === worldInteractionModes.automatic || input.interact;
}

function updateState(
  state: WalkWorldState,
  patch: Partial<Omit<WalkWorldState, 'revision'>>,
): WalkWorldState {
  return { ...state, ...patch, revision: state.revision + 1 };
}

function squaredDistance(left: WorldPoint, right: WorldPoint): number {
  const deltaX = left.x - right.x;
  const deltaZ = left.z - right.z;
  return deltaX * deltaX + deltaZ * deltaZ;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
EOF

cat > games/shared/world-kit/presentation/scene.ts <<'EOF'
import * as THREE from 'three';

import type {
  WalkWorldDefinition,
  WalkWorldState,
  WorldDomainEvent,
} from '../domain/types.ts';
import {
  createWalkerVisual,
  disposeWorldObject,
  type WalkerVisual,
} from './models.ts';
import type { WorldQualityProfile } from './quality.ts';
import {
  StationFeedbackController,
  type WorldStationVisual,
} from './station-feedback.ts';
import { WalkerMotionController } from './walker-motion.ts';
import { configureWorldEnvironment } from './world-environment.ts';

export type { WorldStationVisual } from './station-feedback.ts';

const worldSceneTuning = {
  cameraHeight: 9.5,
  cameraOffsetX: 7.6,
  cameraOffsetZ: 8.8,
  cameraViewHeight: 10.8,
  cameraNear: 0.1,
  cameraFar: 80,
} as const;

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
  private readonly canvas = document.createElement('canvas');
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera();
  private readonly worldRoot = new THREE.Group();
  private readonly walker: WalkerVisual;
  private readonly motion: WalkerMotionController;
  private readonly stationFeedback: StationFeedbackController;
  private readonly cameraOffset = new THREE.Vector3(
    worldSceneTuning.cameraOffsetX,
    worldSceneTuning.cameraHeight,
    worldSceneTuning.cameraOffsetZ,
  );
  private disposed = false;

  public constructor(private readonly options: WalkWorldSceneOptions) {
    this.canvas.className = 'junkyard-canvas';
    this.canvas.setAttribute('aria-label', '3D walkable junkyard');
    options.host.append(this.canvas);
    this.renderer = this.createRenderer();
    configureWorldEnvironment({
      scene: this.scene,
      root: this.worldRoot,
      definition: options.definition,
      quality: options.quality,
      backgroundColor: options.backgroundColor,
      fogColor: options.fogColor,
      groundColor: options.groundColor,
      decorate: options.decorate,
    });
    this.walker = createWalkerVisual(
      options.playerShirtColor,
      options.playerAccentColor,
    );
    this.walker.root.position.set(
      options.definition.spawn.x,
      0,
      options.definition.spawn.z,
    );
    this.worldRoot.add(this.walker.root);
    this.motion = new WalkerMotionController(options.definition.spawn);
    this.stationFeedback = new StationFeedbackController(
      this.worldRoot,
      options.stationVisuals,
    );
    window.addEventListener('resize', this.resize);
    this.resize();
  }

  public update(state: WalkWorldState, deltaSeconds: number): void {
    this.motion.update(this.walker, state.player, deltaSeconds);
    this.motion.followCamera(this.camera, this.cameraOffset);
    this.stationFeedback.update(state, deltaSeconds);
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public markEvent(event: WorldDomainEvent): void {
    this.stationFeedback.markEvent(event);
  }

  public projectInteraction(
    interactionId: string,
  ): { x: number; y: number; visible: boolean } | null {
    return this.stationFeedback.project(
      interactionId,
      this.camera,
      this.canvas,
    );
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

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: this.options.quality.id !== 'low',
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio,
        this.options.quality.maximumPixelRatio,
      ),
    );
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = this.options.quality.shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    return renderer;
  }

  private readonly resize = (): void => {
    const width = Math.max(1, this.options.host.clientWidth);
    const height = Math.max(1, this.options.host.clientHeight);
    const halfHeight = worldSceneTuning.cameraViewHeight / 2;
    const aspect = width / height;
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
EOF

cat > games/junkyard-station/runtime/presentation/models.ts <<'EOF'
import * as THREE from 'three';

import type { WorldStationVisual } from '../../../shared/world-kit/presentation/station-feedback.ts';
import {
  junkyardStations,
  junkyardVisualKinds,
  type JunkyardStationDefinition,
} from '../definition.ts';
import { junkyardPalette } from './palette.ts';

export function createJunkyardStationVisuals(): ReadonlyArray<WorldStationVisual> {
  return junkyardStations.map((station) => {
    const root = createStationModel(station);
    root.position.set(
      station.interaction.position.x,
      0,
      station.interaction.position.z,
    );
    return {
      interactionId: station.interaction.id,
      root,
      accentColor: station.accentColor,
      anchorHeight: station.anchorHeight,
    };
  });
}

function createStationModel(station: JunkyardStationDefinition): THREE.Group {
  if (station.visualKind === junkyardVisualKinds.scrapPile) {
    return createScrapPile();
  }
  if (station.visualKind === junkyardVisualKinds.crusher) {
    return createCrusher();
  }
  if (station.visualKind === junkyardVisualKinds.fuelRack) {
    return createFuelRack();
  }
  if (station.visualKind === junkyardVisualKinds.customer) {
    return createCustomerStop();
  }
  return createUpgradePad(station.accentColor);
}

function createScrapPile(): THREE.Group {
  const root = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.25, 0.4, 9),
    createMaterial(junkyardPalette.steel, 0.92),
  );
  base.position.y = 0.2;
  base.scale.z = 0.75;
  root.add(base);
  const pieces: ReadonlyArray<readonly [number, number, number, number]> = [
    [-0.55, 0.62, 0.18, 0.7],
    [0.05, 0.72, -0.1, -0.45],
    [0.55, 0.48, 0.18, 0.9],
    [-0.15, 0.95, 0.2, 0.25],
  ];
  for (const [x, y, z, rotation] of pieces) {
    const piece = createBox(0.68, 0.22, 0.42, junkyardPalette.darkSteel);
    piece.position.set(x, y, z);
    piece.rotation.y = rotation;
    root.add(piece);
  }
  const tire = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.13, 8, 18),
    createMaterial(junkyardPalette.tire, 0.9),
  );
  tire.position.set(0.4, 0.78, -0.15);
  tire.rotation.x = Math.PI / 2.8;
  root.add(tire);
  return root;
}

function createCrusher(): THREE.Group {
  const root = new THREE.Group();
  const platform = createBox(2.25, 0.22, 1.7, junkyardPalette.darkSteel);
  platform.position.y = 0.11;
  const towerLeft = createBox(0.35, 2.45, 0.52, junkyardPalette.red);
  const towerRight = createBox(0.35, 2.45, 0.52, junkyardPalette.red);
  towerLeft.position.set(-0.86, 1.35, 0);
  towerRight.position.set(0.86, 1.35, 0);
  const beam = createBox(2.05, 0.42, 0.68, junkyardPalette.darkRed);
  beam.position.y = 2.45;
  const jaw = createBox(1.55, 0.32, 1.1, junkyardPalette.steel);
  jaw.position.y = 1.55;
  root.add(platform, towerLeft, towerRight, beam, jaw);
  return root;
}

function createFuelRack(): THREE.Group {
  const root = new THREE.Group();
  const tank = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.62, 1.8, 16),
    createMaterial(junkyardPalette.fuel, 0.76),
  );
  tank.rotation.z = Math.PI / 2;
  tank.position.y = 1.05;
  const stand = createBox(1.95, 0.22, 1.25, junkyardPalette.darkSteel);
  stand.position.y = 0.11;
  const pump = createBox(0.62, 1.35, 0.58, junkyardPalette.cream);
  pump.position.set(0.92, 0.78, 0.15);
  const screen = createBox(0.38, 0.3, 0.05, junkyardPalette.glass);
  screen.position.set(0.92, 1.04, 0.46);
  root.add(stand, tank, pump, screen);
  return root;
}

function createCustomerStop(): THREE.Group {
  const root = new THREE.Group();
  const car = createBox(2.25, 0.62, 1.18, junkyardPalette.customerShirt);
  car.position.set(0.25, 0.52, -0.2);
  const cabin = createBox(1.1, 0.5, 1.02, junkyardPalette.glass);
  cabin.position.set(0.05, 1.02, -0.2);
  root.add(car, cabin);
  for (const x of [-0.62, 0.88]) {
    for (const z of [-0.67, 0.27]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, 0.18, 12),
        createMaterial(junkyardPalette.tire, 0.9),
      );
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.32, z);
      wheel.castShadow = true;
      root.add(wheel);
    }
  }
  const customer = createSimplePerson();
  customer.position.set(-1.35, 0, 0.35);
  root.add(customer);
  return root;
}

function createUpgradePad(color: number): THREE.Group {
  const root = new THREE.Group();
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.18, 0.16, 24),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.66,
      metalness: 0.08,
    }),
  );
  pad.position.y = 0.08;
  const arrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.35, 0.75, 4),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  );
  arrow.position.y = 0.62;
  arrow.rotation.y = Math.PI / 4;
  root.add(pad, arrow);
  return root;
}

function createSimplePerson(): THREE.Group {
  const root = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.22, 0.58, 5, 9),
    createMaterial(junkyardPalette.customerShirt, 0.82),
  );
  body.position.y = 0.84;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.19, 12, 8),
    createMaterial(junkyardPalette.skin, 0.86),
  );
  head.position.y = 1.4;
  const legs = createBox(0.34, 0.52, 0.26, junkyardPalette.customerTrousers);
  legs.position.y = 0.28;
  root.add(body, head, legs);
  return root;
}

function createBox(
  width: number,
  height: number,
  depth: number,
  color: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    createMaterial(color, 0.84),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createMaterial(
  color: number,
  roughness: number,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.02,
  });
}
EOF

python3 - <<'PY'
from pathlib import Path

path = Path('games/junkyard-station/runtime/presentation/ui.ts')
content = path.read_text()
old = """  elements.prompt.style.setProperty('--junkyard-accent', toCssColor(station.accentColor));
  elements.prompt.style.transform = `translate3d(${projected.x - 117}px, ${projected.y - 78}px, 0)`;
  elements.prompt.classList.add('is-visible');"""
new = """  elements.prompt.style.setProperty('--junkyard-accent', toCssColor(station.accentColor));
  const left = Math.min(window.innerWidth - 247, Math.max(12, projected.x - 117));
  const top = Math.min(window.innerHeight - 90, Math.max(72, projected.y - 78));
  elements.prompt.style.transform = `translate3d(${left}px, ${top}px, 0)`;
  elements.prompt.classList.add('is-visible');"""
if old in content:
    path.write_text(content.replace(old, new))

style_path = Path('games/junkyard-station/runtime/presentation/styles.ts')
style_lines = style_path.read_text().splitlines()
if len(style_lines) > 320:
    compact = [line for line in style_lines if line.strip()]
    style_path.write_text('\n'.join(compact) + '\n')
PY
