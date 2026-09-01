# AGENTS.md

This repository builds compact games with AI agents. Human review focuses on architecture, game feel, and visual output; agents own routine implementation and verification.

## Before editing

1. Read this file and the nearest local `AGENTS.md`.
2. Read `architecture/target.mmd`, `quality/generation-policy.md`, and `quality/active-change.json`.
3. Search the repository by concept and synonyms before creating anything.
4. Search maintained packages and permissive open-source implementations before writing a subsystem.
5. Update the active change contract with the owner, reuse decision, non-goals, and measurable acceptance checks.

Default order:

> **search → reuse → extend → compose → create**

## Hard rules

- One behavior or state value has one canonical owner.
- Gameplay rules are pure TypeScript and never depend on Modoki, Three.js, DOM, storage, network, or wall-clock APIs.
- Presentation consumes state and semantic events. It does not decide whether a move, reward, interaction, or completion is valid.
- Cross-game mechanics belong in `games/shared/**`; game folders compose them instead of copy-pasting variants.
- Every `games/**/*.ts` source file has one owner in `architecture/model.json`; static and dynamic imports must follow declared dependencies.
- Domain strings and tuning numbers belong to cohesive typed registries/config objects. An orphan local constant is not a valid fix.
- `const` by default; `let` only for intentional reassignment; never `var`.
- Do not copy-paste variants. Extend or compose the existing semantic owner.
- Generic `constants.ts`, `utils.ts`, and `helpers.ts` owners are forbidden.
- Generated code and assets pass the same types, tests, budgets, provenance, browser interactions, and visual review as human output.
- Files listed in `quality/debt.json` may not grow. New files obey `quality/quality-contract.json`.
- Development-only AI, MCP, validation, and asset tooling never ships in the game bundle.
- GitHub workflows validate and publish; they never unpack staged source payloads, commit generated source, or push back into development branches.
- A working patch can be rejected for incorrect ownership, duplication, weak game feel, budget regression, or architectural drift.
- Recreate mechanics and interaction patterns, not proprietary source code, branding, levels, models, sounds, textures, or exact compositions.

## Current architecture

- `games/shared/proximity-world/domain/**` owns reusable movement, bounds, nearest interaction selection, progress, cooldown, and completion events.
- `games/junkyard-tycoon/runtime/domain/**` owns junkyard progression, resources, construction, fueling, payment, and objectives.
- `games/junkyard-tycoon/runtime/presentation/**` owns the tycoon 3D scene, character input, visual interactions, and HUD.
- `games/traffic-jam/runtime/domain/rules.ts` is the parking command facade; `board.ts`, `queue.ts`, `events.ts`, and `solver.ts` own their focused deterministic concerns.
- `games/traffic-jam/runtime/presentation/**` owns the Parking Jam scene, models, minimal HUD, input, and animation.
- `games/hub/runtime/presentation/**` owns game catalog, routing, and child-game lifecycle.
- `games/traffic-jam/runtime/setup.ts` is the thin Modoki lifecycle adapter for the full hub build; `games/junkyard-station/runtime/setup.ts` is the standalone Junkyard adapter.
- `games/shared/game-shell/**` owns standalone return navigation; the main hub still owns browser query routing.
- `quality/quality-contract.json` owns code, asset, runtime, and UI ratchets.
- `architecture/model.json` owns module boundaries; current and target diagrams show actual versus intended structure.

## Product presentation

- Gameplay must dominate the screen.
- Do not generate dashboard, landing-page, glassmorphism, oversized title-card, or generic AI-demo UI.
- Characters, cars, interaction props, and rewards must remain recognizable at mobile scale.
- Decoration may not cover interaction zones, movement routes, parking exits, pickup bays, or queues.
- Every core action needs physical feedback and a visible reward consequence.
- Auto-interaction worlds show what will happen, progress while the player stays nearby, and clear feedback when the action completes.
- Review visual changes against `quality/visual-target.md`.

## Repository flow

- Maximum five branches total: `main`, `stable`, and up to three disjoint `feature/*` branches.
- Maximum three open pull requests.
- `main` contains reviewed code. `stable` is the only automatic Pages publication source.
- Feature branches must own disjoint responsibility zones. Overlap means one larger branch.

## Acceptance

A change is complete only when all applicable checks pass:

1. strict TypeScript and domain tests;
2. architecture, code-size, duplicate, and change-contract gates;
3. deterministic asset reproduction and GLB recipes;
4. real Modoki production build and bundle ratchet;
5. real browser interactions across required viewports with screenshot/report evidence;
6. independent visual and code review of the actual diff.

Never claim a check was run when it was not.
