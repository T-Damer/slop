import { phosphorIcon } from '../../../shared/game-shell/phosphor.ts';
import { billiardsBallIds } from '../domain/registry.ts';
import { billiardsCopy, billiardsUiAttributes, billiardsUiIds } from './registry.ts';

export interface BilliardsViewElements {
  readonly root: HTMLElement;
  readonly canvas: HTMLCanvasElement;
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
  readonly sideSpin: HTMLInputElement;
  readonly followSpin: HTMLInputElement;
  readonly powerOutput: HTMLOutputElement;
  readonly angleOutput: HTMLOutputElement;
  readonly sideSpinOutput: HTMLOutputElement;
  readonly followSpinOutput: HTMLOutputElement;
  readonly spinPad: HTMLElement;
  readonly spinDot: HTMLElement;
  readonly shoot: HTMLButtonElement;
  readonly restart: HTMLButtonElement;
  readonly smokeLayer: HTMLElement;
}

const roomArtworkUrl = new URL('./assets/pocket-club-room.svg', import.meta.url).href;
const scoreboardArtworkUrl = new URL('./assets/pocket-club-scoreboard.svg', import.meta.url).href;

export function createBilliardsViewElements(): BilliardsViewElements {
  const root = document.createElement('main');
  root.id = billiardsUiIds.root;
  root.setAttribute(billiardsUiAttributes.root, '');
  root.style.setProperty('--billiards-room-art', cssUrl(roomArtworkUrl));
  root.style.setProperty('--billiards-scoreboard-art', cssUrl(scoreboardArtworkUrl));
  root.innerHTML = `
    <div class="billiards-room-backdrop" aria-hidden="true"></div>
    ${smokeLayer()}
    <div class="billiards-shell">
      <header class="billiards-header">
        <div class="billiards-brand">
          <h1>${billiardsCopy.title}</h1>
          <p>${billiardsCopy.subtitle}</p>
        </div>
        <div class="billiards-utilities">
          <div class="billiards-connection" aria-live="polite"></div>
          <button
            class="billiards-icon-button"
            type="button"
            data-billiards-sound
            aria-label="${billiardsCopy.soundOn}"
            aria-pressed="false"
            title="${billiardsCopy.soundOn}"
          >${phosphorIcon('sound')}</button>
        </div>
      </header>
      <section class="billiards-scoreboard" aria-label="Счёт и очередь хода">
        ${playerCard(0)}
        <div class="billiards-status" aria-live="polite"></div>
        ${playerCard(1)}
      </section>
      <section class="billiards-table-wrap" aria-label="Бильярдный стол">
        <div class="billiards-stage">
          <canvas
            id="${billiardsUiIds.canvas}"
            ${billiardsUiAttributes.canvas}
            width="1280"
            height="720"
            tabindex="0"
            aria-label="Бильярдный стол. Ведите указателем для прицеливания."
          ></canvas>
          ${powerControl()}
          ${angleControl()}
        </div>
      </section>
      <section class="billiards-controls" aria-label="Настройки удара">
        ${spinControl()}
        <div class="billiards-actions">
          <button class="billiards-button" type="button" ${billiardsUiAttributes.shoot}>
            ${billiardsCopy.shoot}
          </button>
          <button
            class="billiards-button secondary"
            type="button"
            title="${billiardsCopy.restart}"
            aria-label="${billiardsCopy.restart}"
            ${billiardsUiAttributes.restart}
          >${phosphorIcon('restart')}</button>
        </div>
        <p class="billiards-controls-copy billiards-table-hint" aria-live="polite">${billiardsCopy.controls}</p>
      </section>
    </div>
  `;
  return collectElements(root);
}

function playerCard(index: 0 | 1): string {
  return `
    <article class="billiards-player" data-billiards-player data-player-index="${index}">
      <div class="billiards-avatar" aria-hidden="true">${phosphorIcon('player')}</div>
      <div class="billiards-player-copy">
        <div class="billiards-player-name"></div>
        <div class="billiards-player-group"></div>
        <div class="billiards-pocketed-balls" data-player-ball-slots="${index}">
          ${Array.from({ length: billiardsBallIds.allObjects.length }, (_, slot) => `
            <span
              class="billiards-ball-slot"
              data-billiards-pocket-slot
              data-ball-slot="${slot}"
              role="img"
            ></span>
          `).join('')}
        </div>
      </div>
    </article>
  `;
}

function powerControl(): string {
  return `
    <label class="billiards-side-control billiards-power-control" data-billiards-power-rail>
      <output data-output-for="power" data-billiards-power-output>68%</output>
      <span class="billiards-side-caption">${billiardsCopy.power}</span>
      <span class="billiards-power-meter" aria-hidden="true">
        <span class="billiards-power-track"></span>
        <span class="billiards-power-fill"></span>
        <span class="billiards-power-cue"></span>
        <span class="billiards-power-tip"></span>
      </span>
      <input
        data-control="power"
        type="range"
        min="0.04"
        max="1"
        value="0.68"
        step="0.01"
        aria-label="${billiardsCopy.power}"
      />
    </label>
  `;
}

function angleControl(): string {
  return `
    <label class="billiards-side-control billiards-angle-control" data-billiards-angle-rail>
      <output data-output-for="angle" data-billiards-angle-output>0°</output>
      <span class="billiards-side-caption">${billiardsCopy.angle}</span>
      <span class="billiards-angle-meter" aria-hidden="true">
        <span class="billiards-angle-scale"></span>
        <span class="billiards-angle-indicator"></span>
      </span>
      <input
        data-control="angle"
        type="range"
        min="0"
        max="359"
        value="0"
        step="1"
        aria-label="${billiardsCopy.angle}"
      />
    </label>
  `;
}

