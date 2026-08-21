# Code standards

## Hard rules

1. TypeScript is strict; do not weaken types to make a patch compile.
2. `const` by default, `let` only for intentional reassignment, never `var`.
3. Domain-significant strings/numbers live in typed domain registries/config objects — never inline and never as one-off local constants.
4. One piece of state has one canonical owner; derived state is computed.
5. Mutually exclusive boolean state becomes a discriminated union/state machine.
6. UI components render/compose; workflows, effects, subscriptions, and non-trivial state orchestration move to focused hooks/controllers/services.
7. Search before creating helpers/hooks/systems/services; copy-paste variants are defects.
8. Pure/domain logic keeps side effects at explicit boundaries.
9. Public APIs and dependencies stay minimal.
10. Behaviour changes require behavioural tests; bugs normally require regression tests.

These rules are optimized for a codebase written mostly by AI agents: explicit ownership and discoverability are more valuable than cleverness.

## 1. TypeScript baseline

Use strict TypeScript.

- no implicit `any`;
- avoid explicit `any`; prefer `unknown` + validation/narrowing;
- no unchecked assertions used to bypass compiler errors;
- no `@ts-ignore` without a documented exception;
- prefer discriminated unions for closed state variants;
- external/untrusted data is validated at boundaries;
- closed unions should be handled exhaustively.

Do not weaken global compiler settings for a local task.

## 2. Domain literals must have typed owners

The following must not float through implementation code:

- gameplay values and tuning;
- timers/durations/cooldowns;
- distances/speeds/limits;
- probabilities/thresholds;
- event/command/moment/action identifiers;
- game/component/system IDs;
- asset IDs;
- route IDs;
- network/protocol message names;
- storage/cache keys;
- feature flags;
- analytics identifiers;
- permissions;
- other values whose change alters product/domain behaviour or a boundary contract.

### Inline literals are forbidden

Bad:

```ts
if (distance <= 2.5) {
  emit("fishing.caught");
}

setTimeout(animatePickup, 300);
```

### One-off local constants are also forbidden

This is still bad:

```ts
const MIN_CATCH_DISTANCE = 2.5;
const FISH_CAUGHT_EVENT = "fishing.caught";
const PICKUP_ANIMATION_MS = 300;
```

It names the values but leaves ownership beside one implementation, which makes discovery, reuse, tuning, and validation worse.

### Use cohesive typed domain registries/config objects

Preferred:

```ts
export const fishingEvents = {
  caught: "fishing.caught",
  escaped: "fishing.escaped",
} as const;

export const fishingDistances = {
  minCatchDistanceMeters: 2.5,
} as const;

export const fishingTimers = {
  pickupAnimationMs: 300,
} as const;
```

Usage:

```ts
if (distance <= fishingDistances.minCatchDistanceMeters) {
  emit(fishingEvents.caught);
}

schedule(animatePickup, fishingTimers.pickupAnimationMs);
```

Use `satisfies`/explicit types where the object represents a contract:

```ts
export const fishingRules = {
  maxPlayers: 8,
  rareCatchMultiplier: 1.5,
} as const satisfies FishingRules;
```

### Ownership rules

- game-specific values live with the game/domain;
- cross-game values live in the shared capability that owns their semantics;
- protocol identifiers live with the protocol contract;
- asset identifiers live in typed asset registries;
- user-facing product copy should move through the localization/message system once defined, not become scattered implementation strings;
- do not create a global `constants.ts` junk drawer.

Good shapes include:

```text
fishing/fishing-events.ts
fishing/fishing-rules.ts
fishing/fishing-config.ts
activity/activity-states.ts
network/protocol-messages.ts
assets/asset-ids.ts
```

The exact file split is secondary; **stable semantic ownership is mandatory**.

### Narrow structural exceptions

Structural literals may remain explicit when extracting them would reduce clarity and they do not encode domain behaviour, for example:

```ts
items[0]
count += 1
Math.max(value, 0)
```

Also acceptable:

- mathematical identities;
- explicit test fixture/sample data;
- import/module paths;
- syntax/library options whose meaning is already defined by an external API.

If changing a literal changes gameplay, UX timing, protocol behaviour, persistence, permissions, routing, or product semantics, it is not structural.

## 3. State ownership

Every state value has one canonical owner.

Before adding state, classify it as:

- authoritative simulation;
- server/platform domain;
- client application state;
- UI presentation state;
- persisted configuration/preferences;
- derived state.

Do not synchronize duplicate representations without an explicit contract.

Bad:

```ts
const [players, setPlayers] = useState(...);
const [playerCount, setPlayerCount] = useState(players.length);
```

