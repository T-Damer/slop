import { junkyardLevel } from '../domain/level.ts';
import {
  junkyardEventTypes,
  type JunkyardDomainEvent,
  type JunkyardState,
} from '../domain/types.ts';
import {
  createInitialJunkyardState,
  getJunkyardObjective,
  stepJunkyard,
} from '../domain/rules.ts';
import { createMovementInput, type MovementInput } from './input.ts';
import {
  junkyardCopy,
  junkyardInteractionIcons,
  junkyardUiActions,
  junkyardUiAttributes,
  junkyardUiEvents,
  junkyardUiIds,
  resolveJunkyardQuality,
} from './registry.ts';
import {
  JunkyardScene,
  type JunkyardRendererStats,
} from './scene.ts';
import { junkyardStyles } from './styles.ts';

interface JunkyardQaSnapshot {
  readonly state: JunkyardState;
  readonly objective: ReturnType<typeof getJunkyardObjective>;
  readonly renderer: JunkyardRendererStats;
}

interface JunkyardQaBridge {
  readonly schemaVersion: 1;
  readonly snapshot: () => JunkyardQaSnapshot;
}

declare global {
  interface Window {
    __SLOP_JUNKYARD_QA__?: JunkyardQaBridge;
  }
}

let activeApp: JunkyardApp | null = null;

export function mountJunkyardTycoon(parent: HTMLElement): void {
  unmountJunkyardTycoon();
  installStyles();
  const root = document.createElement('div');
  root.id = junkyardUiIds.root;
  parent.append(root);
  activeApp = new JunkyardApp(root);
  activeApp.mount();
}

export function unmountJunkyardTycoon(): void {
  activeApp?.unmount();
  activeApp = null;
  document.getElementById(junkyardUiIds.root)?.remove();
  document.getElementById(junkyardUiIds.style)?.remove();
}

class JunkyardApp {
  private state = createInitialJunkyardState();
  private readonly previousTitle = document.title;
  private scene: JunkyardScene | null = null;
  private input: MovementInput | null = null;
  private animationFrame = 0;
  private lastFrameAt = 0;
  private disposed = false;
  private message = junkyardCopy.subtitle;

  public constructor(private readonly root: HTMLElement) {}

  public mount(): void {
    document.title = junkyardCopy.title;
    this.root.innerHTML = renderShell();
    const host = this.root.querySelector<HTMLElement>('.junkyard-canvas-host');
    if (host === null) {
      throw new Error('Junkyard canvas host is missing.');
    }
    this.scene = new JunkyardScene(host, resolveJunkyardQuality());
    this.input = createMovementInput(this.root);
    this.root.addEventListener(junkyardUiEvents.click, this.handleClick);
    this.installQaBridge();
    this.updateHud();
    this.animationFrame = window.requestAnimationFrame(this.tick);
  }

  public unmount(): void {
    this.disposed = true;
    document.title = this.previousTitle;
    window.cancelAnimationFrame(this.animationFrame);
    this.root.removeEventListener(junkyardUiEvents.click, this.handleClick);
    this.input?.destroy();
    this.input = null;
    this.scene?.destroy();
    this.scene = null;
    delete window.__SLOP_JUNKYARD_QA__;
  }

  private readonly tick = (frameAt: number): void => {
    if (this.disposed || this.scene === null || this.input === null) {
      return;
    }
    const deltaMs = this.lastFrameAt === 0
      ? 16
      : Math.min(100, frameAt - this.lastFrameAt);
    this.lastFrameAt = frameAt;
    const movement = this.input.read();
    const result = stepJunkyard(this.state, {
      moveX: movement.x,
      moveZ: movement.z,
      deltaMs,
    });
    this.state = result.state;
    this.consumeEvents(result.events);
    this.scene.update(this.state, deltaMs / 1000);
    this.scene.render();
    this.updateHud();
    this.updateInteractionBubble();
    this.animationFrame = window.requestAnimationFrame(this.tick);
  };

