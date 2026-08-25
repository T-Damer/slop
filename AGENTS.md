# AGENTS.md

Mandatory contract for every agent that plans, edits, reviews, or accepts work in `slop`.

## Before editing

1. Read this file and every nearer `AGENTS.md` for the target paths.
2. Read only the relevant canonical document routed from `docs/README.md`.
3. Inspect branch, diff, and unrelated work.
4. Search the repository by concept, synonyms, events, schemas, tests, and callers.
5. Search the web/package registries for maintained reusable solutions before writing a new subsystem.
6. Identify the canonical state owner, dependency direction, scope, non-goals, and acceptance checks.
7. For non-trivial features/refactors, run `grill-me` when available; otherwise perform an adversarial plan review.

Default order:

> **search → reuse → extend → create**

## While working

At least every 6 tool calls, and whenever scope/ownership/refactoring changes:

- re-read the nearest `AGENTS.md` and relevant `## Hard rules`;
- inspect the actual diff;
- search again for newly introduced concepts;
- verify ownership, dependencies, and scope;
- rerun `grill-me` after a material plan or architecture change.

## Hard code rules

- `const` by default; `let` only for intentional reassignment; never `var`.
- Domain strings/numbers never float inline or as one-off local constants.
- Put domain values in cohesive typed owners such as `trafficEvents.moved`,
  `trafficDistances.exitCells`, or `trafficTimers.moveAnimationMs`.
- Registry/config files own definitions; implementation files only reference them.
- One state value has one canonical owner; derive rather than mirror.
- ECS components are small data-only records; systems own behavior.
- UI renders/composes. Move workflows, subscriptions, async orchestration, and
  related state into focused hooks/controllers/services/systems.
- Before adding a helper, component, system, service, schema, event, or dependency,
  prove that an equivalent capability does not already exist.
- Do not copy-paste variants. Extend or compose the semantic owner.
- Shared code never branches on a concrete game ID.
- Deterministic rules never access uncontrolled time, randomness, network,
  storage, analytics, or DOM APIs.
- A working patch may be rejected for wrong ownership or architecture.

Full rules:
`docs/engineering/code-standards.md`,
`docs/engineering/refactoring.md`,
`docs/architecture/runtime-and-ecs.md`,
`docs/architecture/capabilities-and-reuse.md`.

## Repository flow

- Maximum branches: **5 total**.
- Permanent branches: `main` and `stable`.
- Maximum feature branches: **3**.
- Maximum open PRs: **3**.
- Feature branches must own disjoint path/responsibility zones. Overlap means one
  larger feature branch, not parallel branches.
- `main` is reviewed code. `stable` is the only automatic publish/deploy source.
- Do not create a branch or PR without checking `.slop/repository-policy.json`.

## Boundaries

A local `AGENTS.md` is required before implementation in every new
`addons/*`, `packages/*`, `games/*`, `server/*`, `services/*`, or `tools/*`
architectural root. Keep it short and subsystem-specific.

Dependency direction:

```text
games/adapters → reusable packages/addons → contracts
server adapters → turn engine/game rules → contracts
```

Games never import other games. Presentation never owns authoritative rules.

## Acceptance

A change is complete only when applicable gates pass:

1. requested behavior and edge cases;
2. generated contracts are current;
3. tests, typecheck, guard, and Godot conformance;
4. no duplicate capability or floating domain literal;
5. history/replay contracts remain lossless;
6. docs/local instructions remain truthful;
7. final diff is scoped;
8. an independent reviewer inspects the actual diff and returns `PASS`.

Never claim a check was run when it was not.
