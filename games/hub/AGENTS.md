# Hub agent rules

Read the root `AGENTS.md` first.

- The hub router is the only owner of `game` query routing and browser history.
- The root route mounts `games/island-hub`; it must never regress to a static card-only launcher.
- Island portals and game-menu entries call the existing router rather than implementing navigation themselves.
- Direct routes for Parking Jam, Junkyard Station, and external playables remain independently addressable.
- External playables use a local launch screen and must not embed or copy third-party code or assets.
