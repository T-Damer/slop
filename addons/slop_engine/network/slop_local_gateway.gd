class_name SlopLocalGateway
extends SlopGateway

var _executor: Callable
var _snapshot: Dictionary = {}

func configure(executor: Callable, initial_snapshot: Dictionary) -> SlopLocalGateway:
    _executor = executor
    _snapshot = initial_snapshot.duplicate(true)
    snapshot_received.emit(_snapshot.duplicate(true))
    return self

func submit_command(request: Dictionary) -> void:
    if not _executor.is_valid():
        command_rejected.emit(SlopGatewayRegistry.errors.executor_missing)
        return

    var result: Dictionary = _executor.call(
        _snapshot.duplicate(true),
        request.duplicate(true),
    )
    if result.has(SlopGatewayRegistry.fields.error):
        command_rejected.emit(result[SlopGatewayRegistry.fields.error])
        return

    _snapshot = result[SlopGatewayRegistry.fields.snapshot].duplicate(true)
    snapshot_received.emit(_snapshot.duplicate(true))
