#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

fetch_blob() {
  local sha="$1"
  local destination="$2"
  mkdir -p "$(dirname "$destination")"
  curl -fsSL \
    -H "Authorization: Bearer ${GITHUB_TOKEN}" \
    -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/${GITHUB_REPOSITORY}/git/blobs/${sha}" \
    | python3 -c 'import base64,json,sys; data=json.load(sys.stdin); sys.stdout.buffer.write(base64.b64decode(data["content"]))' \
    > "$destination"
}

rm -rf games/traffic-jam/runtime/domain games/traffic-jam/runtime/ui
mkdir -p games/traffic-jam/runtime/domain games/traffic-jam/runtime/ui games/traffic-jam/runtime/assets/scenes

fetch_blob c9f8898e86e3d6aabbdb48569581fc48f6520e6a games/traffic-jam/runtime/ui/scene.ts
fetch_blob 6ba06aae026c345703710250d32604a38d152d22 games/traffic-jam/runtime/ui/app.ts
fetch_blob c8227cfb1b5b1f543a67eec6221231d609fa0a23 games/traffic-jam/runtime/ui/models.ts
fetch_blob 77e58acd292158c2f440eacfb7e3430e39e75e0c games/traffic-jam/runtime/ui/styles.ts

python3 - <<'PY'
from pathlib import Path
path = Path('games/traffic-jam/runtime/ui/app.ts')
source = path.read_text()
source = source.replace(
    "    if (this.state.completed) {\n      this.scene.celebrate();\n",
    "    if (this.state.completed) {\n      this.commitReward();\n      this.updateHud();\n      this.scene.celebrate();\n",
)
source = source.replace(
    "    this.showMessage(parkingUiCopy.hint);\n    await this.scene.highlightCar(carId);\n    this.showMessage(parkingUiCopy.instruction);\n",
    "    this.setBusy(true);\n    this.showMessage(parkingUiCopy.hint);\n    await this.scene.highlightCar(carId);\n    this.setBusy(false);\n    this.showMessage(parkingUiCopy.instruction);\n",
)
path.write_text(source)
PY

cat > games/traffic-jam/runtime/domain/registry.ts <<'EOF'
export type ValueOf<T> = T[keyof T];

export const trafficDirections = {
  left: 'left',
  right: 'right',
  up: 'up',
  down: 'down',
} as const;

export const trafficColors = {
  coral: 'coral',
  blue: 'blue',
  mint: 'mint',
  yellow: 'yellow',
  violet: 'violet',
  orange: 'orange',
  teal: 'teal',
  pink: 'pink',
  lime: 'lime',
  sky: 'sky',
  red: 'red',
  indigo: 'indigo',
} as const;

export const trafficCarStatuses = {
  parked: 'parked',
  bay: 'bay',
  departed: 'departed',
} as const;

export const trafficRules = {
  boardColumns: 6,
  boardRows: 6,
  minimumVehicleLength: 2,
  maximumVehicleLength: 3,
  minimumCapacity: 1,
  maximumCapacity: 3,
  maximumBays: 3,
  initialScore: 0,
  initialCoins: 0,
  initialCombo: 1,
  maximumCombo: 9,
  passengerBasePoints: 100,
  departureBasePoints: 250,
  departureCoins: 3,
  initialMoveCount: 0,
  firstCoordinate: 0,
  firstIndex: 0,
  cellStep: 1,
  emptyCollectionSize: 0,
  noBayIndex: -1,
} as const;

export const trafficGame = {
  id: 'parking-jam',
  title: 'Parking Jam',
  progressStorageKey: 'slop.parking-jam.progress.v2',
  coinStorageKey: 'slop.parking-jam.coins.v2',
} as const;

export const trafficEvents = {
  carReleased: 'parking.car-released',
  passengerBoarded: 'parking.passenger-boarded',
  carDeparted: 'parking.car-departed',
  comboReset: 'parking.combo-reset',
  levelCompleted: 'parking.level-completed',
} as const;

export const trafficErrors = {
  carMissing: 'parking.car-missing',
  carUnavailable: 'parking.car-unavailable',
  pathBlocked: 'parking.path-blocked',
  noBayAvailable: 'parking.no-bay-available',
  levelCompleted: 'parking.level-completed',
  levelJammed: 'parking.level-jammed',
  invalidLevel: 'parking.invalid-level',
} as const;

export type TrafficDirection = ValueOf<typeof trafficDirections>;
export type TrafficColor = ValueOf<typeof trafficColors>;
export type TrafficCarStatus = ValueOf<typeof trafficCarStatuses>;
export type TrafficEventType = ValueOf<typeof trafficEvents>;
export type TrafficErrorCode = ValueOf<typeof trafficErrors>;
EOF

cat > games/traffic-jam/runtime/domain/types.ts <<'EOF'
import type {
  TrafficCarStatus,
  TrafficColor,
  TrafficDirection,
  TrafficErrorCode,
  TrafficEventType,
} from './registry.ts';

export interface TrafficCell {
  readonly x: number;
  readonly y: number;
}

export interface TrafficCarDefinition {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly length: number;
  readonly direction: TrafficDirection;
  readonly color: TrafficColor;
  readonly capacity: number;
}

export interface TrafficLevelDefinition {
  readonly id: string;
  readonly name: string;
  readonly objective: string;
  readonly bayCount: number;
  readonly cars: ReadonlyArray<TrafficCarDefinition>;
  readonly passengers: ReadonlyArray<TrafficColor>;
}

export interface TrafficCarProgress {
  readonly id: string;
  readonly status: TrafficCarStatus;
  readonly bayIndex: number | null;
  readonly passengers: number;
}

export interface TrafficState {
  readonly levelId: string;
  readonly cars: ReadonlyArray<TrafficCarProgress>;
  readonly passengers: ReadonlyArray<TrafficColor>;
  readonly score: number;
  readonly coins: number;
  readonly combo: number;
  readonly moves: number;
  readonly completed: boolean;
  readonly jammed: boolean;
}

