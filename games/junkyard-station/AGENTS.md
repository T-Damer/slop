# Junkyard Station agent rules

Junkyard Station is the reference consumer of `games/shared/world-kit`.

- `runtime/definition.ts` owns this game's resources, stations, declarative effects, labels, icons, and world layout.
- `runtime/presentation/**` owns junkyard-specific geometry, HUD, prompts, feedback, and lifecycle projection.
- Movement, proximity, costs, rewards, cooldowns, and interaction progress remain in the shared world-kit domain.
- Use original project-authored geometry and copy. Do not reproduce proprietary assets, branding, level layout, or UI from reference games.
- Every station must declare whether it is automatic or prompted. The player should understand the interaction before its reward is applied.
- The first loop must remain playable with keyboard and touch without menus: collect, process, serve, upgrade.
