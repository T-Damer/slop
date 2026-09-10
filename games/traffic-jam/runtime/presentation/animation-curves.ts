export function dampAngle(
  current: number,
  target: number,
  amount: number,
): number {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + delta * amount;
}

export function linear(progress: number): number {
  return progress;
}

export function easeInCubic(progress: number): number {
  return progress * progress * progress;
}

export function easeOutCubic(progress: number): number {
  return 1 - Math.pow(1 - progress, 3);
}

export function easeInOutCubic(progress: number): number {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}
