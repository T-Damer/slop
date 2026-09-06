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
