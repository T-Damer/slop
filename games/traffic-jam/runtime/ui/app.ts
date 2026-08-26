import {
  trafficDirections,
  trafficGame,
  trafficRules,
} from '../domain/registry.ts';
import { trafficLevels } from '../domain/levels.ts';
import {
  createInitialTrafficState,
  getAvailableVehicleIds,
  releaseTrafficVehicle,
} from '../domain/rules.ts';
import type {
  TrafficLevelDefinition,
  TrafficState,
  TrafficVehicleDefinition,
} from '../domain/types.ts';
import {
  trafficDirectionAngles,
  trafficUiActions,
  trafficUiAttributes,
  trafficUiClasses,
  trafficUiCopy,
  trafficUiEvents,
  trafficUiIds,
  trafficUiKeys,
  trafficUiSymbols,
  trafficUiTimings,
  trafficVehiclePalette,
} from './registry.ts';
import { trafficStyles } from './styles.ts';

let activeApp: TrafficJamApp | null = null;

export function mountTrafficJam(parent: HTMLElement): void {
  unmountTrafficJam();
  installStyles();
  const root = document.createElement('div');
  root.id = trafficUiIds.root;
  parent.append(root);
  activeApp = new TrafficJamApp(root);
  activeApp.mount();
}

export function unmountTrafficJam(): void {
  activeApp?.unmount();
  activeApp = null;
  document.getElementById(trafficUiIds.root)?.remove();
  document.getElementById(trafficUiIds.style)?.remove();
}

class TrafficJamApp {
  private levelIndex = loadSavedLevelIndex();
  private state = createInitialTrafficState(this.level);
  private history: Array<TrafficState> = [];
  private busy = false;
  private status: string = trafficUiCopy.instruction;
  private readonly timers = new Set<number>();

  public constructor(private readonly root: HTMLElement) {}

  private get level(): TrafficLevelDefinition {
    return trafficLevels[this.levelIndex] ?? trafficLevels[trafficRules.firstIndex]!;
  }

  public mount(): void {
    this.root.addEventListener(trafficUiEvents.click, this.handleClick);
    document.addEventListener(trafficUiEvents.keydown, this.handleKeydown);
    this.render();
  }

  public unmount(): void {
    this.root.removeEventListener(trafficUiEvents.click, this.handleClick);
    document.removeEventListener(trafficUiEvents.keydown, this.handleKeydown);
    for (const timer of this.timers) {
      window.clearTimeout(timer);
    }
    this.timers.clear();
  }

  private readonly handleClick = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const actionElement = target.closest<HTMLElement>(`[${trafficUiAttributes.action}]`);
    if (actionElement === null) {
      return;
    }

