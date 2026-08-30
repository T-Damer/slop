import {
  createJoystickMovementInput,
  type MovementInput,
  type MovementVector,
} from '../../../shared/player-movement/input.ts';

export type IslandMovementInput = MovementInput;
export type IslandMovementVector = MovementVector;

export function createIslandMovementInput(root: HTMLElement): IslandMovementInput {
  return createJoystickMovementInput(root, {
    baseSelector: '.island-joystick-base',
    knobSelector: '.island-joystick-knob',
    maximumRadiusPx: 38,
    minimumMagnitude: 0.08,
  });
}
