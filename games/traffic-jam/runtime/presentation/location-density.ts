export function selectByDensity<T>(
  values: ReadonlyArray<T>,
  density: number,
  minimum = 1,
): ReadonlyArray<T> {
  return values.slice(0, scaledCount(values.length, density, minimum));
}

export function scaledCount(
  total: number,
  density: number,
  minimum: number,
): number {
  const normalizedDensity = Math.min(1, Math.max(0, density));
  return Math.min(
    total,
    Math.max(minimum, Math.ceil(total * normalizedDensity)),
  );
}
