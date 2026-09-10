# Pocket Club HUD stability, foul clarity and power guide — 2026-09-10

Base: 8131a975d378f194869a3d02a9a4135f53474d3b. Preserve concurrent island work; its previous change contract remains in island-world-input.json.

## Changes

- Keep player names and a fixed-height, non-wrapping, horizontally scrollable ball shelf on the same heading row. Status has one fixed line plus its full accessible text/title. The primary action keeps the same width and height when switching between a shot and placement. Scrolling the shelf must not rotate the cue or change shot power.
- Preserve the domain's 8-ball foul permissions, but include the full reason and explicit ball-in-hand award during placement and explain it in the new-match dialog. A non-scratch foul can legitimately grant placement. Reference: WPA Rules of Play, section 4.9 (https://wpapool.com/wp-content/uploads/2026/01/2026.01.02-WPA-Rules.pdf). Club pyramid is unchanged.
- Estimate the cue's free-roll guide using the actual shot speed, rolling deceleration and stop threshold. Clip it at the existing distance limit and first reachable collision. An unreachable object gets neither a contact marker nor an object guide. This is a bounded aiming estimate, not a complete rebound/stop-position simulation; actual physics is unchanged.

## Verification

Local source check: 177 passed, 7 toolchain-dependent skips, zero failures. Eight new tests cover both presets' power guides, reachable collision clipping, immutability, legal miss/pot placement rejection and each standard foul's single-use placement permission.

A local Chromium component fixture used the actual view projection, stylesheet and camera (without the Modoki bootstrap). Projecting 0/1/8/15 pocketed balls, turn changes, a long foul and placement/reset caused 0px stage/scoreboard/primary-action shift on all six required viewports. The 360x640 stage remains 385px high. This fixture is not a claim of full production validation.

The production browser contract additionally observes stage, HUD and controls throughout real play; exercises a real weak non-scratch foul and one-time placement; and checks weak/medium/strong guides with real crown wheel events. CI and deployed Pages evidence must validate the exact committed tree before claiming release success. No checks or budgets are relaxed.

## First production run follow-up

CI 34489249262 passed types, build, assets, budgets and the three other browser suites. Desktop and landscape billiards passed the new real-play HUD/guide/foul checks with 0px shift. The shortest phone needed actual dialog scrolling to reach the new-match action. Portrait tests also rounded native aim coordinates to 0.01 CSS pixels, changing the symmetric break and the following recorded pot. Preserve CDP's native floating-point coordinates, keep non-finite rejection, add round-trip regressions, and scroll/hit-test dialog controls before real mouse input. No gameplay state is injected and every outcome assertion remains blocking.

## Release verification follow-up

Run 34516189242 reproduced the pot failure on all four portrait devices; both landscape devices passed, with 0px HUD movement. The non-scratch fixture deliberately locks aim before restart, triggering portrait auto-zoom. Its fixed 100ms sleep did not guarantee that restart's overview transition finished before the next break converted world coordinates to a screen point. Replace that sleep with the existing camera-settled predicate. This changes only fixture sequencing, not game physics, native input, pot/HUD assertions or budgets. Add a regression guard against restoring a time-based delay. CI now retains the browser log even for failures before viewport reports.
