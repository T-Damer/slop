import {
  trafficErrors,
  trafficEvents,
  trafficGame,
  trafficRandomization,
  trafficRules,
} from '../domain/registry.ts';
import {
  createTrafficLevel,
  getTrafficLevelCount,
} from '../domain/levels.ts';
import {
  createInitialTrafficState,
  getAvailableCarIds,
  releaseTrafficCar,
} from '../domain/rules.ts';
import { solveTrafficState } from '../domain/solver.ts';
import type {
  TrafficDomainEvent,
  TrafficLevelDefinition,
  TrafficState,
} from '../domain/types.ts';
import { parkingGuidanceStyles } from './guidance-styles.ts';
import { parkingImpactStyles } from './impact-styles.ts';
import {
  parkingColorCss,
  parkingColorNames,
  parkingLayout,
  parkingLocationNames,
  parkingUiActions,
  parkingUiAttributes,
  parkingUiCopy,
  parkingUiEvents,
  parkingUiIds,
  parkingUiKeys,
  parkingUiSymbols,
  parkingUiTimings,
} from './registry.ts';
import { ParkingJamScene } from './scene.ts';
import { parkingStyles } from './styles.ts';

let activeApp: ParkingJamApp | null = null;

export function mountParkingJam(parent: HTMLElement): void {
  unmountParkingJam();
  installStyles();
  const root = document.createElement('div');
  root.id = parkingUiIds.root;
  parent.append(root);
  activeApp = new ParkingJamApp(root);
  activeApp.mount();
}

export function unmountParkingJam(): void {
  activeApp?.unmount();
  activeApp = null;
  document.getElementById(parkingUiIds.root)?.remove();
  document.getElementById(parkingUiIds.style)?.remove();
}

class ParkingJamApp {
  private levelIndex = loadNumber(trafficGame.progressStorageKey, trafficRules.firstIndex);
  private levelSeed = createRuntimeSeed();
  private currentLevel = createTrafficLevel(this.levelIndex, this.levelSeed);
  private state = createInitialTrafficState(this.currentLevel);
  private history: Array<TrafficState> = [];
  private bankCoins = loadNumber(trafficGame.coinStorageKey, trafficRules.initialCoins);
  private busy = false;
  private rewardCommitted = false;
  private disposed = false;
  private scene: ParkingJamScene | null = null;
  private readonly timers = new Set<number>();
  private readonly previousTitle = document.title;

  public constructor(private readonly root: HTMLElement) {}

  private get level(): TrafficLevelDefinition {
    return this.currentLevel;
  }

  public mount(): void {
    document.title = parkingUiCopy.title;
    this.root.innerHTML = renderShell();
    const host = this.root.querySelector<HTMLElement>('.parking-canvas-host');
    if (host === null) {
      throw new Error('Parking Jam canvas host is missing.');
    }

    this.scene = new ParkingJamScene(host, {
      onCarSelected: (carId) => void this.selectCar(carId),
    });
    this.root.addEventListener(parkingUiEvents.click, this.handleClick);
    document.addEventListener('keydown', this.handleKeydown);
    this.loadLevel(this.levelIndex, false, false);
  }

  public unmount(): void {
    this.disposed = true;
    document.title = this.previousTitle;
    this.root.removeEventListener(parkingUiEvents.click, this.handleClick);
    document.removeEventListener('keydown', this.handleKeydown);
    for (const timer of this.timers) {
      window.clearTimeout(timer);
    }
    this.timers.clear();
    this.scene?.destroy();
    this.scene = null;
  }

