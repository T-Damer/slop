import {
  trafficErrors,
  trafficEvents,
  trafficGame,
  trafficRules,
} from '../domain/registry.ts';
import { trafficLevels } from '../domain/levels.ts';
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
import {
  parkingColorPalette,
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
  private state = createInitialTrafficState(this.level);
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
    return trafficLevels[this.levelIndex] ?? trafficLevels[trafficRules.firstIndex]!;
  }

  public mount(): void {
    document.title = parkingUiCopy.title;
    this.root.innerHTML = renderShell();
    const host = this.root.querySelector<HTMLElement>('.parking-canvas-host');
    if (host === null) {
      throw new Error('Parking Jam canvas host is missing.');
    }

    this.scene = new ParkingJamScene(host, {
      onCarSelected: (carId) => {
        void this.selectCar(carId);
      },
    });
    this.root.addEventListener(parkingUiEvents.click, this.handleClick);
    document.addEventListener('keydown', this.handleKeydown);
    this.loadLevel(this.levelIndex, false);
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
    const actionElement = target.closest<HTMLElement>(`[${parkingUiAttributes.action}]`);
    const action = actionElement?.getAttribute(parkingUiAttributes.action);
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
    this.showMessage(parkingUiCopy.instruction);
  }

  private async playEvent(event: TrafficDomainEvent): Promise<void> {
    if (this.scene === null) {
      return;
    }

    if (event.type === trafficEvents.carReleased) {
      await this.scene.animateCarReleased(this.level, event);
      return;
    }

    if (event.type === trafficEvents.passengerBoarded) {
      this.updateEventHud(event);
      this.spawnScorePopup(event.carId, `+${formatNumber(event.points)}`);
      await this.scene.animatePassengerBoarded(event);
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
    this.showMessage(parkingUiCopy.instruction);
  }

  private resetLevel(): void {
    if (this.scene === null) {
      return;
    }
    this.state = createInitialTrafficState(this.level);
    this.history = [];
    this.rewardCommitted = false;
    this.clearOverlay();
    this.scene.load(this.level, this.state);
    this.setBusy(false);
    this.updateHud();
    this.showMessage(this.level.objective);
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
    this.showMessage(parkingUiCopy.hint);
    await this.scene.highlightCar(carId);
    this.showMessage(parkingUiCopy.instruction);
  }

  private nextLevel(): void {
    if (!this.state.completed) {
      return;
    }
    this.commitReward();
    const nextIndex = this.levelIndex + trafficRules.cellStep;
    this.loadLevel(nextIndex >= trafficLevels.length ? trafficRules.firstIndex : nextIndex, true);
  }

  private loadLevel(levelIndex: number, persist: boolean): void {
    this.levelIndex = normalizeLevelIndex(levelIndex);
    if (persist) {
      saveNumber(trafficGame.progressStorageKey, this.levelIndex);
    }
    this.state = createInitialTrafficState(this.level);
    this.history = [];
    this.rewardCommitted = false;
    this.clearOverlay();
    this.scene?.load(this.level, this.state);
    this.setBusy(false);
    this.updateHud();
    this.showMessage(this.level.objective);
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
    const levelValue = this.root.querySelector<HTMLElement>('[data-hud="level"]');
    const levelName = this.root.querySelector<HTMLElement>('[data-hud="level-name"]');
    const score = this.root.querySelector<HTMLElement>('[data-hud="score"]');
    const coins = this.root.querySelector<HTMLElement>('[data-hud="coins"]');
    const combo = this.root.querySelector<HTMLElement>('[data-hud="combo"]');

    if (levelValue !== null) {
      levelValue.textContent = `${this.levelIndex + trafficRules.cellStep}/${trafficLevels.length}`;
    }
    if (levelName !== null) {
      levelName.textContent = this.level.name;
    }
    if (score !== null) {
      score.textContent = formatNumber(this.state.score);
    }
    if (coins !== null) {
      const unbankedCoins = this.rewardCommitted ? trafficRules.emptyCollectionSize : this.state.coins;
      coins.textContent = formatNumber(this.bankCoins + unbankedCoins);
    }
    if (combo !== null) {
      combo.textContent = `×${this.state.combo} ${parkingUiCopy.combo}`;
      combo.classList.toggle('is-visible', this.state.combo > trafficRules.initialCombo);
    }

    this.renderNextPassengers(this.state.passengers);
    this.updateControls();
  }

  private updateEventHud(event: TrafficDomainEvent): void {
    const score = this.root.querySelector<HTMLElement>('[data-hud="score"]');
    const coins = this.root.querySelector<HTMLElement>('[data-hud="coins"]');
    const combo = this.root.querySelector<HTMLElement>('[data-hud="combo"]');
    if (score !== null) {
      score.textContent = formatNumber(event.scoreAfter);
    }
    if (coins !== null) {
      const stateCoinDelta = Math.max(trafficRules.emptyCollectionSize, event.coins);
      const current = Number.parseInt(coins.textContent?.replace(/\D/g, '') ?? '0', 10);
      if (stateCoinDelta > trafficRules.emptyCollectionSize) {
        coins.textContent = formatNumber(current + stateCoinDelta);
      }
    }
    if (combo !== null) {
      combo.textContent = `×${event.comboAfter} ${parkingUiCopy.combo}`;
      combo.classList.toggle('is-visible', event.comboAfter > trafficRules.initialCombo);
    }
    const remainingPassengers = this.state.passengers.slice(
      this.state.passengers.length - event.queueRemaining,
    );
    this.renderNextPassengers(remainingPassengers);
  }

  private renderNextPassengers(passengers: TrafficState['passengers']): void {
    const next = this.root.querySelector<HTMLElement>('[data-hud="next"]');
    if (next === null) {
      return;
    }
    const dots = passengers
      .slice(trafficRules.firstIndex, 5)
      .map((color) => `<span class="parking-next-dot" style="background:${toCssHex(parkingColorPalette[color])}"></span>`)
      .join('');
    next.innerHTML = `<span class="parking-next-label">${parkingUiCopy.queue}</span>${dots}`;
  }

  private updateControls(): void {
    const undo = this.root.querySelector<HTMLButtonElement>(`[${parkingUiAttributes.action}="${parkingUiActions.undo}"]`);
    const hint = this.root.querySelector<HTMLButtonElement>(`[${parkingUiAttributes.action}="${parkingUiActions.hint}"]`);
    const reset = this.root.querySelector<HTMLButtonElement>(`[${parkingUiAttributes.action}="${parkingUiActions.reset}"]`);
    if (undo !== null) {
      undo.disabled = this.history.length === trafficRules.emptyCollectionSize || (this.busy && !this.state.jammed && !this.state.completed);
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
    if (element === null) {
      return;
    }
    element.classList.add('is-changing');
    this.runAfter(90, () => {
      element.textContent = message;
      element.classList.remove('is-changing');
    });
  }

  private spawnScorePopup(
    carId: string | null,
    text: string,
    modifier = '',
  ): void {
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
    const isLastLevel = this.levelIndex === trafficLevels.length - trafficRules.cellStep;
    const actionLabel = isLastLevel ? parkingUiCopy.replay : parkingUiCopy.next;
    const overlay = this.overlayElement();
    overlay.innerHTML = `
      <section class="parking-result" role="dialog" aria-modal="true" aria-label="${parkingUiCopy.completedTitle}">
        <div class="parking-result-badge" aria-hidden="true">✓</div>
        <h2 class="parking-result-title">${parkingUiCopy.completedTitle}</h2>
        <p class="parking-result-body">${parkingUiCopy.completedBody}</p>
        <div class="parking-result-stats">
          <div class="parking-result-stat"><strong>${formatNumber(this.state.score)}</strong><span>${parkingUiCopy.score}</span></div>
          <div class="parking-result-stat"><strong>+${this.state.coins}</strong><span>${parkingUiCopy.coins}</span></div>
        </div>
        <button class="parking-primary" type="button" ${parkingUiAttributes.action}="${parkingUiActions.next}">${actionLabel}</button>
      </section>
    `;
  }

  private showJammedOverlay(): void {
    this.setBusy(true);
    const overlay = this.overlayElement();
    overlay.innerHTML = `
      <section class="parking-result is-jammed" role="dialog" aria-modal="true" aria-label="${parkingUiCopy.jammedTitle}">
        <div class="parking-result-badge" aria-hidden="true">!</div>
        <h2 class="parking-result-title">${parkingUiCopy.jammedTitle}</h2>
        <p class="parking-result-body">${parkingUiCopy.jammedBody}</p>
        <button class="parking-primary" type="button" ${parkingUiAttributes.action}="${parkingUiActions.retry}">${parkingUiCopy.retry}</button>
        <button class="parking-secondary" type="button" ${parkingUiAttributes.action}="${parkingUiActions.reset}">${parkingUiCopy.reset}</button>
      </section>
    `;
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
  style.textContent = parkingStyles;
  document.head.append(style);
}

function renderShell(): string {
  return `
    <main class="parking-game" aria-label="${parkingUiCopy.title}">
      <section class="parking-stage" aria-label="Parking lot">
        <div class="parking-canvas-host"></div>
      </section>

      <header class="parking-hud">
        <div class="parking-level">
          <span class="parking-level-label">${parkingUiCopy.level}</span>
          <strong class="parking-level-value" data-hud="level">1/${trafficLevels.length}</strong>
          <span class="parking-level-name" data-hud="level-name"></span>
        </div>
        <div class="parking-score">
          <span class="parking-score-label">${parkingUiCopy.score}</span>
          <strong class="parking-score-value" data-hud="score">0</strong>
          <span class="parking-combo" data-hud="combo"></span>
        </div>
        <div class="parking-coins">
          <span class="parking-coin-icon" aria-hidden="true">${parkingUiSymbols.coin}</span>
          <strong data-hud="coins">0</strong>
        </div>
      </header>

      <div class="parking-next" data-hud="next" aria-label="${parkingUiCopy.queue}"></div>
      <p class="parking-message" data-hud="message">${parkingUiCopy.instruction}</p>

      <nav class="parking-controls" aria-label="Game controls">
        ${renderControl(parkingUiActions.undo, parkingUiSymbols.undo, parkingUiCopy.undo, '')}
        ${renderControl(parkingUiActions.hint, parkingUiSymbols.hint, parkingUiCopy.hintButton, 'parking-control-hint')}
        ${renderControl(parkingUiActions.reset, parkingUiSymbols.reset, parkingUiCopy.reset, '')}
      </nav>
      <div class="parking-fx" aria-hidden="true"></div>
    </main>
  `;
}

function renderControl(
  action: string,
  symbol: string,
  label: string,
  modifier: string,
): string {
  return `
    <button
      class="parking-control ${modifier}"
      type="button"
      aria-label="${label}"
      title="${label}"
      ${parkingUiAttributes.action}="${action}"
    >${symbol}</button>
  `;
}

function normalizeLevelIndex(levelIndex: number): number {
  if (!Number.isInteger(levelIndex)) {
    return trafficRules.firstIndex;
  }
  return Math.min(
    Math.max(levelIndex, trafficRules.firstIndex),
    trafficLevels.length - trafficRules.cellStep,
  );
}

function loadNumber(key: string, fallback: number): number {
  try {
    const stored = window.localStorage.getItem(key);
    if (stored === null) {
      return fallback;
    }
    const parsed = Number.parseInt(stored, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function saveNumber(key: string, value: number): void {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Persistence is optional; the game remains playable without storage access.
  }
}

function formatNumber(value: number): string {
  return Math.max(trafficRules.emptyCollectionSize, Math.round(value)).toLocaleString('en-US');
}

function toCssHex(value: number): string {
  return `#${value.toString(16).padStart(6, '0')}`;
}
