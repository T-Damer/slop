# Runtime dependencies

`slop-engine` uses the official Godot client for Nakama. The SDK is pinned to an exact upstream commit, synchronized into the ignored `addons/com.heroiclabs.nakama/` directory, and included in engine release artifacts together with its Apache-2.0 license and provenance metadata.

```bash
npm run runtime:sync
npm run runtime:check
```

Do not edit the synchronized directory. Change the pin in `.slop/runtime-dependencies.json`, re-run synchronization, then validate Godot import, conformance, web export, and runtime size.
