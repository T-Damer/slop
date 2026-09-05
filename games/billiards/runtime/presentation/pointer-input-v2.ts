import { cameraTuning } from './camera-geometry.ts';
import type { Vec2 } from '../domain/types.ts';
import { canvasToWorld, clientToCanvas } from './coordinates.ts';
import type { BilliardsControllerSnapshotV2, BilliardsGameControllerV2 } from './controller-v2.ts';
import { billiardsInteractionModes as modes } from './interaction-state-v2.ts';
import { ManualCueStroke } from './manual-stroke.ts';

export interface BilliardsPointerInputOptions {
  readonly root: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly shootButton: HTMLButtonElement;
  readonly controller: BilliardsGameControllerV2;
  readonly snapshot: () => BilliardsControllerSnapshotV2;
}

class BilliardsPointerGesture {
  private pointerId: number | null = null;
  private stroke: ManualCueStroke | null = null;
  private placing = false;

  public constructor(private readonly options: BilliardsPointerInputOptions) {}

  public move = (event: PointerEvent): void => {
    if (!event.isPrimary || (this.pointerId !== null && this.pointerId !== event.pointerId)) return;
    const point = this.point(event);
    if (point === null) return;
    const { controller, snapshot } = this.options;
    if (this.stroke !== null) {
      event.preventDefault();
      controller.updateManualStroke(this.stroke.sample(point, event.timeStamp));
      if (this.stroke.reachedContact()) {
        controller.finishManualStroke();
        this.release();
      }
    } else if (snapshot().interaction.mode === modes.placingCueBall) {
      controller.setPlacementPreview(canvasToWorld(point));
    } else if (snapshot().interaction.mode === modes.aiming) {
      controller.setAimFromWorld(canvasToWorld(point));
    }
  };

  public down = (event: PointerEvent): void => {
    if (event.button !== 0 || !event.isPrimary || this.pointerId !== null) return;
    const point = this.point(event);
    if (point === null) return;
    const { controller, canvas, snapshot } = this.options;
    if (!snapshot().canInteract) return;
    const mode = snapshot().interaction.mode;
    if (mode === modes.placingCueBall) {
      controller.setPlacementPreview(canvasToWorld(point));
      this.placing = true;
      this.pointerId = event.pointerId;
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      return;
    }
    if (mode === modes.aimLocked) {
      if (!controller.beginManualStroke()) return;
      this.stroke = new ManualCueStroke(point, snapshot().angleRadians, event.timeStamp);
    } else if (mode === modes.aiming) {
      controller.setAimFromWorld(canvasToWorld(point));
    } else return;
    event.preventDefault();
    this.pointerId = event.pointerId;
    canvas.setPointerCapture(event.pointerId);
  };

  public up = (event: PointerEvent): void => {
    if (this.pointerId !== event.pointerId) return;
    if (this.placing) {
      this.move(event);
      this.options.controller.confirmCuePlacement();
      this.release();
      this.focusAction();
      return;
    }
    if (this.stroke !== null) {
      this.move(event);
      if (this.stroke === null) return; // Contact already executed the shot exactly once.
      const wasTap = this.stroke.isTap();
      this.options.controller.cancelManualStroke();
      if (wasTap) this.options.controller.unlockAim();
    } else if (this.options.controller.lockAim()) this.focusAction();
    this.release();
  };

  public cancel = (): void => {
    this.options.controller.cancelManualStroke();
    this.release();
  };

  public lostCapture = (event: PointerEvent): void => {
    if (event.pointerId === this.pointerId) this.cancel();
  };

  private release(): void {
    const id = this.pointerId;
    this.pointerId = null;
    this.stroke = null;
    this.placing = false;
    if (id !== null && this.options.canvas.hasPointerCapture(id)) {
      this.options.canvas.releasePointerCapture(id);
    }
  }

  private point(event: PointerEvent): Vec2 | null {
    return clientToCanvas(this.options.canvas.getBoundingClientRect(),
      { x: event.clientX, y: event.clientY }, this.options.root.dataset.billiardsPortrait === 'true');
  }

  private focusAction(): void {
    this.options.shootButton.focus({ preventScroll: true });
  }
}

export function bindBilliardsPointerInputV2(options: BilliardsPointerInputOptions): () => void {
  const gesture = new BilliardsPointerGesture(options);
  const { canvas } = options;
  const onContextMenu = (event: MouseEvent): void => event.preventDefault();
  canvas.addEventListener(cameraTuning.cancelGestureEvent, gesture.cancel);
  canvas.addEventListener('pointerdown', gesture.down);
  canvas.addEventListener('pointermove', gesture.move);
  canvas.addEventListener('pointerup', gesture.up);
  canvas.addEventListener('pointercancel', gesture.cancel);
  canvas.addEventListener('lostpointercapture', gesture.lostCapture);
  canvas.addEventListener('contextmenu', onContextMenu);
  window.addEventListener('blur', gesture.cancel);
  window.addEventListener('resize', gesture.cancel);
  document.addEventListener('visibilitychange', gesture.cancel);
  return () => {
    gesture.cancel();
    canvas.removeEventListener(cameraTuning.cancelGestureEvent, gesture.cancel);
    canvas.removeEventListener('pointerdown', gesture.down);
    canvas.removeEventListener('pointermove', gesture.move);
    canvas.removeEventListener('pointerup', gesture.up);
    canvas.removeEventListener('pointercancel', gesture.cancel);
    canvas.removeEventListener('lostpointercapture', gesture.lostCapture);
    canvas.removeEventListener('contextmenu', onContextMenu);
    window.removeEventListener('blur', gesture.cancel);
    window.removeEventListener('resize', gesture.cancel);
    document.removeEventListener('visibilitychange', gesture.cancel);
  };
}