  private readonly handleClick = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const element = target.closest<HTMLElement>(`[${parkingUiAttributes.action}]`);
    const action = element?.getAttribute(parkingUiAttributes.action);
    if (action === parkingUiActions.undo || action === parkingUiActions.retry) {
      this.undoMove();
    } else if (action === parkingUiActions.reset) {
      this.resetLevel();
    } else if (action === parkingUiActions.hint) {
      void this.showHint();
    } else if (action === parkingUiActions.next) {
      this.nextLevel();
    }
  };

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (event.repeat || this.busy) {
      return;
    }
    const key = event.key.toLowerCase();
    if (key === parkingUiKeys.undo) {
      this.undoMove();
    } else if (key === parkingUiKeys.reset) {
      this.resetLevel();
    } else if (key === parkingUiKeys.hint) {
      void this.showHint();
    }
  };

  private async selectCar(carId: string): Promise<void> {
    if (this.busy || this.disposed || this.scene === null) {
      return;
    }

    const result = releaseTrafficCar(this.level, this.state, carId);
    if (!result.ok) {
      this.setBusy(true);
      if (result.error === trafficErrors.pathBlocked) {
        this.showMessage(parkingUiCopy.blocked);
        await this.scene.showBlocked(carId, result.blockingCarIds);
      } else if (result.error === trafficErrors.noBayAvailable) {
        this.showMessage(parkingUiCopy.noBay);
        await this.scene.showNoBay();
      }
      this.setBusy(false);
      this.showMessage(this.targetInstruction());
      return;
    }

    this.history.push(this.state);
    this.setBusy(true);
    this.clearOverlay();

    for (const event of result.events) {
      if (this.disposed || this.scene === null) {
        return;
      }
      await this.playEvent(event);
    }

    this.state = result.state;
    this.updateHud();

    if (this.state.completed) {
      this.commitReward();
      this.updateHud();
      this.scene.celebrate();
      this.runAfter(parkingUiTimings.completionDelayMs, () => {
        if (this.state.completed) {
          this.showCompletionOverlay();
        }
      });
      return;
    }

    if (this.state.jammed) {
      this.showJammedOverlay();
      return;
    }

    this.setBusy(false);
    this.showMessage(this.targetInstruction());
  }

  private async playEvent(event: TrafficDomainEvent): Promise<void> {
    if (this.scene === null) {
      return;
    }

    if (event.type === trafficEvents.carReleased) {
      await this.scene.animateCarReleased(this.level, event);
      return;
    }

    if (event.type === trafficEvents.passengerGroupBoarded) {
      this.updateEventHud(event);
      this.spawnScorePopup(event.carId, `+${formatNumber(event.points)}`);
      this.spawnScorePopup(
        event.carId,
        `${parkingUiSymbols.group}${event.passengerCount} ${parkingUiCopy.groupSuffix}`,
        'is-group',
      );
      await this.scene.animatePassengerGroupBoarded(event);
      return;
    }

    if (event.type === trafficEvents.carDeparted) {
      this.updateEventHud(event);
      this.spawnScorePopup(event.carId, `+${formatNumber(event.points)}`);
      if (event.coins > trafficRules.emptyCollectionSize) {
        this.spawnScorePopup(event.carId, `+${event.coins} ${parkingUiCopy.coins}`, 'is-coin');
      }
      if (event.comboAfter > trafficRules.initialCombo + trafficRules.cellStep) {
        this.spawnScorePopup(event.carId, `×${event.comboAfter} ${parkingUiCopy.combo}`, 'is-combo');
      }
      await this.scene.animateCarDeparted(event);
      return;
    }

    if (event.type === trafficEvents.comboReset) {
      this.updateEventHud(event);
    }
  }

  private undoMove(): void {
    if (this.busy && !this.state.jammed && !this.state.completed) {
      return;
    }
    const previousState = this.history.pop();
    if (previousState === undefined || this.scene === null) {
      return;
    }
    this.state = previousState;
    this.rewardCommitted = false;
    this.clearOverlay();
    this.scene.load(this.level, this.state);
    this.setBusy(false);
    this.updateHud();
    this.showMessage(this.targetInstruction());
  }

  private resetLevel(): void {
    this.loadLevel(this.levelIndex, false, true);
    this.showMessage(parkingUiCopy.shuffled);
  }

  private async showHint(): Promise<void> {
    if (this.busy || this.state.completed || this.state.jammed || this.scene === null) {
      return;
    }
    const solution = solveTrafficState(this.level, this.state);
    const carId = solution?.[trafficRules.firstIndex]
      ?? getAvailableCarIds(this.level, this.state)[trafficRules.firstIndex];
    if (carId === undefined) {
      return;
    }
    this.setBusy(true);
    this.showMessage(parkingUiCopy.hint);
    await this.scene.highlightCar(carId);
    this.setBusy(false);
    this.showMessage(this.targetInstruction());
  }

  private nextLevel(): void {
    if (!this.state.completed) {
      return;
    }
    this.commitReward();
    const nextIndex = this.levelIndex + trafficRules.cellStep;
    this.loadLevel(
      nextIndex >= getTrafficLevelCount() ? trafficRules.firstIndex : nextIndex,
      true,
      true,
    );
  }

  private loadLevel(levelIndex: number, persist: boolean, reroll: boolean): void {
    this.levelIndex = normalizeLevelIndex(levelIndex);
    if (reroll) {
      this.levelSeed = createRuntimeSeed(this.levelSeed);
    }
    this.currentLevel = createTrafficLevel(this.levelIndex, this.levelSeed);
    if (persist) {
      saveNumber(trafficGame.progressStorageKey, this.levelIndex);
    }
    this.state = createInitialTrafficState(this.currentLevel);
    this.history = [];
    this.rewardCommitted = false;
    this.clearOverlay();
    this.scene?.load(this.currentLevel, this.state);
    this.setBusy(false);
    this.updateHud();
    this.showMessage(this.targetInstruction());
  }

  private commitReward(): void {
    if (this.rewardCommitted) {
      return;
    }
    this.bankCoins += this.state.coins;
    saveNumber(trafficGame.coinStorageKey, this.bankCoins);
    this.rewardCommitted = true;
  }

  private updateHud(): void {
    setText(this.root, '[data-hud="level"]', `${this.levelIndex + trafficRules.cellStep}/${getTrafficLevelCount()}`);
    setText(
      this.root,
      '[data-hud="level-name"]',
      `${this.level.name} · ${parkingLocationNames[this.level.location]}`,
    );
    setText(this.root, '[data-hud="score"]', formatNumber(this.state.score));
    const unbanked = this.rewardCommitted ? trafficRules.initialCoins : this.state.coins;
    setText(this.root, '[data-hud="coins"]', formatNumber(this.bankCoins + unbanked));

    const combo = this.root.querySelector<HTMLElement>('[data-hud="combo"]');
    if (combo !== null) {
      combo.textContent = `×${this.state.combo} ${parkingUiCopy.combo}`;
      combo.classList.toggle('is-visible', this.state.combo > trafficRules.initialCombo);
    }

    this.renderQueue(this.state.passengers);
    this.scene?.syncGuidance(this.level, this.state);
    this.updateControls();
  }

  private updateEventHud(event: TrafficDomainEvent): void {
    setText(this.root, '[data-hud="score"]', formatNumber(event.scoreAfter));
    setText(this.root, '[data-hud="coins"]', formatNumber(this.bankCoins + event.coinsAfter));
    const combo = this.root.querySelector<HTMLElement>('[data-hud="combo"]');
    if (combo !== null) {
      combo.textContent = `×${event.comboAfter} ${parkingUiCopy.combo}`;
      combo.classList.toggle('is-visible', event.comboAfter > trafficRules.initialCombo);
    }
    const remainingPassengers = this.state.passengers.slice(
      this.state.passengers.length - event.queueRemaining,
    );
    this.renderQueue(remainingPassengers);
  }

  private renderQueue(passengers: TrafficState['passengers']): void {
    const next = this.root.querySelector<HTMLElement>('[data-hud="next"]');
    if (next === null) {
      return;
    }
    const color = passengers[trafficRules.firstIndex];
    if (color === undefined) {
      next.innerHTML = '';
      return;
    }

    const groupSize = countLeadingGroup(passengers, color);
    const css = parkingColorCss[color];
    const name = parkingColorNames[color];
    const dots = passengers
      .slice(trafficRules.firstIndex, parkingLayout.queueHudLimit)
      .map((passengerColor, index) => {
        const groupClass = index < groupSize ? 'is-current-group' : '';
        const firstClass = index === trafficRules.firstIndex ? 'is-first' : '';
        return `<span class="parking-queue-dot ${groupClass} ${firstClass}" style="background:${parkingColorCss[passengerColor]}"></span>`;
      })
      .join('');

    next.innerHTML = `
      <div class="parking-target-card" style="--target-color:${css}">
        <span class="parking-target-car" aria-hidden="true"></span>
        <span class="parking-target-copy">
          <small class="parking-target-label">${parkingUiCopy.targetLabel}</small>
          <strong class="parking-target-name">${name} ${parkingUiCopy.targetSuffix}</strong>
          <span class="parking-target-group">${parkingUiSymbols.group}${groupSize} ${parkingUiCopy.groupSuffix}</span>
        </span>
        <span class="parking-target-arrow" aria-hidden="true">${parkingUiSymbols.targetArrow}</span>
      </div>
      <div class="parking-queue-strip">
        <span class="parking-queue-label">${parkingUiCopy.queue}</span>${dots}
      </div>
    `;
  }

  private targetInstruction(): string {
    const color = this.state.passengers[trafficRules.firstIndex];
    if (color === undefined) {
      return parkingUiCopy.instruction;
    }
    const groupSize = countLeadingGroup(this.state.passengers, color);
    return `${parkingUiCopy.instructionPrefix} ${parkingColorNames[color]} ${parkingUiCopy.instructionMiddle} ${groupSize} ${parkingUiCopy.instructionSuffix}`;
  }

  private updateControls(): void {
    const undo = this.root.querySelector<HTMLButtonElement>(`[${parkingUiAttributes.action}="${parkingUiActions.undo}"]`);
    const hint = this.root.querySelector<HTMLButtonElement>(`[${parkingUiAttributes.action}="${parkingUiActions.hint}"]`);
    const reset = this.root.querySelector<HTMLButtonElement>(`[${parkingUiAttributes.action}="${parkingUiActions.reset}"]`);
    if (undo !== null) {
      undo.disabled = this.history.length === trafficRules.emptyCollectionSize
        || (this.busy && !this.state.jammed && !this.state.completed);
    }
    if (hint !== null) {
      hint.disabled = this.busy || this.state.completed || this.state.jammed;
    }
    if (reset !== null) {
      reset.disabled = this.busy && !this.state.jammed && !this.state.completed;
    }
  }

  private setBusy(busy: boolean): void {
    this.busy = busy;
    this.scene?.setInteractive(!busy && !this.state.completed && !this.state.jammed);
    this.root.classList.toggle('is-busy', busy);
    this.updateControls();
  }

  private showMessage(message: string): void {
    const element = this.root.querySelector<HTMLElement>('[data-hud="message"]');
    if (element !== null) {
      element.textContent = message;
    }
  }

  private spawnScorePopup(carId: string | null, text: string, modifier = ''): void {
    if (carId === null || this.scene === null) {
      return;
    }
    const point = this.scene.screenPointForCar(carId);
    const layer = this.root.querySelector<HTMLElement>('.parking-fx');
    if (point === null || layer === null) {
      return;
    }
    const popup = document.createElement('span');
    popup.className = `parking-score-pop ${modifier}`.trim();
    popup.textContent = text;
    popup.style.left = `${point.x}px`;
    popup.style.top = `${point.y}px`;
    layer.append(popup);
    this.runAfter(parkingUiTimings.popupMs, () => popup.remove());
  }

  private showCompletionOverlay(): void {
    this.setBusy(true);
    const last = this.levelIndex === getTrafficLevelCount() - trafficRules.cellStep;
    const overlay = this.overlayElement();
    overlay.innerHTML = `
      <section class="parking-result" role="dialog" aria-modal="true">
        <div class="parking-result-badge">✓</div>
        <h2 class="parking-result-title">${parkingUiCopy.completedTitle}</h2>
        <p class="parking-result-body">${parkingUiCopy.completedBody}</p>
        <div class="parking-result-stats">
          <div class="parking-result-stat"><strong>${formatNumber(this.state.score)}</strong><span>${parkingUiCopy.score}</span></div>
          <div class="parking-result-stat"><strong>+${this.state.coins}</strong><span>${parkingUiCopy.coins}</span></div>
        </div>
        <button class="parking-primary" type="button" ${parkingUiAttributes.action}="${parkingUiActions.next}">${last ? parkingUiCopy.replay : parkingUiCopy.next}</button>
      </section>`;
  }

  private showJammedOverlay(): void {
    this.setBusy(true);
    const overlay = this.overlayElement();
    overlay.innerHTML = `
      <section class="parking-result is-jammed" role="dialog" aria-modal="true">
        <div class="parking-result-badge">!</div>
        <h2 class="parking-result-title">${parkingUiCopy.jammedTitle}</h2>
        <p class="parking-result-body">${parkingUiCopy.jammedBody}</p>
        <button class="parking-primary" type="button" ${parkingUiAttributes.action}="${parkingUiActions.retry}">${parkingUiCopy.retry}</button>
        <button class="parking-secondary" type="button" ${parkingUiAttributes.action}="${parkingUiActions.reset}">${parkingUiCopy.reset}</button>
      </section>`;
  }

  private overlayElement(): HTMLElement {
    let overlay = this.root.querySelector<HTMLElement>('.parking-overlay');
    if (overlay === null) {
      overlay = document.createElement('div');
      overlay.className = 'parking-overlay';
      this.root.append(overlay);
    }
    return overlay;
  }

  private clearOverlay(): void {
    this.root.querySelector('.parking-overlay')?.remove();
  }

  private runAfter(delayMs: number, callback: () => void): void {
    const timer = window.setTimeout(() => {
      this.timers.delete(timer);
      if (!this.disposed) {
        callback();
      }
    }, delayMs);
    this.timers.add(timer);
  }
}

