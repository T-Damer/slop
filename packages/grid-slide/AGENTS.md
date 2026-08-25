# AGENTS.md

## Scope
Owns pure grid occupancy and axis-locked movement validation. No game goals, rendering, input, networking, or Traffic-specific rules.

## Rules
- Geometry is deterministic and allocation-conscious.
- Pieces are plain data; movement functions own behavior.
- Validate every intermediate cell, not only the destination.
- Domain values and errors come from `registry.ts`.
- Do not add a special case for a concrete game or vehicle type.
- Add regression tests through a consuming game when semantics change.
