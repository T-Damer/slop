# Refactoring policy

## Hard rules

1. Refactoring is a scoped engineering task, not background cleanup.
2. Search and understand the existing capability/callers before changing its shape.
3. Do not mix broad structural cleanup with behavioural changes unless separation is impossible and documented.
4. Preserve behaviour with tests before a risky structural rewrite.
5. Do not introduce an abstraction for one speculative use case.
6. A local task may not silently redesign shared runtime/API/schema.
7. Do not copy an implementation during migration and leave two active paths without an explicit, temporary migration plan.
8. When a refactor materially expands beyond the approved plan, stop, refresh context, and run `grill-me`/adversarial plan review again.
9. Delete obsolete paths after migration; do not leave compatibility debris “just in case”.
10. A refactor is accepted only when the resulting ownership and reuse are simpler, not merely when files are shorter.

## Refactor decision test

Before refactoring, answer:

```text
PROBLEM
What concrete architecture/maintenance defect exists?

EVIDENCE
Where is duplication, invalid ownership, excessive coupling, or impossible extension visible?

EXISTING CAPABILITY
What existing abstraction was inspected and why can it not be reused/extended as-is?

TARGET OWNER
Which module/system should own the behaviour after the change?

BEHAVIOUR
What must remain unchanged?

MIGRATION
Which callers/data/contracts move, in what order?

VALIDATION
Which tests prove behaviour and architecture after the change?

NON-GOALS
What nearby cleanup is intentionally not part of this refactor?
```

If these cannot be answered, the refactor is not ready.

## Refactoring triggers

Reasonable triggers include:

- same semantic behaviour has appeared independently more than once;
- canonical state has multiple owners;
- a dependency direction is violated;
- adding a required feature is impossible without bypassing an existing abstraction;
- a component/system has accumulated multiple unrelated responsibilities;
- a public contract no longer represents actual semantics;
- tests cannot isolate behaviour because responsibilities are coupled.

Weak triggers include:

- “this file looks old”;
- “I prefer another pattern”;
- “we can make it more generic”;
- “AI would write it differently today”;
- an unrelated task happens to touch nearby code.

## Reuse before abstraction

Use this sequence:

```text
existing capability fits
→ reuse

existing capability owns semantics but lacks one case
→ extend deliberately

second truly shared occurrence
→ candidate abstraction; review semantics

third equivalent implementation
→ shared abstraction is normally required
```

Never extract a universal framework from one implementation just because future games *might* need it.

## Behavioural vs structural changes

Prefer separate conceptual phases:

```text
1. tests establish current/required behaviour
2. structural refactor with behaviour preserved
3. requested behaviour change
4. cleanup obsolete migration path
```

These phases may be in one task/diff when small, but the reviewer must be able to distinguish them.

Avoid simultaneously:

- renaming everything;
- moving directories;
- changing public APIs;
- changing behaviour;
- replacing dependencies;
- rewriting tests.

That makes regressions and agent review unnecessarily hard.

## Shared code escalation

A refactor touching `engine`, `game-sdk`, platform contracts, persistence/network schemas, or another shared boundary must explicitly document:

- affected consumers;
- compatibility impact;
- migration order;
- rollback/recovery approach where relevant;
- contract tests;
- whether an ADR is required.

Game-local inconvenience is not sufficient justification for contaminating shared code with `gameId` branches or special cases.

## UI refactoring

When a UI component becomes complex, do not blindly split JSX into many files.

First identify the responsibility causing complexity:

- workflow state → focused hook/controller/state machine;
- reusable transformation → pure helper;
- domain command orchestration → service/controller;
- repeated presentation → child component;
- server/gameplay state → move to canonical owner rather than another hook.

A smaller component with a 300-line mega-hook is not an improvement.

## ECS refactoring

When moving gameplay behaviour:

- components remain data-only;
- systems declare ownership/reads/writes according to runtime rules;
- do not duplicate ECS state into UI/application state for convenience;
- prefer component composition over game-specific branches in shared systems;
- deterministic behaviour remains deterministic;
- replay/network semantics must remain explicit.

## Migration debt

Temporary dual paths require all of:

- explicit reason;
- documented owner;
- removal condition;
- tests covering the migration boundary;
- no new callers added to the deprecated path.

Unbounded “temporary compatibility” is architecture debt and should fail review.

## Refactor completion checklist

Before handoff:

- inspect the complete diff;
- confirm requested behaviour still passes;
- confirm no new duplicate capability exists;
- search for old names/imports/callers;
- remove dead exports/files;
- confirm local `AGENTS.md` and canonical docs still match ownership;
- verify the abstraction has a smaller, clearer API than the code it replaced;
- confirm no unrelated cleanup entered the diff;
- obtain independent reviewer approval.