Prefer deriving `playerCount` unless it has independent semantics.

## 4. State machines over boolean soup

Several booleans describing mutually exclusive states are a smell.

Bad:

```text
isLoading
isJoining
isSpectating
hasFailed
```

Prefer:

```ts
type JoinFlowState =
  | { kind: "idle" }
  | { kind: "joining" }
  | { kind: "spectating" }
  | { kind: "failed"; reason: JoinFailure };
```

The string discriminants above are type-level structural values of the state contract; keep them defined with the contract rather than scattering comparisons across unrelated modules.

## 5. UI components and hooks

A UI component should primarily:

- receive/select data;
- compose presentation;
- bind explicit actions;
- render.

Review/extraction triggers:

- more than 3 related local state values;
- effects coordinating multiple states;
- non-trivial async/retry/loading/error flow;
- subscriptions/lifecycle orchestration;
- reusable transformation/behaviour;
- component starts owning a domain workflow.

Move coherent behaviour to a focused hook/controller/service.

Do **not** create a hook merely to move lines. A hook must have one responsibility, a small API, and tests when behaviour is non-trivial. A 300-line mega-hook is not an improvement.

## 6. Helpers and reuse

Before creating any helper/hook/system/service:

1. search by intended name;
2. search by synonyms/semantics;
3. inspect neighbouring capability APIs/tests;
4. reuse when semantics match;
5. extend when the existing owner should support the case;
6. create only when genuinely different.

Prefer pure helpers and domain-specific names.

Avoid generic dump modules such as:

```text
utils.ts
helpers.ts
common.ts
misc.ts
shared.ts
```

unless the module has a specific documented responsibility despite the name.

Follow `../architecture/capabilities-and-reuse.md` and `refactoring.md`.

## 7. Functions and modules

Functions/modules have coherent responsibilities.

Starting review signals:

```text
function length: warning > 40 lines; hard review > 80
nesting depth: target <= 3
cyclomatic complexity: warning > 8; hard review > 12
positional parameters: target <= 3
file length: warning > 250; hard review > 500
```

These are review signals, not reasons to fragment coherent code.

Use options/context objects when many parameters form one operation.

## 8. Naming

Names reveal domain intent.

Avoid vague names such as `data`, `thing`, `process`, `helper`, `manager`, `item2` when a semantic name exists.

Use architectural suffixes consistently when useful:

```text
*.system.ts
*.component.ts
*.hook.ts
*.service.ts
*.adapter.ts
*.schema.ts
*.config.ts
```

## 9. Events and boundaries

Use typed domain events/actions with explicit payload types.

Do not emit arbitrary event strings inline.

Subscriptions have explicit lifecycle cleanup.

Pure/deterministic code does not directly:

- fetch/network;
- mutate storage;
- access DOM;
- send analytics;
- read uncontrolled wall-clock time;
- use uncontrolled randomness.

Use explicit adapters/context/services at boundaries.

## 10. Async/errors/logging

Promises are intentionally handled.

At an error boundary, explicitly recover, convert to typed/domain failure, report/rethrow, or propagate to a documented owner.

Never make callers parse human-readable error text to determine behaviour.

Do not leave ad-hoc `console.log` debugging in committed code. Use the platform logger when defined and never log secrets/private payloads.

## 11. Dependencies and public APIs

Before adding a dependency:

1. search existing project capability;
2. check platform/runtime primitives;
3. justify why a dependency is better;
4. consider runtime/bundle/security/license/maintenance impact.

Do not add a package for a tiny helper.

Minimize public exports. Do not export internals “for later”. Shared contracts must have documented semantics and contract tests.

## 12. Comments and TODOs

Comments explain **why** a non-obvious constraint exists, not what syntax does.

Do not use comments to excuse bad architecture.

Untracked `TODO`/`FIXME` is not a substitute for completing a change. Legitimate deferred work needs an explicit follow-up/owner and reason.

## 13. Tests

Prefer behavioural tests with named fixtures/builders.

Tests may use explicit fixture literals when that improves readability; they do not need to mirror production registry extraction mechanically.

Do not rely on snapshot tests alone for important domain/gameplay behaviour.

## 14. Final self-review

Before handoff ask:

- Did any domain string/number appear inline?
- Did I hide one behind a local standalone constant instead of its domain registry?
- Did I add a second state owner?
- Did I create something semantically equivalent to an existing helper/hook/system?
- Did UI become a domain orchestrator?
- Did boolean soup appear?
- Did I weaken typing or boundaries?
- Did I add unnecessary dependency/public API surface?
- Does every new reusable concept have a discoverable owner?

If the answer exposes structural work, follow `refactoring.md` instead of patching around it.
