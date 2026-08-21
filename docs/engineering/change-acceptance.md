# Change acceptance policy

## Hard rules

A change is complete only when all applicable conditions hold:

```text
requested behaviour is correct
AND applicable root/local instructions were followed
AND architecture/state ownership remain valid
AND existing capabilities were reused where appropriate
AND domain literals have canonical typed owners
AND refactors satisfy refactoring policy
AND tests/checks provide evidence
AND final diff is scoped
AND docs/contracts/local AGENTS remain truthful
AND an independent reviewer inspected the final diff
```

Passing tests never waives an architecture violation.

## 1. Required evidence

The final handoff/review must answer:

- what changed and why;
- canonical owner of changed state/behaviour;
- applicable local `AGENTS.md` chain;
- existing capabilities searched/reused;
- new capabilities introduced and why they are genuinely new;
- observable acceptance behaviour;
- files/layers intentionally changed;
- shared/public/schema/refactor impact;
- exact checks actually run.

Do not claim a check ran when it did not.

## 2. Automated checks

Once implemented, the default CI/local gate should include:

```text
format
lint
TypeScript typecheck
relevant tests
dependency architecture
dead-code / unused exports
slop-guard
local AGENTS boundary check
```

Planned checks are not considered executed until the tooling exists.

## 3. Behaviour/testing gate

Use the lowest stable useful boundary:

```text
pure logic          → unit test
ECS behaviour       → deterministic system test
routing/domain flow → domain/integration test
network contract    → serialization/contract test
critical user flow  → integration/e2e where practical
```

Bug fixes normally include a regression test.

Shared capabilities require contract coverage.

A refactor must preserve behaviour with tests and satisfy `refactoring.md`.

## 4. Architecture/state gate

Reject without an explicit approved architecture change if the diff introduces:

- a second authoritative state owner;
- stored derived state without justification;
- boolean workflow soup instead of an explicit state model;
- game → another game imports;
- shared runtime → concrete game imports;
- simulation → presentation dependencies;
- uncontrolled time/random/network/storage in deterministic simulation;
- game-specific branches in shared capabilities;
- hidden cross-layer mutation;
- circular dependencies;
- public API growth solely to patch a local caller;
- schema changes without compatibility/version handling.

## 5. Domain literal gate

Reject a domain-significant string/number when it is:

- inline; or
- merely extracted into a standalone local/module constant with no canonical domain owner.

Bad:

```ts
emit("fishing.caught");
const MIN_CATCH_DISTANCE = 2.5;
```

Expected ownership:

```ts
fishingEvents.caught
fishingDistances.minCatchDistanceMeters
fishingTimers.pickupAnimationMs
```

Review applies to gameplay values, timings, thresholds, identifiers, routes, assets, protocol messages, storage keys, permissions, flags, analytics IDs, and other domain/boundary values.

Narrow structural/test-fixture exceptions follow `code-standards.md`.

## 6. Reuse/refactor gate

For a new helper/hook/system/service/capability, reviewer must be able to see:

- repository search was performed;
- existing owner/capability was considered;
- reuse/extension was rejected for a concrete semantic reason when a new concept was created.

Reject copy-paste variants.

A second equivalent occurrence requires an explicit reuse decision. A third equivalent implementation without an architecture exception is unacceptable.

For non-trivial refactors also require:

- concrete defect/evidence;
- target owner;
- preserved behaviour;
- caller/migration impact;
- validation;
- non-goals;
- obsolete path removed or a bounded migration plan.

## 7. Component/hook gate

Review UI/framework code when it becomes a workflow/state/effect orchestrator.

Signals:

- more than 3 related local states;
- several mutually exclusive boolean flags;
- coordinated async/effect/subscription lifecycle;
- significant transformation logic;
- domain/network/storage side effects;
- duplicated behaviour.

Do not automatically “extract a hook”. Identify the correct coherent owner: hook, controller, service, store, helper, runtime system, or domain module.

## 8. Scope/dependency/API gate

Reject/split unrelated:

- opportunistic refactors;
- broad formatting;
- dependency upgrades;
- renames/moves;
- legacy cleanup;
- generated changes.

New dependencies require justification against existing capabilities/platform primitives plus maintenance/license/security/runtime impact.

Shared/public APIs and network/persistence schemas require explicit contract/consumer/migration/test review.

## 9. Local instructions/documentation gate

If a change creates a new architectural boundary, its local `AGENTS.md` must exist **before acceptance** and satisfy `agent-context.md`.

If ownership/dependency/reuse/test rules of a subsystem changed, update its local instructions in the same change.

If product/architecture/game contract changed, update its canonical document/ADR when applicable.

Reject documentation that claims planned tooling already exists.

## 10. Cleanup gate

When replacing an implementation:

- migrate intended callers;
- remove obsolete path when migration completes;
- remove unused exports/dependencies;
- search old names/imports/callers;
- do not allow new callers onto a deprecated migration path.

Dual paths require a bounded compatibility reason and removal condition.

## 11. Context-discipline gate

For a non-trivial agent task, reviewer should confirm the handoff reflects the current rules/plan rather than an obsolete initial assumption.

The process expectation is:

- recurring 6-tool-call context checkpoints during implementation;
- `grill-me` when available before non-trivial/refactor/architecture work;
- another adversarial plan pass after material plan expansion.

This is primarily an orchestrator/reviewer process rule; do not fabricate logs merely to prove it happened. Prefer tool/harness automation later.

## 12. Independent review

Implementation agent is not sole approver.

Reviewer returns:

### `PASS`

State what diff/rules/evidence were reviewed and any non-blocking follow-ups.

### `REQUEST CHANGES`

Each blocker states the concrete problem, violated contract, and acceptable correction direction.

Avoid vague “clean this up”.

## 13. Merge-readiness checklist

- [ ] Requested behaviour/acceptance criteria satisfied.
- [ ] Final diff inspected; no unrelated work.
- [ ] Applicable root/local `AGENTS.md` rules satisfied.
- [ ] New architectural boundaries have local `AGENTS.md`.
- [ ] Existing capabilities searched/reused; no semantic duplicate added.
- [ ] State ownership is singular and layer/ECS boundaries are valid.
- [ ] No floating domain literals or orphan domain constants.
- [ ] Refactor policy satisfied where applicable.
- [ ] Relevant tests/checks actually pass.
- [ ] Shared API/schema changes are explicit/migrated/tested.
- [ ] Replaced/deprecated code is cleaned or bounded.
- [ ] Canonical docs/local instructions remain accurate.
- [ ] Independent reviewer returned `PASS`.

## 14. “Works” is not a waiver

> This implementation works for the current case.

is never sufficient by itself. Acceptance protects the shape of the system across many autonomous agent changes.
