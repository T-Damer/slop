class_name TrafficProjector
extends RefCounted

func project(snapshot: Dictionary) -> SlopWorld:
    var world := SlopWorld.new()
    var state: Dictionary = snapshot[TrafficRegistry.fields.state]

    for vehicle: Dictionary in state[TrafficRegistry.fields.vehicles]:
        var entity_id := world.create_entity()
        world.set_component(
            entity_id,
            TrafficRegistry.components.vehicle,
            vehicle.duplicate(true),
        )
        world.set_component(
            entity_id,
            TrafficRegistry.components.position,
            vehicle[TrafficRegistry.fields.position].duplicate(true),
        )
        world.set_component(
            entity_id,
            TrafficRegistry.components.visual,
            {
                TrafficRegistry.fields.color: vehicle[TrafficRegistry.fields.color],
                TrafficRegistry.fields.is_target: vehicle[TrafficRegistry.fields.is_target],
            },
        )

    return world
