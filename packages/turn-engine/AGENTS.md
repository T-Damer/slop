# AGENTS.md

## Scope
Owns deterministic command/event/session/replay behavior. No transport, storage, clock, UI, or concrete game rules.

## Rules
- Functions are pure and deterministic.
- History is authoritative; snapshots are rebuildable caches.
- Commands are idempotent by command ID and guarded by expected revision.
- Participant roles and completion rules are enforced here.
- Reuse platform contracts; do not introduce game-specific branches.
- Every behavior change requires deterministic and replay tests.
