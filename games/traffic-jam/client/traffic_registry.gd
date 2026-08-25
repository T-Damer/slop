class_name TrafficRegistry
extends RefCounted

const game := {
    "id": "traffic-jam",
    "title": "Traffic Jam",
    "version": "0.1.0",
}

const paths := {
    "fixture": "res://games/traffic-jam/fixtures/conformance.json",
}

const commands := {
    "move_vehicle": "traffic.move_vehicle",
}

const events := {
    "vehicle_moved": "traffic.vehicle_moved",
    "level_completed": "traffic.level_completed",
}

const errors := {
    "invalid_command": "traffic.invalid_command",
    "stale_revision": "slop.stale_revision",
    "piece_missing": "grid.piece_missing",
    "zero_move": "grid.zero_move",
    "out_of_bounds": "grid.out_of_bounds",
    "path_blocked": "grid.path_blocked",
}

const fields := {
    "snapshot": "snapshot",
    "error": "error",
    "events": "events",
    "type": "type",
    "payload": "payload",
    "command_id": "commandId",
    "actor_id": "actorId",
    "expected_revision": "expectedRevision",
    "vehicle_id": "vehicleId",
    "delta": "delta",
    "revision": "revision",
    "state": "state",
    "board": "board",
    "vehicles": "vehicles",
    "position": "position",
    "x": "x",
    "y": "y",
    "axis": "axis",
    "length": "length",
    "preferred_delta": "preferredDelta",
    "is_target": "isTarget",
    "color": "color",
    "move_count": "moveCount",
    "completed": "completed",
    "width": "width",
    "height": "height",
    "level": "level",
    "scenario": "scenario",
    "expect_error": "expectError",
    "expect_events": "expectEvents",
    "expected": "expected",
    "status": "status",
}

const axes := {
    "horizontal": "horizontal",
    "vertical": "vertical",
}

const components := {
    "vehicle": "traffic.vehicle",
    "position": "grid.position",
    "visual": "presentation.visual",
}

const systems := {
    "projection": "traffic.projection",
}

const runtime := {
    "initial_revision": 2,
    "initial_move_count": 0,
    "forward_step": 1,
    "backward_step": -1,
    "minimum_coordinate": 0,
}

const copy := {
    "ready": "Tap a vehicle to move it along its arrow.",
    "moves_format": "Moves: %d",
    "completed_format": "Solved in %d moves",
    "restart": "Restart",
    "blocked": "That path is blocked.",
}

const local := {
    "actor_id": "local-player",
    "command_format": "traffic-local-%d",
}

const visual := {
    "board_padding": 18.0,
    "cell_gap": 5.0,
    "vehicle_radius": 10.0,
    "outline_width": 2.0,
    "minimum_board_size": 420.0,
}

const colors := {
    "board": Color("25262b"),
    "grid": Color("3b3e45"),
    "coral": Color("ff7a70"),
    "blue": Color("65a9ff"),
    "green": Color("64d294"),
    "yellow": Color("f5ca62"),
    "outline": Color("111216"),
}
