# Slop

Slop is an AI-oriented game factory experiment. The current vertical slice is a real 3D **Parking Jam** game built as an external Modoki project.

## Play

https://t-damer.github.io/slop/

## Current game loop

1. Tap a 3D car whose route to the road is clear.
2. The car drives to one of a limited number of pickup bays.
3. The next matching passenger walks to the car and boards.
4. The car departs, awards points and coins, and grows the combo.
5. Filling every bay with the wrong colors creates a recoverable pickup jam.

The three included levels contain 27, 36, and 40 cars. Rules, queue resolution, scoring, jam detection, and the solver have one pure TypeScript owner under `games/traffic-jam/runtime/domain`.

## Verify

```bash
npm test
npm run architecture:check
```

CI also builds the actual Modoki web artifact and executes the published game in headless Chrome at a mobile viewport.

## Architecture

```text
Parking domain (pure TypeScript)
        ↓
3D presentation (Three.js scene + minimal HUD)
        ↓
Modoki lifecycle and production web build
```

See `architecture/current.mmd`, `architecture/target.mmd`, and `architecture/model.json`.
