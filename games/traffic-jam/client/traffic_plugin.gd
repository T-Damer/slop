class_name TrafficPlugin
extends SlopGamePlugin

func manifest() -> Dictionary:
    return {
        TrafficPluginRegistry.fields.id: TrafficRegistry.game.id,
        TrafficPluginRegistry.fields.version: TrafficRegistry.game.version,
        TrafficPluginRegistry.fields.entry_scene: TrafficPluginRegistry.paths.entry_scene,
        TrafficPluginRegistry.fields.network: TrafficPluginRegistry.values.turn_based,
        TrafficPluginRegistry.fields.join_policy: TrafficPluginRegistry.values.between_turns,
        TrafficPluginRegistry.fields.spectators: true,
    }

func required_capabilities() -> PackedStringArray:
    return PackedStringArray([
        SlopEngineRegistry.capabilities.ecs,
        SlopEngineRegistry.capabilities.session,
        SlopEngineRegistry.capabilities.shared_ui,
    ])

func create_entry_scene() -> PackedScene:
    return load(TrafficPluginRegistry.paths.entry_scene) as PackedScene
