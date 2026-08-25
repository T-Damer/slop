class_name TrafficPluginRegistry
extends RefCounted

const fields := {
    "id": "id",
    "version": "version",
    "entry_scene": "entryScene",
    "network": "network",
    "join_policy": "joinPolicy",
    "spectators": "spectators",
}

const values := {
    "turn_based": "turn-based",
    "between_turns": "between-turns",
}

const paths := {
    "entry_scene": "res://games/traffic-jam/client/main.tscn",
}
