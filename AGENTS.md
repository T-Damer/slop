# AGENTS.md

Mandatory entry point for every agent that plans, edits, reviews, or accepts work in this repository.

`slop` is intentionally optimized for AI-swarm development. A change is acceptable only when it works **and** preserves the system for the next agent.

## 1. Rule hierarchy

For every file you may touch, read rules in this order:

1. this root `AGENTS.md` — always applies;
2. every ancestor/local `AGENTS.md` from repository root to the target directory;
3. the task-specific canonical documents linked by those files and `docs/README.md`;
4. accepted ADRs when the task touches an architectural decision.

Local `AGENTS.md` files may **tighten or specialize** root rules. They may not silently relax them. A relaxation requires an explicit architecture decision and an update to the canonical rule.

## 2. Mandatory preflight — no code before this

Before the first code edit:

1. read this file;
2. discover and read the complete applicable `AGENTS.md` chain;
3. read only the relevant task/domain documents from `docs/README.md`;
4. inspect branch/worktree/current diff and preserve unrelated work;
5. search for the requested capability, synonyms, helpers, hooks, systems, registries, schemas, tests, and call sites;
6. identify canonical state/behaviour ownership and dependency layers;
7. write expected behaviour, scope, and acceptance criteria;
8. determine whether the task is a refactor or changes shared contracts/runtime/schema;
9. for non-trivial features, refactors, or architecture changes, run the `grill-me` skill when the active harness provides it; if unavailable, perform the same adversarial plan review explicitly before implementation.

Default order:

> **search → reuse → extend → create**

## 3. Context refresh loop

Agents must not rely on a rule read hundreds of tokens ago.

During active implementation, perform a context checkpoint **at least every 6 tool calls**, and immediately when any of these occurs:

- task scope expands;
- a new helper/hook/system/service is about to be introduced;
- work crosses a package/subsystem boundary;
- shared runtime/API/schema is about to change;
- a refactor becomes necessary;
- failed tests invalidate the current plan;
- before final handoff/review.

At a checkpoint:

1. re-read the closest applicable local `AGENTS.md`;
2. re-read the hard-rule section of the relevant canonical document;
3. inspect the current diff;
4. search again before introducing a new reusable concept;
5. verify that state ownership, dependency direction, and task scope have not drifted;
6. revise the plan before continuing if they have.

The 6-call checkpoint is intentionally lightweight and non-interactive. `grill-me` is required at the start of non-trivial/refactor work and again after a **material plan/architecture change**, not mechanically every 6 calls when doing so would repeatedly interrupt the user.

## 4. Local `AGENTS.md` files are mandatory architectural boundaries

Create a local `AGENTS.md` **before implementation** when creating a new boundary such as:

- `apps/*`;
- `packages/*`;
- `games/*`;
- `services/*`;
- `tools/*`;
- a subsystem with its own public API;
- a subsystem owning authoritative state;
- a subsystem owning network/persistence schemas;
- a subsystem with materially different dependency/test/runtime rules.

Do not create one in every tiny folder. Create them where ownership or rules change.

Local files should be short (target **<= 120 lines**) and contain only:

- scope/purpose;
- owned state/contracts;
- allowed/forbidden dependencies;
- capabilities that must be reused;
- local refactor restrictions;
- tests/checks required;
- links to canonical docs.

Do not copy the root handbook into child folders.

See `docs/engineering/agent-context.md`.

## 5. No floating domain strings or numbers

A meaningful domain literal must have a stable typed owner. It must not live inline **or as an ad-hoc local constant beside the code that uses it**.

Bad:

```ts
emit("fishing.caught");
const MIN_CATCH_DISTANCE = 2.5;
setTimeout(runPickupAnimation, 300);
```

Good:

```ts
emit(fishingEvents.caught);

if (distance <= fishingDistances.minCatchDistanceMeters) {
  // ...
}

schedule(runPickupAnimation, fishingTimers.pickupAnimationMs);
```

Canonical domain values belong in cohesive typed registries/config objects, for example:

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

This applies to gameplay tuning, timers, distances, probabilities, event/action/moment IDs, game/component/system IDs, asset IDs, routes, protocol messages, storage keys, feature flags, permissions, analytics IDs, and other domain-significant literals.

Use `const` by default and `let` only for intentional reassignment.

Structural literals (`array[0]`, `count += 1`, mathematical identities, explicit test fixtures) are narrow exceptions. Do not use the exception to hide gameplay/product values.

See `docs/engineering/code-standards.md`.

## 6. ECS is the gameplay model

Gameplay follows `docs/architecture/runtime-and-ecs.md`.

Hard rules:

- components are small data-only state;
- systems own behaviour;
- behaviour is composed from components/capabilities;
- shared systems do not branch on a specific `gameId`;
- UI is not an alternative authoritative gameplay store;
- presentation may read state/events but does not own simulation rules;
- deterministic simulation does not directly access wall-clock time, uncontrolled randomness, network, storage, analytics, or DOM APIs.

## 7. UI/components stay simple

UI/framework components primarily compose presentation and bind explicit actions.

Extract a focused hook/controller/service when a component starts owning a workflow, related effects, async orchestration, significant transformations, or multiple related state values.

Review triggers include:

- more than 3 related local state values;
- several booleans representing mutually exclusive states;
- effects coordinating multiple states;
- non-trivial async lifecycle/subscriptions;
- reusable behaviour.

Do not move complexity into a mega-hook just to reduce file length.

## 8. Reuse is mandatory

Before creating a helper, hook, system, service, schema, event, or capability:

1. search by name and semantics;
2. inspect the capability/reuse docs;
3. reuse when semantics match;
4. extend deliberately when the abstraction owns the behaviour;
5. create only when genuinely new.

Copying an existing implementation and changing a few lines is a defect.

A second independent occurrence must trigger an explicit reuse decision. A third equivalent implementation without an architecture exception is unacceptable.

## 9. Refactoring is controlled work

Read `docs/engineering/refactoring.md` before any non-trivial refactor.

Hard rules:

- no opportunistic refactor outside task scope;
- do not mix broad cleanup with behavioural changes;
- do not create an abstraction from one speculative use case;
- prove existing capability/search results before adding another abstraction;
- shared/public refactors require architecture impact review;
- preserve behaviour with tests before structural rewrites;
- if the refactor expands materially, update the plan and run `grill-me`/adversarial review again before continuing.

## 10. State and dependency invariants

- one piece of state has one canonical owner;
- derived state is computed, not synchronized as a second source of truth;
- mutually exclusive boolean soup becomes a tagged union/state machine;
- one game never imports another game;
- shared packages never import game implementations;
- simulation never depends on presentation;
- circular dependencies are defects;
- public/shared contract changes are explicit architecture changes.

## 11. Testing and acceptance

Behaviour changes require evidence. Bugs require regression coverage when practical. Shared capabilities require contract tests.

A change is not complete until applicable checks pass:

1. requested behaviour;
2. tests;
3. formatting/lint;
4. type checking;
5. architecture/dependency guard;
6. dead-code/unused-export checks;
7. no duplicate capability;
8. no floating domain literals;
9. docs/local `AGENTS.md` updated when ownership/contracts changed;
10. final diff contains no unrelated changes;
11. an independent reviewer agent reviews the diff against task + rules.

The reviewer may reject code that works but violates architecture.

## 12. Final invariant

Never optimize for “make this task pass” at the expense of the system.

Optimize for:

> **the smallest correct change that fits existing ownership, reuses existing capabilities, is mechanically checkable, and is easier for the next agent to understand.**
