import { voyageRules, type VoyageBridge, type VoyageHomeSite, type VoyageLayout, type VoyageRegionId,
  type VoyageRiver, type VoyageSite, type VoyagePickup } from './voyage-registry.ts';
import type { IslandBlueprint, IslandPoint } from './types.ts';

const site = (id: string, name: string, x: number, z: number, text: string): VoyageSite => ({ id, name, point: { x, z }, text });
const bridge = (id: string, x: number, z: number, length: number, width: number, rotation = 0): VoyageBridge =>
  ({ id, x, z, length, width, rotation });
const home = (resident: VoyageHomeSite['resident'], x: number, z: number, rotation: number, roof: number): VoyageHomeSite =>
  ({ resident, x, z, rotation, roof });
const homeRiver: VoyageRiver = {
  width: 2.25,
  points: [{ x: 10, z: -32 }, { x: 10.5, z: -24 }, { x: 9.5, z: -16 }, { x: 12, z: -9 },
    { x: 14, z: -3 }, { x: 12, z: 5 }, { x: 15, z: 12 }, { x: 19, z: 20 }, { x: 21, z: 31 }],
};
const layouts = {
  home: { dock: { x: 4, z: 31 }, pond: { x: 18, z: -9, rx: 3.8, rz: 2.5, bridgeHalfWidth: 0.78 },
    river: homeRiver,
    bridges: [bridge('willow', 12, 5, 6.1, 1.75), bridge('south', 9.6, -16, 6, 1.75, 0.08)],
    homes: [home('lumi', 4.2, 8.4, 0.08, 0xd38868), home('mira', 19.4, 3.1, -0.14, 0xd48eaa),
      home('timo', -15.8, 4.5, 0.12, 0x7897b8)],
    sites: [
      site('village', 'Соседская улочка', 0.5, 9.5, 'У каждого дома свой маленький двор. По вечерам здесь особенно уютно.'),
      site('meadow', 'Цветочный луг', 7.5, 12, 'За домами открывается большой луг. Здесь хватит места и для пикника, и для будущего сада.'),
      site('grove', 'Тенистый лес', -18, 7, 'Под кронами прохладнее. Тропа теряется среди кустов и снова появляется дальше.'),
      site('orchard', 'Старый фруктовый сад', -7, 17, 'Несколько старых деревьев пережили не один сезон. Между ними приятно гулять без цели.'),
      site('cave', 'Каменная пещера', -24, -16, 'За каменной аркой темнеет прохладный проход. Пока можно исследовать вход и прислушаться к эху.'),
      site('stones', 'Сад камней', -15, -23, 'Морской ветер сгладил камни. Хорошее место для передышки после лесной тропы.'),
      site('pond', 'Пруд у мостика', 22.5, -9, 'Пруд соединяется с речной низиной. На другой берег ведёт деревянный мост.'),
      site('falls', 'Речной каскад', 22.5, 20, 'Вода становится громче у каменного каскада, прежде чем уйти к морю.'),
      site('beach', 'Южный пляж', 1, 29, 'Широкий песчаный берег ведёт к лодке Луми и местам, где море оставляет находки.'),
    ],
    residents: [{ id: 'lumi', point: { x: 3, z: 5.6 } }, { id: 'mira', point: { x: 17, z: 4 } },
      { id: 'timo', point: { x: -13, z: 4.4 } }],
    routes: [
      [{ x: -3, z: 2 }, { x: 0.5, z: 9.5 }, { x: 7.5, z: 12 }],
      [{ x: -3, z: 2 }, { x: -10, z: 5 }, { x: -18, z: 7 }, { x: -7, z: 17 }],
      [{ x: -18, z: 7 }, { x: -22, z: -5 }, { x: -24, z: -16 }, { x: -15, z: -23 }],
      [{ x: -15, z: -23 }, { x: 1, z: -21 }, { x: 9.6, z: -16 }, { x: 16, z: -16 }, { x: 22.5, z: -9 }],
      [{ x: 7.5, z: 12 }, { x: 10, z: 7 }, { x: 12, z: 5 }, { x: 16, z: 5 }, { x: 17, z: 4 }],
      [{ x: 16, z: 5 }, { x: 18, z: 12 }, { x: 22.5, z: 20 }],
      [{ x: 7.5, z: 12 }, { x: 5, z: 20 }, { x: 4, z: 31 }, { x: 1, z: 29 }],
      [{ x: 0.5, z: 9.5 }, { x: 3, z: 5.6 }, { x: 4.2, z: 7 }, { x: 0.5, z: 9.5 }],
      [{ x: -10, z: 5 }, { x: -13, z: 4.4 }],
    ],
  },
  shell: { dock: { x: 0, z: 16 }, pond: { x: -6, z: -4, rx: 3, rz: 2, bridgeHalfWidth: 0.72 },
    river: null, bridges: [], homes: [],
    sites: [site('cove', 'Стеклянная отмель', 8, 2, 'Волны оставили кусочки гладкого цветного стекла.'),
      site('lagoon', 'Лагуна', -10, -4, 'Бирюзовая вода скрывает крошечных обитателей.'),
      site('arch', 'Каменные ворота', 1, -11, 'Две скалы обрамляют море, словно вход в другой мир.')],
    residents: [], routes: [[{ x: 0, z: 16 }, { x: 8, z: 2 }, { x: 1, z: -11 }, { x: -10, z: -4 },
      { x: -2, z: -4 }, { x: 0, z: 16 }]],
  },
  pine: { dock: { x: 0, z: 16 }, pond: { x: 5, z: -3, rx: 3.2, rz: 2.4, bridgeHalfWidth: 0.72 },
    river: null, bridges: [], homes: [],
    sites: [site('forest', 'Хвойная тропа', -8, 1, 'Шишки шуршат под ногами. Между стволами виден просвет.'),
      site('post', 'Забытая почта', -5, -10, 'У старого ящика лежит письмо в бутылке. Тимо захочет его прочитать.'),
      site('lake', 'Лесное озеро', 10, -3, 'Над водой тихо качаются ветви. Здесь совсем другой свет.')],
    residents: [], routes: [[{ x: 0, z: 16 }, { x: -8, z: 1 }, { x: -5, z: -10 }, { x: 0, z: -3 },
      { x: 10, z: -3 }, { x: 0, z: 16 }]],
  },
} satisfies Record<VoyageRegionId, Omit<VoyageLayout, 'region' | 'pickups' | 'shrubs'>>;

