# AGENTS.md

This file is the mandatory entry point for every agent that reads, plans, edits, reviews, or merges code in this repository.

The project is intentionally designed for AI-swarm development. Correctness is not enough: a change must also preserve architecture, reuse existing capabilities, remain understandable to future agents, and pass the acceptance gates below.

## 1. Mandatory preflight before touching code

Do **not** edit code before completing this sequence.

1. Read this file completely.
2. Read [`docs/README.md`](./docs/README.md) and the documents listed there for the task type.
3. Inspect the current worktree/branch and existing diff. Never overwrite unrelated work.
4. Search the repository for the requested capability, similar systems, hooks, helpers, constants, events, schemas, and tests.
5. Check whether the change belongs in an existing capability instead of creating a new local implementation.
6. Identify the layer(s) that must change and verify the dependency direction in the architecture docs.
7. Write down the expected behaviour and acceptance conditions before implementation.
8. If the task changes a shared contract, ECS primitive, public API, dependency boundary, persistence/network schema, or cross-game behaviour, stop implementation until the architecture impact is explicit in the task plan.

The default behaviour is **search first, reuse second, extend third, create last**.

## 2. Non-negotiable engineering rules

### 2.1 No magic domain literals

Do not scatter domain-significant strings or numbers through implementation code.

Bad:

```ts
if (distance < 2.5) emit("fish.caught");
```

Preferred:

```ts
const AUTO_INTERACT_DISTANCE_METERS = 2.5;
const FISH_CAUGHT_EVENT = GAME_EVENTS.FISH_CAUGHT;

if (distance < AUTO_INTERACT_DISTANCE_METERS) {
  emit(FISH_CAUGHT_EVENT);
}
```

Rules:

- stable/tunable numeric values use named `const` values or typed configuration;
- event names, storage keys, asset IDs, route IDs, game IDs, action IDs, component IDs, and protocol message names come from typed registries/constants;
- use `let` only for values that are intentionally reassigned;
- prefer `const` by default;
- do not hide magic values inside helper calls merely to satisfy linting;
- structural literals such as array indexes, mathematical identities, test fixture values, import paths, and user-facing copy may use documented exceptions where extracting a constant would reduce clarity.

The intent is not constant spam. The intent is that meaningful behaviour can be located, named, reviewed, tuned, and reused from one place.

### 2.2 ECS is the gameplay model

Gameplay state and behaviour must follow the ECS rules in [`docs/architecture/runtime-and-ecs.md`](./docs/architecture/runtime-and-ecs.md).

Core principles:

- components are small data containers;
- systems own behaviour;
- entities gain behaviour by composition;
- shared runtime code must not branch on a specific `gameId` to implement game behaviour;
- UI components do not become alternative gameplay state stores;
- presentation reads gameplay state/events but does not own authoritative gameplay rules.

### 2.3 Components must stay simple

UI/framework components should primarily compose presentation and connect already-defined behaviour.

Extract logic when a component begins to coordinate state, effects, orchestration, transformations, or reusable behaviour.

Default review triggers:

- more than 3 related local state values;
- boolean flags that together describe one workflow/state machine;
- effects that coordinate multiple state variables;
- non-trivial async logic;
- non-trivial data transformation;
- logic reused or likely to be reused elsewhere.

Use a dedicated hook/controller/service as appropriate. Do not create a hook merely to move lines out of a file; the extracted unit must have a coherent responsibility and explicit API.

### 2.4 Helpers must be reusable and discoverable

Before creating a helper:

1. search for equivalent behaviour;
2. search the capability registry/documentation;
3. extend an existing helper if semantics match;
4. create a new helper only when the responsibility is genuinely different.

Prefer pure helpers. Keep domain-specific helpers close to their domain. Promote behaviour into shared code only when the semantics are actually shared.

Copying a helper and changing a few lines is not acceptable.

### 2.5 Do not patch around architecture

Forbidden patterns include:

- local workaround because the shared API is inconvenient;
- duplicate systems/helpers/hooks for the same capability;
- game-specific branches inside shared runtime code;
- direct network/storage/time/random calls from deterministic simulation;
- one-off event strings or protocol messages;
- introducing a second source of truth;
- adding a dependency to avoid understanding an existing subsystem;
- broad refactors unrelated to the task.

