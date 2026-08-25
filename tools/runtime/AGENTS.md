# AGENTS.md

## Scope

Owns deterministic synchronization of third-party runtime dependencies used by the engine package.

## Rules

- Every dependency is pinned to an immutable revision in `.slop/runtime-dependencies.json`.
- Synced source stays ignored by git and must not be edited locally.
- The distributable engine includes required licenses and provenance metadata.
- Runtime dependencies may not introduce game-specific behavior.
- Do not replace an official maintained SDK with a local protocol client without an ADR.
