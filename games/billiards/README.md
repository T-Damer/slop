# Pocket Club

Pocket Club is SLOP's clean-room, mobile-first 8-ball implementation.

## Runtime

- `runtime/domain` owns the deterministic table state, continuous collision detection, fixed-step simulation, shot preview, spin, fouls, groups, turn changes, and eight-ball outcomes.
- `runtime/presentation` mounts a SolidJS interface and draws the table through the Canvas 2D API. The current artwork is entirely procedural and can be replaced through presentation-owned renderers without changing physics.
- `runtime/network` provides a local fallback and a lazy Colyseus client. Add `?billiardsServer=https://host.example` to attempt an online room connection.
- `protocol/billiards.proto` is the stable transport-neutral contract. The initial Colyseus adapter mirrors these fields while using Colyseus messages on the wire.

## Controls

Move the pointer over the table to aim, click to place the cue ball after a foul, adjust power and spin with the controls, and press **Space** or the shot button. Keyboard aiming uses **A/D** or the arrow keys; power uses **W/S**.

## Verification

```bash
node --experimental-strip-types --test games/billiards/tests/*.test.ts
npm run check
npm run billiards:quality -- http://127.0.0.1:4173/slop/
```

The game is available through the Personal Island and directly at `?game=billiards`.
