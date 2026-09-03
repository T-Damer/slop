# Pocket Club

Pocket Club is SLOP's clean-room, mobile-first 8-ball implementation.

## Runtime

- `runtime/domain` owns deterministic table state, continuous collision detection, fixed-step simulation, shot preview, spin, fouls, groups, turn changes, and eight-ball outcomes.
- `runtime/presentation` mounts SolidJS controls around a Canvas 2D table. A software sphere mapper gives every ball stable room lighting and rolls its stripe, number patch, and cue-ball mark from actual planar displacement.
- Presentation also owns the billiard-room backdrop, player/potted-ball HUD, vertical power and direction controls, circular spin control, impact glints, and synthesized Web Audio feedback. None of those layers decide physics or scoring.
- `runtime/network` provides a local fallback and a lazy Colyseus client. Add `?billiardsServer=https://host.example` to attempt an online room connection.
- `protocol/billiards.proto` is the stable transport-neutral contract. The initial Colyseus adapter mirrors these fields while using Colyseus messages on the wire.

## Controls

Move the pointer over the table to aim, drag the left cue meter for power, drag the right meter for direction, and drag the cue-ball control to apply side spin or follow/draw. Click the table to place the cue ball after a foul. Press **Space** or the shot button to shoot. Keyboard aiming uses **A/D** or left/right; power uses **W/S** or up/down. The speaker button mutes or restores collision audio.

## Verification

```bash
node --experimental-strip-types --test games/billiards/tests/*.test.ts
npm run check
npm run billiards:quality -- http://127.0.0.1:4173/slop/
```

The browser contract requires visible side controls, fourteen player ball slots, the spherical-roll renderer, a deterministic break, and every supported viewport. The game is available through the Personal Island and directly at `?game=billiards`.
