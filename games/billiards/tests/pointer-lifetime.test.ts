import assert from 'node:assert/strict';
import test from 'node:test';
import { bindBilliardsPointerInputV2 } from '../runtime/presentation/pointer-input-v2.ts';
import { cameraTuning } from '../runtime/presentation/camera-geometry.ts';

test('unmount aborts pointer cancellation listeners on the canvas, document and window', () => {
  const names = ['window', 'document'] as const;
  const previous = names.map((name) => Object.getOwnPropertyDescriptor(globalThis, name));
  const win = new EventTarget(), doc = new EventTarget(), canvas = new EventTarget();
  let cancellations = 0;
  names.forEach((name, index) => Object.defineProperty(globalThis, name, {
    value: [win, doc][index], configurable: true,
  }));
  const options = { canvas, controller: { cancelManualStroke: () => { cancellations++; } } } as unknown as Parameters<typeof bindBilliardsPointerInputV2>[0];
  try {
    const remove = bindBilliardsPointerInputV2(options);
    const dispatch = (): void => {
      canvas.dispatchEvent(new Event(cameraTuning.cancelGestureEvent));
      win.dispatchEvent(new Event('blur')); doc.dispatchEvent(new Event('visibilitychange'));
    };
    dispatch(); assert.equal(cancellations, 3);
    remove(); const disposedCount = cancellations;
    dispatch(); assert.equal(cancellations, disposedCount);
  } finally {
    names.forEach((name, index) => {
      if (previous[index]) Object.defineProperty(globalThis, name, previous[index]!);
      else Reflect.deleteProperty(globalThis, name);
    });
  }
});
