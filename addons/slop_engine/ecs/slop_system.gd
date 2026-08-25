class_name SlopSystem
extends RefCounted

var system_id: StringName
var reads: PackedStringArray = PackedStringArray()
var writes: PackedStringArray = PackedStringArray()

func configure(
    next_system_id: StringName,
    read_components: PackedStringArray,
    written_components: PackedStringArray,
) -> SlopSystem:
    system_id = next_system_id
    reads = read_components
    writes = written_components
    return self

func process(_world: SlopWorld, _delta: float) -> void:
    pass
