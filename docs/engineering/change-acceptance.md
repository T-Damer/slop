# Change acceptance policy

## Purpose

This document defines when a change is allowed to be considered complete and accepted. It is intentionally stricter than “the feature works”.

A change must satisfy product behaviour, architecture, tests, scope discipline, and maintainability for future agents.

## 1. Acceptance principle

A patch is acceptable only when all applicable statements are true:

```text
requested behaviour is correct
AND architecture remains valid
AND state ownership remains clear
AND existing capabilities were reused where appropriate
AND tests/checks provide evidence
AND the diff is scoped
AND documentation/contracts remain truthful
AND an independent reviewer has inspected the final diff
```

Passing tests cannot override an architecture violation.

## 2. Before implementation may be accepted

The task must have a clear answer to:

- what changed?
- why is it needed?
- what is the canonical owner of the changed behaviour/state?
- which existing capabilities were searched/reused?
- what observable behaviour proves completion?
- what files/layers were intentionally changed?
- did any shared/public contract change?

If the answers changed during implementation, the final handoff must reflect the new reality.

## 3. Required automated checks

Once the toolchain exists, the default gate should include:

```text
format
lint
TypeScript typecheck
unit/system/integration tests relevant to change
architecture/dependency checks
dead-code/unused-export checks
domain architecture guard
```

The exact commands will be added here when package scripts exist.

Agents must never claim a check passed when the command was not run.

## 4. Behavioural evidence

### New behaviour

Requires tests at the lowest useful stable boundary.

Examples:

- pure calculation → unit test;
- ECS behaviour → deterministic system test;
- activity routing → domain/integration test;
- network contract → serialization/contract test;
- critical user flow → integration/e2e test where practical.

### Bug fix

Normally requires a regression test that fails before the fix and passes after it.

If a regression test is genuinely impractical, the handoff must explain why and provide alternative evidence.

### Refactor

Must preserve behaviour and should not expand public APIs or dependencies without a separate reason.

Relevant tests/checks must remain green.

### Documentation-only change

Must be internally consistent and must not claim tooling/contracts already exist when they are only planned.

## 5. Architecture gate

Reject a change if it introduces any of the following without an explicit approved architecture change:

- second authoritative source of state;
- game importing another game;
- shared runtime importing a game implementation;
- simulation importing presentation/UI;
- direct uncontrolled time/random/network/storage access from deterministic simulation;
- game-specific branches in shared capability code;
- duplicate semantic helper/hook/system/capability;
- protocol/event IDs as ad-hoc raw strings;
- circular dependency;
- public API growth solely to patch one caller;
- hidden cross-layer mutation.

## 6. Reuse gate

The implementation handoff/review must be able to explain:

- which existing concepts were searched;
- which existing capabilities were reused;
- why any new capability was necessary;
- whether similar logic exists elsewhere;
- whether a shared abstraction is premature or justified.

A reviewer should search independently when the change introduces a new shared concept.

## 7. State gate

Reject or revise when:

- state is duplicated merely for convenience;
- derived state is stored without need;
- several booleans encode a mutually exclusive workflow;
- UI owns authoritative gameplay state;
- client owns server-authoritative data without an explicit prediction/cache contract;
- persistence/network schema changes without explicit compatibility/version handling.

## 8. Component/hook gate

A UI/framework component should be reviewed when it becomes a behaviour container rather than presentation/composition.

Warning signs:

- more than 3 related local state values;
- coordinated async/effect lifecycle;
- workflow booleans;
- substantial transformation logic;
- duplicated behaviour from another component;
- direct domain/network/storage side effects.

The correct response is not automatically “extract hook”. The reviewer should identify a coherent owner: hook, service, helper, store, runtime system, or domain module.

## 9. Literal/configuration gate

Reject unexplained domain-significant magic strings/numbers.

Review new literals for:

- tunable gameplay value;
- duration/threshold/limit;
- event/command/moment ID;
- asset/game/route/storage/network identifier;
- feature/permission key;
- duplicated semantic value.

Meaningful values need named ownership in constants/configuration/typed registries.

Do not reject obvious structural literals that are clearer inline under the exceptions in `code-standards.md`.

## 10. Scope gate

The final diff must not contain unrelated modifications.

Reject or split:

- opportunistic refactors;
- formatting unrelated directories;
- dependency upgrades unrelated to the task;
- renames/moves unrelated to the requested behaviour;
- cleanup of unrelated legacy code;
- generated changes that are not required.

If unrelated work is discovered, create a separate task/issue instead of silently expanding scope.

## 11. Dependency gate

A new external dependency must have a stated reason.

Review:

- existing dependency/standard capability alternatives;
- runtime/bundle impact;
- maintenance maturity;
- license/security suitability;
- whether the dependency is excessive for the problem.

Do not accept a dependency added only because it made an implementation agent's task easier.

## 12. API/schema gate

Shared/public APIs and persisted/network schemas are high-cost changes.

Acceptance requires, as applicable:

- explicit contract update;
- consumer impact review;
- migration/backward compatibility strategy;
- contract tests;
- documentation update.

Do not silently change event payload meaning while preserving its identifier.

## 13. Cleanup gate

If the new implementation replaces an old path:

- migrate intended callers;
- delete obsolete path;
- delete unused exports/dependencies;
- update tests;
- verify dead-code tooling.

Maintaining two paths needs an explicit compatibility reason.

## 14. Performance gate

For gameplay/runtime hot paths, consider:

- per-frame allocation;
- unnecessary entity queries;
- network payload size/frequency;
- repeated expensive computation;
- rendering/mobile cost.

Do not prematurely micro-optimize ordinary application code. Performance changes should target measurable or clearly hot paths.

## 15. Security/privacy gate

Changes touching identity, chat, presence privacy, payments, network authority, user-generated content, or persistence require explicit review of trust boundaries.

Client data is not trusted for competitive/authoritative outcomes merely because it is typed.

Do not log credentials, tokens, private chat data, or unnecessary personal data.

## 16. Documentation gate

Docs must change when the change modifies:

- architecture invariants;
- component/system semantics;
- public/shared API;
- state ownership;
- game integration contract;
- agent workflow/quality rules.

Do not update docs for trivial implementation details that are better expressed by types/tests/code.

## 17. Independent review

The implementation agent cannot be the sole approver of its own change.

Reviewer output should be one of:

### PASS

Include:

- what was reviewed;
- critical checks/evidence considered;
- any non-blocking follow-ups.

### REQUEST CHANGES

Each blocking item should explain:

- concrete problem;
- violated requirement/architecture rule;
- expected correction or acceptable design direction.

Avoid vague feedback such as “clean this up”.

## 18. Merge readiness checklist

Before a change is considered merge-ready:

- [ ] Task acceptance behaviour is satisfied.
- [ ] Final diff was inspected.
- [ ] No unrelated work is present.
- [ ] Existing capabilities were searched/reused.
- [ ] No semantic duplication was introduced.
- [ ] State ownership is explicit and singular.
- [ ] ECS/layer boundaries are respected.
- [ ] Domain literals are named/configured/typed.
- [ ] Relevant tests exist and pass.
- [ ] Type/lint/architecture/dead-code checks pass when available.
- [ ] Shared API/schema changes are explicit.
- [ ] Replaced code has been cleaned up.
- [ ] Docs remain accurate.
- [ ] Independent reviewer returned PASS.

## 19. “Works” is not a waiver

The following argument is never sufficient:

> This implementation works for the current case.

The architecture exists specifically because many agents will solve many current cases. Acceptance protects the shape of the system across those tasks.
