# Personal Island Hub

The default SLOP world. New players meet the guide, choose typed preferences, watch the deterministic generator reveal the world in stages, and arrive on a locally persisted personal island.

## Live routes

- Personal island: `https://t-damer.github.io/slop/`
- Restart onboarding: `https://t-damer.github.io/slop/?onboarding=1&resetIsland=1`
- QA world: `https://t-damer.github.io/slop/?qa=1`

The island contains the player home, a guide, an animal neighbour, an activity area, animated ocean and shore, camera modes, mobile/keyboard movement, and portals to registered games.

Storage is behind `IslandRepository`. `LocalIslandRepository` is the current adapter; a future HTTP/database adapter should not change the generator or scene.

Third-party models and sounds are CC0 assets with checked provenance in `runtime/assets/manifest.json`.
