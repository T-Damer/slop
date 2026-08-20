# Documentation index

This documentation is written for an AI-swarm codebase. Agents should not load every document for every task; they should always read the root [`AGENTS.md`](../AGENTS.md), then follow the route below for the smallest relevant context.

## Mandatory for every code change

1. [`../AGENTS.md`](../AGENTS.md)
2. [`engineering/agent-workflow.md`](./engineering/agent-workflow.md)
3. the architecture/product document relevant to the task
4. [`engineering/change-acceptance.md`](./engineering/change-acceptance.md) before declaring completion

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

## Architecture

### [`architecture/runtime-and-ecs.md`](./architecture/runtime-and-ecs.md)

Read when changing:

- gameplay state;
- components;
- systems;
- entities;
- deterministic simulation;
- presentation/simulation ownership;
- networking boundaries.

### [`architecture/capabilities-and-reuse.md`](./architecture/capabilities-and-reuse.md)

Read before:

- creating a new helper/hook/system/service;
- moving code into shared packages;
- implementing similar behaviour in a second game;
- changing a shared primitive.

## Engineering

### [`engineering/code-standards.md`](./engineering/code-standards.md)

Read when writing or reviewing TypeScript/UI code. Defines constants, state ownership, hooks, helpers, component complexity, typing, naming, and failure-handling rules.

### [`engineering/agent-workflow.md`](./engineering/agent-workflow.md)

Defines the task lifecycle, mandatory preflight, swarm roles, scope ownership, handoff format, and review sequence.

### [`engineering/change-acceptance.md`](./engineering/change-acceptance.md)

Defines when a change is allowed to be accepted and what evidence the implementation/reviewer must produce.

### [`engineering/architecture-guard.md`](./engineering/architecture-guard.md)

Defines the machine-enforced checks we intend to build: Biome/custom lint, dependency boundaries, dead-code detection, domain-specific AST rules, duplication/capability checks, and CI gates.

## How to change documentation

Documentation is part of the architecture contract.

When code and documentation disagree:

- do not silently choose the code;
- determine whether code is violating the contract or the contract is intentionally changing;
- update both in the same change when the contract changes;
- shared architecture changes should be explicitly called out for reviewer attention.

## Documentation design rules

To keep agent context efficient:

- root documents contain invariants, not tutorials;
- subsystem details stay in subsystem documents;
- avoid repeating the same rule in multiple places unless the root file needs a short hard-rule summary;
- link to the canonical rule instead of copying it;
- use examples for ambiguous constraints;
- prefer machine-checkable statements over subjective style advice;
- mark aspirational future tooling clearly so agents do not assume it already exists.