function spinControl(): string {
  return `
    <div class="billiards-spin-control">
      <div class="billiards-spin-copy">
        <strong>${billiardsCopy.spin}</strong>
        <span>${billiardsCopy.spinHint}</span>
      </div>
      <div
        class="billiards-spin-pad"
        data-spin-pad
        role="slider"
        tabindex="0"
        aria-label="${billiardsCopy.spin}"
        aria-valuetext="Без вращения"
      >
        <span class="billiards-spin-crosshair" aria-hidden="true"></span>
        <span class="billiards-spin-dot" data-spin-dot aria-hidden="true"></span>
      </div>
      <div class="billiards-spin-values" aria-live="polite">
        <span>Бок. <output data-output-for="side-spin">0%</output></span>
        <span>Нак. <output data-output-for="follow-spin">0%</output></span>
      </div>
      <input class="billiards-hidden-control" data-control="side-spin" type="range" min="-1" max="1" value="0" step="0.01" />
      <input class="billiards-hidden-control" data-control="follow-spin" type="range" min="-1" max="1" value="0" step="0.01" />
    </div>
  `;
}

function smokeLayer(): string {
  return `
    <div class="billiards-smoke-layer" data-billiards-smoke aria-hidden="true">
      <span class="billiards-smoke-wisp smoke-a"></span>
      <span class="billiards-smoke-wisp smoke-b"></span>
      <span class="billiards-smoke-wisp smoke-c"></span>
      <span class="billiards-smoke-wisp smoke-d"></span>
      <span class="billiards-smoke-wisp smoke-e"></span>
      <span class="billiards-dust-mote dust-a"></span>
      <span class="billiards-dust-mote dust-b"></span>
      <span class="billiards-dust-mote dust-c"></span>
      <span class="billiards-dust-mote dust-d"></span>
      <span class="billiards-dust-mote dust-e"></span>
      <span class="billiards-dust-mote dust-f"></span>
    </div>
  `;
}

function collectElements(root: HTMLElement): BilliardsViewElements {
  const players = root.querySelectorAll<HTMLElement>('.billiards-player');
  const names = root.querySelectorAll<HTMLElement>('.billiards-player-name');
  const groups = root.querySelectorAll<HTMLElement>('.billiards-player-group');
  const slots = root.querySelectorAll<HTMLElement>('[data-player-ball-slots]');
  return {
    root,
    canvas: required(root, `#${billiardsUiIds.canvas}`, HTMLCanvasElement),
    status: required(root, '.billiards-status', HTMLElement),
    hint: required(root, '.billiards-table-hint', HTMLElement),
    connection: required(root, '.billiards-connection', HTMLElement),
    sound: required(root, '[data-billiards-sound]', HTMLButtonElement),
    players: [requiredIndex(players, 0), requiredIndex(players, 1)],
    playerNames: [requiredIndex(names, 0), requiredIndex(names, 1)],
    playerGroups: [requiredIndex(groups, 0), requiredIndex(groups, 1)],
    pocketSlots: [Array.from(requiredIndex(slots, 0).querySelectorAll<HTMLElement>('[data-billiards-pocket-slot]')),
      Array.from(requiredIndex(slots, 1).querySelectorAll<HTMLElement>('[data-billiards-pocket-slot]'))],
    powerRail: required(root, '[data-billiards-power-rail]', HTMLElement),
    angleRail: required(root, '[data-billiards-angle-rail]', HTMLElement),
    power: control(root, 'power'),
    angle: control(root, 'angle'),
    sideSpin: control(root, 'side-spin'),
    followSpin: control(root, 'follow-spin'),
    powerOutput: output(root, 'power'),
    angleOutput: output(root, 'angle'),
    sideSpinOutput: output(root, 'side-spin'),
    followSpinOutput: output(root, 'follow-spin'),
    spinPad: required(root, '[data-spin-pad]', HTMLElement),
    spinDot: required(root, '[data-spin-dot]', HTMLElement),
    shoot: required(root, `[${billiardsUiAttributes.shoot}]`, HTMLButtonElement),
    restart: required(root, `[${billiardsUiAttributes.restart}]`, HTMLButtonElement),
    smokeLayer: required(root, '[data-billiards-smoke]', HTMLElement),
  };
}

function control(root: HTMLElement, id: string): HTMLInputElement {
  return required(root, `[data-control="${id}"]`, HTMLInputElement);
}

function output(root: HTMLElement, id: string): HTMLOutputElement {
  return required(root, `[data-output-for="${id}"]`, HTMLOutputElement);
}

function requiredIndex<T extends Element>(items: NodeListOf<T>, index: number): T {
  const element = items.item(index);
  if (element === null) {
    throw new Error(`Missing billiards view element at index ${index}.`);
  }
  return element;
}

function required<T extends Element>(
  root: ParentNode,
  selector: string,
  constructor: { new(): T },
): T {
  const element = root.querySelector(selector);
  if (!(element instanceof constructor)) {
    throw new Error(`Missing billiards view element: ${selector}`);
  }
  return element;
}

function cssUrl(value: string): string {
  return `url(${JSON.stringify(value)})`;
}
