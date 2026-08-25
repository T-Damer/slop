class_name SlopGateway
extends RefCounted

signal snapshot_received(snapshot: Dictionary)
signal command_rejected(error_code: StringName)

func create_session(_request: Dictionary) -> void:
    push_error(SlopEngineRegistry.messages.gateway_not_configured)

func join_session(_request: Dictionary) -> void:
    push_error(SlopEngineRegistry.messages.gateway_not_configured)

func submit_command(_request: Dictionary) -> void:
    push_error(SlopEngineRegistry.messages.gateway_not_configured)

func request_history(_request: Dictionary) -> void:
    push_error(SlopEngineRegistry.messages.gateway_not_configured)
