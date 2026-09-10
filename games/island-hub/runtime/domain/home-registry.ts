import type { IslandPoint } from './types.ts';

export const homeRules = {
  schemaVersion: 1, halfSize: 3, wallMargin: 0.15, grid: 0.5, navigationGrid: 0.25,
  playerRadius: 0.24, interactionRadius: 1.15, doorRadius: 0.9, doorOffset: 1.9,
  door: { x: 0, z: 2.5 }, exitClearance: { halfWidth: 0.7, minimumZ: 1.7 },
  maximumItems: 24, maximumUndo: 20, maximumIdLength: 80,
  messages: { bounds: 'Предмет должен оставаться внутри комнаты.',
    collision: 'Здесь уже стоит мебель.', exit: 'Оставь свободный проход к двери.',
    access: 'К мебели должен оставаться доступ от двери.', invalid: 'Некорректное размещение.',
    missing: 'Предмет не найден.', full: 'Нет свободного места.',
    saved: 'Обстановка сохранена.', failed: 'Не удалось сохранить. Изменения остаются в предпросмотре.' },
} as const;

export const homeCatalog = {
  chair: { label: 'Кресло', width: 0.7, depth: 0.7, action: 'Сесть', seatHeight: 0.46 },
  table: { label: 'Стол', width: 1, depth: 0.8, action: 'Осмотреть стол', seatHeight: 0 },
  lamp: { label: 'Торшер', width: 0.45, depth: 0.45, action: 'Переключить свет', seatHeight: 0 },
  bed: { label: 'Кровать', width: 1, depth: 1.8, action: 'Отдохнуть', seatHeight: 0.42 },
  plant: { label: 'Растение', width: 0.6, depth: 0.6, action: 'Полюбоваться', seatHeight: 0 },
  cabinet: { label: 'Комод', width: 1, depth: 0.6, action: 'Открыть хранение мебели', seatHeight: 0 },
} as const;
export type HomeItemKind = keyof typeof homeCatalog;
export interface HomeItem extends IslandPoint {
  readonly id: string; readonly kind: HomeItemKind; readonly rotation: number;
  readonly placed: boolean; readonly active: boolean;
}
export interface HomeState {
  readonly schemaVersion: 1; readonly revision: number; readonly items: ReadonlyArray<HomeItem>;
}
export type HomeCommand = { readonly kind: 'move'; readonly x: number; readonly z: number }
  | { readonly kind: 'rotate' | 'store' | 'place' | 'toggle' };

const starterLayout: ReadonlyArray<readonly [HomeItemKind, number, number]> = [
  ['chair', 0, 0], ['table', 0, -1.5], ['lamp', 2, -1.5],
  ['bed', -2, -1.5], ['plant', -2, 1], ['cabinet', 2, 0.5],
];
export function createHomeState(): HomeState {
  return { schemaVersion: homeRules.schemaVersion, revision: 0,
    items: starterLayout.map(([kind, x, z]) => ({ id: `home-${kind}`, kind, x, z,
      rotation: 0, placed: true, active: kind === 'lamp' })) };
}
