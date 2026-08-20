# Agent workflow

## Purpose

This document defines how AI agents should execute engineering work in `slop`. The goal is to make parallel/swam development predictable and to stop local task completion from degrading global architecture.

## 1. Roles

A swarm may use more roles, but the minimum conceptual separation is:

### Orchestrator

Owns:

- task decomposition;
- scope boundaries;
- ordering/dependencies;
- assigning file/subsystem ownership;
- collecting handoffs;
- deciding when architecture review is required.

The orchestrator should avoid becoming the primary implementation agent for every task.

### Implementation agent

Owns a narrow task and its tests within declared paths/contracts.

It must not silently expand shared APIs or rewrite unrelated architecture.

### Reviewer agent

Independently reviews the final diff against:

- task requirements;
- `AGENTS.md`;
- relevant architecture documents;
- test evidence;
- duplication/reuse policy.

The reviewer should not assume working code is acceptable code.

### Specialist agents

Optional examples:

- gameplay/runtime;
- networking;
- UI;
- assets;
- product/game design;
- test/verification;
- performance/security.

Specialists still follow the same preflight and acceptance rules.

## 2. Mandatory task lifecycle

Every coding task follows:

```text
inspect
→ search/reuse analysis
→ scope/contract
→ plan
→ implement
→ local checks
→ self-review
→ independent review
→ acceptance
```

Skipping directly from prompt to implementation is discouraged for non-trivial changes.

## 3. Preflight

Before editing:

1. read root `AGENTS.md`;
2. read the relevant routed docs from `docs/README.md`;
3. inspect branch/worktree/status/diff;
4. identify unrelated in-progress changes and preserve them;
5. search for existing capabilities, helpers, hooks, systems, constants, tests, and related call sites;
6. identify the canonical owner of the state/behaviour being changed;
7. identify dependency layers touched;
8. state expected behaviour/acceptance criteria;
9. decide which files/directories are in scope;
10. identify whether shared/public contracts change.

For trivial documentation-only changes, some implementation-specific steps may be not applicable, but unrelated work must still be preserved.

## 4. Task packet

Whenever the orchestrator can provide structured work to another agent, use a packet similar to:

```text
GOAL
What behaviour/outcome must exist.

CONTEXT
Why it is needed and relevant product/architecture docs.

ALLOWED PATHS
Files/directories this agent may modify.

EXISTING CAPABILITIES
Systems/hooks/helpers/contracts that should be reused.

INPUTS / OUTPUTS
Important types, commands, events, schemas, or APIs.

ACCEPTANCE
Observable tests/behaviour required.

FORBIDDEN CHANGES
Shared contracts/dependencies/refactors that are out of scope.

DEPENDENCIES
Other tasks/agents that must finish first.
```

This reduces architectural invention by implementation agents.

## 5. File/subsystem ownership during parallel work

Parallel agents should have disjoint write ownership whenever practical.

Example:

```text
Agent A → games/fishing/**
Agent B → platform/activity/**
Agent C → tests/integration/activity/**
```

If two agents need the same shared file, coordinate sequencing rather than racing edits.

Do not resolve conflicts by blindly choosing one entire version.

## 6. Shared code escalation

Changes under shared architecture/runtime packages should be treated as higher risk than local game changes.

When an implementation agent discovers that it needs to change shared code, it should report:

- missing capability;
- why composition/reuse is insufficient;
- proposed contract change;
- current consumers affected;
- migration/compatibility impact;
- tests required.

A swarm may assign that shared change to a dedicated architecture/runtime agent before the original game task continues.

## 7. Search protocol

Repository search is mandatory before creating concepts.

Search:

- intended name;
- synonyms/domain concepts;
- related event names;
- related tests;
- imports/exports of neighbouring capabilities.

Example:

A task asks for “player holds fish”. Search not only `heldFish`, but also:

```text
carry
carrier
carryable
pickup
held item
attach
inventory
```

The search result should inform the plan.

## 8. Plan quality

A useful implementation plan names:

- state owner;
- existing capability to reuse;
- files/layers to change;
- events/commands/API contract;
- test strategy;
- expected side effects.

