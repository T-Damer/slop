import type { Accessor } from 'solid-js';
import type { BilliardsAudioEngine } from './audio.ts';
import type { BilliardsControllerSnapshotV2, BilliardsGameControllerV2 } from './controller-v2.ts';
import { billiardsInputTuning as tuning } from './registry.ts';
import type { BilliardsViewElements } from './view-elements.ts';

export interface BilliardsRailInputOptions {
  readonly view: BilliardsViewElements;
  readonly controller: BilliardsGameControllerV2;
  readonly snapshot: Accessor<BilliardsControllerSnapshotV2>;
  readonly audio: BilliardsAudioEngine;
}

export function bindBilliardsRailInputV2(options: BilliardsRailInputOptions): () => void {
  let angleCoordinate = 0;
  let detent = 0;
  const power = (event: PointerEvent): void => {
    const rect = options.view.powerRail.getBoundingClientRect();
    options.controller.setPower(clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0));
  };
  const angle = (event: PointerEvent, beginning: boolean): void => {
    const coordinate = event.clientX;
    if (!beginning) options.controller.adjustAngle((coordinate - angleCoordinate) * tuning.angleRadiansPerPixel);
    angleCoordinate = coordinate;
    const nextDetent = Math.floor(coordinate / 12);
    if (!beginning && nextDetent !== detent) options.audio.playDialTick();
    detent = nextDetent;
  };
  const key = (event: KeyboardEvent): void => {
    const direction = ['ArrowLeft', 'ArrowDown'].includes(event.code) ? -1
      : ['ArrowRight', 'ArrowUp'].includes(event.code) ? 1 : 0;
    if (direction === 0) return;
    event.preventDefault(); event.stopPropagation();
    options.controller.adjustAngle(direction * (event.shiftKey ? tuning.fineAngleStep : tuning.angleStep));
    options.audio.playDialTick();
  };
  options.view.angle.addEventListener('keydown', key);
  const removers = [
    () => options.view.angle.removeEventListener('keydown', key),
    bindCapturedControl(options.view.powerRail, options, power),
    bindCapturedControl(options.view.angleRail, options, angle),
    bindRangeInputs(options),
  ];
  return () => removers.forEach((remove) => remove());
}

/** One captured pointer per control, with the same cancellation policy in both orientations. */
function bindCapturedControl(
  element: HTMLElement,
  options: BilliardsRailInputOptions,
  update: (event: PointerEvent, beginning: boolean) => void,
): () => void {
  let pointerId: number | null = null;
  const cancel = (): void => {
    const id = pointerId;
    pointerId = null;
    if (id !== null && element.hasPointerCapture(id)) element.releasePointerCapture(id);
  };
  const down = (event: PointerEvent): void => {
    if (!event.isPrimary || event.button !== 0 || pointerId !== null || !options.snapshot().canInteract) return;
    event.preventDefault();
    pointerId = event.pointerId;
    element.setPointerCapture(pointerId);
    void options.audio.unlock();
    update(event, true);
  };
  const move = (event: PointerEvent): void => {
    if (pointerId !== event.pointerId) return;
    event.preventDefault();
    update(event, false);
  };
  const up = (event: PointerEvent): void => {
    if (pointerId !== event.pointerId) return;
    update(event, false);
    cancel();
  };
  element.addEventListener('pointerdown', down);
  element.addEventListener('pointermove', move);
  element.addEventListener('pointerup', up);
  element.addEventListener('pointercancel', cancel);
  element.addEventListener('lostpointercapture', cancel);
  window.addEventListener('blur', cancel);
  window.addEventListener('resize', cancel);
  return () => {
    cancel();
    element.removeEventListener('pointerdown', down);
    element.removeEventListener('pointermove', move);
    element.removeEventListener('pointerup', up);
    element.removeEventListener('pointercancel', cancel);
    element.removeEventListener('lostpointercapture', cancel);
    window.removeEventListener('blur', cancel);
    window.removeEventListener('resize', cancel);
  };
}

function bindRangeInputs(options: BilliardsRailInputOptions): () => void {
  const bindings: ReadonlyArray<readonly [HTMLInputElement, (value: number) => void]> = [
    [options.view.power, (value) => options.controller.setPower(value)],
    [options.view.angle, (value) => options.controller.setAngleRadians(value * tuning.degreesToRadians)],
  ];
  const removers = bindings.map(([element, update]) => {
    const onInput = (): void => update(Number(element.value));
    element.addEventListener('input', onInput);
    return () => element.removeEventListener('input', onInput);
  });
  return () => removers.forEach((remove) => remove());
}

function clamp(value: number, minimum: number): number {
  return Math.min(1, Math.max(minimum, value));
}
