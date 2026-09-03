import type { Vec2 } from '../domain/types.ts';
import { canvasToWorld, pointerToCanvas } from './coordinates.ts';
import type { BilliardsAudioEngine } from './audio.ts';
import {
  BilliardsGameController,
  type BilliardsControllerSnapshot,
} from './controller.ts';
import { billiardsControlTuning } from './registry.ts';
import type { BilliardsViewElements } from './view-elements.ts';
interface PointerDragState {
  pointerId: number;
  startY: number;
  latestY: number;
}
export function bindBilliardsControls(
  view: BilliardsViewElements,
  controller: BilliardsGameController,
  snapshot: () => BilliardsControllerSnapshot,
  audio: BilliardsAudioEngine,
  onSoundChanged: (enabled: boolean) => void,
): () => void {
  const cleanups = [
    bindCanvas(view, controller, snapshot, audio),
    bindNativeControls(view, controller),
    bindPowerRail(view, controller, audio),
    bindAngleRail(view, controller, audio),
    bindSpinPad(view, controller, snapshot, audio),
    bindActions(view, controller, audio, onSoundChanged),
    bindKeyboard(view, controller, audio),
  ];
  const unlock = (): void => { void audio.unlock(); };
  view.root.addEventListener('pointerdown', unlock, { passive: true });
  cleanups.push(() => view.root.removeEventListener('pointerdown', unlock));
  return () => {
    for (const cleanup of cleanups) {
      cleanup();
    }
  };
}
function bindCanvas(
  view: BilliardsViewElements,
  controller: BilliardsGameController,
  snapshot: () => BilliardsControllerSnapshot,
  audio: BilliardsAudioEngine,
): () => void {
  const onPointerMove = (event: PointerEvent): void => {
    controller.setAimFromWorld(readPointerWorld(view.canvas, event));
  };
  const onPointerDown = (event: PointerEvent): void => {
    event.preventDefault();
    void audio.unlock();
    view.canvas.setPointerCapture(event.pointerId);
    const point = readPointerWorld(view.canvas, event);
    if (snapshot().match.ballInHand) {
      controller.placeCue(point);
    } else {
      controller.setAimFromWorld(point);
    }
  };
  view.canvas.addEventListener('pointermove', onPointerMove);
  view.canvas.addEventListener('pointerdown', onPointerDown);
  return () => {
    view.canvas.removeEventListener('pointermove', onPointerMove);
    view.canvas.removeEventListener('pointerdown', onPointerDown);
  };
}
function bindNativeControls(
  view: BilliardsViewElements,
  controller: BilliardsGameController,
): () => void {
  const onPower = (): void => controller.setPower(Number(view.power.value) / 100);
  const onSideSpin = (): void => controller.setSideSpin(Number(view.sideSpin.value) / 100);
  const onFollowSpin = (): void => controller.setFollowSpin(Number(view.followSpin.value) / 100);
  view.power.addEventListener('input', onPower);
  view.sideSpin.addEventListener('input', onSideSpin);
  view.followSpin.addEventListener('input', onFollowSpin);
  return () => {
    view.power.removeEventListener('input', onPower);
    view.sideSpin.removeEventListener('input', onSideSpin);
    view.followSpin.removeEventListener('input', onFollowSpin);
  };
}
function bindPowerRail(
  view: BilliardsViewElements,
  controller: BilliardsGameController,
  audio: BilliardsAudioEngine,
): () => void {
  let drag: PointerDragState | null = null;
  const setFromPointer = (event: PointerEvent): void => {
    const rect = view.powerRail.getBoundingClientRect();
    controller.setPower(clamp((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1));
  };
  const onPointerDown = (event: PointerEvent): void => {
    event.preventDefault();
    void audio.unlock();
    drag = { pointerId: event.pointerId, startY: event.clientY, latestY: event.clientY };
    view.powerRail.setPointerCapture(event.pointerId);
    view.powerRail.classList.add('is-dragging');
    setFromPointer(event);
  };
  const onPointerMove = (event: PointerEvent): void => {
    if (drag?.pointerId !== event.pointerId) {
      return;
    }
    drag.latestY = event.clientY;
    setFromPointer(event);
  };
  const finish = (event: PointerEvent, shoot: boolean): void => {
    if (drag?.pointerId !== event.pointerId) {
      return;
    }
    const distance = Math.abs(drag.latestY - drag.startY);
    drag = null;
    view.powerRail.classList.remove('is-dragging');
    if (shoot && distance >= billiardsControlTuning.powerDragShotThresholdPx) {
      controller.shoot();
    }
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    const step = event.shiftKey ? 0.1 : 0.04;
    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
      controller.setPower(controller.snapshot().power + step);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
      controller.setPower(controller.snapshot().power - step);
    } else if (event.code === 'Space' || event.key === 'Enter') {
      void audio.unlock();
      controller.shoot();
    } else {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  };
  const onPointerUp = (event: PointerEvent): void => finish(event, true);
  const onPointerCancel = (event: PointerEvent): void => finish(event, false);
  view.powerRail.addEventListener('pointerdown', onPointerDown);
  view.powerRail.addEventListener('pointermove', onPointerMove);
  view.powerRail.addEventListener('pointerup', onPointerUp);
  view.powerRail.addEventListener('pointercancel', onPointerCancel);
  view.powerRail.addEventListener('keydown', onKeyDown);
  return () => {
    view.powerRail.removeEventListener('pointerdown', onPointerDown);
    view.powerRail.removeEventListener('pointermove', onPointerMove);
    view.powerRail.removeEventListener('pointerup', onPointerUp);
    view.powerRail.removeEventListener('pointercancel', onPointerCancel);
    view.powerRail.removeEventListener('keydown', onKeyDown);
  };
}
function bindAngleRail(
  view: BilliardsViewElements,
  controller: BilliardsGameController,
  audio: BilliardsAudioEngine,
): () => void {
  let pointerId: number | null = null;
  const setFromPointer = (event: PointerEvent): void => {
    const rect = view.angleRail.getBoundingClientRect();
    const ratio = clamp((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1);
    controller.setAngle(Math.PI - ratio * Math.PI * 2);
  };
  const onPointerDown = (event: PointerEvent): void => {
    event.preventDefault();
    void audio.unlock();
    pointerId = event.pointerId;
    view.angleRail.setPointerCapture(event.pointerId);
    setFromPointer(event);
  };
  const onPointerMove = (event: PointerEvent): void => {
    if (pointerId === event.pointerId) {
      setFromPointer(event);
    }
  };
  const onPointerEnd = (event: PointerEvent): void => {
    if (pointerId === event.pointerId) {
      pointerId = null;
    }
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    const step = event.shiftKey
      ? billiardsControlTuning.angleLargeKeyboardStepRadians
      : billiardsControlTuning.angleKeyboardStepRadians;
    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
      controller.adjustAngle(step);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
      controller.adjustAngle(-step);
    } else {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  };
  view.angleRail.addEventListener('pointerdown', onPointerDown);
  view.angleRail.addEventListener('pointermove', onPointerMove);
  view.angleRail.addEventListener('pointerup', onPointerEnd);
  view.angleRail.addEventListener('pointercancel', onPointerEnd);
  view.angleRail.addEventListener('keydown', onKeyDown);
  return () => {
    view.angleRail.removeEventListener('pointerdown', onPointerDown);
    view.angleRail.removeEventListener('pointermove', onPointerMove);
    view.angleRail.removeEventListener('pointerup', onPointerEnd);
    view.angleRail.removeEventListener('pointercancel', onPointerEnd);
    view.angleRail.removeEventListener('keydown', onKeyDown);
  };
}
function bindSpinPad(
  view: BilliardsViewElements,
  controller: BilliardsGameController,
  snapshot: () => BilliardsControllerSnapshot,
  audio: BilliardsAudioEngine,
): () => void {
  let pointerId: number | null = null;
  const setFromPointer = (event: PointerEvent): void => {
    const rect = view.spinPad.getBoundingClientRect();
    let x = (event.clientX - rect.left) / Math.max(1, rect.width) * 2 - 1;
    let y = (event.clientY - rect.top) / Math.max(1, rect.height) * 2 - 1;
    const length = Math.hypot(x, y);
    if (length > 1) {
      x /= length;
      y /= length;
    }
    controller.setSideSpin(x);
    controller.setFollowSpin(-y);
  };
  const onPointerDown = (event: PointerEvent): void => {
    event.preventDefault();
    void audio.unlock();
    pointerId = event.pointerId;
    view.spinPad.setPointerCapture(event.pointerId);
    setFromPointer(event);
  };
  const onPointerMove = (event: PointerEvent): void => {
    if (pointerId === event.pointerId) {
      setFromPointer(event);
    }
  };
  const onPointerEnd = (event: PointerEvent): void => {
    if (pointerId === event.pointerId) {
      pointerId = null;
    }
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    const current = snapshot();
    const step = billiardsControlTuning.spinKeyboardStep;
    if (event.key === 'ArrowLeft') controller.setSideSpin(current.sideSpin - step);
    else if (event.key === 'ArrowRight') controller.setSideSpin(current.sideSpin + step);
    else if (event.key === 'ArrowUp') controller.setFollowSpin(current.followSpin + step);
    else if (event.key === 'ArrowDown') controller.setFollowSpin(current.followSpin - step);
    else if (event.code === 'Space' || event.key === 'Enter') {
      controller.setSideSpin(0);
      controller.setFollowSpin(0);
    } else return;
    event.preventDefault();
    event.stopPropagation();
  };
  view.spinPad.addEventListener('pointerdown', onPointerDown);
  view.spinPad.addEventListener('pointermove', onPointerMove);
  view.spinPad.addEventListener('pointerup', onPointerEnd);
  view.spinPad.addEventListener('pointercancel', onPointerEnd);
  view.spinPad.addEventListener('keydown', onKeyDown);
  return () => {
    view.spinPad.removeEventListener('pointerdown', onPointerDown);
    view.spinPad.removeEventListener('pointermove', onPointerMove);
    view.spinPad.removeEventListener('pointerup', onPointerEnd);
    view.spinPad.removeEventListener('pointercancel', onPointerEnd);
    view.spinPad.removeEventListener('keydown', onKeyDown);
  };
}
function bindActions(
  view: BilliardsViewElements,
  controller: BilliardsGameController,
  audio: BilliardsAudioEngine,
  onSoundChanged: (enabled: boolean) => void,
): () => void {
  const onShoot = (): void => { controller.shoot(); };
  const onRestart = (): void => controller.restart();
  const onSound = (): void => {
    void audio.unlock();
    onSoundChanged(audio.toggle());
  };
  view.shoot.addEventListener('click', onShoot);
  view.restart.addEventListener('click', onRestart);
  view.sound.addEventListener('click', onSound);
  return () => {
    view.shoot.removeEventListener('click', onShoot);
    view.restart.removeEventListener('click', onRestart);
    view.sound.removeEventListener('click', onSound);
  };
}
function bindKeyboard(
  view: BilliardsViewElements,
  controller: BilliardsGameController,
  audio: BilliardsAudioEngine,
): () => void {
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement) {
      return;
    }
    const key = event.key.toLowerCase();
    if (key === 'a' || key === 'arrowleft') controller.adjustAngle(-0.045);
    else if (key === 'd' || key === 'arrowright') controller.adjustAngle(0.045);
    else if (key === 'w' || key === 'arrowup') {
      controller.setPower(controller.snapshot().power + 0.04);
    } else if (key === 's' || key === 'arrowdown') {
      controller.setPower(controller.snapshot().power - 0.04);
    } else if (event.code === 'Space') {
      void audio.unlock();
      controller.shoot();
    } else return;
    event.preventDefault();
  };
  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}
function readPointerWorld(canvas: HTMLCanvasElement, event: PointerEvent): Vec2 {
  return canvasToWorld(pointerToCanvas(canvas, event.clientX, event.clientY));
}
function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
