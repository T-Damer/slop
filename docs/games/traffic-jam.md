# Traffic Jam — first game contract

## Hard rules

- Traffic Jam is the real foundation sanity check, not a throwaway demo.
- It uses shared grid-slide, turn-session, history, plugin, ECS projection, and UI capabilities.
- Server rules are authoritative; Godot may predict/project but must conform to the same fixture.
- Every accepted command and resulting event is retained.
- Friends may join as players where mode allows or as spectators; spectator commands cannot alter state.
- The first web build uses procedural visuals and no heavy asset dependency.

## Core loop

The board contains axis-locked vehicles. A player selects a vehicle and moves it
an integer number of cells along its axis. Intermediate cells must be inside the
board and unoccupied. The introductory goal is to clear a path and move the target
vehicle to the configured exit.

## Session model

- mode: cooperative turn-based;
- one owner is created with the session;
- friends can join as player or spectator;
- commands carry `commandId` and `expectedRevision`;
- a duplicate command returns its prior receipt;
- a stale command is rejected;
- completion makes later gameplay commands invalid;
- reconnect reads the latest snapshot and can page immutable history;
- replay must reproduce the final snapshot.

## Commands and events

```text
traffic.move_vehicle
  -> traffic.vehicle_moved
  -> optional traffic.level_completed
```

Platform events record session creation and participant joins.

## Shared capabilities exercised

- typed registries/config ownership;
- deterministic turn engine;
- grid occupancy/path validation;
- immutable event history and receipts;
- Godot plugin registry;
- lightweight ECS state projection;
- shared game shell;
- browser-compatible rendering;
- conformance fixture shared by TypeScript and GDScript.

## Current fixture

The canonical fixture is
`games/traffic-jam/fixtures/conformance.json`. It includes one rejected move and
three accepted moves ending in completion. Generated TypeScript data and the
Godot runner must remain byte-for-behavior compatible with this source.

## Prototype non-goals

- polished commercial level set;
- realtime simultaneous movement;
- island hub integration;
- production authentication UI;
- monetization;
- extracted original assets;
- AI level generation before a solver/validator exists.

## Acceptance

- blocked movement is rejected without changing revision/history;
- valid moves update occupancy deterministically;
- completion is emitted exactly once;
- duplicate command IDs are idempotent;
- stale revisions fail;
- spectators cannot submit gameplay commands;
- replay equals the accepted final snapshot;
- TypeScript and Godot execute the canonical fixture successfully;
- web export uses Compatibility renderer and stays free of large binary assets.
