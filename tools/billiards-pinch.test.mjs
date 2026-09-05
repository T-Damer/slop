import assert from 'node:assert/strict';
import test from 'node:test';
import { pinchPoints } from './browser-quality/billiards-pinch.mjs';

for (const [width, height] of [[768, 1024], [390, 844], [360, 640]]) {
  test(`trusted pinch coordinates stay on the visible stage at ${width}x${height}`, () => {
    const bounds = { left: 6, top: 130.5, right: width - 6, bottom: height - 150.25, width, height };
    const frames = pinchPoints(bounds);
    for (const frame of frames) for (const point of frame) {
      assert.ok(Number.isInteger(point.x) && Number.isInteger(point.y));
      assert.ok(point.x > bounds.left && point.x < bounds.right);
      assert.ok(point.y > bounds.top && point.y < bounds.bottom);
    }
    const span = ([a, b]) => b.x - a.x;
    assert.ok(span(frames.at(-1)) > span(frames[0]));
    assert.deepEqual(frames[0].map(p => p.id), frames.at(-1).map(p => p.id));
  });
}
test('a missing or offscreen camera cannot be mistaken for a successful pinch', () => {
  assert.throws(() => pinchPoints({}), /Non-finite/);
  assert.throws(() => pinchPoints({ left: 0, right: 20, top: 1000, bottom: 1050, width: 360, height: 640 }), /not large enough/);
});
