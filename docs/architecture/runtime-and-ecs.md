# Runtime and ECS architecture

## Purpose

This document defines the gameplay runtime contract. It exists to keep many independently implemented games compatible with one platform and to prevent agents from creating local object-oriented or component-state shortcuts that fragment behaviour.

## 1. ECS is the gameplay composition model

Gameplay entities are composed from data components and processed by systems.

The engine/runtime may provide its own ECS primitives. Do not build a second generic client ECS merely for abstraction purity. Our contract is the **semantic component/system vocabulary and its ownership rules**.

Example:

```text
Fishing player
Entity
├ Transform
├ PlayerControlled
├ Movement
├ Carrier
├ Inventory
└ ActivityParticipant

Fish
Entity
├ Transform
├ Interactable
├ Carryable
├ Collectible
└ FishData
```

Behaviour emerges from systems acting on component combinations.

## 2. Components are data-only

Components should contain serializable state or references explicitly permitted by the runtime contract.

Good:

```ts
interface MovementComponent {
  speedMetersPerSecond: number;
  accelerationMetersPerSecondSquared: number;
}
```

Bad:

```ts
class MovementComponent {
  speed = 4;

  move() {
    // behaviour hidden inside component
  }
}
```

Rules:

- no gameplay methods inside components;
- no hidden network/storage access;
- no timers implemented by wall-clock side effects;
- prefer small components representing one capability/state concern;
- avoid components that become miscellaneous bags of unrelated state;
- use typed IDs/enums/registries for categorical values.

## 3. Systems own behaviour

Systems operate over entities/components and declare their dependencies.

Target conceptual shape:

```ts
defineSystem({
  id: SYSTEM_IDS.MOVEMENT,
  phase: SYSTEM_PHASES.SIMULATION,
  reads: [COMPONENT_IDS.MOVEMENT, COMPONENT_IDS.TRANSFORM],
  writes: [COMPONENT_IDS.TRANSFORM],
  emits: [GAME_EVENTS.MOVEMENT_STARTED, GAME_EVENTS.MOVEMENT_STOPPED],
  update(context) {
    // behaviour
  },
});
```

The exact runtime API may evolve, but the metadata intent is mandatory: system ownership and side effects must remain discoverable.

Benefits:

- architecture validation;
- deterministic simulation;
- easier code review;
- replay/debug tooling;
- server/client portability;
- better AI-agent search and reasoning.

## 4. Prefer composition over game-specific classes

Avoid hierarchies such as:

```text
BaseGameObject
└ InteractiveObject
  └ CarryableObject
    └ FishingFishObject
```

Prefer:

```text
Entity + Interactable + Carryable + Collectible + FishData
```

Game-specific data is acceptable. Reimplementing generic capability behaviour is not.

## 5. Shared semantic components

The initial vocabulary is expected to include concepts such as:

```text
Transform
Movement
PlayerControlled
BotControlled

Interactable
AutoInteract
Carryable
Carrier
DropZone

Collectible
Inventory
RewardSource

Health
Damageable

Spawner
Timer
Cooldown

Team
ActivityParticipant
Spectator

RoundParticipant
Score
Objective

NavigationTarget
Visibility
FogReveal

AnimationState
AudioEmitter
```

This list is a starting vocabulary, not permission to pre-build every component before a game requires it.

Each new shared component must have:

- one clear semantic responsibility;
- documented ownership;
- typed schema;
- at least one real consumer;
- tests for systems relying on it.

## 6. Shared systems

Likely reusable systems include:

```text
MovementSystem
AutoInteractionSystem
CarrySystem
DropSystem
CollectionSystem
SpawnSystem
TimerSystem
ObjectiveSystem
ScoreSystem
RoundSystem
NavigationSystem
VisibilitySystem
FogSystem
MomentSystem
```

A shared system must not contain branches that identify a specific game and implement that game's rules.

Forbidden:

```ts
if (gameId === GAME_IDS.FISHING) {
  // special fishing behaviour in shared CarrySystem
}
```

Game-specific behaviour belongs in game-specific systems/configuration/events composed around shared primitives.

## 7. Simulation phases

The runtime should expose explicit phases rather than relying on arbitrary registration order.

A tentative phase model:

```text
input
→ pre-simulation
→ simulation
→ post-simulation
→ event resolution
→ presentation sync
```

Final phases should be kept small and stable.

If a system requires a particular ordering, it should declare that relationship or belong to a phase that guarantees it. Do not rely on incidental import order.

## 8. Deterministic simulation boundary

Gameplay simulation should be deterministic wherever practical.

Simulation code must not directly access:

```text
Date.now / performance.now
Math.random
fetch / raw WebSocket
localStorage / IndexedDB
analytics SDKs
payment SDKs
DOM/browser presentation APIs
```

Use injected runtime facilities instead:

```text
context.clock
context.rng
context.events
context.commands
context.services
```

Examples:

```ts
const now = context.clock.simulationTime;
const roll = context.rng.next();
```

This supports:

- authoritative servers;
- deterministic/replay tests;
- bots;
- debugging;
- reconnect/resimulation strategies;
- future server-side simulation implementation.

## 9. Randomness

Randomness affecting gameplay must come from a seeded/controlled RNG source.

The seed/stream ownership must be explicit for networked gameplay.

Presentation-only randomness may use a separate visual RNG that cannot change authoritative outcomes.

Do not mix cosmetic random effects into the gameplay RNG stream unless their order is intentionally part of simulation.

## 10. Time

Gameplay time uses simulation clocks/ticks, not raw wall-clock calls.

Distinguish:

- simulation time;
- server wall time;
- UI/presentation time;
- persisted timestamps.

A timer component stores data; a timer system advances/resolves it.

Bad:

```ts
setTimeout(() => explode(), 3000);
```

inside authoritative simulation.

Preferred concept:

```ts
const EXPLOSION_DELAY_MS = GAMEPLAY_TIMINGS.EXPLOSION_DELAY_MS;

addComponent(entity, COMPONENT_IDS.TIMER, {
  remainingMs: EXPLOSION_DELAY_MS,
  eventId: GAME_EVENTS.EXPLODE,
});
```

## 11. Events and commands

Events describe something that happened.

Commands request an action.

Keep them distinct.

Example:

```text
Command: AttemptPickup
Event: ItemPickedUp
```

All cross-system/game-platform event identifiers come from typed registries. Do not use floating string event names.

Payloads must have explicit types/schemas.

Avoid using a global event bus as a substitute for clear ownership. Prefer direct system/component relationships when no decoupling is needed.

## 12. Authoritative state

For online competitive/co-op simulation, authoritative gameplay state belongs to the server unless a specific architecture decision says otherwise.

Clients may:

- predict local movement/interactions where useful;
- render interpolation;
- maintain ephemeral presentation state;
- submit input/commands.

Clients must not become authoritative because an implementation shortcut is easier.

## 13. Presentation boundary

Presentation converts simulation state/events into visuals/audio/UI.

Presentation may own ephemeral concerns such as:

- animation blending;
- camera smoothing;
- particle lifetime;
- UI transitions;
- purely cosmetic effects.

Presentation must not silently change authoritative gameplay state.

Bad:

```ts
// React component
if (animationFinished) {
  authoritativeInventory.remove(itemId);
}
```

The simulation owns inventory removal. Presentation reflects it.

## 14. UI and ECS

UI framework state is not an alternate ECS.

Use UI state for presentation-specific concerns. Gameplay state should be selected/derived from runtime stores/contracts.

If a UI interaction requests gameplay behaviour, emit a typed command/action through the approved boundary.

## 15. Entity identity

Do not use display names, scene names, or mutable labels as entity identity.

Entity IDs are typed identifiers.

Asset IDs and entity IDs are different concepts.

Network identity, persistence identity, and runtime entity handles may also be different concepts and should not be conflated.

## 16. Configuration vs state

Configuration defines rules/tuning.

State describes the current session.

Example configuration:

```ts
const FISHING_CONFIG = {
  autoInteractDistanceMeters: 2.5,
  carryCapacity: 1,
} as const;
```

Example state:

```ts
interface CarrierComponent {
  carriedEntityId: EntityId | null;
}
```

Do not mutate configuration to represent live gameplay state.

## 17. Theme/style independence

Visual themes operate through presentation configuration/semantic asset mapping.

Theme code must not contain hidden gameplay rules.

If dark mode needs shorter vision as a mechanic, shorter vision is a game configuration value; the theme may render corresponding fog but does not own the gameplay radius.

## 18. System size and responsibility

A system should own one coherent capability or simulation responsibility.

Signals that a system should be split:

- unrelated component sets;
- unrelated events;
- multiple independent reasons to change;
- game-specific branches accumulating in shared logic;
- complex lifecycle unrelated to the primary system function.

Do not split systems merely to meet line-count limits. Split on semantic boundaries.

## 19. Server-side ECS

A data-oriented server ECS may be introduced when it materially simplifies authoritative simulation or performance.

Do not introduce a second ECS simply because a library exists.

If client and server use different ECS implementations, shared contracts/components must remain semantically equivalent and serialization boundaries must be explicit.

## 20. New gameplay capability checklist

Before adding a new gameplay capability:

1. search for an existing component/system/helper;
2. decide whether the behaviour is game-specific or platform-shared;
3. define state ownership;
4. define component data;
5. define the system(s) that read/write it;
6. define events/commands, if any;
7. identify deterministic side effects;
8. identify network authority;
9. write tests;
10. register/document the capability if shared.

If steps 3–8 cannot be answered, implementation should not start yet.
