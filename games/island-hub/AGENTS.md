# Personal Island agent rules

Read the root `AGENTS.md` first.

- `runtime/domain/**` owns preferences, seeds and `IslandBlueprint`; it must remain deterministic and platform-independent.
- `runtime/storage/**` implements `IslandRepository`; presentation code never reads or writes `localStorage` directly.
- `runtime/application/**` creates and restores versioned snapshots.
- `runtime/presentation/**` renders the blueprint and translates player input; it must not decide how many trees, rocks, animals or portals exist.
- Root navigation belongs to `games/hub/runtime/presentation/app.ts`. Do not create a second router.
- New customization fields require a snapshot migration plan before changing `schemaVersion`.
- A generated placement must be reproducible from `playerId + typed preferences` and validated inside the island boundary.
- Keep the onboarding, generator, repository, player controller, camera and game menu as separate owners.
- Preserve keyboard, touch joystick and direct `?game=` routes.
