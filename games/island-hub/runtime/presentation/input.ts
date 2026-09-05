import { createJoystickMovementInput, type MovementInput,
  type MovementVector } from '../../../shared/player-movement/input.ts';

const islandInput = {
  baseSelector: '.island-joystick-base', knobSelector: '.island-joystick-knob',
  maximumRadiusPx: 38, minimumMagnitude: 0.08,
  actionSelector: '[data-island-interact]', runSelector: '[data-island-run]',
  actionKeys: new Set(['KeyE', 'Space']), runKeys: new Set(['ShiftLeft', 'ShiftRight']),
} as const;

export interface IslandMovementInput {
  read(): MovementVector; consumeAction(): boolean; running(): boolean;
  setEnabled(enabled: boolean): void; destroy(): void;
}
export function createIslandMovementInput(root: HTMLElement): IslandMovementInput {
  return new IslandInputController(root);
}

class IslandInputController implements IslandMovementInput {
  private movement: MovementInput | null = null;
  private enabled = true;
  private action = false;
  private readonly shifts = new Set<string>();
  private touchRun = false;
  public constructor(private readonly root: HTMLElement) {
    this.setEnabled(true);
    window.addEventListener('keydown', this.keyDown);
    window.addEventListener('keyup', this.keyUp);
    root.addEventListener('click', this.click);
    root.addEventListener('keydown', this.fieldKey, true);
  }
  public read(): MovementVector { return this.movement?.read() ?? { x: 0, z: 0 }; }
  public consumeAction(): boolean { const action = this.action; this.action = false; return action; }
  public running(): boolean { return this.shifts.size > 0 || this.touchRun; }
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.movement?.destroy();
    this.movement = enabled ? createJoystickMovementInput(this.root, islandInput) : null;
    this.action = false;
    this.shifts.clear();
    this.touchRun = false;
    this.root.querySelector(islandInput.runSelector)?.setAttribute('aria-pressed', 'false');
    const knob = this.root.querySelector<HTMLElement>(islandInput.knobSelector);
    if (knob !== null) knob.style.transform = 'translate3d(0, 0, 0)';
  }
  public destroy(): void {
    this.setEnabled(false);
    window.removeEventListener('keydown', this.keyDown);
    window.removeEventListener('keyup', this.keyUp);
    this.root.removeEventListener('click', this.click);
    this.root.removeEventListener('keydown', this.fieldKey, true);
  }
  private readonly fieldKey = (event: KeyboardEvent): void => {
    if (event.code !== 'Escape' && (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement
      || event.target instanceof HTMLTextAreaElement)) event.stopPropagation();
  };
  private readonly keyDown = (event: KeyboardEvent): void => {
    if (!this.enabled || event.repeat || event.target instanceof HTMLInputElement
      || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement
      || (event.target instanceof HTMLElement && event.target.isContentEditable)) return;
    if (islandInput.runKeys.has(event.code)) this.shifts.add(event.code);
    if (islandInput.actionKeys.has(event.code)
      && !(event.code === 'Space' && event.target instanceof HTMLButtonElement)) {
      event.preventDefault();
      this.action = true;
    }
  };
  private readonly keyUp = (event: KeyboardEvent): void => { this.shifts.delete(event.code); };
  private readonly click = (event: Event): void => {
    if (!this.enabled || !(event.target instanceof Element)) return;
    if (event.target.closest(islandInput.actionSelector) !== null) this.action = true;
    if (event.target.closest(islandInput.runSelector) !== null) {
      this.touchRun = !this.touchRun;
      this.root.querySelector(islandInput.runSelector)?.setAttribute('aria-pressed', String(this.touchRun));
    }
  };
}
