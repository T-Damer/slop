# Billiards crown controls and cue cosmetics — 2026-09-06

Base: `0ec2205528e6319b9062077dee9171cea60f48d8` (`feature/core-traffic`).

## Implementation

- Relative pointer power, independent wheel targets with pixel/line/page normalization, keyboard preservation, interaction guards, abort-based disposal.
- Crown surface lighting/ridge masking, explanatory captions/tooltips, restrained detent click with 25 ms voice limiter.
- Three project-authored cue designs; route-local cosmetic state, picker previews, confirmation/cancel semantics and both aiming/strike rendering.
- Russian pocket bowls expanded behind unchanged narrow mouths. Rubber/jaws render after bowls, so the hole cannot paint over its entrance. Existing centred/offset collision tests remain unchanged and pass.
- Existing dimmed player backgrounds and ivory Russian object balls preserved. Russian remains an 8-ball geometry preset, not implemented pyramid rules.

## Validation

`npm run check:source` passed before and after the changes (after: 156 passing tests, 7 skipped; architecture, code, change-contract, asset provenance and controls checks passed). Four new tests cover relative grabs, independent wheel input, disabled/cancelled/disposed controls, and cue isolation.

The production Modoki dependency tree is absent from the downloaded source snapshot, and network downloads from the local container are unavailable. A standalone browser component harness was prepared but Chromium refused its local HTTP URL with `ERR_BLOCKED_BY_ADMINISTRATOR`; no successful browser/visual validation or complete strict typecheck is claimed. CI must validate the exact committed source and unchanged bundle ratchets before publication. No budget limits were changed.

## Remaining

Collision/cue/cushion/pocket recordings have NOT been replaced: only mechanical UI detents changed. A CC0 candidate was identified (Yoo-toob-FX, https://directory.audio/sound-effects/sports/184-billiard-balls-hit), but its binary could not be downloaded or auditioned here. Do not describe synthetic collision voices as real recordings.

Do not publish stable until production build, browser contracts and the original byte limits pass for the exact candidate.
