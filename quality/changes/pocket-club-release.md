# Pocket Club release repair — 2026-09-06

Owner: billiards-presentation / quality-tooling.

The user explicitly approved relaxing or redistributing the route-size gate.
The expanded local game needs room for recorded audio and the club pyramid rule set.
Keep the gate and transfer unused allowance from the lazy Colyseus module:

| Metric | Local game before → after | Colyseus before → after | Total, unchanged |
| --- | --- | --- | --- |
| Raw | 90,000 → 100,000 | 230,000 → 220,000 | 4,055,000 |
| Gzip | 28,000 → 32,000 | 71,000 → 67,000 | 1,455,000 |
| Brotli | 25,000 → 28,000 | 62,000 → 59,000 | 1,237,000 |

Base limits and bundle matching are unchanged. Nothing is moved out of accounting.
The CDP client now reports method, parameters and protocol details on failure;
browser checks are not skipped and malformed inputs are not retried as success.
Actual production/browser results must be recorded by CI before publication.

Native input follow-up: record both protocol details and exact attempted arguments,
validate and normalize viewport coordinates before dispatch, and always release
touch emulation after the manual cue gesture. Pinch itself passed the first CI
viewport. The subsequent recorded-pot setup now uses range keyboard controls
instead of an obsolete absolute-position click on a relative crown.

CI follow-up: manual cue input and pinch now pass; Home/Arrow range input in the
production pot fixture reached power 1 rather than 0.35. The fixture now uses
the actual crown wheel handler with its canonical per-event cap and sensitivity,
awaiting each result and checking angle/revision remain unchanged. No QA state
mutation or injected pot replaces the real shot. Fatal per-viewport diagnostics
are retained while all six viewports are exercised; failures still fail CI.
Island held-key navigation polls at 10 ms instead of 100 ms to avoid overshooting
planned corners, and releases keys in a finally block. Gameplay is unchanged.

Run 34058991608 passed the full tablet-landscape and desktop billiards suites,
including the real pot, recorded audio and both presets. Portrait gestures
failed. Touch capability is now configured once before viewport navigation,
not disabled and re-enabled between pinch and stroke. Gesture tests wait for
observable capture/pullback/zoom instead of assuming delivery within 30–40 ms.
Failures retain the complete read-only renderer/controller snapshot.

The portrait stroke entered manual-stroke but returned to aim-locked before
the pullback. Its camera also reset to overview. The live hint could wrap
between one and two lines, resizing the stage and invoking the camera's safety
cancellation. Reserve a two-line hint box in the existing stylesheet and assert
that stage height remains stable during a native stroke. End failed native
touch sequences; do not send cancel after a successfully ended sequence.

## 2026-09-07: actual publication blocker

Stable 73475db did not deploy: Publish stable #20 failed its candidate browser
step. CI 34060657764 confirms production, types and budgets pass. Small-phone
completed touch stroke, audio, both breaks and pot feedback, but its canvas was
238.53125px wide against the unchanged 240px minimum. Later portrait viewports
failed native multiTouch capture, while both landscape devices passed.

The runner now opens and closes the existing Chromium host for each device,
without sharing emulated/native input state or saved graphics preferences.
Settings persistence is still tested by reload within every device. All six
viewports and every gameplay assertion remain required. Short portrait grid
gaps reclaim six pixels of stage height; the hint stays fixed at two lines and
primary touch targets stay 44px. Failed publication reports are now uploaded.

Local source-only validation and exact-candidate CI are recorded separately;
local Chromium cannot navigate HTTP in this environment (administrator policy),
so production browser evidence must come from the GitHub runner.
