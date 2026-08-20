# Capabilities and reuse

## Purpose

AI implementation tends to produce locally correct copies of the same idea. This document defines how the repository prevents that failure mode.

The repository should behave as a library of discoverable capabilities, not a collection of task-specific patches.

## 1. Search-before-create is mandatory

Before creating any of the following:

- ECS component;
- ECS system;
- hook;
- helper;
- service;
- adapter;
- event;
- command;
- schema;
- constant registry;
- UI primitive;
- network message;

an agent must search for equivalent or adjacent behaviour.

Search by **concept**, not only by the name you intend to use.

Example for a planned `useHeldItem` hook:

Search for terms such as:

```text
held item
carry
carrier
pickup
inventory
attached entity
```

A missing exact name does not mean the capability is missing.

## 2. Decision order

Use this order:

```text
1. Reuse existing capability unchanged
2. Extend existing capability without breaking semantics
3. Compose existing lower-level capabilities
4. Create game-local capability
5. Promote to shared capability when reuse is demonstrated
```

Do not jump directly to step 5 merely because code looks generic.

## 3. Semantic reuse, not text reuse

Two pieces of code are reusable when they represent the same domain concept, not merely when their syntax looks similar.

Good shared concept:

```text
Carryable + Carrier + CarrySystem
```

used by fish, boxes, loot, groceries, and tools.

Potentially bad abstraction:

```text
GenericThingThatMovesBetweenTwoPlaces
```

created only because two implementations happened to share ten lines.

## 4. First/second/third occurrence policy

### First occurrence

Keep genuinely game-specific behaviour local if the shared abstraction is not yet clear.

### Second independent occurrence

The implementation agent must explicitly evaluate whether the capability should be shared.

The result must be one of:

- promote/refactor into an existing shared capability;
- create a new shared capability;
- document why the two behaviours are semantically different.

### Third equivalent occurrence

Treat it as an architecture defect unless an explicit exception explains why reuse is inappropriate.

The planned architecture guard should eventually detect likely duplicates and require review.

## 5. Capability registry

Shared capabilities should have a machine-readable registry generated or maintained from canonical metadata.

Target concept:

```json
{
  "carry-object": {
    "components": ["Carrier", "Carryable"],
    "systems": ["CarrySystem"],
    "entrypoints": ["game-sdk/carry"],
    "summary": "Attach, transport and release carryable entities"
  }
}
```

The exact format will be decided when the runtime exists.

The registry should allow agents/tools to answer:

- does this behaviour already exist?
- which package owns it?
- what APIs/components/systems implement it?
- who consumes it?
- what tests define its contract?

Do not manually create a second source of truth if this can be generated from code metadata.

## 6. Shared vs game-local code

Shared code belongs in shared packages only if its semantics are stable across consumers.

Game-local code belongs under the game when:

- behaviour is unique to that game;
- the abstraction is still uncertain;
- sharing it would introduce game-specific flags/options into a generic API;
- no other consumer exists and the generic abstraction would be speculative.

Moving a file to `shared/` does not make it good architecture.

## 7. No game-specific branching in shared capabilities

Forbidden:

```ts
switch (gameId) {
  case GAME_IDS.FISHING:
    return fishPickupRules();
  case GAME_IDS.SALVAGE:
    return salvagePickupRules();
}
```

inside a shared `CarrySystem`.

Prefer configuration/components/composition:

```text
CarrySystem
+ Carryable
+ Carrier
+ game-specific EligibilitySystem or rule component
```

Shared code knows capabilities, not game identities.

## 8. Helper rules

Helpers should usually be:

- small;
- pure where possible;
- named after domain meaning;
- independently testable when non-trivial;
- located where agents searching the relevant domain will find them.

Do not create generic dumping grounds such as:

```text
utils.ts
helpers.ts
common.ts
misc.ts
```

for unrelated functions.

Prefer:

```text
inventory/calculate-stack-space.ts
math/clamp.ts
activity/is-session-joinable.ts
```

or a cohesive module with several tightly related functions.

## 9. Hook rules

Hooks encapsulate coherent UI/application behaviour, not arbitrary extracted lines.

Good hook responsibility:

```text
useActivityPresence
useJoinActivity
useSpectatorQueue
```

Bad:

```text
useEverythingOnGameScreen
```

A hook should expose the smallest useful API and hide internal coordination state/effects.

Before creating a hook, search for:

- an existing hook;
- a lower-level store/service selector;
- an ECS/runtime selector;
- a helper that already implements the transformation.

## 10. Constants and registries

Do not duplicate the same semantic literal across packages.

Canonical registries should eventually own identifiers such as:

```text
GAME_IDS
COMPONENT_IDS
SYSTEM_IDS
GAME_EVENTS
GAME_COMMANDS
GAME_MOMENTS
ASSET_IDS
ACTIVITY_STATES
JOIN_POLICIES
ROUTE_IDS
STORAGE_KEYS
NETWORK_MESSAGES
```

A domain-specific constant should live near the domain that owns it.

Do not create one enormous global `constants.ts` containing unrelated values.

## 11. Configuration reuse

Shared configuration types are preferable to copy/pasted object shapes.

However, do not turn every game tuning value into a global constant.

Correct separation:

```text
shared type/contract: MovementConfig
shared default if genuinely universal: DEFAULT_MOVEMENT_CONFIG
specific game tuning: FISHING_PLAYER_MOVEMENT_CONFIG
```

## 12. API growth policy

Do not add an option to a shared API solely to support one caller if composition can express the requirement more cleanly.

Warning sign:

```ts
carry(entity, {
  fishingMode: true,
  salvageMode: false,
  ignorePoolRules: true,
});
```

Shared option sets that grow by game name are architecture failures.

## 13. Duplicate implementation review

Reviewer agents should compare new code against repository-wide concepts, not only files touched by the task.

Ask:

- is there already another implementation of this behaviour?
- did the agent create a new name for an existing concept?
- could an existing helper/system be extended safely?
- is the new abstraction prematurely generic?
- did the change create a second source of truth?

## 14. Deleting replaced capabilities

When a change intentionally replaces an old implementation:

- migrate all intended consumers;
- remove obsolete code/export/configuration;
- remove obsolete tests or convert them to the new contract;
- run dead-code/unused-export checks;
- do not leave a legacy path “just in case” without an explicit compatibility requirement.

## 15. Discoverability is part of implementation

A shared capability that future agents cannot find is effectively duplicated code waiting to happen.

Shared capability work should include:

- clear naming;
- canonical exports;
- searchable domain vocabulary;
- concise docs/metadata;
- tests demonstrating intended use.

## 16. Reuse gate for every change

Before completion, the implementation agent must be able to answer:

1. What existing capabilities were searched?
2. What existing capability was reused or why none fit?
3. Did this change create a concept that another game is likely to need?
4. If similar code already exists elsewhere, why was it not unified?
5. Did this change add another source of truth?

If these questions cannot be answered, the change is not ready for review.