    const action = actionElement.getAttribute(trafficUiAttributes.action);
    if (action === trafficUiActions.vehicle) {
      const vehicleId = actionElement.getAttribute(trafficUiAttributes.vehicleId);
      if (vehicleId !== null) {
        this.releaseVehicle(vehicleId, actionElement);
      }
      return;
    }
    if (action === trafficUiActions.reset) {
      this.resetLevel();
      return;
    }
    if (action === trafficUiActions.undo) {
      this.undoMove();
      return;
    }
    if (action === trafficUiActions.hint) {
      this.showHint();
      return;
    }
    if (action === trafficUiActions.next) {
      this.nextLevel();
      return;
    }
    if (action === trafficUiActions.replay) {
      this.loadLevel(trafficRules.firstIndex);
    }
  };

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === trafficUiKeys.escape || this.busy) {
      return;
    }
    const key = event.key.toLowerCase();
    if (key === trafficUiKeys.reset) {
      this.resetLevel();
    } else if (key === trafficUiKeys.hint) {
      this.showHint();
    } else if (key === trafficUiKeys.undo) {
      this.undoMove();
    }
  };

  private releaseVehicle(vehicleId: string, element: HTMLElement): void {
    if (this.busy) {
      return;
    }
    const result = releaseTrafficVehicle(this.level, this.state, vehicleId);
    if (!result.ok) {
      this.status = trafficUiCopy.blocked;
      this.updateStatus();
      element.classList.add(trafficUiClasses.blocked);
      for (const blockingVehicleId of result.blockingVehicleIds) {
        this.vehicleElement(blockingVehicleId)?.classList.add(trafficUiClasses.blocking);
      }
      this.runAfter(trafficUiTimings.blockedPulseMs, () => {
        element.classList.remove(trafficUiClasses.blocked);
        for (const blockingVehicleId of result.blockingVehicleIds) {
          this.vehicleElement(blockingVehicleId)?.classList.remove(trafficUiClasses.blocking);
        }
      });
      this.restoreDefaultStatusLater();
      return;
    }

    this.history.push(this.state);
    this.busy = true;
    this.root.querySelector(`.${trafficUiClasses.app}`)?.classList.add(trafficUiClasses.busy);
    element.classList.add(trafficUiClasses.exiting);

    this.runAfter(trafficUiTimings.exitAnimationMs, () => {
      this.state = result.state;
      this.busy = false;
      this.status = trafficUiCopy.instruction;
      this.render();
    });
  }

  private resetLevel(): void {
    if (this.busy) {
      return;
    }
    this.state = createInitialTrafficState(this.level);
    this.history = [];
    this.status = this.level.hint;
    this.render();
    this.restoreDefaultStatusLater();
  }

  private undoMove(): void {
    if (this.busy) {
      return;
    }
    const previousState = this.history.pop();
    if (previousState === undefined) {
      return;
    }
    this.state = previousState;
    this.status = trafficUiCopy.instruction;
    this.render();
  }

  private showHint(): void {
    if (this.busy || this.state.completed) {
      return;
    }
    const vehicleId = getAvailableVehicleIds(this.level, this.state)[trafficRules.firstIndex];
    if (vehicleId === undefined) {
      return;
    }
    this.status = trafficUiCopy.hintPrefix;
    this.updateStatus();
    const element = this.vehicleElement(vehicleId);
    element?.classList.add(trafficUiClasses.hinted);
    this.runAfter(trafficUiTimings.hintPulseMs, () => {
      element?.classList.remove(trafficUiClasses.hinted);
    });
    this.restoreDefaultStatusLater();
  }

  private nextLevel(): void {
    const nextLevelIndex = this.levelIndex + trafficRules.cellStep;
    if (nextLevelIndex >= trafficLevels.length) {
      this.loadLevel(trafficRules.firstIndex);
      return;
    }
    this.loadLevel(nextLevelIndex);
  }

  private loadLevel(levelIndex: number): void {
    this.levelIndex = normalizeLevelIndex(levelIndex);
    saveLevelIndex(this.levelIndex);
    this.state = createInitialTrafficState(this.level);
    this.history = [];
    this.busy = false;
    this.status = this.level.hint;
    this.render();
    this.restoreDefaultStatusLater();
  }

  private render(): void {
    const levelNumber = this.levelIndex + trafficRules.cellStep;
    this.root.innerHTML = `
      <main class="${trafficUiClasses.app}" aria-label="${trafficUiCopy.title}">
        <header class="traffic-header">
          <div>
            <p class="traffic-eyebrow">${trafficUiCopy.eyebrow}</p>
            <h1 class="traffic-title">${trafficUiCopy.title}</h1>
            <p class="traffic-level-name">${this.level.name}</p>
          </div>
          <div class="traffic-stats" aria-label="Game status">
            ${renderStat(`${levelNumber}/${trafficLevels.length}`, trafficUiCopy.levelLabel)}
            ${renderStat(String(this.state.moveCount), trafficUiCopy.movesLabel)}
            ${renderStat(String(this.state.remainingVehicleIds.length), trafficUiCopy.remainingLabel)}
          </div>
        </header>

        <section class="traffic-board-wrap" aria-label="Traffic board">
          <div class="traffic-board">
            ${this.renderVehicles()}
          </div>
        </section>

        <nav class="traffic-toolbar" aria-label="Game actions">
          ${renderAction(trafficUiActions.undo, trafficUiSymbols.undo, trafficUiCopy.undo, this.history.length === trafficRules.emptyCollectionSize)}
          ${renderAction(trafficUiActions.hint, trafficUiSymbols.hint, trafficUiCopy.hint, this.state.completed)}
          ${renderAction(trafficUiActions.reset, trafficUiSymbols.reset, trafficUiCopy.reset, false)}
        </nav>

        <section class="traffic-status" aria-live="polite">
          <p class="traffic-status-copy">${this.status}</p>
          <span class="traffic-keyboard">${trafficUiCopy.keyboardHelp}</span>
        </section>
      </main>
      ${this.state.completed ? this.renderCompletion() : ''}
    `;
  }

  private renderVehicles(): string {
    return this.level.vehicles
      .filter((vehicle) => this.state.remainingVehicleIds.includes(vehicle.id))
      .map((vehicle) => renderVehicle(vehicle))
      .join('');
  }

  private renderCompletion(): string {
    const isLastLevel = this.levelIndex === trafficLevels.length - trafficRules.cellStep;
    const title = isLastLevel ? trafficUiCopy.allCompletedTitle : trafficUiCopy.completedTitle;
    const body = isLastLevel
      ? trafficUiCopy.allCompletedBody
      : `${trafficUiCopy.completedBodyPrefix} ${this.state.moveCount} ${trafficUiCopy.completedBodySuffix}`;
    const action = isLastLevel ? trafficUiActions.replay : trafficUiActions.next;
    const label = isLastLevel ? trafficUiCopy.replay : trafficUiCopy.next;

    return `
      <div class="traffic-complete" role="dialog" aria-modal="true" aria-label="${title}">
        <section class="traffic-complete-card">
          <div class="traffic-complete-icon">${trafficUiSymbols.check}</div>
          <h2 class="traffic-complete-title">${title}</h2>
          <p class="traffic-complete-body">${body}</p>
          <button class="traffic-primary" type="button" ${trafficUiAttributes.action}="${action}">${label}</button>
        </section>
      </div>
    `;
  }

  private updateStatus(): void {
    const statusElement = this.root.querySelector<HTMLElement>('.traffic-status-copy');
    if (statusElement !== null) {
      statusElement.textContent = this.status;
    }
  }

  private restoreDefaultStatusLater(): void {
    this.runAfter(trafficUiTimings.statusResetMs, () => {
      if (!this.state.completed) {
        this.status = trafficUiCopy.instruction;
        this.updateStatus();
      }
    });
  }

  private vehicleElement(vehicleId: string): HTMLElement | null {
    return this.root.querySelector<HTMLElement>(
      `[${trafficUiAttributes.vehicleId}="${vehicleId}"]`,
    );
  }

  private runAfter(delayMs: number, callback: () => void): void {
    const timer = window.setTimeout(() => {
      this.timers.delete(timer);
      callback();
    }, delayMs);
    this.timers.add(timer);
  }
}

