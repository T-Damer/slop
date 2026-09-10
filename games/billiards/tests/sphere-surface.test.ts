import assert from 'node:assert/strict';
import test from 'node:test';
import { rollBall, sphereSurface, sphereTexel, surfaceMatrix } from '../runtime/presentation/sphere-surface.ts';

test('rolling quaternions remain normalized and a reversed displacement restores orientation', () => {
  let q = sphereSurface.identity;
  for (let i = 0; i < 1000; i += 1) q = rollBall(q, 0.13, -0.04, 2.85);
  assert.ok(Math.abs(Math.hypot(...q) - 1) < 1e-10);
  for (let i = 0; i < 1000; i += 1) q = rollBall(q, -0.13, 0.04, 2.85);
  assert.ok(Math.abs(q[0]) + Math.abs(q[1]) + Math.abs(q[2]) < 1e-10);
  assert.equal(sphereTexel(1.01, 0, surfaceMatrix(q)), null);
});

test('number caps remain partially visible at the sphere limb instead of disappearing with their centres', () => {
  const counts = [0, Math.PI / 3, Math.PI / 2].map((angle) => {
    const matrix = surfaceMatrix(rollBall(sphereSurface.identity, angle, 0, 1));
    let count = 0;
    for (let ix = 0; ix < 100; ix += 1) for (let iy = 0; iy < 100; iy += 1) {
      const p = sphereTexel((ix + 0.5) / 50 - 1, (iy + 0.5) / 50 - 1, matrix);
      if (p !== null && p[0] ** 2 + p[1] ** 2 < sphereSurface.capRadius ** 2) count += 1;
    }
    return count;
  });
  assert.ok(counts[0]! > counts[1]! && counts[1]! > counts[2]!);
  assert.ok(counts[2]! > 0, 'pixels at a cap edge should still be visible at 90 degrees');
});
