# Personal Island expansion plan

This plan is the implementation-sized companion to `DESIGN.md` section P0-C. It keeps the persisted v1 island core intact and grows the derived exploration world around it.

## Slice A — geography and navigation (this change)

- Expand the home exploration envelope to a useful radius of at least 32 logical units.
- Author a residential street, flower meadow, dense western forest, orchard, cave approach, stone garden, pond, river cascade and southern beach.
- Add one meandering river, two authored river bridges and retain the pond bridge.
- Put three original resident cottages next to their residents; reserve every house, route, bridge, discovery and dock before procedural decoration.
- Cluster trees, bushes, flowers and rocks by district instead of distributing every prop uniformly.
- Render the same water/bridge/home geometry used by walking and footstep classification.
- Extend the notebook map with river, bridges and resident houses.
- Add one exploration request that explicitly needs the forest and cave discoveries.

Definition of done: existing saves load unchanged; all interest points are reachable across seed sweeps; water cannot be walked through except at visible bridges; no resident house can be walked through; strict types, tests, architecture, production build and unchanged byte ratchets pass.

## Slice B — inhabited neighborhood

- Make resident houses enterable with three distinct interior layouts and personalities.
- Give residents small schedule blocks: home, garden/forest, plaza, beach, sleep.
- Add door state and a simple “where is this resident?” fallback instead of duplicating NPCs.
- Add visit/home dialogue and one functional object per resident interior.

## Slice C — deeper exploration

- Make the cave a small interior region with mineral/foraging interactions and safe return point.
- Add beach fishing and shell/shore behaviors; add river fishing spots and insects in forest/meadow districts.
- Add a lightweight inventory/crafting bridge so exploration findings become furniture, gifts or collection entries rather than one-off quest tokens.

## Slice D — editable outdoors

- Reuse the home item identity/placement model for the player yard, then paths, fences and public decor.
- Protect docks, doors, bridges and required routes from edits.
- Only after outdoor placement is stable add building relocation and terrain editing.

## Parallel-work rule

Island changes stay under `games/island-hub/**` plus island-scoped quality contracts/tests. Do not change billiards source, dependency manifests, `main`, or `stable`; fast-forward the shared feature branch and preserve concurrent commits.