function installStyles(): void {
  document.getElementById(trafficUiIds.style)?.remove();
  const style = document.createElement('style');
  style.id = trafficUiIds.style;
  style.textContent = trafficStyles;
  document.head.append(style);
}

function renderVehicle(vehicle: TrafficVehicleDefinition): string {
  const horizontal = vehicle.direction === trafficDirections.left || vehicle.direction === trafficDirections.right;
  const width = horizontal ? vehicle.length : trafficRules.cellStep;
  const height = horizontal ? trafficRules.cellStep : vehicle.length;
  const arrowAngle = trafficDirectionAngles[vehicle.direction];
  const color = trafficVehiclePalette[vehicle.color];
  const ariaLabel = `${trafficUiCopy.vehicleAriaPrefix} ${vehicle.id}`;

  return `
    <button
      class="traffic-vehicle"
      type="button"
      aria-label="${ariaLabel}"
      ${trafficUiAttributes.action}="${trafficUiActions.vehicle}"
      ${trafficUiAttributes.vehicleId}="${vehicle.id}"
      ${trafficUiAttributes.direction}="${vehicle.direction}"
      style="--x:${vehicle.x};--y:${vehicle.y};--vehicle-w:${width};--vehicle-h:${height};--vehicle-color:${color};--arrow-angle:${arrowAngle}deg"
    >
      <span class="traffic-arrow" aria-hidden="true">${trafficUiSymbols.arrow}</span>
    </button>
  `;
}

function renderStat(value: string, label: string): string {
  return `
    <div class="traffic-stat">
      <span class="traffic-stat-value">${value}</span>
      <span class="traffic-stat-label">${label}</span>
    </div>
  `;
}

function renderAction(
  action: string,
  symbol: string,
  label: string,
  disabled: boolean,
): string {
  return `
    <button
      class="traffic-action"
      type="button"
      ${trafficUiAttributes.action}="${action}"
      ${disabled ? 'disabled' : ''}
    >
      <span class="traffic-action-symbol" aria-hidden="true">${symbol}</span>${label}
    </button>
  `;
}

function loadSavedLevelIndex(): number {
  try {
    const saved = window.localStorage.getItem(trafficGame.progressStorageKey);
    if (saved === null) {
      return trafficRules.firstIndex;
    }
    return normalizeLevelIndex(Number.parseInt(saved, 10));
  } catch {
    return trafficRules.firstIndex;
  }
}

function saveLevelIndex(levelIndex: number): void {
  try {
    window.localStorage.setItem(trafficGame.progressStorageKey, String(levelIndex));
  } catch {
    // Progress persistence is optional; the game remains playable without storage.
  }
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
