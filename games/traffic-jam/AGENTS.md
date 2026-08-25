# AGENTS.md

## Scope
Owns Traffic Jam rules, fixture, Godot presentation, and game-local configuration. It consumes shared engine capabilities and must remain independently runnable.

## Required reuse
- `packages/turn-engine` for sessions, revisions, receipts, and replay.
- `packages/grid-slide` for occupancy and movement.
- `addons/slop_engine` for plugin/session/ECS client primitives.
- `addons/slop_ui` for shared game chrome.

## Rules
- Do not duplicate platform, history, grid, or shared UI behavior.
- TypeScript is authoritative for online outcomes; Godot must pass the shared fixture.
- No extracted original assets enter this game.
- Keep the web slice procedural and compact until performance budgets are measured.
- Update `docs/games/traffic-jam.md` when the contract changes.
