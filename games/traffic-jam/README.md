# Parking Jam

A touch-first 3D parking puzzle.

- Dense isometric lot with up to 40 cars.
- Cars physically drive out, turn onto the road, and enter pickup bays.
- Low-poly passengers walk to matching cars.
- Score, coins, combo, popups, camera feedback, and completion effects.
- Limited pickup bays create a color-order jam if the player releases the wrong cars.
- Undo, reset, hint, deterministic solver, and validated generated levels.

The domain does not depend on Modoki, Three.js, DOM, storage, or time APIs. The presentation consumes domain events and does not reimplement path, queue, scoring, or completion rules.
