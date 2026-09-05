# Personal Island Hub

The default SLOP world. New players meet Lumi, choose typed preferences, watch the deterministic generator reveal the world in stages, and arrive on a locally persisted personal island.

## Live routes

- Personal island: `https://t-damer.github.io/slop/`
- Restart onboarding: `https://t-damer.github.io/slop/?onboarding=1&resetIsland=1`
- QA world: `https://t-damer.github.io/slop/?qa=1`

## Current vertical slice

- seven preference questions with typed emoji chips;
- stable seed and versioned `IslandBlueprint`;
- local repository behind the `IslandRepository` contract;
- low-poly Three.js terrain, house, vegetation, rocks, flowers, guide, player and animal;
- animated ocean and shore;
- keyboard and touch-joystick movement;
- cozy, standard and overview camera modes;
- in-world portals and an accessible game menu for Parking Jam and Junkyard Station.

The present scene uses project-authored procedural geometry so that the root-route fix has no network asset dependency. Curated CC0 models can replace individual visual factories later without changing the domain generator, repository or routing contracts.
