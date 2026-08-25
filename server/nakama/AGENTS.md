# AGENTS.md

## Scope
Owns the Nakama adapter: authenticated RPCs, storage transactions, participant access, and history paging. Pure rules stay in shared packages/game domains.

## Rules
- Nakama is transport/storage, never the canonical game-rule owner.
- Snapshot, immutable events, and command receipt are written together with optimistic versions.
- Event/receipt create-only conflicts are not ignored.
- Never discard or overwrite accepted history.
- Client input is untrusted and validated at the boundary.
- Identifiers, permissions, limits, and messages come from `registry.ts`.
- Keep the bundled runtime compatible with Nakama's JavaScript environment.
