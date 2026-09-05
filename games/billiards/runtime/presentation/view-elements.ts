import { phosphorIcon } from '../../../shared/game-shell/phosphor.ts';
import { billiardsBallIds } from '../domain/registry.ts';
import { billiardsCopy, billiardsUiAttributes, billiardsUiIds } from './registry.ts';

export interface BilliardsViewElements {
  readonly root: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly stage: HTMLElement;
  readonly zoom: HTMLButtonElement;
  readonly status: HTMLElement;
  readonly hint: HTMLElement;
  readonly connection: HTMLElement;
  readonly sound: HTMLButtonElement;
  readonly players: readonly [HTMLElement, HTMLElement];
  readonly playerNames: readonly [HTMLElement, HTMLElement];
  readonly playerGroups: readonly [HTMLElement, HTMLElement];
  readonly pocketSlots: readonly [ReadonlyArray<HTMLElement>, ReadonlyArray<HTMLElement>];
  readonly powerRail: HTMLElement;
  readonly angleRail: HTMLElement;
  readonly power: HTMLInputElement;
  readonly angle: HTMLInputElement;
  readonly powerOutput: HTMLOutputElement;
  readonly angleOutput: HTMLOutputElement;
  readonly shoot: HTMLButtonElement;
  readonly restart: HTMLButtonElement;
  readonly smokeLayer: HTMLElement;
}

export function createBilliardsViewElements(): BilliardsViewElements {
  const root = document.createElement('main');
  root.id = billiardsUiIds.root; root.setAttribute(billiardsUiAttributes.root, '');
  root.style.setProperty('--billiards-room-art', `url("${new URL('./assets/pocket-club-room.svg', import.meta.url).href}")`);
  root.innerHTML = `<div class="billiards-room-backdrop" aria-hidden="true"></div>
    <div class="billiards-smoke-layer" aria-hidden="true">${Array.from({ length: 5 }, () => '<i class="billiards-smoke-wisp"></i>').join('')}</div>
    <div class="billiards-shell">
    <header class="billiards-header"><span class="billiards-brand">Pocket Club</span><span class="billiards-connection"></span>
      <button class="billiards-icon-button" type="button" data-billiards-sound aria-label="Звук">${phosphorIcon('sound')}</button></header>
    <section class="billiards-scoreboard" aria-label="Игроки и забитые шары">${playerCard(0)}${playerCard(1)}
      <div class="billiards-status" aria-live="polite"></div></section>
    <section class="billiards-stage" aria-label="Бильярдный стол">
      <canvas id="${billiardsUiIds.canvas}" data-billiards-canvas width="1280" height="720" tabindex="0" aria-label="Стол: один палец — прицел, два — масштаб и сдвиг"></canvas>
    </section>
    <div class="billiards-camera-tools"><button type="button" data-billiards-zoom>Приблизить</button><span>2 пальца: масштаб и сдвиг</span></div>
    <section class="billiards-controls" aria-label="Управление ударом">
      <div class="billiards-rollers">${roller('power', 'Сила удара', '68%', '0.04', '1', '0.01')}${roller('angle', 'Направление', '0°', '0', '359', '1')}</div>
      <div class="billiards-actions"><button class="billiards-button" type="button" data-billiards-shoot>Удар</button>
      <button class="billiards-icon-button" type="button" data-billiards-restart aria-label="Новая партия">${phosphorIcon('restart')}</button></div>
      <p class="billiards-table-hint" aria-live="polite">${billiardsCopy.controls}</p>
    </section></div>`;
  return collect(root);
}
function playerCard(index: number): string {
  return `<article class="billiards-player" data-billiards-player data-player-index="${index}">
    <div class="billiards-avatar" aria-hidden="true">${index + 1}</div><div class="billiards-player-copy">
    <div class="billiards-player-name"></div><div class="billiards-player-group"></div>
    <div class="billiards-pocketed-balls" data-player-ball-slots="${index}">${billiardsBallIds.allObjects.map((id) =>
      `<span class="billiards-ball-slot" data-billiards-pocket-slot data-ball-id="${id}" hidden role="img"></span>`).join('')}</div></div></article>`;
}
function roller(id: string, label: string, value: string, min: string, max: string, step: string): string {
  return `<label class="billiards-side-control billiards-${id}-control" data-billiards-${id}-rail>
    <span class="billiards-side-caption">${label}</span><span class="billiards-roller-drum">
    <span class="billiards-roller-ridges" aria-hidden="true"></span><output data-output-for="${id}">${value}</output>
    <input data-control="${id}" type="range" min="${min}" max="${max}" step="${step}" aria-label="${label}"></span></label>`;
}
function collect(root: HTMLElement): BilliardsViewElements {
  const required = <T extends Element>(selector: string): T => {
    const node = root.querySelector<T>(selector);
    if (!node) throw new Error(`Missing billiards view: ${selector}`);
    return node;
  };
  const pair = (selector: string): readonly [HTMLElement, HTMLElement] => {
    const nodes = root.querySelectorAll<HTMLElement>(selector);
    return [nodes[0]!, nodes[1]!];
  };
  const players = pair('.billiards-player');
  return { root, players, canvas: required('canvas'), stage: required('.billiards-stage'), zoom: required('[data-billiards-zoom]'),
    status: required('.billiards-status'), hint: required('.billiards-table-hint'), connection: required('.billiards-connection'), sound: required('[data-billiards-sound]'),
    playerNames: pair('.billiards-player-name'), playerGroups: pair('.billiards-player-group'),
    pocketSlots: [Array.from(players[0].querySelectorAll<HTMLElement>('[data-billiards-pocket-slot]')),
      Array.from(players[1].querySelectorAll<HTMLElement>('[data-billiards-pocket-slot]'))],
    powerRail: required('[data-billiards-power-rail]'), angleRail: required('[data-billiards-angle-rail]'),
    power: required('[data-control="power"]'), angle: required('[data-control="angle"]'),
    powerOutput: required('[data-output-for="power"]'), angleOutput: required('[data-output-for="angle"]'),
    shoot: required('[data-billiards-shoot]'), restart: required('[data-billiards-restart]'), smokeLayer: required('.billiards-smoke-layer') };
}
