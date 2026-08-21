# Agent workflow

## Hard rules

1. No implementation before root + local instructions, scoped docs, repository search, ownership analysis, and acceptance criteria are known.
2. Implementation agents work inside declared paths/contracts and do not silently expand shared architecture.
3. Search/reuse comes before creating helpers/hooks/systems/services/schemas.
4. Context is refreshed at least every 6 tool calls during implementation.
5. `grill-me` is required when available before non-trivial features/refactors/architecture changes and after material plan expansion.
6. Shared runtime/API/schema changes are escalated explicitly.
7. Tests are part of implementation, not deferred cleanup.
8. The final diff is independently reviewed against task + rules before acceptance.

## 1. Roles

### Orchestrator

Owns task decomposition, scope, dependency ordering, agent/file ownership, handoffs, and architecture escalation.

It should not implement every task itself.

### Implementation agent

Owns a narrow task and tests inside declared paths/contracts.

It must not redesign shared APIs/runtime to make local work convenient.

### Reviewer agent

Independently reviews the final diff against:

- requirements;
- applicable `AGENTS.md` chain;
- canonical docs;
- refactor/reuse rules;
- test/check evidence.

Working code may still be rejected for architecture violations.

## 2. Mandatory lifecycle

```text
read instructions
→ inspect/search
→ identify owners/boundaries
→ define acceptance/scope
→ adversarial plan review
→ implement
→ context checkpoints
→ tests/checks
→ self-review diff
→ independent review
→ accept
```

## 3. Preflight

Before editing:

1. read root `AGENTS.md`;
2. discover/read all local `AGENTS.md` files applying to target paths;
3. read the smallest relevant canonical docs from `docs/README.md`;
4. inspect branch/worktree/current diff and preserve unrelated work;
5. search intended names + semantic synonyms + neighbouring tests/callers;
6. identify canonical state/behaviour owner;
7. identify dependency layers and public/shared contracts touched;
8. define observable acceptance conditions;
9. declare allowed paths and explicit non-goals;
10. decide whether this contains/refers to a refactor;
11. for non-trivial feature/refactor/shared changes, run `grill-me` when available or an explicit adversarial plan review when unavailable.

## 4. Task packet

Prefer a compact task packet:

```text
GOAL
Observable outcome.

RULES / DOCS
Applicable local AGENTS + canonical docs.

ALLOWED PATHS
Write scope.

OWNERSHIP
Canonical state/behaviour owner.

REUSE
Existing capabilities to use/search first.

CONTRACTS
Inputs/outputs/events/schemas/APIs.

ACCEPTANCE
Tests/behaviour/checks required.

FORBIDDEN / NON-GOALS
Changes explicitly outside scope.
```

## 5. Context checkpoint

Perform one **no later than every 6 tool calls** during active implementation and immediately when:

- creating a reusable concept;
- crossing a subsystem/package boundary;
- touching shared code;
- beginning a refactor;
- failed tests force design changes;
- scope/ownership changes;
- preparing final handoff.

Checkpoint:

```text
1. Re-read closest local AGENTS.md.
2. Re-read relevant ## Hard rules section.
3. Inspect current diff.
4. Search again for any new helper/hook/system/service concept.
5. Confirm state owner and dependency direction.
6. Confirm diff still matches task packet/non-goals.
7. Update plan before continuing if anything drifted.
```

Do not satisfy the checkpoint from memory.

## 6. `grill-me` gate

When supported by the active harness, use `grill-me` before implementation for:

- non-trivial features;
- new shared capabilities;
- architecture decisions;
- API/schema changes;
- non-trivial refactors.

Run it again only when the plan materially changes or a broader refactor appears.

The fixed 6-call checkpoint is intentionally **not** another interactive `grill-me`: routine work should not repeatedly stop for user questioning.

If the skill is unavailable, adversarially answer:

- could an existing capability already solve this?
- is this the correct owner/layer?
- is there a smaller change?
- what assumption is most likely wrong?
- does this create a second source of truth?
- what could make the proposed abstraction/refactor unnecessary?
- what failure/edge case disproves the plan?

## 7. Search protocol

Search by both names and semantics.

For “player holds fish”, search concepts such as:

```text
carry
carrier
carryable
pickup
held item
attach
inventory
```

Also inspect neighbouring imports/exports/tests.

A plan that says “create X” without evidence that X does not already exist is incomplete.

## 8. Local instructions and new boundaries

When work creates a new architectural boundary, create its local `AGENTS.md` **before implementation files** according to `agent-context.md`.

If ownership/dependencies/tests of an existing subsystem change, update its local instructions in the same task.

Do not create instruction files for arbitrary leaf folders.

## 9. Implementation discipline

During implementation:

- remain inside declared scope;
- use canonical registries/config rather than raw domain literals/local constants;
- reuse existing capabilities;
- preserve dependency/state ownership;
- update tests with behaviour;
- do not leave temporary duplicate paths;
- do not fix unrelated defects unless blocking;
- if an assumption becomes false, revise the plan before expanding the patch.

## 10. Shared code escalation

If local work unexpectedly requires changing shared runtime/SDK/contracts/schema, stop and report:

```text
MISSING/WRONG CAPABILITY
Why current abstraction is insufficient.

PROPOSED OWNER/CONTRACT
What should change and where.

CONSUMERS
What existing code is affected.

COMPATIBILITY / MIGRATION
What can break and how it moves.

TESTS
How contract behaviour is proven.
```

A dedicated architecture/runtime task/agent may be required before local work continues.

## 11. Refactor gate

Any non-trivial refactor must follow `refactoring.md`.

Do not hide a refactor inside “while I am here” cleanup.

When behavioural work exposes architecture debt, either:

- perform a scoped, reviewed refactor required for the task; or
- record it separately and keep the current task narrow.

## 12. Parallel work

Prefer disjoint write ownership.

Example:

```text
Agent A → games/fishing/**
Agent B → platform/activity/**
Agent C → integration tests
```

If multiple agents require one shared file, sequence/coordinate the edits. Do not resolve conflicts by blindly choosing one agent's whole file.

## 13. Stop conditions

Stop/escalate instead of improvising when:

- requirement conflicts with documented architecture;
- shared/public contract must change unexpectedly;
- a new dependency becomes necessary outside plan;
- two state owners appear unavoidable;
- migration/backward compatibility is required but unspecified;
- another agent owns required paths;
- security/privacy implications appear unexpectedly.

## 14. Self-review and handoff

Inspect the **actual final diff**.

Confirm:

- all changed files belong to task;
- no floating domain literals/local orphan constants;
- no duplicate capability;
- state ownership remains singular;
- no game-specific branch entered shared code;
- types/boundaries were not weakened;
- tests cover meaningful behaviour/edges;
- obsolete migration code is removed;
- local instructions/docs still match ownership.

Handoff:

```text
SUMMARY
What changed.

ARCHITECTURE / REUSE
Owners/capabilities used or changed.

TESTS / CHECKS
Exact commands/checks and results.

SCOPE
Important paths touched.

RISKS / FOLLOW-UPS
Known limitations only.
```

Never claim a check ran when it did not.

## 15. Reviewer workflow

Reviewer:

1. reads task + applicable instruction chain;
2. reads relevant hard rules;
3. inspects final diff;
4. searches for duplicates when new concepts appeared;
5. verifies ownership/dependency/refactor rules;
6. checks test evidence and missing cases;
7. checks unrelated changes;
8. returns `PASS` or `REQUEST CHANGES` with concrete contract violations.

## 16. Swarm invariant

Every task should leave the repository easier for the next agent to reason about.

Local simplicity that creates hidden global complexity is failure.
