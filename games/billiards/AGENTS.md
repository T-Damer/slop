# Pocket Club agent rules

Read the root `AGENTS.md` first.

- `runtime/domain/**` is the only owner of billiards state, fixed-step physics, scoring, preview geometry, and aim assistance.
- Domain code must remain deterministic and independent of Three.js, DOM, storage, audio, network, and wall-clock APIs.
- Presentation consumes domain state and events; it must not maintain a second collision or scoring implementation.
- Keep simulation on the table plane. Three.js provides depth, lighting, shadows, cue animation, and visible rolling rotation.
- Do not copy proprietary or GPL billiards code or assets. External implementations may inform tests, equations, and design questions only after license review.
- New mechanics require domain tests and browser interaction evidence.
- Preserve pointer, touch, and keyboard operation.
- Trajectory prediction and the actual shot must use the same geometry and constants.
