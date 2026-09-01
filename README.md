# Slop

Slop is an AI-oriented browser game platform built around a personal island, small testable game domains, and interchangeable presentation/runtime adapters.

## Current playable routes

- **Personal Island** — the default experience, with first-run onboarding, deterministic island generation, movement, camera modes, and physical game portals.
- **Parking Jam** — a 3D parking and passenger-group puzzle at `?game=parking-jam`.
- **Junkyard Station** — a joystick-first proximity-interaction tycoon slice at `?game=junkyard-station`.

GitHub Pages: **https://t-damer.github.io/slop/**

Billiards is currently a design contract under `games/billiards`; it is not registered, built, tested, or deployed yet.

## Architecture

```text
pure shared and game domains
        ↓
focused presentation adapters
        ↓
typed lazy game registry + personal island
        ↓
thin Modoki entrypoints
        ↓
verified browser artifact
```

The repository enforces strict TypeScript, complete architecture ownership (including dynamic imports), deterministic domain tests, code-size debt ratchets, asset provenance, bundle budgets, multi-viewport browser contracts, and read-only source workflows.

See `architecture/review-2026-09.md` for the latest architecture and optimization review.

## Intellectual-property boundary

External games may be used as behavioral and visual references. Slop does not import proprietary game code, models, textures, audio, branding, or authored levels.
