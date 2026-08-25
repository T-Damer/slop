extends SceneTree

var _rules := TrafficRules.new()

func _initialize() -> void:
    _run()

func _run() -> void:
    var fixture := _rules.load_fixture()
    var snapshot := _rules.create_snapshot()

    for step: Dictionary in fixture[TrafficRegistry.fields.scenario]:
        var result := _rules.execute(snapshot, {
            TrafficRegistry.fields.command_id:
                step[TrafficRegistry.fields.command_id],
            TrafficRegistry.fields.type: TrafficRegistry.commands.move_vehicle,
            TrafficRegistry.fields.actor_id: TrafficRegistry.local.actor_id,
            TrafficRegistry.fields.expected_revision:
                snapshot[TrafficRegistry.fields.revision],
            TrafficRegistry.fields.payload: {
                TrafficRegistry.fields.vehicle_id:
                    step[TrafficRegistry.fields.vehicle_id],
                TrafficRegistry.fields.delta:
                    step[TrafficRegistry.fields.delta],
            },
        })

        if step.has(TrafficRegistry.fields.expect_error):
            if result.get(TrafficRegistry.fields.error) != step[TrafficRegistry.fields.expect_error]:
                _fail("Expected rejection did not match fixture.")
                return
            continue

        if result.has(TrafficRegistry.fields.error):
            _fail("An accepted fixture step was rejected.")
            return

        var event_types: Array[String] = []
        for event: Dictionary in result[TrafficRegistry.fields.events]:
            event_types.append(event[TrafficRegistry.fields.type])
        if event_types != Array(step[TrafficRegistry.fields.expect_events], TYPE_STRING, &"", null):
            _fail("Event sequence did not match fixture.")
            return
        snapshot = result[TrafficRegistry.fields.snapshot]

    var state: Dictionary = snapshot[TrafficRegistry.fields.state]
    var expected: Dictionary = fixture[TrafficRegistry.fields.expected]
    if not state[TrafficRegistry.fields.completed]:
        _fail("Fixture did not complete the level.")
        return
    if state[TrafficRegistry.fields.move_count] != expected[TrafficRegistry.fields.move_count]:
        _fail("Move count did not match fixture.")
        return
    if snapshot[TrafficRegistry.fields.revision] != expected[TrafficRegistry.fields.revision_without_join]:
        _fail("Revision did not match fixture.")
        return

    quit()

func _fail(message: String) -> void:
    push_error(message)
    quit(1)
