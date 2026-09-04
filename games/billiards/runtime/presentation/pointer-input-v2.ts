import type { Vec2 } from '../domain/types.ts';
import { canvasToWorld as existingCanvasToWorld } from './coordinates.ts';
import type {
  BilliardsControllerSnapshotV2,
  BilliardsGameControllerV2,
} from './controller-v2.ts';
import { billiardsInteractionModes } from './interaction-state-v2.ts';

interface CanonicalPointerPoint {
  readonly canvas: Vec2;
  readonly world: Vec2;
}

interface StrokePointerState {
  readonly pointerId: number;
  readonly start: Vec2;
  last: Vec2;
  lastTimeMs: number;
  maximumPullback: number;
  forwardVelocity: number;
}

export interface BilliardsPointerInputOptions {
  readonly root: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly shootButton: HTMLButtonElement;
  readonly controller: BilliardsGameControllerV2;
  readonly snapshot: () => BilliardsControllerSnapshotV2;
}

export function bindBilliardsPointerInputV2(
  options: BilliardsPointerInputOptions,
): () => void {
  let stroke: StrokePointerState | null = null;

  const onPointerMove = (event: PointerEvent): void => {
    const point = canonicalPointerPoint(options, event);
    if (point === null) return;
    const interaction = options.snapshot().interaction;
    if (interaction.mode === billiardsInteractionModes.placingCueBall) {
      options.controller.setPlacementPreview(point.world);
      return;
    }
    if (
      interaction.mode === billiardsInteractionModes.manualStroke
      && stroke?.pointerId === event.pointerId
    ) {
      event.preventDefault();
      updateStroke(options, stroke, point.canvas, event.timeStamp);
      return;
    }
    if (interaction.mode === billiardsInteractionModes.aiming) {
      options.controller.setAimFromWorld(point.world);
    }
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || !event.isPrimary) return;
    const point = canonicalPointerPoint(options, event);
    if (point === null) return;
    const interaction = options.snapshot().interaction;
    if (interaction.mode === billiardsInteractionModes.placingCueBall) {
      options.controller.setPlacementPreview(point.world);
      options.shootButton.focus({ preventScroll: true });
      return;
    }
    if (interaction.mode === billiardsInteractionModes.aiming) {
      options.controller.setAimFromWorld(point.world);
      if (options.controller.lockAim()) {
        options.shootButton.focus({ preventScroll: true });
      }
      return;
    }
    if (
      interaction.mode === billiardsInteractionModes.aimLocked
      && options.controller.beginManualStroke()
    ) {
      event.preventDefault();
      options.canvas.setPointerCapture(event.pointerId);
      stroke = {
        pointerId: event.pointerId,
        start: point.canvas,
        last: point.canvas,
        lastTimeMs: event.timeStamp,
        maximumPullback: 0,
        forwardVelocity: 0,
      };
    }
  };

  const finishPointer = (event: PointerEvent, cancelled: boolean): void => {
    if (stroke?.pointerId !== event.pointerId) return;
    const point = canonicalPointerPoint(options, event);
    if (point !== null) updateStroke(options, stroke, point.canvas, event.timeStamp);
    if (options.canvas.hasPointerCapture(event.pointerId)) {
      options.canvas.releasePointerCapture(event.pointerId);
    }
    stroke = null;
    if (cancelled) options.controller.cancelManualStroke();
    else options.controller.finishManualStroke();
  };

  const onPointerUp = (event: PointerEvent): void => finishPointer(event, false);
  const onPointerCancel = (event: PointerEvent): void => finishPointer(event, true);
  const onContextMenu = (event: MouseEvent): void => event.preventDefault();

  options.canvas.addEventListener('pointermove', onPointerMove);
  options.canvas.addEventListener('pointerdown', onPointerDown);
  options.canvas.addEventListener('pointerup', onPointerUp);
  options.canvas.addEventListener('pointercancel', onPointerCancel);
  options.canvas.addEventListener('contextmenu', onContextMenu);

  return () => {
    options.canvas.removeEventListener('pointermove', onPointerMove);
    options.canvas.removeEventListener('pointerdown', onPointerDown);
    options.canvas.removeEventListener('pointerup', onPointerUp);
    options.canvas.removeEventListener('pointercancel', onPointerCancel);
    options.canvas.removeEventListener('contextmenu', onContextMenu);
  };
}

function updateStroke(
  options: BilliardsPointerInputOptions,
  stroke: StrokePointerState,
  point: Vec2,
  timeMs: number,
): void {
  const angle = options.snapshot().angleRadians;
  const axis = { x: Math.cos(angle), y: Math.sin(angle) };
  const displacement = {
    x: point.x - stroke.start.x,
    y: point.y - stroke.start.y,
  };
  const projection = displacement.x * axis.x + displacement.y * axis.y;
  const pullback = Math.max(0, -projection);
  stroke.maximumPullback = Math.max(stroke.maximumPullback, pullback);
  const delta = { x: point.x - stroke.last.x, y: point.y - stroke.last.y };
  const elapsedSeconds = Math.max(0.001, (timeMs - stroke.lastTimeMs) / 1000);
  const forwardVelocity = Math.max(
    0,
    (delta.x * axis.x + delta.y * axis.y) / elapsedSeconds,
  );
  stroke.forwardVelocity = Math.max(
    forwardVelocity,
    stroke.forwardVelocity * 0.72,
  );
  stroke.last = point;
  stroke.lastTimeMs = timeMs;
  options.controller.updateManualStroke({
    cueOffset: pullback,
    pullback: stroke.maximumPullback,
    forwardVelocity: stroke.forwardVelocity,
  });
}

function canonicalPointerPoint(
  options: BilliardsPointerInputOptions,
  event: PointerEvent,
): CanonicalPointerPoint | null {
  const rect = options.canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  const localX = event.clientX - rect.left;
  const localY = event.clientY - rect.top;
  const portrait = options.root.dataset.billiardsPortrait === 'true';
  const canvasPoint = portrait
    ? {
        x: clamp01(localY / rect.height) * options.canvas.width,
        y: (1 - clamp01(localX / rect.width)) * options.canvas.height,
      }
    : {
        x: clamp01(localX / rect.width) * options.canvas.width,
        y: clamp01(localY / rect.height) * options.canvas.height,
      };
  const world = invokeCanvasToWorld(options.canvas, rect, canvasPoint);
  return world === null ? null : { canvas: canvasPoint, world };
}

function invokeCanvasToWorld(
  canvas: HTMLCanvasElement,
  rect: DOMRect,
  point: Vec2,
): Vec2 | null {
  const fakeClientX = rect.left + point.x / canvas.width * rect.width;
  const fakeClientY = rect.top + point.y / canvas.height * rect.height;
  const result = existingCanvasToWorld.length >= 3
    ? Reflect.apply(existingCanvasToWorld, undefined, [
        canvas,
        fakeClientX,
        fakeClientY,
      ])
    : Reflect.apply(existingCanvasToWorld, undefined, [point]);
  return isVec2(result) ? result : null;
}

function isVec2(value: unknown): value is Vec2 {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.x === 'number'
    && Number.isFinite(record.x)
    && typeof record.y === 'number'
    && Number.isFinite(record.y);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
