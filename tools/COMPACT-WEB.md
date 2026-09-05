# Static SLOP web build

Use the pinned Modoki checkout and the same normal production command as CI.
After dependencies and source checks, run `node tools/prepare-web-engine.mjs`
from the SLOP root, then the engine's `npm run build -- --target web` with
`MODOKI_PROJECT` pointing to `games/traffic-jam`. All three workflows use this
same preparation step. The engine source in the upstream repository is unchanged.

The small hash-checked dependency patch removes only the eager import of
`engine/app/sharedRegistry.ts`. That registry exports the entire runtime namespace
for downloaded Modoki OTA subgames and prevents tree-shaking of otherwise unused
runtime exports. SLOP's existing router imports its authored local game modules
normally; it does not use the remote-subgame namespace. The engine entry, bootstrap,
strict typechecks, Vite configuration, asset processing and renderers are retained.
An unexpected engine revision, modified entry, debug build or explicit `ota`
configuration is a hard error. To add Modoki OTA, remove this preparation step,
restore the upstream entry and measure the full profile again.

Pocket Club CSS is authored as normal CSS and imported by its lazy game entry.
Vite performs CSS minification and loads the stylesheet before the entry mounts.
The cascade/import order is identical to the former template strings; no visual
rules or game behavior were removed. Generic smoke/dust selectors and the reduced
motion scroll rule are now scoped to Pocket Club, preventing cross-route leakage.
Unlike the former style element the loaded stylesheet remains cached after leaving
this route, so navigating back does not fetch it again.

The existing client ratchet measures its JavaScript chunk. The extracted CSS is
still counted by the base and TOTAL raw/gzip/Brotli budgets; it is not free bytes
and is not excluded from the report. No limit in `quality-contract.json` changes.
Do not delete emitted files blindly, fake fingerprints, or bypass a failed gate.
The full production browser suites and two-client Colyseus test remain required.
