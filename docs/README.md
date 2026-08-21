# Documentation index

This repository is documented for AI-swarm work. **Do not load the whole documentation tree.** Start with root/local `AGENTS.md` files and open only the canonical documents required for the current task.

## Mandatory context for a code change

1. root [`../AGENTS.md`](../AGENTS.md);
2. every applicable local `AGENTS.md` on the target path;
3. the smallest task-specific documents below;
4. [`engineering/change-acceptance.md`](./engineering/change-acceptance.md) before final handoff.

For multi-agent, non-trivial, or long-running implementation work also read [`engineering/agent-workflow.md`](./engineering/agent-workflow.md).

At recurring context checkpoints, re-read the relevant **`## Hard rules`** sections and closest local `AGENTS.md`; do not reread every reference document from the top.

## Context / agent behaviour

### [`engineering/agent-context.md`](./engineering/agent-context.md)

Read when:

- creating a new package/game/service/tool/subsystem boundary;
- creating/updating local `AGENTS.md`;
- orchestrating a long agent task;
- deciding what documentation must be refreshed during implementation.

Defines the 6-tool-call context checkpoint and `grill-me` policy.

### [`engineering/agent-workflow.md`](./engineering/agent-workflow.md)

Read for swarm task lifecycle, task packets, parallel ownership, shared-code escalation, handoff, and independent review.

## Product

### [`product/vision-and-social-loops.md`](./product/vision-and-social-loops.md)

Read when changing:

- game/session flows;
- retention behaviour;
- presence;
- spectators;
- chat/activity integration;
- notifications;
- achievements/social moments;
- monetization surfaces;
- join/rejoin behaviour.

## Games

### [`games/README.md`](./games/README.md)

Read before implementing a new game or changing a game's contract. Every substantial game should have a canonical specification based on [`games/_template.md`](./games/_template.md).

## Architecture

### [`architecture/runtime-and-ecs.md`](./architecture/runtime-and-ecs.md)

Read when changing gameplay state, ECS components/systems, deterministic simulation, presentation ownership, or networking boundaries.

### [`architecture/capabilities-and-reuse.md`](./architecture/capabilities-and-reuse.md)

Read before creating/replacing a helper, hook, system, service, shared capability, or cross-game primitive.

## Engineering

### [`engineering/code-standards.md`](./engineering/code-standards.md)

Read when writing/reviewing TypeScript/UI code. Especially authoritative for typed domain registries/config, state ownership, hooks/components, helpers, and boundary side effects.

### [`engineering/refactoring.md`](./engineering/refactoring.md)

**Mandatory before non-trivial refactoring.** Defines refactor evidence, scope, migration, reuse, shared-code escalation, and completion checks.

### [`engineering/change-acceptance.md`](./engineering/change-acceptance.md)

Read before declaring completion. Defines acceptance evidence and reviewer gates.

### [`engineering/architecture-guard.md`](./engineering/architecture-guard.md)

Read when implementing/changing CI, lint, dependency rules, `slop-guard`, typed registry enforcement, or local `AGENTS.md` enforcement.

## Architecture decisions

### [`decisions/README.md`](./decisions/README.md)

Read before an architecture-significant change. Existing accepted decisions must not be silently contradicted. Use [`decisions/_template.md`](./decisions/_template.md) when a new ADR is required.

## Documentation contract

When code and documentation disagree:

- do not silently choose the code;
- determine whether code violates the contract or the contract is intentionally changing;
- update code + canonical docs/local instructions together when ownership/behaviour changes;
- architecture changes require explicit reviewer attention/ADR where applicable.

## Documentation size rules

Agent-facing documentation must optimize for repeated reading:

- mandatory rules go first under `## Hard rules`;
- local `AGENTS.md` target <= 120 lines;
- root/local files contain invariants, not tutorials;
- long rationale/history belongs below hard rules or in reference docs;
- link to canonical rules instead of duplicating them;
- prefer machine-checkable statements;
- mark planned tooling as planned until it exists.
