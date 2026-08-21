# Agent context and local instructions

## Hard rules

1. Root `AGENTS.md` always applies.
2. Agents must read every applicable local `AGENTS.md` from root to each target file.
3. New architectural boundaries get a local `AGENTS.md` before implementation starts.
4. Local instructions specialize/tighten root rules; they do not silently weaken them.
5. Local `AGENTS.md` files stay short: target <= 120 lines.
6. During implementation, refresh context at least every 6 tool calls and at every scope/architecture/refactor boundary.
7. Do not load the entire documentation tree. Read the smallest canonical set required for the task.
8. Re-read rules from source at checkpoints instead of trusting memory/summaries.

## Why local `AGENTS.md` files exist

A swarm codebase needs rules close to the code they govern.

A single giant root handbook creates two failure modes:

- agents skip it because it is too large;
- agents remember global rules but miss subsystem-specific ownership/dependency details.

Local `AGENTS.md` files are lightweight contracts attached to architectural boundaries.

## Where a local file is required

Create one for every new root under:

```text
apps/*
packages/*
games/*
services/*
tools/*
```

Also create one for a deeper subsystem when it has one or more of:

- its own public API;
- authoritative state ownership;
- persistence/network schema ownership;
- a distinct runtime lifecycle;
- stricter dependency boundaries;
- special testing or determinism requirements;
- enough independent responsibility that agents can work there without understanding the parent implementation.

Do **not** create a file merely because a directory exists.

## Local file format

Use this compact structure:

```md
# AGENTS.md

## Scope
What this directory owns and what it explicitly does not own.

## Canonical docs
- links only to the documents/sections required here

## State / contracts owned here
- canonical state owners
- public schemas/events/APIs

## Required reuse
- existing capabilities agents must search/use first

## Dependency rules
Allowed and forbidden imports/layers.

## Refactor rules
Local boundaries that must not move/change without escalation.

## Tests / validation
Checks required for changes in this directory.

## Local pitfalls
Only concrete recurring traps that are not already covered by root rules.
```

Do not repeat generic TypeScript, testing, ECS, or review rules from root unless a local stricter variant exists.

## Instruction inheritance

For a file such as:

```text
games/fishing/client/ui/CatchCard.tsx
```

an agent should discover/read, when present:

```text
/AGENTS.md
/games/fishing/AGENTS.md
/games/fishing/client/AGENTS.md
/games/fishing/client/ui/AGENTS.md
```

The closest file provides the most specific instructions, but cannot erase root invariants.

If two files conflict:

1. prefer the rule that satisfies both when possible;
2. otherwise stop;
3. identify the architectural conflict;
4. change the canonical rule/ADR rather than choosing whichever rule makes implementation easier.

## Creating a new boundary

Before adding implementation files to a new architectural boundary:

1. define its responsibility;
2. define state/API ownership;
3. define dependencies;
4. identify reusable capabilities;
5. create its local `AGENTS.md`;
6. only then add implementation code.

This makes agent instructions part of subsystem creation rather than cleanup after the fact.

## Context checkpoint

A checkpoint occurs no later than every 6 tool calls during active implementation and immediately at important boundaries.

At each checkpoint:

```text
RULES
Re-read closest AGENTS.md + relevant hard-rule section.

DIFF
Inspect what has actually changed.

REUSE
If a new concept appeared, search for equivalent capability again.

OWNERSHIP
Confirm canonical state/behaviour owner is unchanged.

SCOPE
Confirm the diff still matches the task packet.

NEXT
Continue only if the current plan still fits the rules.
```

The checkpoint must use repository source as ground truth. Do not satisfy it by saying “I remember the rules”.

## `grill-me` policy

When the active agent harness provides a `grill-me` skill, use it before the first implementation edit for:

- non-trivial new features;
- new systems/capabilities;
- shared API/schema changes;
- architectural decisions;
- non-trivial refactors.

Run it again when the implementation discovers a **materially different plan** or a broader refactor than originally approved.

Do not invoke an interactive `grill-me` mechanically every 6 calls. That would turn routine context refresh into repeated user interruption. The fixed cadence is handled by the non-interactive context checkpoint above.

If `grill-me` is not available in the current harness, the agent must still perform an explicit adversarial plan review covering:

- what existing capability may already solve this;
- why the change belongs in this owner/layer;
- what can go wrong;
- what is intentionally out of scope;
- whether this creates a new source of truth;
- whether a smaller change exists;
- what would make the proposed refactor unnecessary.

## Documentation size discipline

Agent-facing documents should be optimized for repeated reading.

Rules:

- put mandatory rules first under `## Hard rules`;
- keep local instructions short;
- move explanation/history/tutorial material below the contract or into reference docs;
- link instead of duplicating rules;
- use examples only where the rule is easy to misunderstand;
- avoid narrative prose when a mechanical invariant can replace it.

A document being comprehensive is not useful if agents stop reading it.
