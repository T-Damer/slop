# Quality system

`quality-contract.json` is the machine-readable source of truth for code, asset, runtime, performance, and UI ratchets.

- `active-change.json` describes the current task boundary.
- `debt.json` records temporary ceilings for legacy prototype files. Ceilings may decrease, never increase without explicit review.
- `assets/*.asset.json` contains validated source-asset recipes.
- `ui-contract.json` describes the six-viewport Parking Jam browser contract.
- `experience-ui-contract.json` describes the shared hub and cross-game Junkyard Station journey.
- `generation-policy.md` is the detailed AI-generation contract.
- `visual-target.md` records the human visual direction.
- `architecture/model.json` owns complete TypeScript module coverage, static and dynamic dependency edges, cycle detection, and workflow source-write policy.

Generated reports are written to `quality-artifacts/` and uploaded by CI. `npm run ui:quality` runs the Parking Jam interaction suite; hub and Junkyard Station contracts have dedicated commands in the main CI workflow.
