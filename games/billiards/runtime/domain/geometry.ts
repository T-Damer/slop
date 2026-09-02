import type { Vec2 } from './types.ts';

export function addVec2(left: Vec2, right: Vec2): Vec2 {
  return { x: left.x + right.x, y: left.y + right.y };
}

export function subtractVec2(left: Vec2, right: Vec2): Vec2 {
  return { x: left.x - right.x, y: left.y - right.y };
}

export function scaleVec2(vector: Vec2, factor: number): Vec2 {
  return { x: vector.x * factor, y: vector.y * factor };
}

export function dotVec2(left: Vec2, right: Vec2): number {
  return left.x * right.x + left.y * right.y;
}

export function lengthSquaredVec2(vector: Vec2): number {
  return dotVec2(vector, vector);
}

export function lengthVec2(vector: Vec2): number {
  return Math.sqrt(lengthSquaredVec2(vector));
}

export function normalizeVec2(vector: Vec2): Vec2 {
  const length = lengthVec2(vector);
  return length === 0 ? { x: 0, y: 0 } : scaleVec2(vector, 1 / length);
}

export function perpendicularVec2(vector: Vec2): Vec2 {
  return { x: -vector.y, y: vector.x };
}

export function distanceVec2(left: Vec2, right: Vec2): number {
  return lengthVec2(subtractVec2(left, right));
}

export function clampNumber(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function lerpVec2(start: Vec2, end: Vec2, amount: number): Vec2 {
  return {
    x: start.x + (end.x - start.x) * amount,
    y: start.y + (end.y - start.y) * amount,
  };
}

export function isFiniteVec2(vector: Vec2): boolean {
  return Number.isFinite(vector.x) && Number.isFinite(vector.y);
}
