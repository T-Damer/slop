export interface BilliardsSphereVector {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface BilliardsSphereQuaternion extends BilliardsSphereVector {
  readonly w: number;
}

export type BilliardsRgb = readonly [number, number, number];

export const billiardsIdentityQuaternion: BilliardsSphereQuaternion = {
  x: 0,
  y: 0,
  z: 0,
  w: 1,
};

const colorCache = new Map<string, BilliardsRgb>();

export function billiardsAxisAngleQuaternion(
  axis: BilliardsSphereVector,
  angle: number,
): BilliardsSphereQuaternion {
  const half = angle / 2;
  const sine = Math.sin(half);
  return {
    x: axis.x * sine,
    y: axis.y * sine,
    z: axis.z * sine,
    w: Math.cos(half),
  };
}

export function billiardsMultiplyQuaternions(
  left: BilliardsSphereQuaternion,
  right: BilliardsSphereQuaternion,
): BilliardsSphereQuaternion {
  return {
    w: left.w * right.w - left.x * right.x - left.y * right.y - left.z * right.z,
    x: left.w * right.x + left.x * right.w + left.y * right.z - left.z * right.y,
    y: left.w * right.y - left.x * right.z + left.y * right.w + left.z * right.x,
    z: left.w * right.z + left.x * right.y - left.y * right.x + left.z * right.w,
  };
}

export function billiardsNormalizeQuaternion(
  value: BilliardsSphereQuaternion,
): BilliardsSphereQuaternion {
  const length = Math.hypot(value.x, value.y, value.z, value.w) || 1;
  return {
    x: value.x / length,
    y: value.y / length,
    z: value.z / length,
    w: value.w / length,
  };
}

export function billiardsConjugateQuaternion(
  value: BilliardsSphereQuaternion,
): BilliardsSphereQuaternion {
  return { x: -value.x, y: -value.y, z: -value.z, w: value.w };
}

export function billiardsRotateVector(
  rotation: BilliardsSphereQuaternion,
  value: BilliardsSphereVector,
): BilliardsSphereVector {
  const vector = { x: value.x, y: value.y, z: value.z, w: 0 };
  const rotated = billiardsMultiplyQuaternions(
    billiardsMultiplyQuaternions(rotation, vector),
    billiardsConjugateQuaternion(rotation),
  );
  return { x: rotated.x, y: rotated.y, z: rotated.z };
}

export function billiardsNormalizeVector3(
  value: BilliardsSphereVector,
): BilliardsSphereVector {
  const length = Math.hypot(value.x, value.y, value.z) || 1;
  return { x: value.x / length, y: value.y / length, z: value.z / length };
}

export function billiardsDotVector3(
  left: BilliardsSphereVector,
  right: BilliardsSphereVector,
): number {
  return left.x * right.x + left.y * right.y + left.z * right.z;
}

export function billiardsReadHexColor(value: string): BilliardsRgb {
  const cached = colorCache.get(value);
  if (cached !== undefined) {
    return cached;
  }
  const parsed = [
    Number.parseInt(value.slice(1, 3), 16),
    Number.parseInt(value.slice(3, 5), 16),
    Number.parseInt(value.slice(5, 7), 16),
  ] as const;
  colorCache.set(value, parsed);
  return parsed;
}

export function billiardsMixRgb(
  left: BilliardsRgb,
  right: BilliardsRgb,
  amount: number,
): BilliardsRgb {
  return [
    left[0] + (right[0] - left[0]) * amount,
    left[1] + (right[1] - left[1]) * amount,
    left[2] + (right[2] - left[2]) * amount,
  ];
}

export function billiardsSmoothStep(
  edge0: number,
  edge1: number,
  value: number,
): number {
  const amount = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return amount * amount * (3 - 2 * amount);
}

export function billiardsColorChannel(value: number): number {
  return Math.round(Math.min(255, Math.max(0, value)));
}
