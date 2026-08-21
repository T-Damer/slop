# AGENTS.md

## Scope

Applies to everything under `docs/`.

Documentation here is an executable architecture/product contract for agents, not a prose archive.

## Canonical docs

- routing: `docs/README.md`
- agent/context rules: `docs/engineering/agent-context.md`
- acceptance: `docs/engineering/change-acceptance.md`

Read only the domain document being changed in addition to these instructions.

## Rules

- Put mandatory agent rules first under `## Hard rules` where applicable.
- Keep one canonical owner for each rule; link instead of copy-pasting the same policy into several docs.
- Root/local `AGENTS.md` files contain concise invariants, not tutorials/history.
- Local `AGENTS.md` target <= 120 lines.
- Do not describe planned tools as already implemented.
- Code examples must demonstrate the intended architecture, not simplified patterns that violate it.
- When a contract/ownership rule changes, update all directly affected routing/local instruction links in the same change.
- Use ADRs for architecture-significant decisions; do not rewrite history to make a new decision look pre-existing.
- Game specs define game-specific product/session behaviour; shared architecture docs must not accumulate game-specific branches.

## Domain literal examples

Examples must use canonical typed owners:

```ts
fishingEvents.caught
fishingDistances.minCatchDistanceMeters
fishingTimers.pickupAnimationMs
```

Do not teach agents to replace inline literals with orphan standalone constants.

## Refactoring documentation

Any document proposing a non-trivial refactor must state:

- concrete defect/evidence;
- target owner;
- behaviour preserved/changed;
- migration/consumer impact;
- validation;
- non-goals.

See `docs/engineering/refactoring.md`.

## Review

Before completing a docs change:

- verify links/paths;
- check that no new rule contradicts root/local instructions;
- check for duplicated policy text;
- check whether an ADR/local `AGENTS.md` also needs updating;
- keep the diff scoped to the requested contract change.
