class_name SlopGamePlugin
extends RefCounted

func manifest() -> Dictionary:
    return {}

func required_capabilities() -> PackedStringArray:
    return PackedStringArray()

func create_entry_scene() -> PackedScene:
    return null
