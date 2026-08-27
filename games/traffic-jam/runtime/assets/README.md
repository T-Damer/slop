# Parking Jam source assets

`models/compact-car.glb` and `models/passenger.glb` are project-authored low-poly source models.

The current execution container does not include Blender or `bpy`. They were generated deterministically with `tools/generate-traffic-assets.py` through `trimesh`, exported as standard GLB, and can be opened or refined in Blender/Blender MCP later.

`provenance.json` records bounds, mesh count, triangle count, and origin. Runtime code keeps procedural models as a fallback until the authored-model loader is validated across web builds.
