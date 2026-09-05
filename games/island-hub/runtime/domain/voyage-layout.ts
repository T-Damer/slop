import { voyageRules, type VoyageLayout, type VoyageRegionId, type VoyageSite, type VoyagePickup } from './voyage-registry.ts';
import type { IslandBlueprint, IslandPoint } from './types.ts';

const site = (id: string, name: string, x: number, z: number, text: string): VoyageSite => ({ id, name, point: { x, z }, text });
const layouts = {
  home: { dock: { x: 5, z: 22 }, pond: { x: 12, z: -9, rx: 3.4, rz: 2.2, bridgeHalfWidth: 0.72 },
    sites: [site('meadow', 'Цветочный луг', 11, 3, 'За садом открывается луг. Здесь хочется поставить скамейку.'),
      site('grove', 'Тихий сад', -11, 2, 'В старом саду даже шаги становятся тише.'),
      site('stones', 'Сад камней', -8, -12, 'Морской ветер сгладил камни. Хорошее место для передышки.'),
      site('pond', 'Пруд у мостика', 17, -9, 'У воды отражаются облака. Тропинка продолжается за мостом.'),
      site('beach', 'Южный берег', 1, 21, 'Отсюда видно лодку Луми. Чужие берега уже не кажутся далёкими.')],
    residents: [{ id: 'lumi', point: { x: 1.25, z: 1.45 } }, { id: 'mira', point: { x: 10, z: 1 } },
      { id: 'timo', point: { x: -10, z: 3 } }],
    routes: [[{ x: 4, z: 3 }, { x: 11, z: 3 }], [{ x: -3.1, z: 1.45 }, { x: -8, z: 5 }, { x: -11, z: 2 }],
      [{ x: -11, z: 2 }, { x: -12, z: -7 }, { x: -8, z: -12 }, { x: 4, z: -13 }],
      [{ x: 4, z: -13 }, { x: 7, z: -9 }, { x: 17, z: -9 }, { x: 17, z: 3 }, { x: 11, z: 3 }],
      [{ x: 4, z: 3 }, { x: 8, z: 9 }, { x: 5, z: 22 }, { x: 1, z: 21 }]],
  },
  shell: { dock: { x: 0, z: 16 }, pond: { x: -6, z: -4, rx: 3, rz: 2, bridgeHalfWidth: 0.72 },
    sites: [site('cove', 'Стеклянная отмель', 8, 2, 'Волны оставили кусочки гладкого цветного стекла.'),
      site('lagoon', 'Лагуна', -10, -4, 'Бирюзовая вода скрывает крошечных обитателей.'),
      site('arch', 'Каменные ворота', 1, -11, 'Две скалы обрамляют море, словно вход в другой мир.')],
    residents: [], routes: [[{ x: 0, z: 16 }, { x: 8, z: 2 }, { x: 1, z: -11 }, { x: -10, z: -4 },
      { x: -2, z: -4 }, { x: 0, z: 16 }]],
  },
  pine: { dock: { x: 0, z: 16 }, pond: { x: 5, z: -3, rx: 3.2, rz: 2.4, bridgeHalfWidth: 0.72 },
    sites: [site('forest', 'Хвойная тропа', -8, 1, 'Шишки шуршат под ногами. Между стволами виден просвет.'),
      site('post', 'Забытая почта', -5, -10, 'У старого ящика лежит письмо в бутылке. Тимо захочет его прочитать.'),
      site('lake', 'Лесное озеро', 10, -3, 'Над водой тихо качаются ветви. Здесь совсем другой свет.')],
    residents: [], routes: [[{ x: 0, z: 16 }, { x: -8, z: 1 }, { x: -5, z: -10 }, { x: 0, z: -3 },
      { x: 10, z: -3 }, { x: 0, z: 16 }]],
  },
} satisfies Record<VoyageRegionId, Omit<VoyageLayout, 'region' | 'pickups'>>;

export function voyageLayout(region: VoyageRegionId, home: IslandBlueprint): VoyageLayout {
  const definition = layouts[region];
  const pickups: VoyagePickup[] = region === 'pine'
    ? [{ id: 'pine:letter', item: 'letter', point: { x: -4, z: -9 } },
      { id: 'pine:glass', item: 'glass', point: { x: 9, z: 2 } }]
    : Array.from({ length: region === 'home' ? 4 : 8 }, (_, index) => ({
      id: `${region}:shell:${index}`, item: 'shell',
      point: region === 'home' ? { x: -2 + index * 1.5, z: 22 }
        : { x: -5 + index * 1.5, z: 13.5 + Math.sin(index) * 0.6 },
    }));
  if (region === 'shell') pickups.push({ id: 'shell:glass', item: 'glass', point: { x: 8, z: 3 } });
  return { ...definition, region, pickups, residents: definition.residents.map((resident) =>
    resident.id === 'lumi' ? { ...resident, point: home.guideSpawn } : resident) };
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
export function outsidePond(point: IslandPoint, layout: VoyageLayout, margin = 0): boolean {
  const pond = layout.pond;
  if (Math.abs(point.z - pond.z) <= pond.bridgeHalfWidth - margin) return true;
  return ((point.x - pond.x) / (pond.rx + margin)) ** 2 + ((point.z - pond.z) / (pond.rz + margin)) ** 2 >= 1;
}
export function voyageReserved(point: IslandPoint, layout: VoyageLayout): boolean {
  return !outsidePond(point, layout, voyageRules.clearance)
    || Math.hypot(point.x - layout.dock.x, point.z - layout.dock.z) < voyageRules.dockClearance
    || [...layout.sites, ...layout.residents, ...layout.pickups].some((entry) =>
      Math.hypot(point.x - entry.point.x, point.z - entry.point.z) < voyageRules.siteClearance)
    || layout.routes.some((route) => distanceToRoute(point, route) < voyageRules.pathClearance);
}