export interface TrafficDomainEvent {
  readonly type: TrafficEventType;
  readonly carId: string | null;
  readonly bayIndex: number | null;
  readonly seatIndex: number | null;
  readonly points: number;
  readonly coins: number;
  readonly comboAfter: number;
  readonly scoreAfter: number;
  readonly queueRemaining: number;
}

export interface TrafficMoveAccepted {
  readonly ok: true;
  readonly state: TrafficState;
  readonly events: ReadonlyArray<TrafficDomainEvent>;
}

export interface TrafficMoveRejected {
  readonly ok: false;
  readonly error: TrafficErrorCode;
  readonly blockingCarIds: ReadonlyArray<string>;
}

export type TrafficMoveResult = TrafficMoveAccepted | TrafficMoveRejected;

export interface TrafficLevelAnalysis {
  readonly valid: boolean;
  readonly errors: ReadonlyArray<string>;
  readonly solution: ReadonlyArray<string> | null;
}
EOF

cat > games/traffic-jam/runtime/domain/rules.ts <<'EOF'
import {
  trafficCarStatuses,
  trafficDirections,
  trafficErrors,
  trafficEvents,
  trafficRules,
  type TrafficErrorCode,
} from './registry.ts';
import type {
  TrafficCarDefinition,
  TrafficCarProgress,
  TrafficCell,
  TrafficDomainEvent,
  TrafficLevelDefinition,
  TrafficMoveResult,
  TrafficState,
} from './types.ts';

export function createInitialTrafficState(level: TrafficLevelDefinition): TrafficState {
  return {
    levelId: level.id,
    cars: level.cars.map((car) => ({
      id: car.id,
      status: trafficCarStatuses.parked,
      bayIndex: null,
      passengers: trafficRules.emptyCollectionSize,
    })),
    passengers: [...level.passengers],
    score: trafficRules.initialScore,
    coins: trafficRules.initialCoins,
    combo: trafficRules.initialCombo,
    moves: trafficRules.initialMoveCount,
    completed: false,
    jammed: false,
  };
}

export function releaseTrafficCar(
  level: TrafficLevelDefinition,
  state: TrafficState,
  carId: string,
): TrafficMoveResult {
  if (state.completed) return reject(trafficErrors.levelCompleted);
  if (state.jammed) return reject(trafficErrors.levelJammed);

  const car = getTrafficCar(level, carId);
  const progress = getTrafficCarProgress(state, carId);
  if (car === null || progress === null) return reject(trafficErrors.carMissing);
  if (progress.status !== trafficCarStatuses.parked) return reject(trafficErrors.carUnavailable);

  const blockingCarIds = getBlockingCarIds(level, state, carId);
  if (blockingCarIds.length > trafficRules.emptyCollectionSize) {
    return { ok: false, error: trafficErrors.pathBlocked, blockingCarIds };
  }

  const bayIndex = findFreeBayIndex(level, state);
  if (bayIndex === trafficRules.noBayIndex) return reject(trafficErrors.noBayAvailable);

  const events: Array<TrafficDomainEvent> = [];
  let nextState: TrafficState = {
    ...state,
    cars: state.cars.map((candidate) => candidate.id === carId
      ? { ...candidate, status: trafficCarStatuses.bay, bayIndex }
      : candidate),
    moves: state.moves + trafficRules.cellStep,
    completed: false,
    jammed: false,
  };
  events.push(createEvent(trafficEvents.carReleased, nextState, carId, bayIndex));

  const resolution = resolvePassengerQueue(level, nextState);
  nextState = resolution.state;
  events.push(...resolution.events);

  if (!resolution.departed && nextState.combo > trafficRules.initialCombo) {
    nextState = { ...nextState, combo: trafficRules.initialCombo };
    events.push(createEvent(trafficEvents.comboReset, nextState, carId, bayIndex));
  }

  const completed = isTrafficLevelCompleted(nextState);
  nextState = {
    ...nextState,
    completed,
    jammed: completed ? false : isTrafficStateJammed(level, nextState),
  };
  if (completed) events.push(createEvent(trafficEvents.levelCompleted, nextState, null, null));

  return { ok: true, state: nextState, events };
}

export function getAvailableCarIds(
  level: TrafficLevelDefinition,
  state: TrafficState,
): ReadonlyArray<string> {
  if (state.completed || state.jammed || findFreeBayIndex(level, state) === trafficRules.noBayIndex) return [];
  return getLegallyReleasableCarIds(level, state);
}

export function getBlockingCarIds(
  level: TrafficLevelDefinition,
  state: TrafficState,
  carId: string,
): ReadonlyArray<string> {
  const car = getTrafficCar(level, carId);
  if (car === null) return [];

  const occupied = new Map<string, string>();
  for (const candidate of level.cars) {
    if (candidate.id === car.id) continue;
    const candidateProgress = getTrafficCarProgress(state, candidate.id);
    if (candidateProgress?.status !== trafficCarStatuses.parked) continue;
    for (const cell of getOccupiedCells(candidate)) occupied.set(toCellKey(cell), candidate.id);
  }

  const blockingCarIds = new Set<string>();
  for (const cell of getExitPathCells(car)) {
    const blockingCarId = occupied.get(toCellKey(cell));
    if (blockingCarId !== undefined) blockingCarIds.add(blockingCarId);
  }
  return [...blockingCarIds].sort();
}

export function getOccupiedCells(car: TrafficCarDefinition): ReadonlyArray<TrafficCell> {
  const cells: Array<TrafficCell> = [];
  for (let offset = trafficRules.firstCoordinate; offset < car.length; offset += trafficRules.cellStep) {
    cells.push(
      car.direction === trafficDirections.left || car.direction === trafficDirections.right
        ? { x: car.x + offset, y: car.y }
        : { x: car.x, y: car.y + offset },
    );
  }
  return cells;
}

