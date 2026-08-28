# World kit agent rules

This folder is the reusable foundation for character-driven proximity games.

- `domain/**` is pure deterministic TypeScript. It owns movement, bounds, proximity, interaction progress, costs, rewards, and cooldowns.
- `presentation/**` may use Three.js and DOM. It projects domain state, collects input, follows the player, and renders feedback.
- Game-specific resources, station identities, visuals, copy, and progression live in the consuming game.
- Never add tycoon-specific rules to the shared kit unless at least two games need the exact same semantics.
- An interaction is declarative: mode, radius, duration, costs, rewards, cooldown, and movement-lock behavior.
- Tests must prove automatic and prompted interaction paths without browser or wall-clock APIs.
