# Parking Jam

A touch-first 3D parking and passenger puzzle.

- Dense isometric lots with seeded layout variants on every shuffle.
- City and beach locations with distinct procedural surroundings.
- Cars physically drive out, turn onto the road, and enter pickup bays.
- Passenger groups of four to seven people board together instead of walking one by one.
- Group boarding adds crowd motion, particles, car punch, score, coins, combo, and camera feedback.
- One canonical color catalog drives cars, passengers, guidance, and the target overlay.
- Limited pickup bays create a color-order jam if the player releases the wrong cars.
- Undo, shuffle, hint, deterministic solver, and validation across multiple random seeds.

The domain does not depend on Modoki, Three.js, DOM, storage, or time APIs. The presentation consumes semantic domain events and does not reimplement path, queue, scoring, random layout validation, or completion rules.
