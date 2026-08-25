class_name SlopWorld
extends RefCounted

var _next_entity_id: int = int(SlopEngineRegistry.runtime.initial_revision) + 1
var _components_by_entity: Dictionary = {}
var _systems: Array[SlopSystem] = []

func create_entity() -> int:
    const structural_increment := 1
    var entity_id := _next_entity_id
    _next_entity_id += structural_increment
    _components_by_entity[entity_id] = {}
    return entity_id

func destroy_entity(entity_id: int) -> void:
    _components_by_entity.erase(entity_id)

func set_component(
    entity_id: int,
    component_id: StringName,
    value: Variant,
) -> void:
    assert(_components_by_entity.has(entity_id))
    var components: Dictionary = _components_by_entity[entity_id]
    components[component_id] = value

func component(entity_id: int, component_id: StringName) -> Variant:
    var components: Dictionary = _components_by_entity.get(entity_id, {})
    return components.get(component_id)

func entities_with(component_ids: PackedStringArray) -> PackedInt32Array:
    var matches := PackedInt32Array()
    for entity_id: int in _components_by_entity:
        var components: Dictionary = _components_by_entity[entity_id]
        var has_all := true
        for component_id in component_ids:
            if not components.has(component_id):
                has_all = false
                break
        if has_all:
            matches.append(entity_id)
    return matches

func add_system(system: SlopSystem) -> void:
    _systems.append(system)

func process(delta: float) -> void:
    for system in _systems:
        system.process(self, delta)