function installStyles(): void {
  document.getElementById(parkingUiIds.style)?.remove();
  const style = document.createElement('style');
  style.id = parkingUiIds.style;
  style.textContent = `${parkingStyles}\n${parkingGuidanceStyles}\n${parkingImpactStyles}`;
  document.head.append(style);
}

function renderShell(): string {
  return `
    <main class="parking-game" aria-label="${parkingUiCopy.title}">
      <section class="parking-stage" aria-label="Parking lot"><div class="parking-canvas-host"></div></section>
      <header class="parking-hud">
        <div class="parking-level">
          <span class="parking-level-label">${parkingUiCopy.level}</span>
          <strong class="parking-level-value" data-hud="level">1/${getTrafficLevelCount()}</strong>
          <span class="parking-level-name" data-hud="level-name"></span>
        </div>
        <div class="parking-score">
          <span class="parking-score-label">${parkingUiCopy.score}</span>
          <strong class="parking-score-value" data-hud="score">0</strong>
          <span class="parking-combo" data-hud="combo"></span>
        </div>
        <div class="parking-coins"><span class="parking-coin-icon">${parkingUiSymbols.coin}</span><strong data-hud="coins">0</strong></div>
      </header>
      <div class="parking-next" data-hud="next"></div>
      <p class="parking-message" data-hud="message">${parkingUiCopy.instruction}</p>
      <nav class="parking-controls" aria-label="Game controls">
        ${renderControl(parkingUiActions.undo, parkingUiSymbols.undo, parkingUiCopy.undo, '')}
        ${renderControl(parkingUiActions.hint, parkingUiSymbols.hint, parkingUiCopy.hintButton, 'parking-control-hint')}
        ${renderControl(parkingUiActions.reset, parkingUiSymbols.reset, parkingUiCopy.reset, '')}
      </nav>
      <div class="parking-fx" aria-hidden="true"></div>
    </main>`;
}

