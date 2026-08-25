class_name SlopEngineRegistry
extends RefCounted

const package := {
    "id": "slop-engine",
    "version": "0.1.0",
}

const capabilities := {
    "ecs": "slop.ecs",
    "session": "slop.session",
    "plugins": "slop.plugins",
    "shared_ui": "slop.shared_ui",
}

const session_statuses := {
    "active": "active",
    "completed": "completed",
    "abandoned": "abandoned",
}

const participant_roles := {
    "player": "player",
    "spectator": "spectator",
}

const messages := {
    "duplicate_plugin": "A plugin with this identifier is already registered.",
    "missing_capability": "A required engine capability is not registered.",
    "gateway_not_configured": "The session gateway is not configured.",
}

const runtime := {
    "initial_revision": 0,
}
