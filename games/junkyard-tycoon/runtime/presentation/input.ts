export interface MovementVector {
  readonly x: number;
  readonly z: number;
}

export interface MovementInput {
  readonly read: () => MovementVector;
  readonly destroy: () => void;
}

const movementKeys = {
  left: new Set(['ArrowLeft', 'KeyA']),
  right: new Set(['ArrowRight', 'KeyD']),
  up: new Set(['ArrowUp', 'KeyW']),
  down: new Set(['ArrowDown', 'KeyS']),
} as const;

const joystickRules = {
  maximumRadiusPx: 42,
  minimumMagnitude: 0.08,
} as const;

export function createMovementInput(root: HTMLElement): MovementInput {
  return new MovementInputController(root);
}

class MovementInputController implements MovementInput {
  private readonly pressed = new Set<string>();
  private readonly base: HTMLElement | null;
  private readonly knob: HTMLElement | null;
  private joystickX = 0;
  private joystickZ = 0;
  private activePointerId: number | null = null;

  public constructor(root: HTMLElement) {
    this.base = root.querySelector<HTMLElement>('.junkyard-joystick-base');
    this.knob = root.querySelector<HTMLElement>('.junkyard-joystick-knob');
    window.addEventListener('keydown', this.handleKeyDown, { passive: false });
    window.addEventListener('keyup', this.handleKeyUp);
    this.base?.addEventListener('pointerdown', this.handlePointerDown);
    this.base?.addEventListener('pointermove', this.handlePointerMove);
    this.base?.addEventListener('pointerup', this.handlePointerEnd);
    this.base?.addEventListener('pointercancel', this.handlePointerEnd);
  }

  public readonly read = (): MovementVector => {
    const keyboardX =
      Number(hasAny(this.pressed, movementKeys.right))
      - Number(hasAny(this.pressed, movementKeys.left));
    const keyboardZ =
      Number(hasAny(this.pressed, movementKeys.down))
      - Number(hasAny(this.pressed, movementKeys.up));
    const x = keyboardX + this.joystickX;
    const z = keyboardZ + this.joystickZ;
    const magnitude = Math.hypot(x, z);
    if (magnitude < joystickRules.minimumMagnitude) {
      return { x: 0, z: 0 };
    }
    return {
      x: x / Math.max(1, magnitude),
      z: z / Math.max(1, magnitude),
    };
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
    if (
      this.base === null
      || this.knob === null
      || this.activePointerId !== null
    ) {
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
    const scale = distance > joystickRules.maximumRadiusPx
      ? joystickRules.maximumRadiusPx / distance
      : 1;
    const clampedX = deltaX * scale;
    const clampedY = deltaY * scale;
    this.joystickX = clampedX / joystickRules.maximumRadiusPx;
    this.joystickZ = clampedY / joystickRules.maximumRadiusPx;
    this.knob.style.transform =
      `translate3d(${clampedX}px, ${clampedY}px, 0)`;
  }
}

function hasAny(
  pressed: ReadonlySet<string>,
  candidates: ReadonlySet<string>,
): boolean {
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
