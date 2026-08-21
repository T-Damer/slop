# Architecture Guard

## Hard rules

1. Important architecture rules must become machine-enforced; prose alone is insufficient for an AI-written codebase.
2. Use generic tools for syntax/dependencies/dead code and a small TypeScript-aware `slop-guard` only for domain rules generic tools cannot express.
3. Domain literals must resolve through approved typed registries/config objects; naming a local constant is not sufficient.
4. Architectural boundaries that require local instructions must contain `AGENTS.md`.
5. Guard failures may be suppressed only by explicit narrow architecture exceptions.
6. Do not build a new programming language or an excessively clever validator.

Tooling described here is planned until its configuration/scripts exist in the repository.

## 1. Intended guard stack

```text
Biome / formatter / generic lint
        ↓
structural/custom lint
        ↓
dependency graph validation
        ↓
dead-code / unused-export validation
        ↓
slop-guard (AST + repository metadata)
        ↓
tests + typecheck
        ↓
independent reviewer
```

Candidate tools:

- Biome for format/lint and structural rules where practical;
- dependency-cruiser or equivalent for dependency graph invariants;
- Knip or equivalent for dead code/unused exports/dependencies;
- project-owned `slop-guard` for ECS/domain/instruction rules.

Tool choice can change through an ADR; rule semantics should remain stable.

## 2. Guard design principles

Rules should be:

- deterministic;
- fast enough to run locally;
- explicit about the violated contract;
- linked to canonical docs;
- conservative where semantics are uncertain;
- difficult to silence accidentally.

Warnings are appropriate for heuristic complexity checks. Architecture ownership/dependency/identifier violations should become hard failures once detection is reliable.

## 3. Dependency rules

### `SLOP001` — cross-game import

A game implementation imports another game implementation.

```text
games/fishing → games/pool
```

Move genuinely shared semantics to an approved shared capability or keep implementations independent.

### `SLOP002` — shared package imports concrete game

Shared runtime/SDK/platform code cannot depend on concrete game implementations.

### `SLOP003` — simulation imports presentation

Authoritative/deterministic simulation cannot depend on UI/rendering/browser presentation.

### `SLOP004` — dependency cycle

Architectural/package dependency cycles are failures unless an explicitly approved generated/tooling case exists.

## 4. Determinism / side-effect rules

### `SLOP010` — forbidden simulation side effect

Simulation directly accesses uncontrolled APIs such as:

```text
Date.now
performance.now
Math.random
fetch
WebSocket
localStorage
IndexedDB
DOM APIs
analytics/payment SDKs
```

Use controlled runtime adapters/context.

### `SLOP011` — raw gameplay randomness

Gameplay-affecting randomness bypasses the controlled RNG owner.

### `SLOP012` — raw gameplay timer

Authoritative simulation uses raw `setTimeout`/`setInterval`/wall clock instead of the controlled time/scheduler contract.

## 5. ECS rules

### `SLOP020` — behaviour inside ECS component

A gameplay component owns behavioural/side-effectful methods rather than data/schema.

Schema constructors/serialization helpers may be allowed when they do not become domain behaviour.

### `SLOP021` — undeclared system access

A system reads/writes a component outside its declared contract once runtime metadata permits reliable static validation.

### `SLOP022` — shared system branches on game identity

Shared runtime compares/switches on concrete `gameId` to implement game-specific behaviour.

Composition/configuration/game-local systems are required instead.

## 6. Domain literal / registry rules

### `SLOP030` — raw domain string

A domain-significant string appears inline instead of through its canonical registry/config object.

Target categories include:

```text
event/action/moment IDs
network messages
game/component/system IDs
asset IDs
route IDs
storage/cache keys
permissions
feature flags
analytics IDs
```

Bad:

```ts
emit("fishing.caught");
```

Expected:

```ts
emit(fishingEvents.caught);
```

### `SLOP031` — raw domain number

A gameplay/product/protocol numeric literal appears directly in an implementation context.

Bad:

```ts
if (distance <= 2.5) { ... }
setTimeout(fn, 300);
```

Expected:

```ts
if (distance <= fishingDistances.minCatchDistanceMeters) { ... }
schedule(fn, fishingTimers.pickupAnimationMs);
```

The rule must distinguish narrow structural values such as array index `0`, simple increment `1`, mathematical identities, and explicit test fixtures.

### `SLOP032` — orphan domain constant

A domain literal was extracted only into a standalone local/module constant rather than a cohesive owned registry/config.

Bad:

