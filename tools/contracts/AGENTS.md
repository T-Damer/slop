# AGENTS.md

## Scope
Owns deterministic generation of cross-runtime artifacts from canonical schemas/fixtures.

## Rules
- Generated files have one declared source and are never hand-edited.
- `--check` must be side-effect free and fail on drift.
- Generation output must be stable across machines.
- Do not generate speculative abstractions or hide business logic in templates.