export function getExitPathCells(car: TrafficCarDefinition): ReadonlyArray<TrafficCell> {
  const cells: Array<TrafficCell> = [];
  if (car.direction === trafficDirections.right) {
    for (let x = car.x + car.length; x < trafficRules.boardColumns; x += trafficRules.cellStep) cells.push({ x, y: car.y });
    return cells;
  }
  if (car.direction === trafficDirections.left) {
    for (let x = car.x - trafficRules.cellStep; x >= trafficRules.firstCoordinate; x -= trafficRules.cellStep) cells.push({ x, y: car.y });
    return cells;
  }
  if (car.direction === trafficDirections.down) {
    for (let y = car.y + car.length; y < trafficRules.boardRows; y += trafficRules.cellStep) cells.push({ x: car.x, y });
    return cells;
  }
  for (let y = car.y - trafficRules.cellStep; y >= trafficRules.firstCoordinate; y -= trafficRules.cellStep) cells.push({ x: car.x, y });
  return cells;
}

export function getTrafficCar(level: TrafficLevelDefinition, carId: string): TrafficCarDefinition | null {
  return level.cars.find((car) => car.id === carId) ?? null;
}

export function getTrafficCarProgress(state: TrafficState, carId: string): TrafficCarProgress | null {
  return state.cars.find((car) => car.id === carId) ?? null;
}

export function findFreeBayIndex(level: TrafficLevelDefinition, state: TrafficState): number {
  const occupiedBayIndices = new Set(
    state.cars
      .filter((car) => car.status === trafficCarStatuses.bay && car.bayIndex !== null)
      .map((car) => car.bayIndex as number),
  );
  for (let bayIndex = trafficRules.firstIndex; bayIndex < level.bayCount; bayIndex += trafficRules.cellStep) {
    if (!occupiedBayIndices.has(bayIndex)) return bayIndex;
  }
  return trafficRules.noBayIndex;
}

export function isTrafficStateJammed(level: TrafficLevelDefinition, state: TrafficState): boolean {
  if (state.completed || canFrontPassengerBoard(level, state)) return false;
  if (findFreeBayIndex(level, state) === trafficRules.noBayIndex) return true;
  return getLegallyReleasableCarIds(level, state).length === trafficRules.emptyCollectionSize;
}

function resolvePassengerQueue(
  level: TrafficLevelDefinition,
  initialState: TrafficState,
): { readonly state: TrafficState; readonly events: ReadonlyArray<TrafficDomainEvent>; readonly departed: boolean } {
  const events: Array<TrafficDomainEvent> = [];
  let state = initialState;
  let departed = false;

  while (state.passengers.length > trafficRules.emptyCollectionSize) {
    const passengerColor = state.passengers[trafficRules.firstIndex];
    const match = state.cars
      .filter((car) => car.status === trafficCarStatuses.bay && car.bayIndex !== null)
      .sort(compareBayCars)
      .find((carProgress) => {
        const car = getTrafficCar(level, carProgress.id);
        return car !== null && car.color === passengerColor && carProgress.passengers < car.capacity;
      });
    if (match === undefined || match.bayIndex === null) break;

    const car = getTrafficCar(level, match.id);
    if (car === null) break;

    const seatIndex = match.passengers;
    const passengerPoints = trafficRules.passengerBasePoints * state.combo;
    state = {
      ...state,
      passengers: state.passengers.slice(trafficRules.cellStep),
      cars: state.cars.map((candidate) => candidate.id === match.id
        ? { ...candidate, passengers: candidate.passengers + trafficRules.cellStep }
        : candidate),
      score: state.score + passengerPoints,
    };
    events.push(createEvent(trafficEvents.passengerBoarded, state, match.id, match.bayIndex, seatIndex, passengerPoints));

    const updatedProgress = getTrafficCarProgress(state, match.id);
    if (updatedProgress === null || updatedProgress.passengers < car.capacity) continue;

    departed = true;
    const departurePoints = trafficRules.departureBasePoints * state.combo;
    const departureCoins = trafficRules.departureCoins
      + Math.max(trafficRules.emptyCollectionSize, state.combo - trafficRules.initialCombo);
    const departureBayIndex = updatedProgress.bayIndex;
    const comboAfter = Math.min(trafficRules.maximumCombo, state.combo + trafficRules.cellStep);
    state = {
      ...state,
      cars: state.cars.map((candidate) => candidate.id === match.id
        ? { ...candidate, status: trafficCarStatuses.departed, bayIndex: null }
        : candidate),
      score: state.score + departurePoints,
      coins: state.coins + departureCoins,
      combo: comboAfter,
    };
    events.push(createEvent(
      trafficEvents.carDeparted,
      state,
      match.id,
      departureBayIndex,
      null,
      departurePoints,
      departureCoins,
    ));
  }
  return { state, events, departed };
}

function canFrontPassengerBoard(level: TrafficLevelDefinition, state: TrafficState): boolean {
  const passengerColor = state.passengers[trafficRules.firstIndex];
  if (passengerColor === undefined) return false;
  return state.cars.some((progress) => {
    if (progress.status !== trafficCarStatuses.bay) return false;
    const car = getTrafficCar(level, progress.id);
    return car !== null && car.color === passengerColor && progress.passengers < car.capacity;
  });
}

function getLegallyReleasableCarIds(level: TrafficLevelDefinition, state: TrafficState): ReadonlyArray<string> {
  return state.cars
    .filter((progress) => progress.status === trafficCarStatuses.parked)
    .map((progress) => progress.id)
    .filter((carId) => getBlockingCarIds(level, state, carId).length === trafficRules.emptyCollectionSize)
    .sort();
}

function isTrafficLevelCompleted(state: TrafficState): boolean {
  return state.passengers.length === trafficRules.emptyCollectionSize
    && state.cars.every((car) => car.status === trafficCarStatuses.departed);
}

function createEvent(
  type: typeof trafficEvents[keyof typeof trafficEvents],
  state: TrafficState,
  carId: string | null,
  bayIndex: number | null,
  seatIndex: number | null = null,
  points = trafficRules.initialScore,
  coins = trafficRules.initialCoins,
): TrafficDomainEvent {
  return {
    type,
    carId,
    bayIndex,
    seatIndex,
    points,
    coins,
    comboAfter: state.combo,
    scoreAfter: state.score,
    queueRemaining: state.passengers.length,
  };
}

