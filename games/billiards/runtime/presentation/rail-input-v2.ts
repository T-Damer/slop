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
  // Both controls are relative drums. Grabbing their edge must not jump a value.
  const crown = (kind: 'power' | 'angle') => {
    let coordinate = 0;
    let travel = 0;
    return (event: PointerEvent, beginning: boolean): void => {
      const delta = beginning ? 0 : event.clientX - coordinate;
      coordinate = event.clientX;
      if (delta === 0) return;
      const before = options.snapshot();
      if (kind === 'power') options.controller.adjustPower(delta / tuning.powerPixelsPerUnit);
      else options.controller.adjustAngle(delta * tuning.angleRadiansPerPixel);
      const after = options.snapshot();
      if (before.power === after.power && before.angleRadians === after.angleRadians) return;
      const previous = Math.floor(travel / tuning.crownDetentPixels);
      travel += delta;
      if (Math.floor(travel / tuning.crownDetentPixels) !== previous) options.audio.playDialTick();
    };
  };
  const key = (event: KeyboardEvent): void => {
    const direction = ['ArrowLeft', 'ArrowDown'].includes(event.code) ? -1
      : ['ArrowRight', 'ArrowUp'].includes(event.code) ? 1 : 0;
    if (direction === 0 || !options.snapshot().canInteract) return;
    event.preventDefault(); event.stopPropagation();
    options.controller.adjustAngle(direction * (event.shiftKey ? tuning.fineAngleStep : tuning.angleStep));
    options.audio.playDialTick();
  };
  options.view.angle.addEventListener('keydown', key);
  const removers = [
    () => options.view.angle.removeEventListener('keydown', key),
    bindCapturedControl(options.view.powerRail, options, crown('power')),
    bindCapturedControl(options.view.angleRail, options, crown('angle')),
    bindRangeInputs(options),
    bindCrownWheel(options.view.powerRail, options, 'power'),
    bindCrownWheel(options.view.angleRail, options, 'angle'),
  ];
  return () => removers.forEach((remove) => remove());
}

/** One captured pointer per control, with the same cancellation policy in both orientations. */
function bindCapturedControl(
  element: HTMLElement,
  options: BilliardsRailInputOptions,
  update: (event: PointerEvent, beginning: boolean) => void,
): () => void {
  const events = new AbortController();
  const listeners = { signal: events.signal };
  let pointerId: number | null = null;
  const cancel = (): void => {
    const id = pointerId;
    pointerId = null;
    if (id !== null && element.hasPointerCapture(id)) element.releasePointerCapture(id);
  };
  const down = (event: PointerEvent): void => {
    if (!event.isPrimary || event.button !== 0 || pointerId !== null || !options.snapshot().canInteract) return;
    event.preventDefault(); event.stopPropagation();
    element.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
    pointerId = event.pointerId;
    element.setPointerCapture(pointerId);
    void options.audio.unlock();
    update(event, true);
  };
  const move = (event: PointerEvent): void => {
    if (pointerId !== event.pointerId) return;
    if (!options.snapshot().canInteract) { cancel(); return; }
    event.preventDefault(); event.stopPropagation();
    update(event, false);
  };
  const up = (event: PointerEvent): void => {
    if (pointerId !== event.pointerId) return;
    if (options.snapshot().canInteract) update(event, false);
    cancel();
  };
  element.addEventListener('pointerdown', down, listeners);
  element.addEventListener('pointermove', move, listeners);
  element.addEventListener('pointerup', up, listeners);
  element.addEventListener('pointercancel', cancel, listeners);
  element.addEventListener('lostpointercapture', cancel, listeners);
  window.addEventListener('blur', cancel, listeners);
  window.addEventListener('resize', cancel, listeners);
  return () => {
    cancel();
    events.abort();
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

/** A wheel over angle must not bubble into the table-wide power shortcut. */
function bindCrownWheel(element: HTMLElement, options: BilliardsRailInputOptions,
  kind: 'power' | 'angle'): () => void {
  let travel = 0;
  const wheel = (event: WheelEvent): void => {
    if (event.ctrlKey || event.metaKey) return;
    event.preventDefault(); event.stopPropagation();
    if (!options.snapshot().canInteract) return;
    const unit = event.deltaMode === 1 ? tuning.wheelLinePixels : event.deltaMode === 2 ? element.clientWidth : 1;
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : -event.deltaY;
    const pixels = Math.max(-tuning.crownWheelPixels, Math.min(tuning.crownWheelPixels, delta * unit));
    if (pixels === 0) return;
    void options.audio.unlock();
    const before = options.snapshot();
    if (kind === 'power') options.controller.adjustPower(pixels / tuning.wheelPixelsPerPower);
    else options.controller.adjustAngle(pixels * (event.shiftKey ? tuning.fineAngleStep : tuning.angleStep) / tuning.wheelLinePixels);
    const after = options.snapshot();
    if (before.power === after.power && before.angleRadians === after.angleRadians) return;
    const previous = Math.floor(travel / tuning.crownDetentPixels);
    travel += pixels;
    if (Math.floor(travel / tuning.crownDetentPixels) !== previous) options.audio.playDialTick();
  };
  element.addEventListener('wheel', wheel, { passive: false });
  return () => element.removeEventListener('wheel', wheel);
}
