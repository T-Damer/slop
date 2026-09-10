# Proximity world domain

This is the reusable pure TypeScript base for character-driven Slop games.

A game supplies world bounds, movement speed, interaction positions, radii, durations, repeatability, cooldowns, and initial statuses. The base returns immutable world state plus semantic events. It has no Three.js, DOM, storage, time, or game-specific rewards.

Game domains may translate `proximity.interaction-completed` into their own rewards and progression. Presentations may animate movement and actions, but they may not duplicate progress or completion decisions.