function compareBayCars(left: TrafficCarProgress, right: TrafficCarProgress): number {
  return (left.bayIndex ?? trafficRules.maximumBays) - (right.bayIndex ?? trafficRules.maximumBays);
}

function reject(error: TrafficErrorCode): TrafficMoveResult {
  return { ok: false, error, blockingCarIds: [] };
}

function toCellKey(cell: TrafficCell): string {
  return `${cell.x}:${cell.y}`;
}
EOF

cat > games/traffic-jam/runtime/domain/solver.ts <<'EOF'
import { trafficErrors, trafficRules } from './registry.ts';
import {
  createInitialTrafficState,
  getAvailableCarIds,
  getOccupiedCells,
  releaseTrafficCar,
} from './rules.ts';
import type { TrafficLevelAnalysis, TrafficLevelDefinition, TrafficState } from './types.ts';

export function solveTrafficLevel(level: TrafficLevelDefinition): ReadonlyArray<string> | null {
  return solveTrafficState(level, createInitialTrafficState(level));
}

export function solveTrafficState(
  level: TrafficLevelDefinition,
  initialState: TrafficState,
): ReadonlyArray<string> | null {
  return solveState(level, initialState, new Set<string>());
}

export function analyzeTrafficLevel(level: TrafficLevelDefinition): TrafficLevelAnalysis {
  const errors = validateTrafficLevel(level);
  const solution = errors.length === trafficRules.emptyCollectionSize ? solveTrafficLevel(level) : null;
  if (solution === null && errors.length === trafficRules.emptyCollectionSize) errors.push(trafficErrors.invalidLevel);
  return { valid: errors.length === trafficRules.emptyCollectionSize && solution !== null, errors, solution };
}

export function validateTrafficLevel(level: TrafficLevelDefinition): Array<string> {
  const errors: Array<string> = [];
  const occupied = new Map<string, string>();
  const ids = new Set<string>();
  const seatCounts = new Map<string, number>();
  const passengerCounts = new Map<string, number>();

  if (level.bayCount < trafficRules.cellStep || level.bayCount > trafficRules.maximumBays) errors.push(`bays:${level.bayCount}`);

  for (const car of level.cars) {
    if (ids.has(car.id)) errors.push(`duplicate:${car.id}`);
    ids.add(car.id);
    if (car.length < trafficRules.minimumVehicleLength || car.length > trafficRules.maximumVehicleLength) errors.push(`length:${car.id}`);
    if (car.capacity < trafficRules.minimumCapacity || car.capacity > trafficRules.maximumCapacity) errors.push(`capacity:${car.id}`);
    seatCounts.set(car.color, (seatCounts.get(car.color) ?? trafficRules.emptyCollectionSize) + car.capacity);

    for (const cell of getOccupiedCells(car)) {
      if (
        cell.x < trafficRules.firstCoordinate || cell.y < trafficRules.firstCoordinate
        || cell.x >= trafficRules.boardColumns || cell.y >= trafficRules.boardRows
      ) errors.push(`bounds:${car.id}`);
      const key = `${cell.x}:${cell.y}`;
      const occupant = occupied.get(key);
      if (occupant !== undefined) errors.push(`overlap:${occupant}:${car.id}`);
      occupied.set(key, car.id);
    }
  }

  for (const color of level.passengers) {
    passengerCounts.set(color, (passengerCounts.get(color) ?? trafficRules.emptyCollectionSize) + trafficRules.cellStep);
  }
  const allColors = new Set([...seatCounts.keys(), ...passengerCounts.keys()]);
  for (const color of allColors) {
    if ((seatCounts.get(color) ?? trafficRules.emptyCollectionSize)
      !== (passengerCounts.get(color) ?? trafficRules.emptyCollectionSize)) errors.push(`manifest:${color}`);
  }
  return errors;
}

function solveState(
  level: TrafficLevelDefinition,
  state: TrafficState,
  visited: Set<string>,
): ReadonlyArray<string> | null {
  if (state.completed) return [];
  if (state.jammed) return null;
  const key = stateKey(state);
  if (visited.has(key)) return null;
  visited.add(key);

  for (const carId of getAvailableCarIds(level, state)) {
    const result = releaseTrafficCar(level, state, carId);
    if (!result.ok || result.state.jammed) continue;
    const suffix = solveState(level, result.state, visited);
    if (suffix !== null) return [carId, ...suffix];
  }
  return null;
}

function stateKey(state: TrafficState): string {
  const cars = state.cars
    .map((car) => `${car.id}:${car.status}:${car.bayIndex ?? 'x'}:${car.passengers}`)
    .join('|');
  return `${state.passengers.join(',')}#${cars}`;
}
EOF

cat > games/traffic-jam/runtime/domain/levels.ts <<'EOF'
import { trafficColors, trafficDirections } from './registry.ts';
import type { TrafficLevelDefinition } from './types.ts';

