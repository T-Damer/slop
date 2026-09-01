# Billiards — planned game contract

**Status:** design and agent rules only. No billiards runtime is currently registered, built, tested, or deployed.

The intended slice is an original mobile-first 3D billiards game for SLOP. Before it can be exposed through the island or `?game=billiards`, the repository must contain:

- a deterministic planar domain for balls, cushions, pockets, scoring, prediction, and assistance;
- a presentation layer that consumes domain state without owning collision or scoring rules;
- pointer, touch, and keyboard controls;
- licensed or project-authored assets with provenance;
- domain tests, production build evidence, bundle checks, and real browser interactions across required viewports.

## Intellectual-property boundary

Any external playable is a behavioral and presentation reference only. The implementation must not copy its code, models, textures, sounds, branding, authored table, or level composition.
