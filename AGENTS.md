# AGENTS.md

This repository builds compact games with AI agents. Human review focuses on architecture, game feel, and visual output; agents own routine implementation and verification.

## Before editing

1. Read this file and the nearest local `AGENTS.md`.
2. Read `architecture/target.mmd` and compare it with `architecture/current.mmd`.
3. Search the repository by concept and synonyms before creating anything.
4. Search maintained packages and permissive open-source implementations before writing a new subsystem.
5. Identify the canonical owner, allowed dependencies, non-goals, and acceptance checks.

Default order:

> **search → reuse → extend → compose → create**

## Hard rules

- One behavior or state value has one canonical owner.
- Gameplay rules are pure TypeScript and never depend on Modoki, DOM, rendering, storage, network, or wall-clock APIs.
- Modoki is an authoring/rendering/build adapter. It must not become a second implementation of game rules.
- Domain strings and tuning numbers belong to cohesive typed registries/config objects. Do not replace a floating literal with an orphan local constant.
- `const` by default; `let` only for intentional reassignment; never `var`.
- Do not copy-paste variants. Extend or compose the existing semantic owner.
- Shared code never branches on a concrete game identifier.
- Generated code and assets pass the same tests, budgets, provenance, and visual review as human output.
- Runtime code stays compact. Development-only AI, MCP, validation, and asset tooling never ships in the game bundle.
- A working patch can be rejected for incorrect ownership, duplication, or architectural drift.

## Current architecture

- `games/traffic-jam/runtime/domain/**` owns the Traffic Jam state and rules.
- `games/traffic-jam/runtime/ui/**` renders the domain and translates input into domain commands.
- `games/traffic-jam/runtime/setup.ts` is the thin Modoki lifecycle adapter.
- `architecture/model.json` is the machine-readable module contract.
- `architecture/current.mmd` shows the implemented module graph.
- `architecture/target.mmd` shows the intended graph. CI rejects forbidden drift.

## Modoki

- Pin the engine revision in CI; never build against an unpinned `main` branch.
- Keep each game independently buildable as a Modoki external project.
- Scene data is presentation data, not an authoritative rule store.
- Prefer structured live-state checks and deterministic domain tests over screenshot-only claims.
- Game-specific MCP tools may be added later, but they must be namespaced and disabled in release builds.

## Repository flow

- Maximum five branches total: `main`, `stable`, and up to three disjoint `feature/*` branches.
- Maximum three open pull requests.
- `main` contains reviewed code. `stable` is the only automatic Pages publication source.
- Feature branches must own disjoint responsibility zones. Overlap means one larger branch.

## Acceptance

A change is complete only when all applicable checks pass:

1. domain tests and edge cases;
2. architecture drift check;
3. Modoki production web build;
4. no duplicate rules or floating domain values;
5. mobile-sized interaction and layout review;
6. final diff remains scoped;
7. an independent reviewer reads the actual diff.

Never claim a check was run when it was not.