export const trafficLevels: ReadonlyArray<TrafficLevelDefinition> = [
  {
    id: 'parking-level-01',
    name: 'First pickup',
    objective: 'Bring the coral and blue cars to the pickup bays before the mint car.',
    bayCount: 2,
    cars: [
      { id: 'l1-coral', x: 0, y: 1, length: 2, direction: trafficDirections.left, color: trafficColors.coral, capacity: 2 },
      { id: 'l1-blue', x: 4, y: 3, length: 2, direction: trafficDirections.right, color: trafficColors.blue, capacity: 2 },
      { id: 'l1-mint', x: 2, y: 4, length: 2, direction: trafficDirections.down, color: trafficColors.mint, capacity: 2 },
    ],
    passengers: [trafficColors.coral, trafficColors.blue, trafficColors.coral, trafficColors.blue, trafficColors.mint, trafficColors.mint],
  },
  {
    id: 'parking-level-02',
    name: 'Three bays',
    objective: 'Read the queue. One early teal car is enough to block the whole pickup area.',
    bayCount: 3,
    cars: [
      { id: 'l2-yellow', x: 1, y: 0, length: 2, direction: trafficDirections.up, color: trafficColors.yellow, capacity: 2 },
      { id: 'l2-violet', x: 4, y: 1, length: 2, direction: trafficDirections.right, color: trafficColors.violet, capacity: 2 },
      { id: 'l2-orange', x: 0, y: 4, length: 2, direction: trafficDirections.left, color: trafficColors.orange, capacity: 2 },
      { id: 'l2-teal', x: 4, y: 4, length: 2, direction: trafficDirections.down, color: trafficColors.teal, capacity: 2 },
    ],
    passengers: [trafficColors.yellow, trafficColors.violet, trafficColors.orange, trafficColors.yellow, trafficColors.violet, trafficColors.orange, trafficColors.teal, trafficColors.teal],
  },
  {
    id: 'parking-level-03',
    name: 'Two waves',
    objective: 'Clear the first pair of colours, then bring in the second pair.',
    bayCount: 2,
    cars: [
      { id: 'l3-coral', x: 4, y: 0, length: 2, direction: trafficDirections.right, color: trafficColors.coral, capacity: 2 },
      { id: 'l3-mint', x: 0, y: 2, length: 2, direction: trafficDirections.left, color: trafficColors.mint, capacity: 2 },
      { id: 'l3-blue', x: 2, y: 4, length: 2, direction: trafficDirections.down, color: trafficColors.blue, capacity: 2 },
      { id: 'l3-yellow', x: 3, y: 0, length: 2, direction: trafficDirections.up, color: trafficColors.yellow, capacity: 2 },
    ],
    passengers: [trafficColors.coral, trafficColors.mint, trafficColors.coral, trafficColors.mint, trafficColors.blue, trafficColors.yellow, trafficColors.blue, trafficColors.yellow],
  },
  {
    id: 'parking-level-04',
    name: 'Blocked lane',
    objective: 'The coral car is blocking the blue one. Free that lane before filling the bays.',
    bayCount: 3,
    cars: [
      { id: 'l4-coral', x: 1, y: 0, length: 3, direction: trafficDirections.up, color: trafficColors.coral, capacity: 2 },
      { id: 'l4-blue', x: 2, y: 2, length: 2, direction: trafficDirections.left, color: trafficColors.blue, capacity: 2 },
      { id: 'l4-yellow', x: 4, y: 4, length: 2, direction: trafficDirections.right, color: trafficColors.yellow, capacity: 2 },
      { id: 'l4-violet', x: 0, y: 4, length: 2, direction: trafficDirections.down, color: trafficColors.violet, capacity: 2 },
      { id: 'l4-orange', x: 4, y: 5, length: 2, direction: trafficDirections.right, color: trafficColors.orange, capacity: 2 },
    ],
    passengers: [trafficColors.coral, trafficColors.blue, trafficColors.yellow, trafficColors.coral, trafficColors.blue, trafficColors.yellow, trafficColors.violet, trafficColors.orange, trafficColors.violet, trafficColors.orange],
  },
  {
    id: 'parking-level-05',
    name: 'City terminal',
    objective: 'Unwind the three-car chain, keep the pickup bays useful, and preserve the combo.',
    bayCount: 3,
    cars: [
      { id: 'l5-lime', x: 0, y: 0, length: 3, direction: trafficDirections.up, color: trafficColors.lime, capacity: 2 },
      { id: 'l5-pink', x: 1, y: 2, length: 3, direction: trafficDirections.left, color: trafficColors.pink, capacity: 2 },
      { id: 'l5-sky', x: 3, y: 3, length: 2, direction: trafficDirections.up, color: trafficColors.sky, capacity: 2 },
      { id: 'l5-red', x: 4, y: 1, length: 2, direction: trafficDirections.right, color: trafficColors.red, capacity: 2 },
      { id: 'l5-indigo', x: 5, y: 3, length: 3, direction: trafficDirections.down, color: trafficColors.indigo, capacity: 2 },
    ],
    passengers: [trafficColors.lime, trafficColors.pink, trafficColors.sky, trafficColors.lime, trafficColors.pink, trafficColors.sky, trafficColors.red, trafficColors.indigo, trafficColors.red, trafficColors.indigo],
  },
] as const;
EOF

cat > games/traffic-jam/runtime/domain/rules.test.ts <<'EOF'
import assert from 'node:assert/strict';
import test from 'node:test';

import { trafficLevels } from './levels.ts';
import { createInitialTrafficState, getAvailableCarIds, releaseTrafficCar } from './rules.ts';
import { analyzeTrafficLevel, solveTrafficLevel } from './solver.ts';

for (const level of trafficLevels) {
  test(`${level.id} is valid and solvable`, () => {
    const analysis = analyzeTrafficLevel(level);
    assert.equal(analysis.valid, true, analysis.errors.join(', '));
    assert.ok(analysis.solution);
    assert.equal(analysis.solution.length, level.cars.length);
  });

  test(`${level.id} solution boards every passenger and departs every car`, () => {
    const solution = solveTrafficLevel(level);
    assert.ok(solution);
    let state = createInitialTrafficState(level);
    for (const carId of solution) {
      const result = releaseTrafficCar(level, state, carId);
      assert.equal(result.ok, true);
      if (result.ok) state = result.state;
    }
    assert.equal(state.completed, true);
    assert.equal(state.jammed, false);
    assert.equal(state.passengers.length, 0);
    assert.equal(state.moves, level.cars.length);
    assert.ok(state.score > 0);
    assert.ok(state.coins > 0);
  });
}

test('a wrong early car can fill the pickup bays and jam level one', () => {
  const level = trafficLevels[0];
  assert.ok(level);
  let state = createInitialTrafficState(level);
  const mint = releaseTrafficCar(level, state, 'l1-mint');
  assert.equal(mint.ok, true);
  if (!mint.ok) return;
  state = mint.state;
  const coral = releaseTrafficCar(level, state, 'l1-coral');
  assert.equal(coral.ok, true);
  if (!coral.ok) return;
  assert.equal(coral.state.jammed, true);
  assert.equal(coral.state.completed, false);
});

