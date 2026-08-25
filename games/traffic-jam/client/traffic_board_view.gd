class_name TrafficBoardView
extends Control

signal vehicle_selected(vehicle_id: String)

var _snapshot: Dictionary = {}
var _vehicle_rects: Dictionary = {}

func _ready() -> void:
    custom_minimum_size = Vector2.ONE * TrafficRegistry.visual.minimum_board_size
    mouse_filter = Control.MOUSE_FILTER_STOP

func set_snapshot(snapshot: Dictionary) -> void:
    _snapshot = snapshot.duplicate(true)
    queue_redraw()

func _draw() -> void:
    _vehicle_rects.clear()
    if _snapshot.is_empty():
        return

    var state: Dictionary = _snapshot[TrafficRegistry.fields.state]
    var board: Dictionary = state[TrafficRegistry.fields.board]
    var board_rect := _board_rect()
    var cell_size := board_rect.size.x / float(board[TrafficRegistry.fields.width])
    draw_rect(board_rect, TrafficRegistry.colors.board, true)

    for y in range(int(board[TrafficRegistry.fields.height])):
        for x in range(int(board[TrafficRegistry.fields.width])):
            var cell_rect := Rect2(
                board_rect.position + Vector2(x, y) * cell_size,
                Vector2.ONE * cell_size,
            ).grow(-TrafficRegistry.visual.cell_gap)
            draw_rect(cell_rect, TrafficRegistry.colors.grid, false)

    for vehicle: Dictionary in state[TrafficRegistry.fields.vehicles]:
        var vehicle_rect := _vehicle_rect(vehicle, board_rect, cell_size)
        var vehicle_id: String = vehicle[TrafficFixtureRegistry.fields.vehicle_definition_id]
        _vehicle_rects[vehicle_id] = vehicle_rect
        var style := StyleBoxFlat.new()
        style.bg_color = TrafficRegistry.colors[vehicle[TrafficRegistry.fields.color]]
        style.border_color = TrafficRegistry.colors.outline
        style.set_border_width_all(int(TrafficRegistry.visual.outline_width))
        style.set_corner_radius_all(int(TrafficRegistry.visual.vehicle_radius))
        draw_style_box(style, vehicle_rect)

func _gui_input(event: InputEvent) -> void:
    var pointer_position: Vector2
    if event is InputEventMouseButton:
        var mouse_event := event as InputEventMouseButton
        if not mouse_event.pressed:
            return
        pointer_position = mouse_event.position
    elif event is InputEventScreenTouch:
        var touch_event := event as InputEventScreenTouch
        if not touch_event.pressed:
            return
        pointer_position = touch_event.position
    else:
        return

    for vehicle_id: String in _vehicle_rects:
        var vehicle_rect: Rect2 = _vehicle_rects[vehicle_id]
        if vehicle_rect.has_point(pointer_position):
            vehicle_selected.emit(vehicle_id)
            accept_event()
            return

func _board_rect() -> Rect2:
    var available := min(size.x, size.y) - TrafficRegistry.visual.board_padding * 2.0
    var side := max(available, TrafficRegistry.visual.minimum_board_size)
    return Rect2((size - Vector2.ONE * side) * 0.5, Vector2.ONE * side)

func _vehicle_rect(
    vehicle: Dictionary,
    board_rect: Rect2,
    cell_size: float,
) -> Rect2:
    var position: Dictionary = vehicle[TrafficRegistry.fields.position]
    var origin := board_rect.position + Vector2(
        position[TrafficRegistry.fields.x],
        position[TrafficRegistry.fields.y],
    ) * cell_size
    var span := Vector2.ONE
    if vehicle[TrafficRegistry.fields.axis] == TrafficRegistry.axes.horizontal:
        span.x = vehicle[TrafficRegistry.fields.length]
    else:
        span.y = vehicle[TrafficRegistry.fields.length]
    return Rect2(origin, span * cell_size).grow(-TrafficRegistry.visual.cell_gap)
