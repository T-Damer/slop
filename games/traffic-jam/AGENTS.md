# Parking Jam agent rules

Read the root `AGENTS.md` first.

- `runtime/domain/**` is the sole owner of parking, pickup-bay, passenger, score, combo, and jam rules.
- `runtime/presentation/**` may render state and animate domain events; it may not reimplement rule decisions.
- Keep the mobile view dense and game-first: no dashboard, landing-page, or glass-card UI.
- Cars must remain recognizable 3D vehicles, not colored boxes.
- Passenger boarding, car departure, score feedback, and jam feedback are acceptance requirements.
- New levels must pass bounds, overlap, passenger-capacity, solver, and wrong-order jam tests.
- Keep external art optional; procedural fallback assets must stay compact.
