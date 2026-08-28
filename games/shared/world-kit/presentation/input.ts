import type { WalkWorldInput } from '../domain/types.ts';

const worldInputKeys = {
  left: new Set(['a', 'arrowleft']),
  right: new Set(['d', 'arrowright']),
  up: new Set(['w', 'arrowup']),
  down: new Set(['s', 'arrowdown']),
  interact: new Set(['e', ' ', 'enter']),
} as const;

const worldInputTuning = {
  maximumStickRadiusPx: 42,
  minimumMagnitude: 0.05,
} as const;

export interface WalkInputElements {
  readonly joystick: HTMLElement;
  readonly joystickKnob: HTMLElement;
  readonly actionButton: HTMLButtonElement;
}

export class WalkInputController {
  private readonly pressedKeys = new Set<string>();
  private joystickX = 0;
  private joystickZ = 0;
  private interactQueued = false;
  private activePointerId: number | null = null;

  public constructor(private readonly elements: WalkInputElements) {
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
    this.elements.joystick.addEventListener('pointerdown', this.handlePointerDown);
    this.elements.joystick.addEventListener('pointermove', this.handlePointerMove);
    this.elements.joystick.addEventListener('pointerup', this.handlePointerEnd);
    this.elements.joystick.addEventListener('pointercancel', this.handlePointerEnd);
    this.elements.actionButton.addEventListener('pointerdown', this.handleAction);
  }

  public sample(): WalkWorldInput {
    const keyboardX = Number(this.hasAny(worldInputKeys.right))
      - Number(this.hasAny(worldInputKeys.left));
    const keyboardZ = Number(this.hasAny(worldInputKeys.down))
      - Number(this.hasAny(worldInputKeys.up));
    const moveX = keyboardX === 0 ? this.joystickX : keyboardX;
    const moveZ = keyboardZ === 0 ? this.joystickZ : keyboardZ;
    const interact = this.interactQueued;
    this.interactQueued = false;
    return { moveX, moveZ, interact };
  }

  public setActionAvailable(available: boolean): void {
    this.elements.actionButton.disabled = !available;
    this.elements.actionButton.classList.toggle('is-available', available);
  }

  public destroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    this.elements.joystick.removeEventListener('pointerdown', this.handlePointerDown);
    this.elements.joystick.removeEventListener('pointermove', this.handlePointerMove);
    this.elements.joystick.removeEventListener('pointerup', this.handlePointerEnd);
    this.elements.joystick.removeEventListener('pointercancel', this.handlePointerEnd);
    this.elements.actionButton.removeEventListener('pointerdown', this.handleAction);
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    if (this.isMovementKey(key)) {
      event.preventDefault();
      this.pressedKeys.add(key);
    }
    if (!event.repeat && worldInputKeys.interact.has(key)) {
      event.preventDefault();
      this.interactQueued = true;
    }
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.pressedKeys.delete(event.key.toLowerCase());
  };

  private readonly handlePointerDown = (event: PointerEvent): void => {
    this.activePointerId = event.pointerId;
    this.elements.joystick.setPointerCapture(event.pointerId);
    this.updateJoystick(event);
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (event.pointerId === this.activePointerId) {
      this.updateJoystick(event);
    }
  };

  private readonly handlePointerEnd = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) {
      return;
    }
    this.activePointerId = null;
    this.joystickX = 0;
    this.joystickZ = 0;
    this.elements.joystickKnob.style.transform = 'translate3d(0, 0, 0)';
  };

  private readonly handleAction = (event: PointerEvent): void => {
    event.preventDefault();
    if (!this.elements.actionButton.disabled) {
      this.interactQueued = true;
    }
  };

  private updateJoystick(event: PointerEvent): void {
    event.preventDefault();
    const rect = this.elements.joystick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = event.clientX - centerX;
    const deltaY = event.clientY - centerY;
    const distance = Math.hypot(deltaX, deltaY);
    const scale = distance > worldInputTuning.maximumStickRadiusPx
      ? worldInputTuning.maximumStickRadiusPx / distance
      : 1;
    const offsetX = deltaX * scale;
    const offsetY = deltaY * scale;
    this.joystickX = offsetX / worldInputTuning.maximumStickRadiusPx;
    this.joystickZ = offsetY / worldInputTuning.maximumStickRadiusPx;
    if (Math.hypot(this.joystickX, this.joystickZ) < worldInputTuning.minimumMagnitude) {
      this.joystickX = 0;
      this.joystickZ = 0;
    }
    this.elements.joystickKnob.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`;
  }

  private hasAny(keys: ReadonlySet<string>): boolean {
    return [...keys].some((key) => this.pressedKeys.has(key));
  }

  private isMovementKey(key: string): boolean {
    return worldInputKeys.left.has(key)
      || worldInputKeys.right.has(key)
      || worldInputKeys.up.has(key)
      || worldInputKeys.down.has(key);
  }
}