test('blocked moves are rejected without mutating state', () => {
  const level = trafficLevels[3];
  assert.ok(level);
  const state = createInitialTrafficState(level);
  const availableCarIds = new Set(getAvailableCarIds(level, state));
  assert.equal(availableCarIds.has('l4-blue'), false);
  const result = releaseTrafficCar(level, state, 'l4-blue');
  assert.equal(result.ok, false);
  assert.deepEqual(state, createInitialTrafficState(level));
});

test('successful releases preserve the undo snapshot', () => {
  const level = trafficLevels[0];
  assert.ok(level);
  const state = createInitialTrafficState(level);
  const result = releaseTrafficCar(level, state, 'l1-coral');
  assert.equal(result.ok, true);
  assert.deepEqual(state, createInitialTrafficState(level));
});
EOF

cat > games/traffic-jam/runtime/ui/registry.ts <<'EOF'
import { trafficColors, trafficDirections, type TrafficColor, type TrafficDirection } from '../domain/registry.ts';

export const parkingUiIds = { root: 'slop-parking-jam', style: 'slop-parking-jam-style' } as const;
export const parkingUiActions = { undo: 'undo', reset: 'reset', hint: 'hint', next: 'next', retry: 'retry' } as const;
export const parkingUiAttributes = { action: 'data-action' } as const;
export const parkingUiEvents = { click: 'click', pointerUp: 'pointerup', resize: 'resize', visibilityChange: 'visibilitychange' } as const;
export const parkingUiKeys = { undo: 'z', reset: 'r', hint: 'h' } as const;
export const parkingUiSymbols = { undo: '↶', reset: '↻', hint: '✦', coin: '●' } as const;

export const parkingUiCopy = {
  title: 'Parking Jam', level: 'Level', score: 'Score', coins: 'coins', combo: 'combo', queue: 'Next',
  instruction: 'Tap a free car and match it with the people waiting.',
  blocked: 'That car cannot leave yet.', noBay: 'The pickup bays are full.',
  hint: 'This car keeps the queue moving.', hintButton: 'Hint', undo: 'Undo', reset: 'Reset',
  retry: 'Undo last car', next: 'Next level', replay: 'Play again',
  completedTitle: 'Everyone is on the road!',
  completedBody: 'The pickup area is clear and the passengers are moving.',
  jammedTitle: 'Pickup jammed',
  jammedBody: 'The front passenger has no matching car. Undo the last choice or restart.',
} as const;

export const parkingUiTimings = {
  carReleaseMs: 900, passengerWalkMs: 650, passengerGapMs: 90, carDepartureMs: 820,
  blockedPulseMs: 620, hintPulseMs: 980, popupMs: 900, completionDelayMs: 920,
} as const;

export const parkingLayout = {
  maxPixelRatio: 2, shadowMapSize: 2048, cameraHeightSpan: 11.2, cameraMinimumWidth: 7.2,
  cameraLookZ: -0.25, cellSize: 1.05, lotWidth: 6.3, lotDepth: 6.3, lotHeight: 0.18,
  lotY: 0.02, boardOffsetZ: 1.15, carY: 0.23, bayX: [-1.82, 0, 1.82] as const,
  bayZ: -2.78, bayWidth: 1.36, bayDepth: 2.08, queueVisibleLimit: 12, queueColumns: 8,
  queueStartX: -2.55, queueStartZ: -5.42, queueSpacingX: 0.72, queueSpacingZ: 0.62,
  personY: 0.075, roadMergeZ: -3.86, departureZ: -8.8, outerRoadX: 4.35, exitMargin: 0.58,
} as const;

export const parkingSceneColors = {
  sky: 0xcfe8dd, fog: 0xdbece3, grass: 0x7fbd72, road: 0x525c61, asphalt: 0x626b70,
  asphaltEdge: 0xd2d0c3, marking: 0xf6f1d7, concrete: 0xd9d6c8, concreteDark: 0x7d8580,
  pickup: 0xf4c857, pickupInactive: 0xb7b8ad, window: 0x8ab3c1, tire: 0x24282a,
  rim: 0xdce1df, white: 0xffffff, skin: 0xf0b58d, hair: 0x5b4031, treeTrunk: 0x7d5131,
  treeLeaves: 0x4f9360, lamp: 0x586568, gold: 0xf4bd32, danger: 0xe3544d,
} as const;

export const parkingColorPalette: Readonly<Record<TrafficColor, number>> = {
  [trafficColors.coral]: 0xf46f63, [trafficColors.blue]: 0x4e8fe8, [trafficColors.mint]: 0x58c791,
  [trafficColors.yellow]: 0xf0bd3e, [trafficColors.violet]: 0x8b6bd8, [trafficColors.orange]: 0xf58b3d,
  [trafficColors.teal]: 0x3ca7a5, [trafficColors.pink]: 0xe56f9d, [trafficColors.lime]: 0x91bd43,
  [trafficColors.sky]: 0x5fb9dd, [trafficColors.red]: 0xd84f55, [trafficColors.indigo]: 0x5968b8,
};

export const parkingDirectionYaw: Readonly<Record<TrafficDirection, number>> = {
  [trafficDirections.up]: 0,
  [trafficDirections.right]: Math.PI / 2,
  [trafficDirections.down]: Math.PI,
  [trafficDirections.left]: -Math.PI / 2,
};
EOF

cat > games/traffic-jam/runtime/setup.ts <<'EOF'
import { mountParkingJam, unmountParkingJam } from './ui/app.ts';

let registered = false;

export function registerGameSystems(): void {
  if (registered || typeof document === 'undefined') return;
  registered = true;
  mountParkingJam(document.body);
}

export function unregisterGameSystems(): void {
  if (!registered || typeof document === 'undefined') return;
  registered = false;
  unmountParkingJam();
}
EOF

cat > games/traffic-jam/game.ts <<'EOF'
import type { GameDefinition } from '@modoki/engine/runtime';

export const game: GameDefinition = {
  id: 'parking-jam',
  name: 'Parking Jam',
  loadConfig: () => import('./runtime/config').then((module) => module.config),
  registerSystems: () => import('./runtime/setup').then((module) => module.registerGameSystems()),
  unregisterSystems: () => import('./runtime/setup').then((module) => module.unregisterGameSystems()),
};
EOF

