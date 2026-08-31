# Slop

Slop is an AI-oriented browser game platform built around small, testable game domains and interchangeable presentation/runtime adapters.

## Live games

- **Personal Island** — the default root experience, with first-run onboarding, deterministic island generation, movement, camera modes, and physical game portals.
- **Pocket Club** — an original polished 3D billiards game with aiming, power, trajectory preview, auto-aim assistance, ball rotation, pockets, scoring, and touch controls.
- **Parking Jam** — a 3D parking and passenger-group puzzle.
- **Junkyard Station** — a joystick-first proximity-interaction tycoon vertical slice.

GitHub Pages: **https://t-damer.github.io/slop/**

Direct Pocket Club route: **https://t-damer.github.io/slop/?game=billiards**

## Architecture

```text
pure game domains
        ↓
game-specific presentation adapters
        ↓
shared hub router and personal island
        ↓
Modoki web build
        ↓
GitHub Pages
```

The repository enforces strict TypeScript, architecture boundaries, deterministic domain tests, code-size ratchets, asset provenance, bundle budgets, and multi-viewport browser contracts.

## Intellectual-property boundary

External games may be used as behavioral and visual references. Slop does not import proprietary game code, models, textures, audio, branding, or authored levels. Pocket Club uses an original narrow billiards physics implementation and original procedural presentation.
