# Traffic Jam agent rules

Read the root `AGENTS.md` first.

- `runtime/domain/**` is the only owner of game rules and must remain platform-independent.
- `runtime/ui/**` may render domain state and issue domain operations; it may not reimplement collision, blocking, completion, or solving.
- `runtime/setup.ts` only mounts/unmounts the UI in the Modoki lifecycle.
- New levels must pass overlap, bounds, and solver tests.
- Keep the game touch-first, responsive, and playable without external assets.
- Visual constants belong to `runtime/ui/styles.ts` or `runtime/ui/registry.ts`.
- Domain identifiers and tuning belong to `runtime/domain/registry.ts` or level definitions.
