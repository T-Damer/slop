# AI generation policy

This is the detailed contract referenced by the short root `AGENTS.md`.

## Before generation

Every non-trivial task updates `quality/active-change.json` with the problem, semantic owner, inspected existing capabilities, reuse decision, non-goals, and measurable acceptance checks.

Use this order:

> **search → reuse → extend → compose → create**

A new capability is rejected when an existing owner can be extended without changing its meaning.

## Code gates

- Gameplay decisions have one pure TypeScript owner.
- Presentation may project state and play semantic events; it may not infer authoritative results.
- New source files are limited by `quality/quality-contract.json`.
- Existing oversized files are listed in `quality/debt.json`; their byte ceiling cannot increase.
- Generic junk-drawer owners such as `constants.ts`, `utils.ts`, and `helpers.ts` are forbidden.
- Suppression comments and `as any` are forbidden. A real typed boundary or a narrow runtime validator is required.
- Domain strings and tuning values live in cohesive registries owned by their domain.
- New dependencies require an explicit architecture decision and must not duplicate existing capability.

## Asset gates

Every generated or imported asset has a recipe in `quality/assets` containing provenance, license, generator identity, source hash, coordinate contract, required nodes, runtime use, output hash, and budgets.

A preview image is not evidence of validity. CI validates the actual GLB structure, bounds, identifiers, external references, triangles, materials, meshes, bytes, and deterministic regeneration.

Blender, Blender MCP, procedural generators, and external AI services all produce the same recipe-compatible output.

## UI and game-feel gates

UI changes are tested as interactions, not only screenshots. CI must boot the real web build, detect browser errors, exercise canvas input, hint and shuffle controls, and validate required layouts.

The approved visual direction is recorded in `quality/visual-target.md`. Decorative objects may not cover the interaction area. Gameplay must dominate the viewport.

## Waivers

A waiver must be named, scoped to one file or metric, justified, assigned to an owner, and have an expiry date. Silent exceptions are forbidden.
