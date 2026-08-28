import {
  advanceWalkWorld,
  createWalkWorldState,
} from '../../../shared/world-kit/domain/simulation.ts';
import {
  worldEventTypes,
} from '../../../shared/world-kit/domain/registry.ts';
import type {
  WalkWorldState,
  WorldDomainEvent,
} from '../../../shared/world-kit/domain/types.ts';
import { WalkInputController } from '../../../shared/world-kit/presentation/input.ts';
import {
  WalkWorldScene,
  type WorldSceneStats,
} from '../../../shared/world-kit/presentation/scene.ts';
import { resolveWorldQuality } from '../../../shared/world-kit/presentation/quality.ts';
import {
  getJunkyardStation,
  junkyardCopy,
  junkyardInitialResources,
  junkyardWorldDefinition,
} from '../definition.ts';
import { decorateJunkyardWorld } from './decorations.ts';
import { createJunkyardStationVisuals } from './models.ts';
import { junkyardStyles } from './styles.ts';
import {
  readJunkyardElements,
  renderJunkyardShell,
  spawnJunkyardPopup,
  updateJunkyardHud,
  updateJunkyardPrompt,
  type JunkyardElements,
} from './ui.ts';

const junkyardRuntimeUi = {
  rootId: 'slop-junkyard',
  styleId: 'slop-junkyard-style',
  qaQuery: 'qa',
  qaEnabledValue: '1',
  messageResetMs: 2100,
  maximumFrameSeconds: 0.1,
} as const;

interface JunkyardQaSnapshot {
  readonly state: WalkWorldState;
  readonly renderer: WorldSceneStats;
}

interface JunkyardQaBridge {
  readonly snapshot: () => JunkyardQaSnapshot;
}

type JunkyardQaWindow = Window & {
  __SLOP_JUNKYARD_QA__?: JunkyardQaBridge;
};

let activeApp: JunkyardStationApp | null = null;

export function mountJunkyardStation(parent: HTMLElement): void {
  unmountJunkyardStation();
  installJunkyardStyles();
  const root = document.createElement('div');
  root.id = junkyardRuntimeUi.rootId;
  root.innerHTML = renderJunkyardShell();
  parent.append(root);
  activeApp = new JunkyardStationApp(root);
  activeApp.mount();
}

export function unmountJunkyardStation(): void {
  activeApp?.unmount();
  activeApp = null;
  document.getElementById(junkyardRuntimeUi.rootId)?.remove();
  document.getElementById(junkyardRuntimeUi.styleId)?.remove();
}

class JunkyardStationApp {
  private state = createWalkWorldState(
    junkyardWorldDefinition,
    junkyardInitialResources,
  );
  private readonly elements: JunkyardElements;
  private readonly input: WalkInputController;
  private readonly scene: WalkWorldScene;
  private readonly timers = new Set<number>();
  private readonly previousTitle = document.title;
  private animationFrame = 0;
  private lastFrameAt = 0;
  private disposed = false;

  public constructor(private readonly root: HTMLElement) {
    this.elements = readJunkyardElements(root);
    this.input = new WalkInputController({
      joystick: this.elements.joystick,
      joystickKnob: this.elements.joystickKnob,
      actionButton: this.elements.actionButton,
    });
    this.scene = new WalkWorldScene({
      host: this.elements.canvasHost,
      definition: junkyardWorldDefinition,
      quality: resolveWorldQuality(),
      backgroundColor: 0x8fcdd0,
      fogColor: 0xb9d9d4,
      groundColor: 0x9c936f,
      playerShirtColor: 0xf0a338,
      playerAccentColor: 0x33434b,
      stationVisuals: createJunkyardStationVisuals(),
      decorate: decorateJunkyardWorld,
    });
  }

  public mount(): void {
    document.title = junkyardCopy.title;
    updateJunkyardHud(this.elements, this.state);
    this.updateProjection();
    this.installQaBridge();
    this.animationFrame = window.requestAnimationFrame(this.frame);
  }

  public unmount(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    document.title = this.previousTitle;
    window.cancelAnimationFrame(this.animationFrame);
    for (const timer of this.timers) {
      window.clearTimeout(timer);
    }
    this.timers.clear();
    this.input.destroy();
    this.scene.destroy();
    delete (window as JunkyardQaWindow).__SLOP_JUNKYARD_QA__;
  }

  private readonly frame = (timestamp: number): void => {
    if (this.disposed) {
      return;
    }
    const deltaSeconds = this.lastFrameAt === 0
      ? 0
      : Math.min(
        junkyardRuntimeUi.maximumFrameSeconds,
        Math.max(0, (timestamp - this.lastFrameAt) / 1000),
      );
    this.lastFrameAt = timestamp;
    const result = advanceWalkWorld(
      junkyardWorldDefinition,
      this.state,
      this.input.sample(),
      deltaSeconds * 1000,
    );
    this.state = result.state;
    this.handleEvents(result.events);
    this.scene.update(this.state, deltaSeconds);
    this.scene.render();
    updateJunkyardHud(this.elements, this.state);
    this.updateProjection();
    this.animationFrame = window.requestAnimationFrame(this.frame);
  };

  private handleEvents(events: ReadonlyArray<WorldDomainEvent>): void {
    for (const event of events) {
      this.scene.markEvent(event);
      if (event.type === worldEventTypes.interactionStarted) {
        const station = getJunkyardStation(event.interactionId);
        if (station !== null) {
          this.showMessage(station.label);
        }
      } else if (event.type === worldEventTypes.interactionCompleted) {
        this.showCompletion(event.interactionId);
      } else if (event.type === worldEventTypes.interactionBlocked) {
        const station = getJunkyardStation(event.interactionId);
        if (station !== null) {
          this.showMessage(station.unavailableMessage);
        }
      }
    }
  }

  private showCompletion(interactionId: string): void {
    const station = getJunkyardStation(interactionId);
    if (station === null) {
      return;
    }
    this.showMessage(station.completionMessage);
    const timer = spawnJunkyardPopup(
      this.root,
      this.scene,
      interactionId,
      station.completionMessage,
    );
    if (timer !== null) {
      this.timers.add(timer);
    }
  }

  private updateProjection(): void {
    const actionAvailable = updateJunkyardPrompt(
      this.elements,
      this.scene,
      this.state,
    );
    this.input.setActionAvailable(actionAvailable);
  }

  private showMessage(message: string): void {
    this.elements.message.textContent = message;
    const timer = window.setTimeout(() => {
      this.elements.message.textContent = junkyardCopy.idleMessage;
      this.timers.delete(timer);
    }, junkyardRuntimeUi.messageResetMs);
    this.timers.add(timer);
  }

  private installQaBridge(): void {
    const enabled = new URLSearchParams(window.location.search).get(
      junkyardRuntimeUi.qaQuery,
    ) === junkyardRuntimeUi.qaEnabledValue;
    if (!enabled) {
      return;
    }
    (window as JunkyardQaWindow).__SLOP_JUNKYARD_QA__ = {
      snapshot: () => ({
        state: structuredClone(this.state),
        renderer: this.scene.getStats(),
      }),
    };
  }
}

function installJunkyardStyles(): void {
  if (document.getElementById(junkyardRuntimeUi.styleId) !== null) {
    return;
  }
  const style = document.createElement('style');
  style.id = junkyardRuntimeUi.styleId;
  style.textContent = junkyardStyles;
  document.head.append(style);
}
