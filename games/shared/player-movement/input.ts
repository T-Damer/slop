export interface MovementVector {
  readonly x: number;
  readonly z: number;
}

export interface MovementInput {
  readonly read: () => MovementVector;
  readonly destroy: () => void;
}

export interface JoystickMovementOptions {
  readonly baseSelector: string;
  readonly knobSelector: string;
  readonly maximumRadiusPx: number;
  readonly minimumMagnitude: number;
}

const movementKeys = {
  left: new Set(['ArrowLeft', 'KeyA']),
  right: new Set(['ArrowRight', 'KeyD']),
  up: new Set(['ArrowUp', 'KeyW']),
  down: new Set(['ArrowDown', 'KeyS']),
} as const;

export function createJoystickMovementInput(
  root: HTMLElement,
  options: JoystickMovementOptions,
): MovementInput {
  return new JoystickMovementInputController(root, options);
}

class JoystickMovementInputController implements MovementInput {
  private readonly pressed = new Set<string>();
  private readonly base: HTMLElement | null;
  private readonly knob: HTMLElement | null;
  private joystickX = 0;
  private joystickZ = 0;
  private activePointerId: number | null = null;

  public constructor(
    root: HTMLElement,
    private readonly options: JoystickMovementOptions,
  ) {
    this.base = root.querySelector<HTMLElement>(options.baseSelector);
    this.knob = root.querySelector<HTMLElement>(options.knobSelector);
    window.addEventListener('keydown', this.handleKeyDown, { passive: false });
    window.addEventListener('keyup', this.handleKeyUp);
    this.base?.addEventListener('pointerdown', this.handlePointerDown);
    this.base?.addEventListener('pointermove', this.handlePointerMove);
    this.base?.addEventListener('pointerup', this.handlePointerEnd);
    this.base?.addEventListener('pointercancel', this.handlePointerEnd);
  }

  public readonly read = (): MovementVector => {
    const keyboardX = Number(hasAny(this.pressed, movementKeys.right))
      - Number(hasAny(this.pressed, movementKeys.left));
    const keyboardZ = Number(hasAny(this.pressed, movementKeys.down))
      - Number(hasAny(this.pressed, movementKeys.up));
    const x = keyboardX + this.joystickX;
    const z = keyboardZ + this.joystickZ;
    const magnitude = Math.hypot(x, z);
    if (magnitude < this.options.minimumMagnitude) {
      return { x: 0, z: 0 };
    }
    return { x: x / Math.max(1, magnitude), z: z / Math.max(1, magnitude) };
  };

  public readonly destroy = (): void => {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.base?.removeEventListener('pointerdown', this.handlePointerDown);
    this.base?.removeEventListener('pointermove', this.handlePointerMove);
    this.base?.removeEventListener('pointerup', this.handlePointerEnd);
    this.base?.removeEventListener('pointercancel', this.handlePointerEnd);
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (isMovementKey(event.code)) {
      this.pressed.add(event.code);
      event.preventDefault();
    }
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.pressed.delete(event.code);
  };

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (this.base === null || this.knob === null || this.activePointerId !== null) {
      return;
    }
    this.activePointerId = event.pointerId;
    this.base.setPointerCapture(event.pointerId);
    this.updateJoystick(event);
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (this.activePointerId === event.pointerId) {
      this.updateJoystick(event);
    }
  };

  private readonly handlePointerEnd = (event: PointerEvent): void => {
    if (this.activePointerId !== event.pointerId || this.knob === null) {
      return;
    }
    this.activePointerId = null;
    this.joystickX = 0;
    this.joystickZ = 0;
    this.knob.style.transform = 'translate3d(0, 0, 0)';
  };

  private updateJoystick(event: PointerEvent): void {
    if (this.base === null || this.knob === null) {
      return;
    }
    const rect = this.base.getBoundingClientRect();
    const deltaX = event.clientX - (rect.left + rect.width / 2);
    const deltaY = event.clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(deltaX, deltaY);
    const scale = distance > this.options.maximumRadiusPx
      ? this.options.maximumRadiusPx / distance
      : 1;
    const x = deltaX * scale;
    const y = deltaY * scale;
    this.joystickX = x / this.options.maximumRadiusPx;
    this.joystickZ = y / this.options.maximumRadiusPx;
    this.knob.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }
}

function hasAny(pressed: ReadonlySet<string>, candidates: ReadonlySet<string>): boolean {
  for (const candidate of candidates) {
    if (pressed.has(candidate)) {
      return true;
    }
  }
  return false;
}

function isMovementKey(code: string): boolean {
  return movementKeys.left.has(code)
    || movementKeys.right.has(code)
    || movementKeys.up.has(code)
    || movementKeys.down.has(code);
}
