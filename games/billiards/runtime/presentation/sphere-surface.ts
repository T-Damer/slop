/** Presentation-only orientation and per-pixel sphere projection. No physics state. */
export type BallOrientation = readonly [number, number, number, number];
export const sphereSurface = {
  identity: [0, 0, 0, 1] as BallOrientation,
  capRadius: 0.48,
  stripeHalfWidth: 0.48,
  spriteSizes: { high: 48, balanced: 32, low: 24 },
  textureSize: 64,
  rotationQuantization: 64,
  lightCellPixels: 48,
  ambient: 0.32,
  diffuse: 0.68,
  specularPower: 90,
} as const;

export function rollBall(q: BallOrientation, dx: number, dy: number, radius: number): BallOrientation {
  const distance = Math.hypot(dx, dy);
  if (distance === 0) return q;
  const half = distance / radius / 2;
  const ax = -dy / distance * Math.sin(half), ay = dx / distance * Math.sin(half);
  const w = Math.cos(half);
  const next = [w * q[0] + ax * q[3] + ay * q[2],
    w * q[1] + ay * q[3] - ax * q[2],
    w * q[2] + ax * q[1] - ay * q[0], w * q[3] - ax * q[0] - ay * q[1]];
  const length = Math.hypot(...next);
  return [next[0] / length, next[1] / length, next[2] / length, next[3] / length];
}

/** Inverse orientation; each visible pixel samples the rotated sphere surface.
 * Number caps therefore clip at the silhouette without a centre-visibility test. */
export function surfaceMatrix(q: BallOrientation): readonly number[] {
  const [x, y, z, w] = q;
  return [1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w),
    2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w),
    2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y)];
}

export function sphereTexel(x: number, y: number, matrix: readonly number[]): readonly [number, number, number] | null {
  const squared = x * x + y * y;
  if (squared >= 1) return null;
  const z = Math.sqrt(1 - squared);
  return [matrix[0] * x + matrix[1] * y + matrix[2] * z,
    matrix[3] * x + matrix[4] * y + matrix[5] * z,
    matrix[6] * x + matrix[7] * y + matrix[8] * z];
}
