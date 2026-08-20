# Architecture Decision Records

Architecture decisions that materially constrain future agents belong here.

Use ADRs for decisions such as:

- selecting/replacing the game runtime or engine;
- choosing the server authority model;
- changing ECS/component semantics;
- introducing a shared persistence/network schema;
- adding a major dependency/platform;
- changing dependency boundaries;
- changing the game module contract;
- intentionally accepting a significant architecture exception.

Do **not** create ADRs for routine implementation details.

## Status vocabulary

- `Proposed`
- `Accepted`
- `Superseded`
- `Rejected`

## Naming

```text
NNNN-short-decision-name.md
```

Example:

```text
0001-client-runtime.md
0002-authoritative-game-server.md
```

## Rule for agents

Before making an architecture-significant change, search this directory for existing decisions.

An implementation agent must not silently contradict an accepted ADR. If the decision genuinely needs to change, propose a new ADR that supersedes the old one and make the contract change explicit.

Use [`_template.md`](./_template.md).
