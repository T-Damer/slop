import type { Accessor, Setter } from 'solid-js';

import type { BilliardsAudioEngine } from './audio.ts';
import type {
  BilliardsControllerSnapshotV2,
  BilliardsGameControllerV2,
} from './controller-v2.ts';
import { bindBilliardsPointerInputV2 } from './pointer-input-v2.ts';
import { bindBilliardsRailInputV2 } from './rail-input-v2.ts';
import type { BilliardsViewElements } from './view-elements.ts';

export interface BilliardsControlInputOptionsV2 {
  readonly view: BilliardsViewElements;
  readonly controller: BilliardsGameControllerV2;
  readonly snapshot: Accessor<BilliardsControllerSnapshotV2>;
  readonly audio: BilliardsAudioEngine;
  readonly setSoundEnabled: Setter<boolean>;
}

export function bindBilliardsControlsV2(
  options: BilliardsControlInputOptionsV2,
): () => void {
  const removers = [
    bindBilliardsPointerInputV2({
      root: options.view.root,
      canvas: options.view.canvas,
      shootButton: options.view.shoot,
      controller: options.controller,
      snapshot: options.snapshot,
    }),
    bindBilliardsRailInputV2(options),
    bindKeyboard(options),
    bindWheel(options),
    bindActions(options),
    bindAudioUnlock(options),
  ];
  return () => {
    for (const remove of removers) remove();
  };
}

function bindKeyboard(options: BilliardsControlInputOptionsV2): () => void {
  const onKeyDown = (event: KeyboardEvent): void => {
    if (isEditableTarget(event.target)) return;
    const fine = event.shiftKey ? 0.0025 : 0.009;
    const direction = keyboardAngleDirection(event.code);
    if (direction !== 0) {
      event.preventDefault();
      options.controller.adjustAngle(direction * fine);
      return;
    }
    if (event.code === 'Space' || event.code === 'Enter') {
      event.preventDefault();
      void options.audio.unlock();
      options.controller.primaryAction();
    } else if (event.code === 'Escape') {
      event.preventDefault();
      options.controller.unlockAim();
    }
  };
  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}

function bindWheel(options: BilliardsControlInputOptionsV2): () => void {
  const onWheel = (event: WheelEvent): void => {
    if (!options.view.root.contains(event.target as Node | null)) return;
    event.preventDefault();
    const magnitude = Math.min(0.12, Math.abs(event.deltaY) / 700);
    options.controller.adjustPower(event.deltaY < 0 ? magnitude : -magnitude);
  };
  options.view.root.addEventListener('wheel', onWheel, { passive: false });
  return () => options.view.root.removeEventListener('wheel', onWheel);
}

function bindActions(options: BilliardsControlInputOptionsV2): () => void {
  const shoot = (): void => {
    void options.audio.unlock();
    options.controller.primaryAction();
  };
  const restart = (): void => options.controller.restart();
  const sound = (): void => {
    void options.audio.unlock();
    options.setSoundEnabled(options.audio.toggle());
  };
  options.view.shoot.addEventListener('click', shoot);
  options.view.restart.addEventListener('click', restart);
  options.view.sound.addEventListener('click', sound);
  return () => {
    options.view.shoot.removeEventListener('click', shoot);
    options.view.restart.removeEventListener('click', restart);
    options.view.sound.removeEventListener('click', sound);
  };
}

function bindAudioUnlock(options: BilliardsControlInputOptionsV2): () => void {
  const unlock = (): void => {
    void options.audio.unlock();
  };
  options.view.root.addEventListener('pointerdown', unlock, { capture: true });
  return () => options.view.root.removeEventListener('pointerdown', unlock, true);
}

function keyboardAngleDirection(code: string): -1 | 0 | 1 {
  if (code === 'ArrowLeft' || code === 'ArrowDown' || code === 'KeyA') return -1;
  if (code === 'ArrowRight' || code === 'ArrowUp' || code === 'KeyD') return 1;
  return 0;
}

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement
    || target instanceof HTMLTextAreaElement
    || target instanceof HTMLSelectElement
    || (target instanceof HTMLElement && target.isContentEditable);
}
