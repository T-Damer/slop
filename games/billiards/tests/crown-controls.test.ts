import assert from 'node:assert/strict';
import test from 'node:test';
import { bindBilliardsRailInputV2 } from '../runtime/presentation/rail-input-v2.ts';
import { BilliardsGameControllerV2 } from '../runtime/presentation/controller-v2.ts';
import { selectCue, selectedCue } from '../runtime/presentation/cue-selection.ts';

class Rail extends EventTarget {
  public value = '0';
  public clientWidth = 180;
  private captured: number | null = null;
  public focus(): void {}
  public querySelector(): Rail { return this; }
  public setPointerCapture(id: number): void { this.captured = id; }
  public hasPointerCapture(id: number): boolean { return this.captured === id; }
  public releasePointerCapture(): void { this.captured = null; }
}
function send(target: EventTarget, type: string, properties: Record<string, number | boolean> = {}): Event {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, { clientX: 0, pointerId: 1, isPrimary: true, button: 0, ...properties });
  target.dispatchEvent(event);
  return event;
}
function fixture(run: (power: Rail, angle: Rail, controller: BilliardsGameControllerV2, remove: () => void, ticks: () => number) => void): void {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { value: new EventTarget(), configurable: true });
  const power = new Rail(), angle = new Rail(), controller = new BilliardsGameControllerV2();
  let ticks = 0;
  const remove = bindBilliardsRailInputV2({
    view: { powerRail: power, angleRail: angle, power, angle }, controller,
    snapshot: () => controller.snapshot(), audio: { unlock: async () => {}, playDialTick: () => { ticks++; } },
  } as unknown as Parameters<typeof bindBilliardsRailInputV2>[0]);
  try { run(power, angle, controller, remove, () => ticks); }
  finally {
    remove();
    if (original) Object.defineProperty(globalThis, 'window', original);
    else Reflect.deleteProperty(globalThis, 'window');
  }
}

test('crown grab does not jump; equal relative drags work from either edge', () => fixture((power, _angle, controller, _remove, ticks) => {
  const initial = controller.snapshot().power;
  for (const start of [8, 172]) {
    controller.setPower(initial);
    send(power, 'pointerdown', { clientX: start });
    assert.equal(controller.snapshot().power, initial);
    send(power, 'pointermove', { clientX: start - 18 });
    assert.ok(Math.abs(controller.snapshot().power - (initial - 0.1)) < 1e-9);
    send(power, 'pointerup', { clientX: start - 18 });
  }
  assert.ok(ticks() >= 2);
}));

test('wheel targets angle and power independently, including line mode', () => fixture((power, angle, controller) => {
  const initial = controller.snapshot();
  assert.equal(send(angle, 'wheel', { deltaY: -2, deltaX: 0, deltaMode: 1 }).defaultPrevented, true);
  assert.equal(controller.snapshot().power, initial.power);
  assert.ok(controller.snapshot().angleRadians > initial.angleRadians);
  const direction = controller.snapshot().angleRadians;
  send(power, 'wheel', { deltaY: 32, deltaX: 0, deltaMode: 0 });
  assert.ok(controller.snapshot().power < initial.power);
  assert.equal(controller.snapshot().angleRadians, direction);
}));

test('pause, cancellation, non-primary pointers and disposal prevent crown changes', () => fixture((power, angle, controller, remove) => {
  const initial = controller.snapshot();
  send(power, 'pointerdown', { isPrimary: false });
  send(power, 'pointermove', { clientX: 50 });
  assert.equal(controller.snapshot().power, initial.power);
  send(power, 'pointerdown'); send(power, 'pointercancel');
  send(power, 'pointermove', { clientX: 50 });
  assert.equal(controller.snapshot().power, initial.power);
  controller.setPaused(true);
  send(angle, 'wheel', { deltaY: -50, deltaX: 0, deltaMode: 0 });
  assert.equal(controller.snapshot().angleRadians, initial.angleRadians);
  controller.setPaused(false); remove();
  send(power, 'pointerdown'); send(power, 'pointermove', { clientX: 50 });
  send(angle, 'wheel', { deltaY: -50, deltaX: 0, deltaMode: 0 });
  assert.equal(controller.snapshot().power, initial.power);
  assert.equal(controller.snapshot().angleRadians, initial.angleRadians);
}));

test('cue cosmetics are validated and isolated between route instances', () => {
  const one = {} as HTMLCanvasElement, two = {} as HTMLCanvasElement;
  assert.equal(selectedCue(one), 'house');
  assert.equal(selectCue(one, 'ebony'), true);
  assert.equal(selectedCue(one), 'ebony');
  assert.equal(selectedCue(two), 'house');
  assert.equal(selectCue(one, 'unknown'), false);
  assert.equal(selectedCue(one), 'ebony');
});
