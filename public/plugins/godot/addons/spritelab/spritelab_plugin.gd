@tool
extends EditorPlugin

var dock: Control


func _enter_tree():
	# Load and instantiate the dock scene
	var dock_scene = preload("res://addons/spritelab/spritelab_dock.tscn")
	dock = dock_scene.instantiate()

	# Add the dock to the editor
	add_control_to_dock(DOCK_SLOT_RIGHT_UL, dock)


func _exit_tree():
	# Remove the dock when plugin is disabled
	if dock:
		remove_control_from_docks(dock)
		dock.queue_free()
