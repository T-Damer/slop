# Traffic Jam

A touch-first Traffic Escape-style puzzle used as the first Modoki/Slop vertical slice.

## Rules

Every vehicle has a fixed direction. Tap a vehicle when every cell between its front and the edge of the board is clear. The vehicle exits the board. Clear all vehicles to complete the level.

The authoritative local rules live in `runtime/domain/**`. The Modoki adapter and DOM UI never reimplement blocking or completion logic.

## Included

- seven validated levels;
- deterministic solver;
- reset, undo, and hint controls;
- touch/keyboard support;
- responsive browser presentation;
- no external art assets;
- standalone Modoki web build.