Bad plan:

```text
1. Add feature
2. Test it
```

Good plan:

```text
1. Reuse Carrier/Carryable and extend fishing eligibility as a game-local system.
2. Add typed fishing catch configuration without modifying CarrySystem.
3. Emit canonical pickup/catch events through runtime event registry.
4. Add deterministic system tests for eligible/ineligible pickups.
```

## 9. Implementation discipline

During implementation:

- work only inside declared scope;
- reuse existing capabilities;
- preserve API/architecture boundaries;
- write/update tests with the behaviour;
- keep constants/configuration named;
- do not leave temporary duplicate paths;
- do not “fix” unrelated issues unless they block the task;
- if assumptions become false, update the plan before expanding implementation.

## 10. Stop conditions

An implementation agent should stop and escalate rather than improvise when:

- required behaviour conflicts with documented architecture;
- an existing shared capability is broken in a way outside task scope;
- a public/shared schema must change unexpectedly;
- the task requires a new dependency not previously approved by the plan;
- two sources of truth appear unavoidable;
- data migration/backward compatibility is required but unspecified;
- another agent owns the files that need modification;
- security/privacy implications appear that were not part of the task.

Stopping for architecture clarification is preferable to creating a hidden workaround.

## 11. Tests are part of implementation

Do not hand off “implementation complete, tests remaining” as a finished task unless the task packet explicitly separates those responsibilities.

Bug fixes should normally include a regression test demonstrating the previous failure.

New shared capabilities need contract tests.

## 12. Self-review before handoff

Implementation agents review their own diff, not only their memory of the change.

Check:

- every changed file belongs to the task;
- no debug code/logs remain;
- no magic domain literals were introduced;
- no duplicate helper/hook/system exists;
- state ownership is still singular;
- types were not weakened;
- shared code contains no game-specific branches;
- tests cover failure/edge cases where relevant;
- docs/contracts changed when semantics changed;
- obsolete code was removed when replaced.

## 13. Handoff format

A completed implementation handoff should be concise and evidence-based:

```text
SUMMARY
What changed.

ARCHITECTURE
What existing capabilities were reused; any new shared concepts.

TESTS / CHECKS
Exact checks run and result.

FILES / SCOPE
Important paths touched.

RISKS / FOLLOW-UPS
Known limitations or intentionally deferred work.
```

Do not claim a check passed if it was not run.

## 14. Reviewer workflow

Reviewer agent:

1. reads task packet/requirements;
2. reads applicable hard rules/docs;
3. inspects the final diff;
4. searches for duplicate/existing capabilities when new concepts were introduced;
5. evaluates state ownership/layer boundaries;
6. checks test evidence and important missing cases;
7. checks unrelated changes;
8. returns PASS or REQUEST CHANGES with concrete reasons.

Review comments should refer to violated contract/behaviour, not subjective preference.

## 15. Reviewer severity

Suggested classes:

### Blocker

- incorrect behaviour;
- architecture violation;
- duplicated authoritative state;
- unsafe data/security issue;
- breaking contract without migration;
- duplicate shared capability;
- failing required checks.

### Required

- missing test for meaningful behaviour;
- magic domain literals;
- component/hook ownership issue;
- unjustified dependency/API expansion;
- incomplete cleanup after replacement.

### Suggestion

- readability/naming improvement that does not affect correctness or architecture.

Suggestions should not create endless review churn.

## 16. Acceptance

The orchestrator/maintainer may accept only after applicable gates in `change-acceptance.md` pass.

Implementation agent approval of its own work is not sufficient.

## 17. Documentation-first architecture work

When building a new subsystem:

1. define contract/invariants in docs/types first;
2. identify ownership/dependencies;
3. implement the minimal vertical slice;
4. validate architecture with real usage;
5. generalize only when evidence exists.

Do not generate a large speculative framework before a prototype exercises it.

## 18. Swarm principle

Agents should leave the repository easier for the next agent to reason about.

A task that reduces local complexity by increasing hidden global complexity is a failed task.