cat > games/traffic-jam/runtime/config.ts <<'EOF'
import type { GameConfig } from '@modoki/engine/runtime';
import sceneUrl from './assets/scenes/main.scene.json?url';

export const config: GameConfig = {
  name: 'Parking Jam',
  sceneSetup: () => {},
  initWorld: () => {},
  scenePath: sceneUrl,
};
EOF

cat > games/traffic-jam/runtime/assets/scenes/main.scene.json <<'EOF'
{
  "id": "b5d64d1a-b6dd-4d1d-9de0-f64d9b41864e",
  "version": 12,
  "createdAt": "2026-08-27T00:00:00.000Z",
  "resources": [],
  "entities": [
    {
      "name": "Main Camera",
      "traits": {
        "Transform": { "y": 7, "z": 12, "rx": -0.5 },
        "Camera": { "fov": 50, "clearColor": 13625567 },
        "EntityAttributes": { "name": "Main Camera", "parentId": "", "layer": "3d", "guid": "832987ef-f69d-45fb-984c-fd9cae976cf3" }
      }
    },
    {
      "name": "Ambient Light",
      "traits": {
        "Transform": {},
        "EntityAttributes": { "name": "Ambient Light", "sortOrder": 10, "parentId": "", "guid": "65707cfb-43ad-4d29-a727-bcc14a8509cf" },
        "Light": { "lightType": "ambient", "intensity": 0.72 }
      }
    },
    {
      "name": "Sun",
      "traits": {
        "Transform": { "x": -5, "y": 10, "z": -4, "rx": -0.94, "ry": -0.25 },
        "EntityAttributes": { "name": "Sun", "sortOrder": 11, "parentId": "", "guid": "c9f08ef8-7765-4fb2-aa4a-d7e73f34b4dc" },
        "Light": { "color": 16774368, "intensity": 1.25, "castShadow": true }
      }
    }
  ]
}
EOF

python3 - <<'PY'
import json
from pathlib import Path
path = Path('games/traffic-jam/project.config.json')
data = json.loads(path.read_text())
data.setdefault('app', {})['appId'] = 'io.tdamer.slop.parkingjam'
data['app']['appName'] = 'Parking Jam'
data['app']['version'] = '0.2.0'
data['app']['buildNumber'] = 2
path.write_text(json.dumps(data, indent=2) + '\n')
PY

cat > README.md <<'EOF'
# Slop

Slop is an AI-oriented game factory built around compact, testable game domains and interchangeable authoring/runtime adapters.

The first browser vertical slice is **Parking Jam**, built as an external Modoki project. It is a small casual-game loop rather than an abstract block puzzle:

- stylized 3D cars in a parking lot;
- a visible passenger queue;
- limited pickup bays;
- passengers walk to matching cars and board them;
- full cars depart with score, coin, combo, camera, and celebration effects;
- wrong car choices can fill the pickup area and create a jam;
- deterministic solver and immutable domain tests;
- GitHub Pages publication from `stable`.

## Play

GitHub Pages: **https://t-damer.github.io/slop/**

## Verify

Requires Node.js 24 or newer:

```bash
npm test
npm run architecture:check
```

## Build with Modoki

```bash
git clone https://github.com/lsgmasa33/modoki-engine.git
cd modoki-engine
git checkout 145bae5b2dc38ac0561a2b627d726cba69a99c1f
npm ci
MODOKI_PROJECT=/absolute/path/to/slop/games/traffic-jam \
  npm run build -- --target web
```

The artifact is written to `games/traffic-jam/dist`.

## Module map

```text
Parking domain (queue, bays, cars, scoring, solver)
        ↓
3D parking presentation (Three.js scene + compact DOM HUD)
        ↓
Modoki adapter (GameDefinition + lifecycle + web build)
```
EOF

cat > games/traffic-jam/README.md <<'EOF'
# Parking Jam

A touch-first casual parking puzzle used as the first Slop/Modoki vertical slice.

## Loop

1. Tap a car whose route out of the parking grid is clear.
2. The car drives to the first free pickup bay.
3. People at the front of the queue board matching-colour cars.
4. A full car departs, freeing its bay and awarding score, coins, and combo.
5. Filling every bay with the wrong colours creates a jam; undo or restart.

The pure domain in `runtime/domain/**` owns queue resolution, bay occupancy, blocking, score, combo, completion, and solver behavior. `runtime/ui/**` only presents that state in a stylized 3D scene.
EOF

cat > games/traffic-jam/AGENTS.md <<'EOF'
# Parking Jam agent rules

Read the root `AGENTS.md` first.

- `runtime/domain/**` is the only owner of queue, bay, car, scoring, combo, jam, and completion rules.
- `runtime/ui/**` may render domain state and play domain events; it may not independently decide who boards, when a car departs, or how rewards are calculated.
- `runtime/setup.ts` only mounts and unmounts the presentation in the Modoki lifecycle.
- New levels must pass bounds, overlap, passenger-manifest, jam-path, and solver checks.
- Keep the scene touch-first and readable at a 390×844 viewport.
- Prefer authored low-poly assets later; procedural models are the prototype fallback, not the final art direction.
EOF

cat > AGENTS.md <<'EOF'
# AGENTS.md

This repository builds compact games with AI agents. Human review focuses on architecture, game feel, and visual output; agents own routine implementation and verification.

## Before editing

1. Read this file and the nearest local `AGENTS.md`.
2. Read `architecture/target.mmd` and compare it with `architecture/current.mmd`.
3. Search the repository by concept and synonyms before creating anything.
4. Search maintained packages and permissive open-source implementations before writing a new subsystem.
5. Identify the canonical owner, allowed dependencies, non-goals, and acceptance checks.

Default order: **search → reuse → extend → compose → create**.

## Hard rules