When the shared abstraction is missing, either extend it deliberately or raise an architecture change. Do not bypass it.

## 3. State rules

- one piece of state must have one owner;
- derived state should be computed, not independently stored;
- multiple booleans describing mutually exclusive states should become a tagged union/state machine;
- simulation state is not duplicated into UI state unless there is an explicit synchronization contract;
- server-authoritative state must not become client-authoritative through convenience code;
- persistent/networked state requires an explicit schema and versioning strategy.

See [`docs/engineering/code-standards.md`](./docs/engineering/code-standards.md).

## 4. Dependency and layer rules

The intended dependency direction is:

```text
games / app features
        ↓
     game-sdk
        ↓
      engine
        ↓
     contracts
```

Platform services integrate through explicit contracts/adapters.

Hard rules:

- one game cannot import another game;
- shared packages cannot import game implementations;
- simulation cannot depend on UI/presentation;
- deterministic simulation cannot access raw wall-clock time, randomness, network, storage, analytics, or DOM APIs;
- circular dependencies are defects;
- cross-layer imports require an explicit documented boundary.

## 5. Change scope rules

Every task must have a narrow declared scope.

Agents must:

- modify only files needed for the task;
- preserve unrelated user/agent changes;
- avoid opportunistic cleanup outside the task;
- avoid renames/moves unless they are part of the task or required to remove duplication;
- keep public API changes explicit;
- update docs when a contract or rule changes.

If implementation reveals a separate defect, record it separately instead of silently expanding scope unless it blocks the requested work.

## 6. Testing rules

Every behavioural change requires evidence.

At minimum:

- changed pure logic has unit tests;
- ECS systems have deterministic system tests where practical;
- bugs receive a regression test before or with the fix;
- cross-package behaviour has integration coverage;
- gameplay-critical flows should eventually support replay/simulation tests;
- tests must assert behaviour, not implementation trivia.

A change is not complete because it works once in a manual run.

## 7. Acceptance gate

An implementation agent must not mark work complete until all applicable gates pass:

1. requested behaviour is implemented;
2. relevant tests pass;
3. formatter/linter passes;
4. type checking passes;
5. architecture/dependency checks pass;
6. dead-code/unused-export checks pass;
7. no duplicated capability was introduced;
8. no unexplained magic domain literals were introduced;
9. documentation/contracts are updated when needed;
10. the diff contains no unrelated changes;
11. a reviewer agent has inspected the final diff against the task and these rules.

The reviewer must review the **diff**, not only the final runtime result.

## 8. Review policy

Implementation and review are separate roles.

The reviewer should actively look for:

- patch solutions that bypass existing abstractions;
- duplicated helpers/hooks/systems;
- new sources of truth;
- hidden magic values;
- oversized components/functions;
- invalid ECS ownership;
- dependency violations;
- missing tests;
- accidental API expansion;
- changed behaviour not represented in docs/contracts;
- code that passes tests but makes future agent work harder.

A reviewer may reject a working change if its architecture is wrong.

## 9. Architecture exceptions

Rules may occasionally need exceptions, but exceptions must be deliberate, local, documented, and removable.

Never use blanket lint disables or broad suppressions.

An exception must state:

- which rule is bypassed;
- why the normal architecture cannot be used;
- scope of the exception;
- follow-up issue/ADR when appropriate;
- expiry/removal condition where practical.

## 10. Documentation routing

Read the smallest relevant set after this file:

- Product behaviour / social flows → `docs/product/vision-and-social-loops.md`
- New game / game contract changes → `docs/games/README.md` + that game's canonical spec
- ECS / systems / simulation boundaries → `docs/architecture/runtime-and-ecs.md`
- Reuse / capability ownership → `docs/architecture/capabilities-and-reuse.md`
- TypeScript / state / hooks / constants → `docs/engineering/code-standards.md`
- Task lifecycle / swarm roles → `docs/engineering/agent-workflow.md`
- Merge/change acceptance → `docs/engineering/change-acceptance.md`
- Machine enforcement → `docs/engineering/architecture-guard.md`
- Architecture-significant decisions → `docs/decisions/README.md`

## 11. Final rule

Never optimize for “make this task pass” at the expense of the system.

Optimize for:

> the smallest correct change that fits existing architecture, increases reuse, remains easy for the next agent to understand, and can be mechanically validated.
