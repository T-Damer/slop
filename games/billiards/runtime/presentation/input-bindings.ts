import type { Vec2 } from '../domain/types.ts';
import { canvasToWorld, pointerToCanvas } from './coordinates.ts';
import type { BilliardsAudio } from './audio.ts';
import {
  BilliardsGameController,
  type BilliardsControllerSnapshot,
} from './controller.ts';
import { updateSoundButton } from './view-update.ts';
import type { BilliardsViewElements } from './view-elements.ts';

const degreesToRadians = Math.PI / 180;
const keyboardAngleStep = 0.045;
const keyboardPowerStep = 0.04;
const keyboardSpinStep = 0.1;

type SnapshotReader = () => BilliardsControllerSnapshot;

interface BilliardsInputHandlers {
  readonly canvasMove: (event: PointerEvent) => void;
  readonly canvasDown: (event: PointerEvent) => void;
  readonly power: () => void;
  readonly angle: () => void;
  readonly sideSpin: () => void;
  readonly followSpin: () => void;
  readonly shoot: () => void;
  readonly restart: () => void;
  readonly sound: () => void;
  readonly spinDown: (event: PointerEvent) => void;
  readonly spinMove: (event: PointerEvent) => void;
  readonly spinEnd: (event: PointerEvent) => void;
  readonly spinReset: () => void;
  readonly spinKey: (event: KeyboardEvent) => void;
  readonly globalKey: (event: KeyboardEvent) => void;
}

export function bindBilliardsInput(
  view: BilliardsViewElements,
  controller: BilliardsGameController,
  snapshot: SnapshotReader,
  audio: BilliardsAudio,
): () => void {
  const handlers = createInputHandlers(view, controller, snapshot, audio);
  addInputListeners(view, handlers);
  return () => removeInputListeners(view, handlers);
}

function createInputHandlers(
  view: BilliardsViewElements,
  controller: BilliardsGameController,
  snapshot: SnapshotReader,
  audio: BilliardsAudio,
): BilliardsInputHandlers {
  let spinPointerId: number | null = null;
  return {
    canvasMove: (event) => controller.setAimFromWorld(readPointerWorld(view.canvas, event)),
    canvasDown: (event) => {
      event.preventDefault();
      audio.unlock();
      view.canvas.setPointerCapture(event.pointerId);
      const point = readPointerWorld(view.canvas, event);
      if (snapshot().match.ballInHand) controller.placeCue(point);
      else controller.setAimFromWorld(point);
    },
    power: () => controller.setPower(Number(view.power.value) / 100),
    angle: () => controller.setAngleRadians(Number(view.angle.value) * degreesToRadians),
    sideSpin: () => controller.setSideSpin(Number(view.sideSpin.value) / 100),
    followSpin: () => controller.setFollowSpin(Number(view.followSpin.value) / 100),
    shoot: () => {
      audio.unlock();
      controller.shoot();
    },
    restart: () => controller.restart(),
    sound: () => updateSoundButton(view, audio.toggleMuted()),
    spinDown: (event) => {
      event.preventDefault();
      audio.unlock();
      spinPointerId = event.pointerId;
      view.spinPad.setPointerCapture(event.pointerId);
      applySpinPointer(view, controller, event.clientX, event.clientY);
    },
    spinMove: (event) => {
      if (spinPointerId === event.pointerId) {
        applySpinPointer(view, controller, event.clientX, event.clientY);
      }
    },
    spinEnd: (event) => {
      if (spinPointerId === event.pointerId) spinPointerId = null;
    },
    spinReset: () => controller.setSpin(0, 0),
    spinKey: createSpinKeyboardHandler(controller, snapshot),
    globalKey: createKeyboardHandler(controller, audio),
  };
}

function addInputListeners(view: BilliardsViewElements, handlers: BilliardsInputHandlers): void {
  view.canvas.addEventListener('pointermove', handlers.canvasMove);
  view.canvas.addEventListener('pointerdown', handlers.canvasDown);
  view.power.addEventListener('input', handlers.power);
  view.angle.addEventListener('input', handlers.angle);
  view.sideSpin.addEventListener('input', handlers.sideSpin);
  view.followSpin.addEventListener('input', handlers.followSpin);
  view.shoot.addEventListener('click', handlers.shoot);
  view.restart.addEventListener('click', handlers.restart);
  view.sound.addEventListener('click', handlers.sound);
  view.spinPad.addEventListener('pointerdown', handlers.spinDown);
  view.spinPad.addEventListener('pointermove', handlers.spinMove);
  view.spinPad.addEventListener('pointerup', handlers.spinEnd);
  view.spinPad.addEventListener('pointercancel', handlers.spinEnd);
  view.spinPad.addEventListener('dblclick', handlers.spinReset);
  view.spinPad.addEventListener('keydown', handlers.spinKey);
  window.addEventListener('keydown', handlers.globalKey);
}

