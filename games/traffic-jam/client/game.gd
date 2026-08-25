class_name TrafficGame
extends Node

var _rules := TrafficRules.new()
var _projector := TrafficProjector.new()
var _gateway := SlopLocalGateway.new()
var _shell: SlopGameShell
var _board: TrafficBoardView
var _snapshot: Dictionary = {}
var _world: SlopWorld
var _command_sequence := TrafficRegistry.runtime.initial_move_count

func _ready() -> void:
    _shell = SlopGameShell.new()
    add_child(_shell)
    _shell.set_game_title(TrafficRegistry.game.title)

    _board = TrafficBoardView.new()
    _board.vehicle_selected.connect(_on_vehicle_selected)
    _shell.set_content(_board)
    _shell.add_action(TrafficRegistry.copy.restart, _restart)

    _gateway.snapshot_received.connect(_on_snapshot_received)
    _gateway.command_rejected.connect(_on_command_rejected)
    _restart()

func _restart() -> void:
    _command_sequence = TrafficRegistry.runtime.initial_move_count
    _gateway.configure(
        Callable(_rules, &"execute"),
        _rules.create_snapshot(),
    )

func _on_snapshot_received(snapshot: Dictionary) -> void:
    _snapshot = snapshot.duplicate(true)
    _world = _projector.project(_snapshot)
    _board.set_snapshot(_snapshot)
    var state: Dictionary = _snapshot[TrafficRegistry.fields.state]
    var move_count: int = state[TrafficRegistry.fields.move_count]
    _shell.set_status(
        TrafficRegistry.copy.completed_format % move_count
        if state[TrafficRegistry.fields.completed]
        else TrafficRegistry.copy.moves_format % move_count
    )

func _on_command_rejected(error_code: StringName) -> void:
    _shell.set_status(
        TrafficRegistry.copy.blocked
        if error_code == TrafficRegistry.errors.path_blocked
        else String(error_code)
    )

func _on_vehicle_selected(vehicle_id: String) -> void:
    if _snapshot.is_empty():
        return
    var state: Dictionary = _snapshot[TrafficRegistry.fields.state]
    if state[TrafficRegistry.fields.completed]:
        return

    var vehicle := _find_vehicle(state[TrafficRegistry.fields.vehicles], vehicle_id)
    if vehicle.is_empty():
        return

    _command_sequence += TrafficRegistry.runtime.forward_step
    _gateway.submit_command({
        TrafficRegistry.fields.command_id:
            TrafficRegistry.local.command_format % _command_sequence,
        TrafficRegistry.fields.type: TrafficRegistry.commands.move_vehicle,
        TrafficRegistry.fields.actor_id: TrafficRegistry.local.actor_id,
        TrafficRegistry.fields.expected_revision:
            _snapshot[TrafficRegistry.fields.revision],
        TrafficRegistry.fields.payload: {
            TrafficRegistry.fields.vehicle_id: vehicle_id,
            TrafficRegistry.fields.delta:
                vehicle[TrafficRegistry.fields.preferred_delta],
        },
    })

func _find_vehicle(vehicles: Array, vehicle_id: String) -> Dictionary:
    for vehicle: Dictionary in vehicles:
        if vehicle[TrafficFixtureRegistry.fields.vehicle_definition_id] == vehicle_id:
            return vehicle
    return {}
