# Parking Jam agent rules

Read the root `AGENTS.md`, `quality/generation-policy.md`, and `quality/visual-target.md` first.

- `runtime/domain/rules.ts` is the public command facade and owns release validation, state completion, and jam projection.
- `runtime/domain/board.ts` owns cells, occupancy, exit paths, blockers, and pickup-bay availability.
- `runtime/domain/queue.ts` owns passenger matching, boarding, departures, score, coins, and combo transitions.
- `runtime/domain/events.ts` owns semantic event defaults; presentation must not invent domain outcomes.
- `runtime/domain/solver.ts` owns validation and deterministic search. Cache stable level indexes outside recursive hot paths.
- Domain code remains pure and immutable at its public boundary; mutable working copies may not escape a transition.
- Reuse one occupancy/index structure per query instead of rebuilding it for every candidate.
- `runtime/presentation/**` renders state and animates events; it may not reimplement rule decisions.
- Keep the mobile view dense and game-first: no dashboard, landing-page, or glass-card UI.
- Cars and people must remain recognizable 3D objects at mobile scale.
- Decoration may not enter the camera-safe interaction volume.
- Passenger boarding, car departure, score feedback, and jam feedback are acceptance requirements.
- New levels pass bounds, overlap, passenger-capacity, solver, determinism, diversity, and wrong-order jam tests.
- Generated assets require a recipe, provenance, reproducibility, GLB validation, budgets, and browser evidence.
- Files in `quality/debt.json` cannot grow; split an owner before adding behavior to it.
