# Slop foundation

## Hard rules

1. Client target is the web. Use Godot Compatibility renderer and GDScript only in runtime code.
2. `slop-engine` is one versioned package containing Godot addons plus shared deterministic contracts.
3. The web shell/social hub and games communicate through stable activity/session contracts; a game never imports the hub.
4. Turn-based rules are server-authoritative and deterministic: `command -> events -> snapshot`.
5. Events and command receipts are immutable history. Snapshots are rebuildable caches, not the source of truth.
6. Each game remains independently runnable; the hub may route into it without owning its rules.
7. Runtime size and startup are acceptance constraints, not post-release optimizations.
8. Godot and Blender MCP automate editor/asset work, but generated output must pass the same validation as human output.

## Repository shape

```text
addons/slop_engine/     Godot runtime/plugin contract
addons/slop_ui/         shared game UI
packages/contracts/     cross-runtime identifiers and schemas
packages/turn-engine/   deterministic session/replay primitives
packages/grid-slide/    reusable grid movement rules
games/traffic-jam/      first game and conformance consumer
server/nakama/          social/storage adapter
tools/                  guards, contract generation, packaging, MCP/assets
```

The current monorepo is a proving ground. Once Traffic Jam stabilizes, the engine
is released as a pinned package and a game may move to a separate repository
without changing its plugin/session contracts.

## Client boundary

Godot owns game presentation, local projection, input, and animation. It does not
own authoritative online outcomes. The shared UI owns loading, result, error,
participant, spectator, and common action presentation.

Only one Godot game runtime should be active at a time inside the web shell. The
hub may unload before a game starts and restore from shell-owned state on return.

## Server boundary

Nakama supplies identity, friends, groups, presence, storage, RPC transport, and
future matchmaking. Slop supplies deterministic rules and append-only history.

A command includes a unique command ID and expected revision. The server:

1. loads the snapshot and prior receipt;
2. rejects stale or unauthorized commands;
3. executes pure game rules;
4. writes immutable events, the command receipt, and the new snapshot in one
   optimistic transaction;
5. returns the accepted receipt/snapshot.

Duplicate command IDs return the existing receipt. Reconnect and replay rebuild
state from history when required.

## Plugin contract

A game plugin declares:

- stable game ID and version;
- entry scene;
- required engine capabilities;
- session/join/spectator policy;
- supported command and event schemas;
- runtime/performance budget;
- theme and shared UI contract.

Plugins request capabilities from the registry. They do not import arbitrary
engine internals by path.

## Web budgets for the first gate

Traffic Jam and the playground establish measurements before hard limits are
finalized. Initial targets:

- no threaded web export requirement;
- no C# or GDExtension runtime dependency;
- procedural/simple assets for the first slice;
- no permanent frame loop for turn rules;
- bounded initial scene/entity count;
- no second game runtime kept alive in the background;
- asset/build size recorded by CI.

A later ADR may replace Godot only if real weak-device measurements fail the
accepted budget.

## Asset automation

MCP servers are development tools, not runtime dependencies.

- Godot MCP may create/edit scenes, scripts, resources, and run validation.
- Blender MCP may create/repair/export source assets.
- raw proprietary references stay outside product/runtime outputs;
- recreated/generated assets require provenance metadata and validation;
- the product repository never treats extracted original assets as distributable.
