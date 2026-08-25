class_name SlopPluginRegistry
extends RefCounted

var _capabilities: Dictionary = {}
var _plugins: Dictionary = {}

func register_capability(capability_id: StringName, capability: Variant) -> void:
    _capabilities[capability_id] = capability

func has_capability(capability_id: StringName) -> bool:
    return _capabilities.has(capability_id)

func capability(capability_id: StringName) -> Variant:
    assert(
        has_capability(capability_id),
        SlopEngineRegistry.messages.missing_capability,
    )
    return _capabilities[capability_id]

func register_plugin(plugin_id: StringName, plugin: SlopGamePlugin) -> void:
    assert(
        not _plugins.has(plugin_id),
        SlopEngineRegistry.messages.duplicate_plugin,
    )
    for capability_id in plugin.required_capabilities():
        assert(
            has_capability(capability_id),
            SlopEngineRegistry.messages.missing_capability,
        )
    _plugins[plugin_id] = plugin

func plugin(plugin_id: StringName) -> SlopGamePlugin:
    return _plugins.get(plugin_id) as SlopGamePlugin
