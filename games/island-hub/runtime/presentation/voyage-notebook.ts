import type { IslandBlueprint, IslandPoint } from '../domain/types.ts';
import { voyageItems, voyageRegions, voyageResidents, type VoyageResidentId, type VoyageState } from '../domain/voyage-registry.ts';
import { questCounter, questStatus, voyageQuests } from '../domain/voyage-quests.ts';

export type VoyageTab = 'quests' | 'map' | 'finds';
const statusLabels = { locked: 'Позже', available: 'Знакомство', active: 'В пути', ready: 'Пора вернуться', complete: 'Спасибо за помощь' } as const;
export function notebookMarkup(state: VoyageState, world: IslandBlueprint, player: IslandPoint, tab: VoyageTab): string {
  const content = tab === 'map' ? mapMarkup(state, world, player) : tab === 'finds' ? findsMarkup(state) : questsMarkup(state);
  return `<header><div><small>${voyageRegions[state.region].name}</small><h2>Мой дневник</h2></div>${closeButton()}</header>
    <nav aria-label="Разделы дневника">${(['quests', 'map', 'finds'] as const).map((id, i) =>
    `<button type="button" data-voyage-tab="${id}" aria-pressed="${id === tab}">${['Поручения', 'Карта', 'Находки'][i]}</button>`).join('')}</nav>
    <div class="voyage-pages">${content}</div>`;
}
export function neighborMarkup(state: VoyageState, id: VoyageResidentId): string {
  const resident = voyageResidents[id];
  const available = voyageQuests.filter((quest) => quest.owner === id && questStatus(state, quest) !== 'locked');
  const greeting = resident.greetings[(Math.max(1, state.conversations[id]) - 1) % resident.greetings.length];
  return `<header><div><small>${resident.title}</small><h2>${resident.name}</h2></div>${closeButton()}</header>
    <p class="voyage-greeting">${greeting}</p><div class="voyage-pages">${available.map((quest) => {
    const status = questStatus(state, quest);
    return `<article><small>${statusLabels[status]}</small><h3>${quest.title}</h3><p>${status === 'complete' ? `Твой подарок: ${quest.reward}. Загляни во двор!` : quest.request}</p>
      ${status === 'complete' ? '' : `<p class="voyage-counter">${questCounter(state, quest)}</p>
      <button type="button" data-voyage-command="${status === 'available' ? 'accept' : 'claim'}" data-quest-id="${quest.id}"
        ${status === 'active' ? 'disabled' : ''}>${status === 'available' ? 'Я помогу' : status === 'ready' ? 'Рассказать / передать находки' : 'Ещё немного осталось'}</button>`}</article>`;
  }).join('')}</div>`;
}
export function dockMarkup(state: VoyageState): string {
  return `<header><div><small>Лодка у причала</small><h2>Куда отправимся?</h2></div>${closeButton()}</header>
    <p>Дом и обстановка останутся на месте. Обратная поездка всегда доступна и ничего не стоит.</p>
    <div class="voyage-pages">${(Object.keys(voyageRegions) as (keyof typeof voyageRegions)[]).filter((id) => id !== state.region).map((id) =>
    `<article><h3>${voyageRegions[id].name}</h3><p>${voyageRegions[id].subtitle}</p>
      <button type="button" data-voyage-travel="${id}">${id === 'home' ? 'Вернуться домой' : 'Отправиться'}</button></article>`).join('')}</div>`;
}
export function closeButton(): string { return '<button class="voyage-close" type="button" data-voyage-close aria-label="Закрыть">×</button>'; }
function questsMarkup(state: VoyageState): string {
  return `<p>Без спешки: выбери одно поручение или просто погуляй.</p>${voyageQuests.map((quest) => {
    const status = questStatus(state, quest);
    return `<article><small>${voyageResidents[quest.owner].name} · ${statusLabels[status]}</small><h3>${quest.title}</h3>
      <p>${status === 'locked' ? 'Сначала познакомься с тропинками своего острова.' : quest.objective}</p>
      <p class="voyage-counter">${status === 'locked' ? '' : questCounter(state, quest)}</p><small>Памятный подарок: ${quest.reward}</small>
      ${status === 'active' || status === 'ready' ? `<button type="button" data-voyage-track="${quest.id}">Следить за поручением</button>` : ''}</article>`;
  }).join('')}`;
}
function findsMarkup(state: VoyageState): string {
  return `<div class="voyage-pockets">${(Object.keys(voyageItems) as (keyof typeof voyageItems)[]).map((id) =>
    `<article><strong>${state.inventory[id]}</strong><span>${voyageItems[id]}</span></article>`).join('')}</div>
    <h3>Память о прогулках</h3><p>Острова: ${state.visited.length}/3 · Открытые места: ${state.discovered.length}/11</p>
    ${state.visited.map((id) => `<p class="voyage-stamp">${voyageRegions[id].name}</p>`).join('')}
    <p>Ракушки и письмо можно передать соседям. Подарки за выполненные поручения появляются у твоего дома.</p>`;
}
function mapMarkup(state: VoyageState, world: IslandBlueprint, player: IslandPoint): string {
  const layout = world.exploration;
  if (!layout) return '<p>Карта пока недоступна.</p>';
  const radius = Math.ceil(Math.max(...world.coastline)) + 2;
  const points = world.coastline.map((r, i) => `${Math.cos(i / world.coastline.length * Math.PI * 2) * r},${Math.sin(i / world.coastline.length * Math.PI * 2) * r}`).join(' ');
  return `<svg class="voyage-map" viewBox="${-radius} ${-radius} ${radius * 2} ${radius * 2}" role="img" aria-label="Карта острова: север сверху, ты отмечен тёмной точкой">
    <rect x="${-radius}" y="${-radius}" width="${radius * 2}" height="${radius * 2}" rx="3" fill="#bcded9"/>
    <polygon points="${points}" fill="#ecd8af"/><polygon points="${points}" transform="scale(.91)" fill="#98bf8c"/>
    <ellipse cx="${layout.pond.x}" cy="${layout.pond.z}" rx="${layout.pond.rx}" ry="${layout.pond.rz}" fill="#bcded9"/>
    ${layout.routes.map((route) => `<polyline points="${route.map((p) => `${p.x},${p.z}`).join(' ')}" fill="none" stroke="#f5e8c6" stroke-width=".8"/>`).join('')}
    ${layout.sites.map((site, i) => `<circle cx="${site.point.x}" cy="${site.point.z}" r=".95" fill="${state.discovered.includes(`${state.region}:${site.id}`) ? '#f9f0d2' : '#679c7d'}"/>
      <text x="${site.point.x}" y="${site.point.z + .45}" text-anchor="middle" font-size="1.5" fill="#334e42">${i + 1}</text>`).join('')}
    ${layout.region === 'home' ? `<rect x="${world.house.x - 1}" y="${world.house.z - 1}" width="2" height="2" fill="#cd9475"/>` : ''}
    <rect x="${layout.dock.x - .65}" y="${layout.dock.z - .65}" width="1.3" height="2" fill="#99704d"/>
    <circle cx="${player.x}" cy="${player.z}" r=".7" fill="#2d514b" stroke="#fff5dc" stroke-width=".3"/>
    <text x="${radius - 3}" y="${-radius + 4}" text-anchor="middle" font-size="2.5" fill="#466659">С</text></svg>
    <p>Тёмная точка — ты. Коричневый причал — лодка.</p>
    ${layout.sites.map((site, i) => `<p>${i + 1}. ${state.discovered.includes(`${state.region}:${site.id}`) ? site.name : 'Неизведанное место'}</p>`).join('')}`;
}
