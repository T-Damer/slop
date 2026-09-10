import type { IslandAnimalId, IslandPlacement, IslandPoint } from './types.ts';

export const voyageRules = {
  version: 1, home: 'home', interactRadius: 1.55, discoveryRadius: 2.4,
  homeRadius: 34, awayRadius: 19, coreRadius: 10.5, coastlineSamples: 128,
  dockWidth: 1.8, dockLength: 3.5, bridgeApron: 0.5,
  treeCount: 62, flowerCount: 78, shrubCount: 36, rockCount: 18,
  placementAttempts: 520, clearance: 1.3, shrubClearance: 0.75,
  pathClearance: 1, siteClearance: 2.2, dockClearance: 2.4, homeClearance: 2.55,
  beachScale: 0.89,
  visitedLimit: 64, inventoryLimit: 99, dialogueHistoryLimit: 10000,
  transitionSeconds: 0.65, mapRefreshSeconds: 0.2, objectiveRefreshSeconds: 0.3,
  messages: { saved: 'Записано в дневник.', storage: 'Не удалось сохранить. Действие не применено; попробуй ещё раз.',
    completed: 'Спасибо! Памятный подарок теперь украшает двор.', far: 'Подойди ближе.',
    missing: 'Пока не всё готово. Дневник подскажет, что осталось.', full: 'Карманы для этих находок заполнены.' },
} as const;
export const voyageRegions = {
  home: { name: 'Родной остров', subtitle: 'Дом, соседская улица, лес, река и южный пляж', color: 0x84b976 },
  shell: { name: 'Ракушечная бухта', subtitle: 'Тёплый песок, ракушки и морское стекло', color: 0xc9bc7a },
  pine: { name: 'Сосновая роща', subtitle: 'Хвойный лес, пруд и потерянное письмо', color: 0x699b8b },
} as const;
export type VoyageRegionId = keyof typeof voyageRegions;
export type VoyageItemId = 'shell' | 'glass' | 'letter';
export const voyageItems: Record<VoyageItemId, string> = { shell: 'Ракушки', glass: 'Морское стекло', letter: 'Письмо в бутылке' };
export const voyageResidents = {
  lumi: { name: 'Луми', species: 'fox', color: 0xd99a69, shirt: 0x6f9c86,
    title: 'Смотритель причала', greetings: ['Ветер сегодня попутный. Отправимся за маленьким открытием?',
      'Мне нравится, когда на острове появляются свои любимые места.', 'С моря всё выглядит иначе. Хорошо, что всегда можно вернуться домой.'] },
  mira: { name: 'Мира', species: 'rabbit', color: 0xe5d3bf, shirt: 0xcf899e,
    title: 'Садовница', greetings: ['Цветы растут неспешно. Нам тоже некуда торопиться.',
      'На берегу бывают красивые ракушки. Из них получится украшение для сада.', 'Сначала выбираю место для скамейки, а потом уже — для клумбы.'] },
  timo: { name: 'Тимо', species: 'raccoon', color: 0x999185, shirt: 0x7396b6,
    title: 'Собиратель историй', greetings: ['У каждой тропинки есть история. Особенно у той, куда ещё не ходил.',
      'Сосновая роща пахнет дождём даже в ясную погоду.', 'Самые интересные находки не обязательно самые дорогие.'] },
} satisfies Record<string, { name: string; species: IslandAnimalId; color: number; shirt: number; title: string; greetings: string[] }>;
export type VoyageResidentId = keyof typeof voyageResidents;
export interface VoyageSite { readonly id: string; readonly name: string; readonly point: IslandPoint; readonly text: string }
export interface VoyagePickup { readonly id: string; readonly item: VoyageItemId; readonly point: IslandPoint }
export interface VoyageNeighbor { readonly id: VoyageResidentId; readonly point: IslandPoint }
export interface VoyagePond extends IslandPoint { readonly rx: number; readonly rz: number; readonly bridgeHalfWidth: number }
export interface VoyageRiver { readonly points: readonly IslandPoint[]; readonly width: number }
export interface VoyageBridge extends IslandPoint {
  readonly id: string; readonly length: number; readonly width: number; readonly rotation: number;
}
export interface VoyageHomeSite extends IslandPoint {
  readonly resident: VoyageResidentId; readonly rotation: number; readonly roof: number;
}
export interface VoyageLayout {
  readonly region: VoyageRegionId; readonly dock: IslandPoint; readonly sites: readonly VoyageSite[];
  readonly residents: readonly VoyageNeighbor[]; readonly pickups: readonly VoyagePickup[];
  readonly routes: readonly (readonly IslandPoint[])[]; readonly pond: VoyagePond;
  readonly river: VoyageRiver | null; readonly bridges: readonly VoyageBridge[];
  readonly homes: readonly VoyageHomeSite[]; readonly shrubs?: readonly IslandPlacement[];
}
export interface VoyageState {
  readonly version: 1; readonly region: VoyageRegionId; readonly visited: readonly VoyageRegionId[];
  readonly discovered: readonly string[]; readonly collected: readonly string[];
  readonly accepted: readonly string[]; readonly claimed: readonly string[];
  readonly inventory: Readonly<Record<VoyageItemId, number>>;
  readonly conversations: Readonly<Record<VoyageResidentId, number>>;
}
export function createVoyageState(): VoyageState {
  return { version: 1, region: 'home', visited: ['home'], discovered: [], collected: [], accepted: [], claimed: [],
    inventory: { shell: 0, glass: 0, letter: 0 }, conversations: { lumi: 0, mira: 0, timo: 0 } };
}