function renderControl(action: string, symbol: string, label: string, modifier: string): string {
  return `<button class="parking-control ${modifier}" type="button" aria-label="${label}" title="${label}" ${parkingUiAttributes.action}="${action}">${symbol}</button>`;
}

function setText(root: HTMLElement, selector: string, value: string): void {
  const element = root.querySelector<HTMLElement>(selector);
  if (element !== null) {
    element.textContent = value;
  }
}

function normalizeLevelIndex(levelIndex: number): number {
  return Number.isInteger(levelIndex)
    ? Math.min(Math.max(levelIndex, trafficRules.firstIndex), getTrafficLevelCount() - trafficRules.cellStep)
    : trafficRules.firstIndex;
}

function createRuntimeSeed(previousSeed: number = trafficRules.emptyCollectionSize): number {
  const values = new Uint32Array(trafficRules.cellStep);
  globalThis.crypto?.getRandomValues?.(values);
  const randomSeed = values[trafficRules.firstIndex] ?? trafficRules.emptyCollectionSize;
  const mixed = (randomSeed + previousSeed + trafficRandomization.seedIncrement) >>> trafficRules.firstCoordinate;
  return mixed === trafficRules.emptyCollectionSize ? trafficRandomization.fallbackSeed : mixed;
}

function countLeadingGroup(passengers: TrafficState['passengers'], color: TrafficState['passengers'][number]): number {
  let count: number = trafficRules.emptyCollectionSize;
  while (passengers[count] === color) {
    count += trafficRules.cellStep;
  }
  return count;
}

function loadNumber(key: string, fallback: number): number {
  try {
    const value = window.localStorage.getItem(key);
    const parsed = value === null ? fallback : Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function saveNumber(key: string, value: number): void {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Storage is optional.
  }
}

function formatNumber(value: number): string {
  return Math.max(trafficRules.emptyCollectionSize, Math.round(value)).toLocaleString('en-US');
}
