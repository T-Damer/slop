import type { ValueOf } from "../../contracts/src/registry.js";

export const gridAxes = {
  horizontal: "horizontal",
  vertical: "vertical",
} as const;

export const gridErrorCodes = {
  pieceMissing: "grid.piece_missing",
  zeroMove: "grid.zero_move",
  outOfBounds: "grid.out_of_bounds",
  pathBlocked: "grid.path_blocked",
  invalidDelta: "grid.invalid_delta",
} as const;

export const gridMessages = {
  pieceMissing: "The requested grid piece does not exist.",
  zeroMove: "A grid move must change the piece position.",
  outOfBounds: "The move leaves the board.",
  pathBlocked: "Another piece blocks the movement path.",
  invalidDelta: "Grid movement must use an integer cell delta.",
} as const;

export type GridAxis = ValueOf<typeof gridAxes>;
