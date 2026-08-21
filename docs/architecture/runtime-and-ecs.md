# Runtime and ECS architecture

## Hard rules

1. ECS is the gameplay composition model.
2. Components are small data-only state/schema; systems own behaviour.
3. Do not build a second generic client ECS when the chosen engine already provides one; our contract is the semantic component/system vocabulary and ownership.
4. Shared systems never branch on a concrete game identity.
5. Gameplay/system behaviour declares what state it reads/writes/emits as runtime tooling permits.
6. Deterministic simulation receives controlled clock/RNG/input/services; it does not directly call wall clock, random, network, storage, analytics, or DOM APIs.
7. UI/presentation does not become an authoritative gameplay state store.
8. Server-authoritative state remains server-authoritative; client convenience code does not redefine authority.
9. Reusable behaviour is expressed through components/capabilities/configuration, not copy-pasted game variants.
10. Domain identifiers/tuning values use canonical typed registries/config objects.

## 1. Composition model

Gameplay entities gain behaviour by component composition.

Example:

```text
Fishing player
├ Transform
├ PlayerControlled
├ Movement
├ Carrier
├ Inventory
└ ActivityParticipant

Fish
├ Transform
├ Interactable
├ Carryable
├ Collectible
└ FishData
```

The engine may physically store these using its own ECS/component API. Do not wrap it in a second generic ECS merely for aesthetic purity.

The stable project contract is:

- component semantics;
- system semantics;
- ownership;
- deterministic boundaries;
- network/presentation boundaries.

## 2. Components are data-only

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
  speedMetersPerSecond = 4;

  move() {
    // hidden behaviour
  }
}
```

Components should:

- represent one coherent state/capability concern;
- be serializable when network/replay semantics require it;
- avoid hidden service/network/storage references;
- avoid timers implemented through wall-clock side effects;
- use typed IDs/contracts for categorical/domain values.

A component becoming a miscellaneous bag of unrelated fields is a refactor signal.

## 3. Systems own behaviour

Conceptual shape:

```ts
defineSystem({
  id: systemIds.movement,
  phase: systemPhases.simulation,
  reads: [componentIds.movement, componentIds.transform],
  writes: [componentIds.transform],
  emits: [movementEvents.started, movementEvents.stopped],
  update(context) {
    // behaviour
  },
});
```

The exact API may change, but behaviour/state access must remain discoverable enough for tests, review, networking, replay, and `slop-guard`.

## 4. Shared systems are semantic capabilities

A shared capability such as carrying should operate from component semantics:

```text
Carrier + Carryable + interaction state
→ CarrySystem
```

Forbidden shared logic:

```ts
if (gameId === gameIds.fishing) {
  // fishing special case
}
```

If fishing needs additional eligibility:

- configure shared semantics through an owned contract; or
- add a fishing-local system/component that composes with the shared capability.

Do not contaminate shared systems with game identity branches.

## 5. State ownership

Before adding ECS state, identify its canonical owner.

Typical categories:

```text
authoritative gameplay simulation
server/platform domain
client prediction/interpolation cache
presentation-only state
persisted preferences/config
pure derived state
```

Do not duplicate gameplay state into UI/application state merely because it is convenient to render.

Derived values are computed unless they have their own independent domain semantics/performance contract.

## 6. Determinism boundary

Deterministic/authoritative simulation must not directly use:

```text
Date.now
performance.now
Math.random
setTimeout / setInterval for gameplay timing
fetch / WebSocket
localStorage / IndexedDB
DOM
analytics / payment SDKs
```

Instead receive controlled owners such as:

```ts
context.clock
context.rng
context.input
context.events
context.commands
context.services
```

Their exact names are runtime decisions; controlled injection/ownership is the invariant.

This enables:

- server execution;
- deterministic tests;
- replay;
- prediction/reconciliation where used;
- bots;
- debugging.

## 7. Time

Gameplay timing is simulation/configuration state, not scattered milliseconds.

Use canonical owners, for example:

```ts
fishingTimers.biteWindowMs
fishingTimers.pickupAnimationMs
activityTimers.reconnectGraceMs
```

Simulation time comes from the controlled clock/scheduler.

Presentation animation timing may use presentation infrastructure but still follows the domain-literal ownership rules when the value is product/style significant.

## 8. Randomness

Gameplay-affecting randomness uses the controlled RNG owner and explicit seeds where deterministic replay/server verification requires them.

Probabilities live in owned configuration:

```ts
fishingProbabilities.legendaryCatch
lootRules.rareDropChance
```

Do not call raw randomness from gameplay systems.

## 9. Presentation boundary

Presentation may:

- render ECS/domain state;
- interpolate visual transforms;
- play animations/audio/effects from semantic events;
- own ephemeral visual state.

Presentation may not:

- decide authoritative hit/catch/reward outcomes;
- mutate canonical game rules outside commands/actions;
- maintain a competing gameplay truth.

Visual theme/style is presentation/configuration unless the game spec explicitly defines a gameplay rule. Shared theme code must not secretly change mechanics.

## 10. Networking and authority

Each game spec declares authority/session model.

For server-authoritative games:

```text
client input/intent
→ authoritative simulation
→ state/events
→ clients/spectators
```

Clients may predict/interpolate only through explicit contracts. Prediction is not ownership.

Networked/persisted ECS data requires explicit schema/version semantics when compatibility matters.

## 11. Spectators/participants

Participant role should be explicit data/state rather than inferred from UI.

Example roles:

```text
player
spectator
queued-next-round
bot
```

Games define join policy; shared activity/session infrastructure owns generic participant lifecycle where possible.

## 12. Bots

Bots should drive the same semantic command/input boundary as human players where practical.

Avoid creating a parallel gameplay implementation solely for bots.

Bot difficulty/behaviour values belong to typed bot/game configuration.

## 13. Events

Systems emit semantic events from canonical registries:

```ts
fishingEvents.caught
carryEvents.started
roundEvents.completed
```

Do not couple simulation directly to notifications, chat cards, analytics, or achievements.

Higher layers decide which semantic gameplay events become social moments, notifications, progression, analytics, or presentation effects.

## 14. Local game systems

Game-specific systems are expected. They stay under the game boundary and compose shared capabilities.

Promote behaviour to shared code only under `capabilities-and-reuse.md`.

A game-local system does not justify a new generic abstraction until semantics are demonstrably shared.

## 15. System phases

The runtime should eventually expose a small stable phase model such as:

```text
input
simulation
post-simulation/events
presentation synchronization
```

Do not create arbitrary ordering dependencies between systems when an explicit phase/dependency contract can represent them.

## 16. Tests

Shared/system gameplay behaviour should be testable without full rendering/UI.

Prefer deterministic tests for:

- component eligibility;
- state transitions;
- system interactions;
- emitted semantic events;
- controlled timing/randomness;
- reconnect/authority boundaries where relevant.

## 17. Change rule

Adding/changing a shared component/system contract is architecture-significant.

Before doing so:

1. search existing capability semantics/callers;
2. read local `AGENTS.md` and reuse/refactor policy;
3. identify affected games/consumers;
4. define migration/compatibility if necessary;
5. update tests/docs/ADR when applicable;
6. run `grill-me`/adversarial architecture review for a non-trivial change.
