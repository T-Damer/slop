# Game hub agent rules

- The hub owns catalog, routing, and child-game lifecycle only.
- Game state stays inside each game. The hub may not infer gameplay progress.
- Preserve direct links and existing query parameters when practical.
- Game cards use original lightweight artwork and remain at least 44×44 px on every supported viewport.
- A child game must unmount completely before another game mounts.