```ts
const MIN_CATCH_DISTANCE = 2.5;
const FISH_CAUGHT = "fishing.caught";
```

Expected:

```ts
fishingDistances.minCatchDistanceMeters
fishingEvents.caught
```

Detection can begin with naming/context heuristics and become stricter after project layout stabilizes.

### `SLOP033` — generic constants junk drawer

A module accumulates unrelated domain constants under generic ownership such as repository-wide `constants.ts`.

This may begin as a reviewer warning because file naming alone is not enough to prove bad ownership.

## 7. UI/state rules

### `SLOP040` — boolean workflow soup

Several related booleans appear to represent mutually exclusive workflow states.

Initially warning/review-level.

### `SLOP041` — component orchestration complexity

A UI component coordinates excessive local state/effects/subscriptions without a focused owner.

Initial signal:

```text
> 3 related state hooks → review
```

Do not hard-fail on raw hook count alone until false-positive behaviour is known.

### `SLOP042` — complexity budget

Review signals:

```text
function > 40 lines
file > 250 lines
nesting > 3
cyclomatic complexity > 8
```

Hard review thresholds may be higher. Generated files are exempt.

These are not automatic instructions to split code.

## 8. Reuse/refactor rules

### `SLOP050` — duplicate capability candidate

New helper/hook/system/service appears semantically equivalent to an existing capability.

Whole-repository semantic detection will be imperfect; start with metadata/naming/registries and reviewer tooling rather than pretending AST similarity proves semantic duplication.

### `SLOP051` — third equivalent implementation

When capability metadata/registry explicitly records two equivalent implementations, creation of another without an exception should hard-fail.

### `SLOP052` — active deprecated migration path receives new callers

After a refactor marks an API/path deprecated for migration, new callers may not depend on it.

### `SLOP053` — game-specific special case in shared layer

Shared code contains a game-specific branch/config escape hatch that belongs in game-local composition.

This overlaps `SLOP022` but can apply outside ECS systems.

## 9. Local instruction rules

### `SLOP070` — missing local `AGENTS.md`

A configured architectural boundary is created without its required local instruction file.

Initial boundary patterns:

```text
apps/*
packages/*
games/*
services/*
tools/*
```

Deeper boundaries can opt in through repository metadata/config when they own public APIs/state/schema/runtime rules.

### `SLOP071` — oversized local instructions

Local `AGENTS.md` exceeds the configured agent-context budget without an exception.

Initial target: <= 120 lines.

This is a context-quality guard, not prose style policing.

### `SLOP072` — local rule attempts to relax root invariant

Full semantic detection is difficult. Start with prohibited override/suppression syntax and reviewer validation; do not claim machine certainty where none exists.

## 10. Suppression policy

Never use blanket disables to make CI green.

A narrow architecture exception must contain:

```text
rule ID
reason
scope
owner/follow-up
removal/expiry condition when practical
```

Example shape:

```ts
// slop-allow SLOP012
// reason: external tournament clock adapter boundary
// issue: ARCH-182
// remove: after ClockAdapter migration
```

Suppressions themselves are scanned. Unknown/untracked suppression syntax should fail.

### `SLOP060` — untracked suppression

A lint/type/guard disable is introduced without an approved narrow exception format.

## 11. Implementation order

Do not attempt the entire guard at once.

Recommended bootstrap:

### Phase 1

- strict TypeScript;
- Biome format/lint;
- dependency graph rules;
- Knip/dead-code checks;
- local `AGENTS.md` boundary existence check;
- grep/AST rules for obvious raw domain strings and raw timer/random APIs.

### Phase 2

- `slop-guard` AST skeleton;
- registry-aware `SLOP030`/`031`/`032`;
- ECS component/system metadata validation;
- suppression scanner.

### Phase 3

- capability registry integration;
- refactor/deprecation checks;
- context/instruction metadata checks;
- heuristics promoted from warning to failure only after false positives are measured.

## 12. Guard output

Errors should tell the agent what owner to use, not only say “wrong”.

Good:

```text
SLOP031 games/fishing/systems/catch.system.ts:42
Raw gameplay distance `2.5` is not allowed.
Use a value from the fishing domain configuration, e.g. `fishingDistances.*`,
or add the value to that canonical registry if it is genuinely new.
See: docs/engineering/code-standards.md#2-domain-literals-must-have-typed-owners
```

This makes CI part of the swarm's navigation system.

## 13. Final principle

Enforce ownership and boundaries, not arbitrary aesthetics.

The guard exists to prevent agents from solving local tasks by creating hidden global complexity.