function removeInputListeners(view: BilliardsViewElements, handlers: BilliardsInputHandlers): void {
  view.canvas.removeEventListener('pointermove', handlers.canvasMove);
  view.canvas.removeEventListener('pointerdown', handlers.canvasDown);
  view.power.removeEventListener('input', handlers.power);
  view.angle.removeEventListener('input', handlers.angle);
  view.sideSpin.removeEventListener('input', handlers.sideSpin);
  view.followSpin.removeEventListener('input', handlers.followSpin);
  view.shoot.removeEventListener('click', handlers.shoot);
  view.restart.removeEventListener('click', handlers.restart);
  view.sound.removeEventListener('click', handlers.sound);
  view.spinPad.removeEventListener('pointerdown', handlers.spinDown);
  view.spinPad.removeEventListener('pointermove', handlers.spinMove);
  view.spinPad.removeEventListener('pointerup', handlers.spinEnd);
  view.spinPad.removeEventListener('pointercancel', handlers.spinEnd);
  view.spinPad.removeEventListener('dblclick', handlers.spinReset);
  view.spinPad.removeEventListener('keydown', handlers.spinKey);
  window.removeEventListener('keydown', handlers.globalKey);
}

function createKeyboardHandler(
  controller: BilliardsGameController,
  audio: BilliardsAudio,
): (event: KeyboardEvent) => void {
  return (event): void => {
    if (event.target instanceof HTMLInputElement) return;
    const key = event.key.toLowerCase();
    if (key === 'a' || key === 'arrowleft') controller.adjustAngle(-keyboardAngleStep);
    else if (key === 'd' || key === 'arrowright') controller.adjustAngle(keyboardAngleStep);
    else if (key === 'w' || key === 'arrowup') {
      controller.setPower(controller.snapshot().power + keyboardPowerStep);
    } else if (key === 's' || key === 'arrowdown') {
      controller.setPower(controller.snapshot().power - keyboardPowerStep);
    } else if (event.code === 'Space') {
      audio.unlock();
      controller.shoot();
    } else return;
    event.preventDefault();
  };
}

function createSpinKeyboardHandler(
  controller: BilliardsGameController,
  snapshot: SnapshotReader,
): (event: KeyboardEvent) => void {
  return (event): void => {
    const current = snapshot();
    if (event.key === 'ArrowLeft') {
      controller.setSpin(current.sideSpin - keyboardSpinStep, current.followSpin);
    } else if (event.key === 'ArrowRight') {
      controller.setSpin(current.sideSpin + keyboardSpinStep, current.followSpin);
    } else if (event.key === 'ArrowUp') {
      controller.setSpin(current.sideSpin, current.followSpin + keyboardSpinStep);
    } else if (event.key === 'ArrowDown') {
      controller.setSpin(current.sideSpin, current.followSpin - keyboardSpinStep);
    } else if (event.key === 'Home' || event.key === '0') controller.setSpin(0, 0);
    else return;
    event.preventDefault();
    event.stopPropagation();
  };
}

function applySpinPointer(
  view: BilliardsViewElements,
  controller: BilliardsGameController,
  clientX: number,
  clientY: number,
): void {
  const bounds = view.spinPad.getBoundingClientRect();
  let side = (clientX - (bounds.left + bounds.width / 2)) / (bounds.width * 0.38);
  let follow = -(clientY - (bounds.top + bounds.height / 2)) / (bounds.height * 0.38);
  const length = Math.hypot(side, follow);
  if (length > 1) {
    side /= length;
    follow /= length;
  }
  controller.setSpin(side, follow);
}

function readPointerWorld(canvas: HTMLCanvasElement, event: PointerEvent): Vec2 {
  return canvasToWorld(pointerToCanvas(canvas, event.clientX, event.clientY));
}
