import { billiardsCopy, billiardsUiAttributes, billiardsUiIds } from './registry.ts';

export interface BilliardsViewElements {
  readonly root: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly status: HTMLElement;
  readonly hint: HTMLElement;
  readonly connection: HTMLElement;
  readonly players: readonly [HTMLElement, HTMLElement];
  readonly playerNames: readonly [HTMLElement, HTMLElement];
  readonly playerGroups: readonly [HTMLElement, HTMLElement];
  readonly power: HTMLInputElement;
  readonly sideSpin: HTMLInputElement;
  readonly followSpin: HTMLInputElement;
  readonly powerOutput: HTMLOutputElement;
  readonly sideSpinOutput: HTMLOutputElement;
  readonly followSpinOutput: HTMLOutputElement;
  readonly shoot: HTMLButtonElement;
  readonly restart: HTMLButtonElement;
}

export function createBilliardsViewElements(): BilliardsViewElements {
  const root = document.createElement('main');
  root.id = billiardsUiIds.root;
  root.setAttribute(billiardsUiAttributes.root, '');
  root.innerHTML = `
    <div class="billiards-shell">
      <header class="billiards-header">
        <div class="billiards-brand">
          <h1>${billiardsCopy.title}</h1>
          <p>${billiardsCopy.subtitle}</p>
        </div>
        <div class="billiards-connection" aria-live="polite"></div>
      </header>
      <section class="billiards-scoreboard" aria-label="Счёт и очередь хода">
        ${playerCard(0)}
        <div class="billiards-status" aria-live="polite"></div>
        ${playerCard(1)}
      </section>
      <section class="billiards-table-wrap" aria-label="Бильярдный стол">
        <canvas
          id="${billiardsUiIds.canvas}"
          ${billiardsUiAttributes.canvas}
          width="1280"
          height="720"
          tabindex="0"
          aria-label="Бильярдный стол. Ведите указателем для прицеливания."
        ></canvas>
        <div class="billiards-table-hint"></div>
      </section>
      <section class="billiards-controls" aria-label="Настройки удара">
        <div class="billiards-control-panel">
          ${slider('power', billiardsCopy.power, 4, 100, 68)}
          ${slider('side-spin', billiardsCopy.sideSpin, -100, 100, 0)}
          ${slider('follow-spin', billiardsCopy.followSpin, -100, 100, 0)}
        </div>
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
          >↻</button>
        </div>
        <p class="billiards-controls-copy">${billiardsCopy.controls}</p>
      </section>
    </div>
  `;
  return collectElements(root);
}

function playerCard(index: 0 | 1): string {
  return `
    <article class="billiards-player" data-player-index="${index}">
      <div class="billiards-avatar">${index + 1}</div>
      <div>
        <div class="billiards-player-name"></div>
        <div class="billiards-player-group"></div>
      </div>
    </article>
  `;
}

function slider(
  id: string,
  label: string,
  minimum: number,
  maximum: number,
  value: number,
): string {
  return `
    <label class="billiards-slider">
      <span class="billiards-slider-line">
        <span>${label}</span>
        <output data-output-for="${id}"></output>
      </span>
      <input
        data-control="${id}"
        type="range"
        min="${minimum}"
        max="${maximum}"
        value="${value}"
        step="1"
        aria-label="${label}"
      />
    </label>
  `;
}

function collectElements(root: HTMLElement): BilliardsViewElements {
  const players = root.querySelectorAll<HTMLElement>('.billiards-player');
  const names = root.querySelectorAll<HTMLElement>('.billiards-player-name');
  const groups = root.querySelectorAll<HTMLElement>('.billiards-player-group');
  return {
    root,
    canvas: required(root, `#${billiardsUiIds.canvas}`, HTMLCanvasElement),
    status: required(root, '.billiards-status', HTMLElement),
    hint: required(root, '.billiards-table-hint', HTMLElement),
    connection: required(root, '.billiards-connection', HTMLElement),
    players: [requiredIndex(players, 0), requiredIndex(players, 1)],
    playerNames: [requiredIndex(names, 0), requiredIndex(names, 1)],
    playerGroups: [requiredIndex(groups, 0), requiredIndex(groups, 1)],
    power: control(root, 'power'),
    sideSpin: control(root, 'side-spin'),
    followSpin: control(root, 'follow-spin'),
    powerOutput: output(root, 'power'),
    sideSpinOutput: output(root, 'side-spin'),
    followSpinOutput: output(root, 'follow-spin'),
    shoot: required(root, `[${billiardsUiAttributes.shoot}]`, HTMLButtonElement),
    restart: required(root, `[${billiardsUiAttributes.restart}]`, HTMLButtonElement),
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