  private readonly handleClick = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const button = target.closest<HTMLElement>(
      `[${junkyardUiAttributes.action}]`,
    );
    if (
      button?.getAttribute(junkyardUiAttributes.action)
      === junkyardUiActions.reset
    ) {
      this.state = createInitialJunkyardState();
      this.message = junkyardCopy.subtitle;
      this.updateHud();
    }
  };

  private consumeEvents(events: ReadonlyArray<JunkyardDomainEvent>): void {
    for (const event of events) {
      if (event.type === junkyardEventTypes.junkCleared) {
        this.message = junkyardCopy.messageByEvent.junkCleared;
      } else if (event.type === junkyardEventTypes.pumpBuilt) {
        this.message = junkyardCopy.messageByEvent.pumpBuilt;
      } else if (event.type === junkyardEventTypes.carFueled) {
        this.message = junkyardCopy.messageByEvent.carFueled;
      } else if (event.type === junkyardEventTypes.cashCollected) {
        this.message = junkyardCopy.messageByEvent.cashCollected;
      } else if (event.type === junkyardEventTypes.mechanicGreeted) {
        this.message = junkyardCopy.messageByEvent.mechanicGreeted;
      }
    }
  }

  private updateHud(): void {
    const objective = getJunkyardObjective(this.state);
    setText(
      this.root,
      `[${junkyardUiAttributes.hud}="cash"]`,
      formatNumber(this.state.cash),
    );
    setText(
      this.root,
      `[${junkyardUiAttributes.hud}="scrap"]`,
      formatNumber(this.state.scrap),
    );
    setText(
      this.root,
      `[${junkyardUiAttributes.hud}="objective"]`,
      junkyardCopy.objectiveById[objective.id]
        ?? junkyardCopy.objectiveById['free-play'],
    );
    setText(
      this.root,
      `[${junkyardUiAttributes.hud}="objective-count"]`,
      objective.target > 0
        ? `${objective.current}/${objective.target}`
        : '',
    );
    setText(
      this.root,
      `[${junkyardUiAttributes.hud}="message"]`,
      this.message,
    );
    const progress = objective.target <= 0
      ? 1
      : Math.min(1, objective.current / objective.target);
    const bar = this.root.querySelector<HTMLElement>('.junkyard-progress > span');
    if (bar !== null) {
      bar.style.width = `${progress * 100}%`;
    }
  }

  private updateInteractionBubble(): void {
    if (this.scene === null) {
      return;
    }
    const bubble = this.root.querySelector<HTMLElement>(
      '.junkyard-action-bubble',
    );
    const interactionId = this.state.world.activeInteractionId;
    if (bubble === null || interactionId === null) {
      bubble?.classList.remove('is-visible');
      return;
    }
    const point = this.scene.getInteractionScreenPoint(interactionId);
    const definition = junkyardLevel.world.interactions.find(
      (interaction) => interaction.id === interactionId,
    );
    const runtime = this.state.world.interactions[interactionId];
    if (
      point === null
      || definition === undefined
      || runtime === undefined
      || !point.visible
    ) {
      bubble.classList.remove('is-visible');
      return;
    }
    const progress = Math.min(1, runtime.progressMs / definition.durationMs);
    bubble.textContent = junkyardInteractionIcons[interactionId] ?? '●';
    bubble.style.left = `${point.x}px`;
    bubble.style.top = `${point.y}px`;
    bubble.style.setProperty('--interaction-progress', `${progress * 100}%`);
    bubble.classList.add('is-visible');
  }

  private installQaBridge(): void {
    if (new URLSearchParams(location.search).get('qa') !== '1') {
      return;
    }
    window.__SLOP_JUNKYARD_QA__ = {
      schemaVersion: 1,
      snapshot: () => ({
        state: this.state,
        objective: getJunkyardObjective(this.state),
        renderer: this.scene?.getRendererStats() ?? {
          calls: 0,
          triangles: 0,
          geometries: 0,
          textures: 0,
          pixelRatio: 0,
        },
      }),
    };
  }
}

function renderShell(): string {
  return `
    <div class="junkyard-canvas-host"></div>
    <div class="junkyard-hud">
      <div class="junkyard-resource-strip">
        <div class="junkyard-resource">
          ${junkyardCopy.cash}
          <span ${junkyardUiAttributes.hud}="cash">0</span>
        </div>
        <div class="junkyard-resource">
          ${junkyardCopy.scrap}
          <span ${junkyardUiAttributes.hud}="scrap">0</span>
        </div>
      </div>
      <div class="junkyard-objective">
        <strong ${junkyardUiAttributes.hud}="objective"></strong>
        <span ${junkyardUiAttributes.hud}="objective-count"></span>
        <div class="junkyard-progress"><span></span></div>
      </div>
      <div class="junkyard-message" ${junkyardUiAttributes.hud}="message"></div>
    </div>
    <div class="junkyard-action-bubble" aria-hidden="true"></div>
    <div class="junkyard-joystick" aria-label="Movement joystick">
      <div class="junkyard-joystick-base">
        <div class="junkyard-joystick-knob"></div>
      </div>
    </div>
    <div class="junkyard-controls">
      <button
        class="junkyard-reset"
        type="button"
        aria-label="${junkyardCopy.reset}"
        ${junkyardUiAttributes.action}="${junkyardUiActions.reset}"
      >↻</button>
    </div>
  `;
}

function installStyles(): void {
  if (document.getElementById(junkyardUiIds.style) !== null) {
    return;
  }
  const style = document.createElement('style');
  style.id = junkyardUiIds.style;
  style.textContent = junkyardStyles;
  document.head.append(style);
}

function setText(
  root: HTMLElement,
  selector: string,
  value: string,
): void {
  const element = root.querySelector<HTMLElement>(selector);
  if (element !== null && element.textContent !== value) {
    element.textContent = value;
  }
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(value);
}
