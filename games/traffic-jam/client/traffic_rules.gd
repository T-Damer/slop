class_name TrafficRules
extends RefCounted

func load_fixture() -> Dictionary:
    var source := FileAccess.get_file_as_string(TrafficRegistry.paths.fixture)
    var parsed := JSON.parse_string(source)
    assert(parsed is Dictionary)
    return (parsed as Dictionary).duplicate(true)

func create_snapshot() -> Dictionary:
    var fixture := load_fixture()
    var level: Dictionary = fixture[TrafficRegistry.fields.level]
    return {
        TrafficRegistry.fields.revision: TrafficRegistry.runtime.initial_revision,
        TrafficRegistry.fields.state: {
            TrafficRegistry.fields.board: level[TrafficRegistry.fields.board].duplicate(true),
            TrafficRegistry.fields.vehicles: level[TrafficRegistry.fields.vehicles].duplicate(true),
            TrafficRegistry.fields.move_count: TrafficRegistry.runtime.initial_move_count,
            TrafficRegistry.fields.completed: false,
        },
    }

func execute(snapshot: Dictionary, command: Dictionary) -> Dictionary:
    if command.get(TrafficRegistry.fields.type) != TrafficRegistry.commands.move_vehicle:
        return _error(TrafficRegistry.errors.invalid_command)
    if command.get(TrafficRegistry.fields.expected_revision) != snapshot.get(TrafficRegistry.fields.revision):
        return _error(TrafficRegistry.errors.stale_revision)

    var payload: Dictionary = command.get(TrafficRegistry.fields.payload, {})
    var state: Dictionary = snapshot[TrafficRegistry.fields.state]
    var validation := _validate_move(
        state[TrafficRegistry.fields.board],
        state[TrafficRegistry.fields.vehicles],
        payload.get(TrafficRegistry.fields.vehicle_id),
        payload.get(TrafficRegistry.fields.delta),
    )
    if validation.has(TrafficRegistry.fields.error):
        return validation

    var next_state := state.duplicate(true)
    var vehicles: Array = next_state[TrafficRegistry.fields.vehicles]
    var vehicle_id: String = payload[TrafficRegistry.fields.vehicle_id]
    var delta: int = payload[TrafficRegistry.fields.delta]
    var next_position: Vector2i = validation[TrafficRegistry.fields.position]

    for vehicle: Dictionary in vehicles:
        if vehicle[TrafficRegistry.fields.vehicle_id] == vehicle_id:
            vehicle[TrafficRegistry.fields.position] = {
                TrafficRegistry.fields.x: next_position.x,
                TrafficRegistry.fields.y: next_position.y,
            }
            break

    next_state[TrafficRegistry.fields.move_count] += TrafficRegistry.runtime.forward_step
    var events: Array[Dictionary] = [
        {
            TrafficRegistry.fields.type: TrafficRegistry.events.vehicle_moved,
            TrafficRegistry.fields.payload: {
                TrafficRegistry.fields.vehicle_id: vehicle_id,
                TrafficRegistry.fields.delta: delta,
            },
        },
    ]

    if _is_completed(next_state):
        next_state[TrafficRegistry.fields.completed] = true
        events.append({
            TrafficRegistry.fields.type: TrafficRegistry.events.level_completed,
            TrafficRegistry.fields.payload: {
                TrafficRegistry.fields.move_count: next_state[TrafficRegistry.fields.move_count],
            },
        })

    var next_snapshot := snapshot.duplicate(true)
    next_snapshot[TrafficRegistry.fields.revision] += events.size()
    next_snapshot[TrafficRegistry.fields.state] = next_state
    return {
        TrafficRegistry.fields.snapshot: next_snapshot,
        TrafficRegistry.fields.events: events,
    }

func _validate_move(
    board: Dictionary,
    vehicles: Array,
    vehicle_id: Variant,
    delta_value: Variant,
) -> Dictionary:
    if not delta_value is int:
        return _error(TrafficRegistry.errors.invalid_command)
    var delta: int = delta_value
    if delta == TrafficRegistry.runtime.minimum_coordinate:
        return _error(TrafficRegistry.errors.zero_move)

    var moving_vehicle := _find_vehicle(vehicles, vehicle_id)
    if moving_vehicle.is_empty():
        return _error(TrafficRegistry.errors.piece_missing)

    var occupied: Dictionary = {}
    for vehicle: Dictionary in vehicles:
        if vehicle[TrafficRegistry.fields.vehicle_id] == vehicle_id:
            continue
        for cell in _cells(vehicle, _position(vehicle)):
            occupied[cell] = true

    var direction := (
        TrafficRegistry.runtime.forward_step
        if delta > TrafficRegistry.runtime.minimum_coordinate
        else TrafficRegistry.runtime.backward_step
    )
    var distance := direction
    while abs(distance) <= abs(delta):
        var candidate := _translated_position(moving_vehicle, distance)
        for cell in _cells(moving_vehicle, candidate):
            if not _inside(board, cell):
                return _error(TrafficRegistry.errors.out_of_bounds)
            if occupied.has(cell):
                return _error(TrafficRegistry.errors.path_blocked)
        distance += direction

    return {
        TrafficRegistry.fields.position: _translated_position(moving_vehicle, delta),
    }

func _find_vehicle(vehicles: Array, vehicle_id: Variant) -> Dictionary:
    for vehicle: Dictionary in vehicles:
        if vehicle[TrafficRegistry.fields.vehicle_id] == vehicle_id:
            return vehicle
    return {}

func _position(vehicle: Dictionary) -> Vector2i:
    var value: Dictionary = vehicle[TrafficRegistry.fields.position]
    return Vector2i(
        value[TrafficRegistry.fields.x],
        value[TrafficRegistry.fields.y],
    )

func _translated_position(vehicle: Dictionary, delta: int) -> Vector2i:
    var position := _position(vehicle)
    if vehicle[TrafficRegistry.fields.axis] == TrafficRegistry.axes.horizontal:
        position.x += delta
    else:
        position.y += delta
    return position

func _cells(vehicle: Dictionary, position: Vector2i) -> Array[Vector2i]:
    var cells: Array[Vector2i] = []
    var length: int = vehicle[TrafficRegistry.fields.length]
    for offset in range(length):
        cells.append(
            Vector2i(position.x + offset, position.y)
            if vehicle[TrafficRegistry.fields.axis] == TrafficRegistry.axes.horizontal
            else Vector2i(position.x, position.y + offset)
        )
    return cells

func _inside(board: Dictionary, position: Vector2i) -> bool:
    return (
        position.x >= TrafficRegistry.runtime.minimum_coordinate
        and position.y >= TrafficRegistry.runtime.minimum_coordinate
        and position.x < int(board[TrafficRegistry.fields.width])
        and position.y < int(board[TrafficRegistry.fields.height])
    )

func _is_completed(state: Dictionary) -> bool:
    var board: Dictionary = state[TrafficRegistry.fields.board]
    for vehicle: Dictionary in state[TrafficRegistry.fields.vehicles]:
        if not vehicle[TrafficRegistry.fields.is_target]:
            continue
        return (
            _position(vehicle).x + int(vehicle[TrafficRegistry.fields.length])
            == int(board[TrafficRegistry.fields.width])
        )
    return false

func _error(error_code: StringName) -> Dictionary:
    return {TrafficRegistry.fields.error: error_code}
