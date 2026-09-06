/** Route-local cosmetics, independent of match rules and network authority. */
export const billiardsCues = [
  { id: 'house', name: 'Классика', url: new URL('./assets/house-cue.svg?no-inline', import.meta.url).href },
  { id: 'ebony', name: 'Эбен и латунь', url: new URL('./assets/ebony-cue.svg?no-inline', import.meta.url).href },
  { id: 'maple', name: 'Клён и бирюза', url: new URL('./assets/maple-cue.svg?no-inline', import.meta.url).href },
] as const;
export type BilliardsCueId = typeof billiardsCues[number]['id'];
const selections = new WeakMap<HTMLCanvasElement, BilliardsCueId>();
export function selectedCue(canvas: HTMLCanvasElement): BilliardsCueId { return selections.get(canvas) ?? 'house'; }
export function selectCue(canvas: HTMLCanvasElement, id: unknown): boolean {
  const cue = billiardsCues.find((entry) => entry.id === id);
  if (!cue) return false;
  selections.set(canvas, cue.id);
  return true;
}
