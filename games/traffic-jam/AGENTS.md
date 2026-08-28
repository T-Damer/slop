# Parking Jam agent rules

Read the root `AGENTS.md`, `quality/generation-policy.md`, and `quality/visual-target.md` first.

- `runtime/domain/**` is the sole owner of parking, pickup-bay, passenger, score, combo, and jam rules.
- `runtime/presentation/**` may render state and animate domain events; it may not reimplement rule decisions.
- Keep the mobile view dense and game-first: no dashboard, landing-page, or glass-card UI.
- Cars and people must remain recognizable 3D objects at mobile scale.
- Decoration may not enter the camera-safe interaction volume.
- Passenger boarding, car departure, score feedback, and jam feedback are acceptance requirements.
- New levels pass bounds, overlap, passenger-capacity, solver, determinism, diversity, and wrong-order jam tests.
- Generated assets require a recipe, provenance, reproducibility, GLB validation, budgets, and browser evidence.
- Files in `quality/debt.json` cannot grow; split an owner before adding behavior to it.