export function voyageLayout(region: VoyageRegionId, homeBlueprint: IslandBlueprint): VoyageLayout {
  const definition = layouts[region];
  const pickups: VoyagePickup[] = region === 'pine'
    ? [{ id: 'pine:letter', item: 'letter', point: { x: -4, z: -9 } },
      { id: 'pine:glass', item: 'glass', point: { x: 9, z: 2 } }]
    : Array.from({ length: region === 'home' ? 6 : 8 }, (_, index) => ({
      id: `${region}:shell:${index}`, item: 'shell',
      point: region === 'home' ? { x: definition.dock.x - 6 + index * 1.55,
        z: definition.dock.z - 1.9 + Math.sin(index * 1.7) * 0.45 }
        : { x: -5 + index * 1.5, z: 13.5 + Math.sin(index) * 0.6 },
    }));
  if (region === 'shell') pickups.push({ id: 'shell:glass', item: 'glass', point: { x: 8, z: 3 } });
  return { ...definition, region, pickups };
}
export function distanceToRoute(point: IslandPoint, route: readonly IslandPoint[]): number {
  let nearest = Infinity;
  for (let i = 1; i < route.length; i += 1) {
    const a = route[i - 1]!; const b = route[i]!;
    const dx = b.x - a.x; const dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
    nearest = Math.min(nearest, Math.hypot(point.x - a.x - dx * t, point.z - a.z - dz * t));
  }
  return nearest;
}
function insideOrientedRect(point: IslandPoint, center: IslandPoint, halfX: number, halfZ: number, rotation: number): boolean {
  const dx = point.x - center.x; const dz = point.z - center.z;
  const cos = Math.cos(rotation); const sin = Math.sin(rotation);
  const localX = dx * cos - dz * sin; const localZ = dx * sin + dz * cos;
  return Math.abs(localX) <= halfX && Math.abs(localZ) <= halfZ;
}
export function outsidePond(point: IslandPoint, layout: VoyageLayout, margin = 0): boolean {
  const pond = layout.pond;
  if (Math.abs(point.z - pond.z) <= Math.max(0, pond.bridgeHalfWidth - margin)) return true;
  return ((point.x - pond.x) / (pond.rx + margin)) ** 2 + ((point.z - pond.z) / (pond.rz + margin)) ** 2 >= 1;
}
export function outsideRiver(point: IslandPoint, layout: VoyageLayout, margin = 0): boolean {
  const river = layout.river;
  if (river === null || distanceToRoute(point, river.points) >= river.width / 2 + margin) return true;
  return layout.bridges.some((entry) => insideOrientedRect(point, entry,
    entry.length / 2 + voyageRules.bridgeApron, Math.max(0.12, entry.width / 2 - margin), entry.rotation));
}
export function outsideWaterways(point: IslandPoint, layout: VoyageLayout, margin = 0): boolean {
  return outsidePond(point, layout, margin) && outsideRiver(point, layout, margin);
}
export function outsideResidentHomes(point: IslandPoint, layout: VoyageLayout, margin = 0): boolean {
  return layout.homes.every((entry) => !insideOrientedRect(point, entry, 1.45 + margin, 1.28 + margin, entry.rotation));
}
export function voyageReserved(point: IslandPoint, layout: VoyageLayout): boolean {
  return !outsideWaterways(point, layout, voyageRules.clearance)
    || !outsideResidentHomes(point, layout, voyageRules.homeClearance - 1.45)
    || Math.hypot(point.x - layout.dock.x, point.z - layout.dock.z) < voyageRules.dockClearance
    || [...layout.sites, ...layout.residents, ...layout.pickups].some((entry) =>
      Math.hypot(point.x - entry.point.x, point.z - entry.point.z) < voyageRules.siteClearance)
    || layout.routes.some((route) => distanceToRoute(point, route) < voyageRules.pathClearance);
}
