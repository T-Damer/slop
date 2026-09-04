import type { Accessor } from 'solid-js';

import type { BilliardsAudioEngine } from './audio.ts';
import type {
  BilliardsControllerSnapshotV2,
  BilliardsGameControllerV2,
} from './controller-v2.ts';
import type { BilliardsViewElements } from './view-elements.ts';

export interface BilliardsRailInputOptions {
  readonly view: BilliardsViewElements;
  readonly controller: BilliardsGameControllerV2;
  readonly snapshot: Accessor<BilliardsControllerSnapshotV2>;
  readonly audio: BilliardsAudioEngine;
}

export function bindBilliardsRailInputV2(
  options: BilliardsRailInputOptions,
): () => void {
  const removers = [
    bindPowerRail(options),
    bindAngleRail(options),
    bindSpinPad(options),
    bindRangeInputs(options),
  ];
  return () => {
    for (const remove of removers) remove();
  };
}

function bindPowerRail(options: BilliardsRailInputOptions): () => void {
  let pointerId: number | null = null;
  const update = (event: PointerEvent): void => {
    if (pointerId !== event.pointerId) return;
    const rect = options.view.powerRail.getBoundingClientRect();
    const portrait = options.view.root.dataset.billiardsPortrait === 'true';
    const ratio = portrait
      ? (event.clientX - rect.left) / Math.max(1, rect.width)
      : 1 - (event.clientY - rect.top) / Math.max(1, rect.height);
    options.controller.setPower(clamp01(ratio));
  };
  const down = (event: PointerEvent): void => {
    if (event.button !== 0 || !event.isPrimary) return;
    pointerId = event.pointerId;
    options.view.powerRail.setPointerCapture(event.pointerId);
    void options.audio.unlock();
    update(event);
  };
  const finish = (event: PointerEvent): void => {
    if (pointerId !== event.pointerId) return;
    update(event);
    if (options.view.powerRail.hasPointerCapture(event.pointerId)) {
      options.view.powerRail.releasePointerCapture(event.pointerId);
    }
    pointerId = null;
  };
  options.view.powerRail.addEventListener('pointerdown', down);
  options.view.powerRail.addEventListener('pointermove', update);
  options.view.powerRail.addEventListener('pointerup', finish);
  options.view.powerRail.addEventListener('pointercancel', finish);
  return () => {
    options.view.powerRail.removeEventListener('pointerdown', down);
    options.view.powerRail.removeEventListener('pointermove', update);
    options.view.powerRail.removeEventListener('pointerup', finish);
    options.view.powerRail.removeEventListener('pointercancel', finish);
  };
}

function bindAngleRail(options: BilliardsRailInputOptions): () => void {
  let pointerId: number | null = null;
  let previousCoordinate = 0;
  const coordinate = (event: PointerEvent): number =>
    options.view.root.dataset.billiardsPortrait === 'true'
      ? event.clientX
      : event.clientY;
  const down = (event: PointerEvent): void => {
    if (event.button !== 0 || !event.isPrimary) return;
    pointerId = event.pointerId;
    previousCoordinate = coordinate(event);
    options.view.angleRail.setPointerCapture(event.pointerId);
    void options.audio.unlock();
  };
  const move = (event: PointerEvent): void => {
    if (pointerId !== event.pointerId) return;
    event.preventDefault();
    const nextCoordinate = coordinate(event);
    const delta = nextCoordinate - previousCoordinate;
    previousCoordinate = nextCoordinate;
    options.controller.adjustAngle(delta * 0.012);
  };
  const finish = (event: PointerEvent): void => {
    if (pointerId !== event.pointerId) return;
    if (options.view.angleRail.hasPointerCapture(event.pointerId)) {
      options.view.angleRail.releasePointerCapture(event.pointerId);
    }
    pointerId = null;
  };
  options.view.angleRail.addEventListener('pointerdown', down);
  options.view.angleRail.addEventListener('pointermove', move);
  options.view.angleRail.addEventListener('pointerup', finish);
  options.view.angleRail.addEventListener('pointercancel', finish);
  return () => {
    options.view.angleRail.removeEventListener('pointerdown', down);
    options.view.angleRail.removeEventListener('pointermove', move);
    options.view.angleRail.removeEventListener('pointerup', finish);
    options.view.angleRail.removeEventListener('pointercancel', finish);
  };
}

function bindSpinPad(options: BilliardsRailInputOptions): () => void {
  const update = (event: PointerEvent): void => {
    const rect = options.view.spinPad.getBoundingClientRect();
    const x = clampSigned((event.clientX - rect.left) / Math.max(1, rect.width) * 2 - 1);
    const y = clampSigned(1 - (event.clientY - rect.top) / Math.max(1, rect.height) * 2);
    options.controller.setSpin(x, y);
  };
  const down = (event: PointerEvent): void => {
    if (event.button !== 0 || !event.isPrimary) return;
    options.view.spinPad.setPointerCapture(event.pointerId);
    void options.audio.unlock();
    update(event);
  };
  const move = (event: PointerEvent): void => {
    if (!options.view.spinPad.hasPointerCapture(event.pointerId)) return;
    event.preventDefault();
    update(event);
  };
  options.view.spinPad.addEventListener('pointerdown', down);
  options.view.spinPad.addEventListener('pointermove', move);
  return () => {
    options.view.spinPad.removeEventListener('pointerdown', down);
    options.view.spinPad.removeEventListener('pointermove', move);
  };
}

function bindRangeInputs(options: BilliardsRailInputOptions): () => void {
  const onPower = (): void => options.controller.setPower(Number(options.view.power.value));
  const onSide = (): void => options.controller.setSideSpin(Number(options.view.sideSpin.value));
  const onFollow = (): void => options.controller.setFollowSpin(Number(options.view.followSpin.value));
  options.view.power.addEventListener('input', onPower);
  options.view.sideSpin.addEventListener('input', onSide);
  options.view.followSpin.addEventListener('input', onFollow);
  return () => {
    options.view.power.removeEventListener('input', onPower);
    options.view.sideSpin.removeEventListener('input', onSide);
    options.view.followSpin.removeEventListener('input', onFollow);
  };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function clampSigned(value: number): number {
  return Math.min(1, Math.max(-1, value));
}
