class_name SlopGameShell
extends MarginContainer

var _title_label: Label
var _status_label: Label
var _content_host: PanelContainer
var _action_bar: HBoxContainer
var _built := false

func _ready() -> void:
    _build_once()

func set_game_title(value: String) -> void:
    _build_once()
    _title_label.text = value

func set_status(value: String) -> void:
    _build_once()
    _status_label.text = value

func set_content(control: Control) -> void:
    _build_once()
    for child in _content_host.get_children():
        _content_host.remove_child(child)
        child.queue_free()
    _content_host.add_child(control)

func clear_actions() -> void:
    _build_once()
    for child in _action_bar.get_children():
        _action_bar.remove_child(child)
        child.queue_free()

func add_action(label: String, callback: Callable) -> Button:
    _build_once()
    var button := Button.new()
    button.text = label
    button.custom_minimum_size.y = SlopUiRegistry.layout.minimum_action_height
    button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
    button.pressed.connect(callback)
    _action_bar.add_child(button)
    return button

func _build_once() -> void:
    if _built:
        return
    _built = true
    name = SlopUiRegistry.nodes.root
    set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
    add_theme_constant_override(
        &"margin_left",
        SlopUiRegistry.layout.outer_margin,
    )
    add_theme_constant_override(
        &"margin_top",
        SlopUiRegistry.layout.outer_margin,
    )
    add_theme_constant_override(
        &"margin_right",
        SlopUiRegistry.layout.outer_margin,
    )
    add_theme_constant_override(
        &"margin_bottom",
        SlopUiRegistry.layout.outer_margin,
    )

    var root := VBoxContainer.new()
    root.add_theme_constant_override(
        &"separation",
        SlopUiRegistry.layout.section_gap,
    )
    add_child(root)

    var header := VBoxContainer.new()
    header.name = SlopUiRegistry.nodes.header
    header.add_theme_constant_override(
        &"separation",
        SlopUiRegistry.layout.header_gap,
    )
    root.add_child(header)

    _title_label = Label.new()
    _title_label.name = SlopUiRegistry.nodes.title
    _title_label.text = SlopUiRegistry.copy.loading
    header.add_child(_title_label)

    _status_label = Label.new()
    _status_label.name = SlopUiRegistry.nodes.status
    _status_label.text = SlopUiRegistry.copy.ready
    header.add_child(_status_label)

    _content_host = PanelContainer.new()
    _content_host.name = SlopUiRegistry.nodes.content
    _content_host.size_flags_vertical = Control.SIZE_EXPAND_FILL
    root.add_child(_content_host)

    _action_bar = HBoxContainer.new()
    _action_bar.name = SlopUiRegistry.nodes.actions
    _action_bar.add_theme_constant_override(
        &"separation",
        SlopUiRegistry.layout.action_gap,
    )
    root.add_child(_action_bar)
