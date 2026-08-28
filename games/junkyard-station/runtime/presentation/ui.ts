import type { WalkWorldState } from '../../../shared/world-kit/domain/types.ts';
import { worldInteractionModes } from '../../../shared/world-kit/domain/registry.ts';
import type { WalkWorldScene } from '../../../shared/world-kit/presentation/scene.ts';
import {
  getJunkyardStation,
  junkyardCopy,
  junkyardResourceIds,
} from '../definition.ts';

export interface JunkyardElements {
  readonly canvasHost: HTMLElement;
  readonly message: HTMLElement;
  readonly prompt: HTMLElement;
  readonly promptIcon: HTMLElement;
  readonly promptLabel: HTMLElement;
  readonly promptHint: HTMLElement;
  readonly progressFill: HTMLElement;
  readonly joystick: HTMLElement;
  readonly joystickKnob: HTMLElement;
  readonly actionButton: HTMLButtonElement;
  readonly resourceValues: Readonly<Record<string, HTMLElement>>;
}

const junkyardUiSelectors = {
  canvasHost: '.junkyard-canvas-host',
  message: '[data-junkyard-message]',
  prompt: '.junkyard-prompt',
  promptIcon: '.junkyard-prompt__icon',
  promptLabel: '.junkyard-prompt__label',
  promptHint: '.junkyard-prompt__hint',
  progressFill: '.junkyard-progress__fill',
  joystick: '.world-joystick',
  joystickKnob: '.world-joystick__knob',
  actionButton: '.world-action',
} as const;

export function renderJunkyardShell(): string {
  return `
    <div class="junkyard-canvas-host"></div>
    <section class="junkyard-hud" aria-label="Resources">
      ${renderResource(junkyardResourceIds.coins, junkyardCopy.resources.coins)}
      ${renderResource(junkyardResourceIds.scrap, junkyardCopy.resources.scrap)}
      ${renderResource(junkyardResourceIds.fuel, junkyardCopy.resources.fuel)}
      ${renderResource(junkyardResourceIds.reputation, junkyardCopy.resources.reputation)}
    </section>
    <div class="junkyard-objective" aria-live="polite">
      <strong>${junkyardCopy.title}</strong>
      <span data-junkyard-message>${junkyardCopy.idleMessage}</span>
    </div>
    <div class="junkyard-prompt" aria-live="polite">
      <span class="junkyard-prompt__icon"></span>
      <span>
        <span class="junkyard-prompt__label"></span>
        <span class="junkyard-prompt__hint"></span>
      </span>
      <span class="junkyard-progress" aria-hidden="true">
        <span class="junkyard-progress__fill"></span>
      </span>
    </div>
    <div class="world-controls" aria-label="Movement and interaction controls">
      <div class="world-joystick" aria-label="Movement joystick">
        <div class="world-joystick__knob"></div>
      </div>
      <button class="world-action" type="button" disabled>${junkyardCopy.actionLabel}</button>
    </div>
  `;
}

export function readJunkyardElements(root: HTMLElement): JunkyardElements {
  const resourceValues: Record<string, HTMLElement> = {};
  for (const resourceId of [
    junkyardResourceIds.coins,
    junkyardResourceIds.scrap,
    junkyardResourceIds.fuel,
    junkyardResourceIds.reputation,
  ]) {
    resourceValues[resourceId] = requireElement<HTMLElement>(
      root,
      `[data-resource="${resourceId}"]`,
    );
  }
  return {
    canvasHost: requireElement(root, junkyardUiSelectors.canvasHost),
    message: requireElement(root, junkyardUiSelectors.message),
    prompt: requireElement(root, junkyardUiSelectors.prompt),
    promptIcon: requireElement(root, junkyardUiSelectors.promptIcon),
    promptLabel: requireElement(root, junkyardUiSelectors.promptLabel),
    promptHint: requireElement(root, junkyardUiSelectors.promptHint),
    progressFill: requireElement(root, junkyardUiSelectors.progressFill),
    joystick: requireElement(root, junkyardUiSelectors.joystick),
    joystickKnob: requireElement(root, junkyardUiSelectors.joystickKnob),
    actionButton: requireElement<HTMLButtonElement>(root, junkyardUiSelectors.actionButton),
    resourceValues,
  };
}

export function updateJunkyardHud(
  elements: JunkyardElements,
  state: WalkWorldState,
): void {
  for (const [resourceId, element] of Object.entries(elements.resourceValues)) {
    element.textContent = formatResource(state.resources[resourceId] ?? 0);
  }
}

export function updateJunkyardPrompt(
  elements: JunkyardElements,
  scene: WalkWorldScene,
  state: WalkWorldState,
): boolean {
  const interactionId = state.activeInteraction?.interactionId ?? state.proximityId;
  const station = interactionId === null ? null : getJunkyardStation(interactionId);
  const projected = interactionId === null ? null : scene.projectInteraction(interactionId);
  if (station === null || projected === null || !projected.visible) {
    elements.prompt.classList.remove('is-visible');
    elements.prompt.style.transform = 'translate3d(-200vw, -200vh, 0)';
    elements.progressFill.style.width = '0%';
    return false;
  }

  const active = state.activeInteraction;
  const progress = active === null
    ? 0
    : 1 - active.remainingMs / active.totalMs;
  const hint = active !== null
    ? `${Math.round(progress * 100)}%`
    : station.interaction.mode === worldInteractionModes.automatic
      ? junkyardCopy.automaticHint
      : junkyardCopy.actionHint;
  elements.promptIcon.textContent = station.icon;
  elements.promptLabel.textContent = station.shortLabel;
  elements.promptHint.textContent = hint;
  elements.progressFill.style.width = `${Math.round(progress * 100)}%`;
  elements.prompt.style.setProperty('--junkyard-accent', toCssColor(station.accentColor));
  elements.prompt.style.transform = `translate3d(${projected.x - 117}px, ${projected.y - 78}px, 0)`;
  elements.prompt.classList.add('is-visible');
  return station.interaction.mode === worldInteractionModes.prompted && active === null;
}

export function spawnJunkyardPopup(
  root: HTMLElement,
  scene: WalkWorldScene,
  interactionId: string,
  text: string,
): number | null {
  const projected = scene.projectInteraction(interactionId);
  if (projected === null || !projected.visible) {
    return null;
  }
  const popup = document.createElement('div');
  popup.className = 'junkyard-pop';
  popup.textContent = text;
  popup.style.left = `${projected.x}px`;
  popup.style.top = `${projected.y}px`;
  root.append(popup);
  return window.setTimeout(() => popup.remove(), 950);
}

function renderResource(resourceId: string, label: string): string {
  return `
    <div class="junkyard-resource">
      <span class="junkyard-resource__label">${label}</span>
      <span class="junkyard-resource__value" data-resource="${resourceId}">0</span>
    </div>
  `;
}

function requireElement<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (element === null) {
    throw new Error(`Junkyard UI element is missing: ${selector}`);
  }
  return element;
}

function formatResource(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

function toCssColor(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
