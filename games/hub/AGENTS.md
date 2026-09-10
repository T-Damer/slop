# Hub agent rules

Read the root `AGENTS.md` first.

- The typed hub router is the only owner of `game` query routing and browser history.
- The root route mounts `games/island-hub`; it must never regress to a static or parallel launcher.
- Island portals and game-menu entries call the existing router rather than implementing navigation themselves.
- A game is available only when one typed id has a catalog entry, lazy loader, direct-route test, build output, and browser evidence.
- Current direct routes are Pocket Club, Parking Jam, and Junkyard Station. A route is playable only while its source, domain tests, production build, bundle budget, and browser contract remain green.
- Keep game modules lazy: opening the island must not eagerly execute a child game's presentation.
