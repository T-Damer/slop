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
- Gameplay rules are pure TypeScript and never depend on Modoki, Three.js, DOM, storage, network, or wall-clock APIs.
- Presentation consumes state and semantic events. It does not decide whether a move, score, queue transition, or completion is valid.
- Domain strings and tuning numbers belong to cohesive typed registries/config objects. Do not replace a floating literal with an orphan local constant.
- `const` by default; `let` only for intentional reassignment; never `var`.
- Do not copy-paste variants. Extend or compose the existing semantic owner.
- Shared code never branches on a concrete game identifier.
- Generated code and assets pass the same tests, budgets, provenance, rendered smoke checks, and visual review as human output.
- Runtime code stays compact. Development-only AI, MCP, validation, and asset tooling never ships in the game bundle.
- A working patch can be rejected for incorrect ownership, duplication, weak game feel, or architectural drift.

## Current architecture

- `games/traffic-jam/runtime/domain/**` owns parking rules, passengers, scoring, jam detection, and solver behavior.
- `games/traffic-jam/runtime/presentation/**` owns the 3D scene, procedural models, minimal HUD, input, and animation.
- `games/traffic-jam/runtime/setup.ts` is the thin Modoki lifecycle adapter.
- `architecture/model.json` is the machine-readable module contract.
- `architecture/current.mmd` shows the implemented graph.
- `architecture/target.mmd` shows the intended graph.

## Product presentation

- Gameplay must dominate the screen.
- Do not generate dashboard, landing-page, glassmorphism, oversized title-card, or generic AI-demo UI.
- A car game must show recognizable cars and spatial context, not rounded rectangles standing in for vehicles.
- Every core action needs satisfying visual feedback and a visible reward consequence.

## Repository flow

- Maximum five branches total: `main`, `stable`, and up to three disjoint `feature/*` branches.
- Maximum three open pull requests.
- `main` contains reviewed code. `stable` is the only automatic Pages publication source.
- Feature branches must own disjoint responsibility zones. Overlap means one larger branch.

## Acceptance

A change is complete only when all applicable checks pass:

1. domain tests and edge cases;
2. architecture drift check;
3. real Modoki production web build;
4. no duplicate rules or floating domain values;
5. rendered mobile Chrome smoke with screenshot evidence;
6. human or independent visual review against the target reference;
7. final diff remains scoped;
8. an independent reviewer reads the actual diff.

Never claim a check was run when it was not.
