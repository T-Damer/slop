# AGENTS.md

Mandatory root contract for every agent that plans, edits, reviews, or accepts work in `slop`.

## 1. Instruction chain

For every target file, read:

1. this root file;
2. every ancestor/local `AGENTS.md` down to the target;
3. only the relevant canonical docs routed by `docs/README.md`;
4. applicable accepted ADRs.

Local instructions may specialize/tighten root rules, never silently weaken them.

## 2. Preflight — no code before this

Before the first implementation edit:

1. read the applicable instruction chain;
2. inspect branch/worktree/current diff and preserve unrelated work;
3. search the repo for the requested capability, synonyms, helpers/hooks/systems/config/events/tests/callers;
4. identify canonical state/behaviour owner and dependency layers;
5. define scope, non-goals, expected behaviour, and acceptance tests;
6. determine whether shared API/schema/runtime or refactoring is involved;
7. for non-trivial features/refactors/architecture changes, run `grill-me` when available; otherwise perform an explicit adversarial plan review.

Default order:

> **search → reuse → extend → create**

## 3. Refresh context while working

During active implementation perform a checkpoint **at least every 6 tool calls**, and immediately before/after:

- creating a reusable concept;
- crossing subsystem/package boundaries;
- touching shared runtime/API/schema;
- starting a refactor;
- materially changing the plan;
- final handoff.

Checkpoint:

1. re-read closest local `AGENTS.md`;
2. re-read relevant canonical `## Hard rules`;
3. inspect current diff;
4. search again for any newly introduced capability;
5. verify owner/dependency/scope still match the plan.

`grill-me` is not repeated mechanically every 6 calls if it is interactive; rerun it after a **material plan/refactor/architecture change**.

## 4. Local `AGENTS.md` is required at architectural boundaries

Create it **before implementation** for new:

```text
apps/*
packages/*
games/*
services/*
tools/*
```

and deeper subsystems with their own public API, authoritative state, schema, runtime lifecycle, dependency boundary, or materially different tests/rules.

Do not create one for every leaf folder.

Local file target: **<= 120 lines**. Include only scope, ownership/contracts, required reuse, dependencies, refactor restrictions, tests, and canonical-doc links.

See `docs/engineering/agent-context.md`.

## 5. No floating domain literals

Domain-significant strings/numbers must live in cohesive typed domain registries/config objects — **not inline and not as orphan local constants**.

Bad:

```ts
emit("fishing.caught");
const MIN_CATCH_DISTANCE = 2.5;
```

Good:

```ts
emit(fishingEvents.caught);
distance <= fishingDistances.minCatchDistanceMeters;
schedule(fn, fishingTimers.pickupAnimationMs);
```

Applies to gameplay tuning/timers/distances/probabilities, event/action/moment IDs, game/component/system IDs, asset/route/protocol/storage IDs, feature flags, permissions, analytics IDs, and other domain/boundary values.

Structural literals such as `array[0]`, simple `+ 1`, mathematical identities, and explicit test fixtures are narrow exceptions.

`const` by default; `let` only for intentional reassignment; never `var`.

See `docs/engineering/code-standards.md`.

## 6. Gameplay / ECS invariants

- ECS is the gameplay composition model.
- Components are small data-only state/schema.
- Systems own behaviour.
- Shared systems never branch on concrete `gameId`.
- UI/presentation is not an authoritative gameplay store.
- One state value has one canonical owner; derived state is computed.
- Deterministic simulation does not directly access uncontrolled time/random/network/storage/analytics/DOM.
- Server-authoritative data remains server-authoritative.

See `docs/architecture/runtime-and-ecs.md`.

## 7. Components, hooks, helpers

UI components primarily render/compose/bind explicit actions.

Reconsider ownership when a component has >3 related local states, boolean workflow soup, coordinated effects/subscriptions/async lifecycle, substantial transformation logic, or reusable behaviour.

Extract a **coherent** hook/controller/service/helper; do not create mega-hooks merely to reduce file length.

Before creating any helper/hook/system/service/schema/capability, search by semantics and reuse/extend existing ownership when it matches.

A second equivalent occurrence requires an explicit reuse decision. A third equivalent implementation without an architecture exception is unacceptable.

See `docs/architecture/capabilities-and-reuse.md`.

## 8. Refactoring is controlled work

Before non-trivial refactoring read `docs/engineering/refactoring.md`.

- no opportunistic cleanup outside task scope;
- preserve behaviour with tests before risky structural rewrites;
- do not create generic abstractions from one speculative use case;
- shared/public refactors require explicit impact/migration review;
- remove obsolete paths after migration;
- material refactor expansion requires plan refresh + `grill-me`/adversarial review.

## 9. Dependency / state boundaries

- one game never imports another game;
- shared packages never import concrete games;
- simulation never depends on presentation;
- circular dependencies are defects;
- mutually exclusive boolean soup becomes an explicit state model;
- public/shared API or persistence/network schema changes are architecture-significant.

## 10. Acceptance

A change is not complete until applicable gates pass:

1. requested behaviour;
2. relevant tests;
3. format/lint/typecheck;
4. dependency/architecture/dead-code/`slop-guard` checks when available;
5. no duplicate capability;
6. no floating domain literal/orphan domain constant;
7. docs/local `AGENTS.md` updated when ownership/contracts changed;
8. final diff contains no unrelated work;
9. independent reviewer agent inspects the actual diff and returns `PASS`.

Working code may be rejected for wrong architecture.

See `docs/engineering/change-acceptance.md`.

## Final invariant

> **Make the smallest correct change that fits existing ownership, reuses existing capabilities, is mechanically checkable, and leaves the repository easier for the next agent to understand.**
