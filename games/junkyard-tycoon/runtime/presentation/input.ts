import {
  createJoystickMovementInput,
  type MovementInput,
  type MovementVector,
} from '../../../shared/player-movement/input.ts';

export type { MovementInput, MovementVector };

export function createMovementInput(root: HTMLElement): MovementInput {
  return createJoystickMovementInput(root, {
    baseSelector: '.junkyard-joystick-base',
    knobSelector: '.junkyard-joystick-knob',
    maximumRadiusPx: 42,
    minimumMagnitude: 0.08,
  });
}
