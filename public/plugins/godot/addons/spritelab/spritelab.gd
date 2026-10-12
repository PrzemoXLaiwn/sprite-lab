## SpriteLab API client for Godot 4.0+
## Generate AI game assets directly in your game
class_name SpriteLab
extends Node

const API_BASE_URL = "https://sprite-lab.com/api"

## Your SpriteLab API key
@export var api_key: String = ""

## Signal emitted when generation completes
signal generation_completed(result: Dictionary)

## Signal emitted when an error occurs
signal generation_error(error: String)

var _http_request: HTTPRequest


func _ready():
	_http_request = HTTPRequest.new()
	add_child(_http_request)


## Generate a single sprite
## Returns a Dictionary with: success, texture, image_url, seed, credits_used, credits_remaining
func generate(options: Dictionary) -> Dictionary:
	if api_key.is_empty():
		push_error("SpriteLab: API key not set")
		return {"success": false, "error": "API key not set"}

	var request_body = JSON.stringify({
		"prompt": options.get("prompt", ""),
		"categoryId": options.get("category", ""),
		"subcategoryId": options.get("subcategory", ""),
		"styleId": options.get("style", "PIXEL_ART_32"),
		"colorPaletteId": options.get("color_palette", null),
		"seed": options.get("seed", null)
	})

	var headers = [
		"Content-Type: application/json",
		"Authorization: Bearer " + api_key
	]

	# Make the generation request
	var error = _http_request.request(
		API_BASE_URL + "/generate",
		headers,
		HTTPClient.METHOD_POST,
		request_body
	)

	if error != OK:
		return {"success": false, "error": "Failed to make request"}

	# Wait for response
	var response = await _http_request.request_completed
	var response_code = response[1]
	var body = response[3]

	if response_code != 200:
		var error_data = JSON.parse_string(body.get_string_from_utf8())
		var error_msg = error_data.get("error", "Unknown error") if error_data else "Request failed"
		generation_error.emit(error_msg)
		return {"success": false, "error": error_msg}

	var data = JSON.parse_string(body.get_string_from_utf8())
	if not data:
		return {"success": false, "error": "Invalid response"}

	# Download the generated image
	var image_url = data.get("imageUrl", "")
	if image_url.is_empty():
		return {"success": false, "error": "No image URL in response"}

	var texture = await _download_texture(image_url)
	if texture == null:
		return {"success": false, "error": "Failed to download image"}

	var result = {
		"success": true,
		"texture": texture,
		"image_url": image_url,
		"seed": data.get("seed", 0),
		"credits_used": data.get("creditsUsed", 1),
		"credits_remaining": data.get("creditsRemaining", 0)
	}

	generation_completed.emit(result)
	return result


## Generate multiple sprites in batch
func generate_batch(options_array: Array) -> Array:
	var results = []
	for options in options_array:
		var result = await generate(options)
		results.append(result)
		# Small delay between requests to avoid rate limiting
		await get_tree().create_timer(0.5).timeout
	return results


## Get remaining credits
func get_credits() -> int:
	if api_key.is_empty():
		push_error("SpriteLab: API key not set")
		return -1

	var headers = ["Authorization: Bearer " + api_key]

	var error = _http_request.request(
		API_BASE_URL + "/credits",
		headers,
		HTTPClient.METHOD_GET
	)

	if error != OK:
		return -1

	var response = await _http_request.request_completed
	var response_code = response[1]
	var body = response[3]

	if response_code != 200:
		return -1

	var data = JSON.parse_string(body.get_string_from_utf8())
	return data.get("credits", 0) if data else -1


## Download a texture from URL
func _download_texture(url: String) -> ImageTexture:
	var error = _http_request.request(url)
	if error != OK:
		return null

	var response = await _http_request.request_completed
	var response_code = response[1]
	var body = response[3]

	if response_code != 200:
		return null

	var image = Image.new()
	var image_error = image.load_png_from_buffer(body)
	if image_error != OK:
		# Try other formats
		image_error = image.load_jpg_from_buffer(body)
		if image_error != OK:
			image_error = image.load_webp_from_buffer(body)
			if image_error != OK:
				return null

	return ImageTexture.create_from_image(image)


## Save a texture to file
static func save_texture(texture: ImageTexture, path: String) -> Error:
	if texture == null:
		return ERR_INVALID_PARAMETER

	var image = texture.get_image()
	if image == null:
		return ERR_INVALID_DATA

	return image.save_png(path)


## Available art styles
static func get_styles() -> Array:
	return [
		{"id": "PIXEL_ART_16", "name": "Pixel Art 16x16", "icon": "🎮"},
		{"id": "PIXEL_ART_32", "name": "Pixel Art 32x32", "icon": "🕹️"},
		{"id": "HAND_PAINTED", "name": "Hand Painted", "icon": "🎨"},
		{"id": "ANIME_GAME", "name": "Anime Game", "icon": "✨"},
		{"id": "VECTOR_CLEAN", "name": "Vector Clean", "icon": "📐"},
		{"id": "CHIBI_CUTE", "name": "Chibi Cute", "icon": "🌸"},
		{"id": "DARK_SOULS", "name": "Dark Souls", "icon": "⚔️"},
		{"id": "CARTOON_WESTERN", "name": "Cartoon Western", "icon": "🤠"},
		{"id": "ISOMETRIC_PIXEL", "name": "Isometric Pixel", "icon": "💎"},
		{"id": "REALISTIC_PAINTED", "name": "Realistic Painted", "icon": "🖼️"},
	]


## Available categories
static func get_categories() -> Array:
	return [
		{"id": "WEAPONS", "name": "Weapons", "icon": "⚔️"},
		{"id": "ARMOR", "name": "Armor", "icon": "🛡️"},
		{"id": "CONSUMABLES", "name": "Consumables", "icon": "🧪"},
		{"id": "RESOURCES", "name": "Resources", "icon": "💎"},
		{"id": "CHARACTERS", "name": "Characters", "icon": "🧙"},
		{"id": "CREATURES", "name": "Creatures", "icon": "🐉"},
		{"id": "ENVIRONMENT", "name": "Environment", "icon": "🌳"},
		{"id": "EFFECTS", "name": "Effects", "icon": "✨"},
	]