- One behavior or state value has one canonical owner.
- Gameplay rules are pure TypeScript and never depend on Modoki, DOM, rendering, storage, network, or wall-clock APIs.
- Rendering plays domain events; it does not infer or duplicate domain outcomes.
- Modoki owns project lifecycle and production builds. Game presentation may use its rendering dependencies through a thin adapter.
- Domain strings and tuning values belong to cohesive typed registries or level definitions.
- `const` by default; `let` only for intentional reassignment; never `var`.
- Do not copy-paste variants. Extend or compose the existing semantic owner.
- Shared code never branches on a concrete game identifier.
- Generated code and assets pass the same tests, budgets, provenance, and visual review as human output.
- Development-only AI, MCP, validation, and asset tooling never ships in the game bundle.

## Parking Jam ownership

- `games/traffic-jam/runtime/domain/**` owns cars, passenger queue, pickup bays, boarding, departures, jam detection, score, coins, combo, and solver behavior.
- `games/traffic-jam/runtime/ui/**` owns the 3D scene, animation, raycast input, HUD, and local progress preferences.
- `games/traffic-jam/runtime/setup.ts` is the thin Modoki lifecycle adapter.
- `architecture/model.json` is the machine-readable module contract.

## Repository flow

- Maximum five branches total: `main`, `stable`, and up to three disjoint `feature/*` branches.
- Maximum three open pull requests.
- `main` contains reviewed code. `stable` is the only automatic Pages publication source.
- Feature branches must own disjoint responsibility zones. Overlap means one larger branch.

## Acceptance

A change is complete only when all applicable checks pass:

1. domain tests and edge cases;
2. architecture drift check;
3. Modoki production web build;
4. no duplicated game rules;
5. rendered mobile interaction and screenshot review;
6. final diff remains scoped;
7. an independent reviewer reads the actual diff.

Never claim a check was run when it was not.
EOF

cat > architecture/current.mmd <<'EOF'
flowchart LR
    Domain[Parking domain\nqueue + bays + score + solver] --> UI[3D parking presentation\nscene + animation + HUD]
    UI --> Setup[Modoki lifecycle adapter]
    Setup --> Modoki[Modoki web runtime/build]
    Modoki --> Pages[GitHub Pages]
EOF

cat > architecture/target.mmd <<'EOF'
flowchart LR
    Prompt[Human or AI game task] --> Domain[Pure game domain]
    Domain --> Tests[Deterministic tests + solver]
    Domain --> Presentation[Replaceable 3D presentation]
    Assets[Validated authored assets] --> Presentation
    Presentation --> Adapter[Modoki lifecycle + build adapter]
    Adapter --> Pages[Browser + mobile release]

    Domain -. no dependency .-> Rendering[DOM / Three / Modoki rendering]
EOF

cat > architecture/model.json <<'EOF'
{
  "schemaVersion": 1,
  "modules": [
    {
      "id": "parking-domain",
      "path": "games/traffic-jam/runtime/domain",
      "owns": [
        "parking-grid blocking",
        "pickup-bay occupancy",
        "passenger queue and boarding",
        "car departure",
        "score, coins, combo and jam state",
        "level definitions and solver"
      ],
      "dependsOn": []
    },
    {
      "id": "parking-presentation",
      "path": "games/traffic-jam/runtime/ui",
      "owns": [
        "3D parking scene",
        "procedural prototype models",
        "raycast and keyboard input",
        "animation and effects",
        "HUD and local preferences"
      ],
      "dependsOn": ["parking-domain"]
    },
    {
      "id": "modoki-adapter",
      "path": "games/traffic-jam/runtime",
      "owns": [
        "Modoki registration lifecycle",
        "scene selection",
        "production web build integration"
      ],
      "dependsOn": ["parking-presentation"]
    }
  ],
  "forbidden": [
    { "from": "parking-domain", "to": "parking-presentation" },
    { "from": "parking-domain", "to": "modoki-adapter" },
    { "from": "parking-presentation", "to": "modoki-adapter" }
  ]
}
EOF

python3 - <<'PY'
from pathlib import Path
path = Path('.github/workflows/publish-stable.yml')
source = path.read_text()
replacements = {
    'traffic-jam-pages-smoke-': 'parking-jam-pages-smoke-',
    'traffic-jam-dom.html': 'parking-jam-dom.html',
    'traffic-jam.png': 'parking-jam.png',
    'id="slop-traffic-jam"': 'id="slop-parking-jam"',
    "grep -q 'Traffic Jam'": "grep -q 'Parking Jam'",
    "grep -q 'traffic-board'": "grep -q 'parking-canvas'",
    'Rendered browser smoke passed': 'Rendered Parking Jam smoke passed',
}
for old, new in replacements.items():
    source = source.replace(old, new)
path.write_text(source)
PY

npm test
npm run architecture:check

validation_dir="${RUNNER_TEMP:-/tmp}/modoki-validation"
rm -rf "$validation_dir"
git clone --filter=blob:none --no-checkout https://github.com/lsgmasa33/modoki-engine.git "$validation_dir"
git -C "$validation_dir" fetch --depth=1 origin 145bae5b2dc38ac0561a2b627d726cba69a99c1f
git -C "$validation_dir" checkout --detach 145bae5b2dc38ac0561a2b627d726cba69a99c1f
npm --prefix "$validation_dir" ci --no-audit --no-fund
MODOKI_PROJECT="$repo_root/games/traffic-jam" npm --prefix "$validation_dir" run build -- --target web
test -f games/traffic-jam/dist/index.html
rm -rf "$validation_dir" games/traffic-jam/dist

rm -f tools/apply-parking-jam-v2.sh .github/workflows/apply-parking-jam-v2.yml

git config user.name "Slop release bot"
git config user.email "actions@users.noreply.github.com"
git add -A
git commit -m "feat: replace block puzzle with 3D Parking Jam loop"
git push origin HEAD:feature/core-traffic
git push origin HEAD:stable

for workflow in ci.yml publish-stable.yml; do
  curl -fsSL -X POST \
    -H "Authorization: Bearer ${GITHUB_TOKEN}" \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "https://api.github.com/repos/${GITHUB_REPOSITORY}/actions/workflows/${workflow}/dispatches" \
    -d '{"ref":"stable"}'
done
