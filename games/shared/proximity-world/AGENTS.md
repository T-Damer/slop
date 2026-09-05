# Proximity-world agent rules

- This folder owns only reusable pure domain behavior.
- Never import Three.js, Modoki, DOM, storage, networking, wall-clock time, or a game presentation.
- Do not add game-specific currency, objectives, models, copy, or animation kinds here.
- Extend the interaction definition only when at least two games need the behavior or the abstraction remains clearly generic.
- Every state transition requires focused tests, including leaving a radius, locked states, cooldown, and repeatability.
