# SpriteLab Godot Plugin

Generate AI game assets directly in the Godot Editor.

## Requirements

- Godot 4.0 or newer
- Internet connection

## Installation

1. Download and extract the ZIP file
2. Copy the `addons/spritelab` folder to your project's `addons` directory
3. Go to `Project → Project Settings → Plugins`
4. Enable "SpriteLab"
5. The SpriteLab dock will appear on the right side

## Setup

1. Get your API key from [sprite-lab.com/settings](https://sprite-lab.com/settings)
2. Paste your API key in the SpriteLab dock
3. Click "Connect" to verify

## Features

- **Editor Dock**: Generate sprites without leaving Godot
- **Direct Import**: Sprites are saved as resources automatically
- **Batch Generation**: Generate multiple assets at once
- **Style Presets**: Save and reuse your favorite settings
- **Resource Management**: Automatic file organization

## Usage

### From Editor Dock

1. Find SpriteLab in the right dock panel
2. Select category and style
3. Enter your prompt
4. Click "Generate"
5. Drag the result into your scene

### From GDScript

```gdscript
extends Node2D

@onready var spritelab = SpriteLab.new()

func _ready():
    spritelab.api_key = "YOUR_API_KEY"
    add_child(spritelab)

func generate_sprite():
    var options = {
        "prompt": "fire sword with magical glow",
        "category": "WEAPONS",
        "subcategory": "SWORDS",
        "style": "PIXEL_ART_32"
    }

    var result = await spritelab.generate(options)

    if result.success:
        $Sprite2D.texture = result.texture

        # Optionally save to project
        result.save_to_file("res://sprites/fire_sword.png")
```

## API Reference

### SpriteLab

| Method | Description |
|--------|-------------|
| `generate(options)` | Generate a single sprite (async) |
| `generate_batch(options_array)` | Generate multiple sprites (async) |
| `get_credits()` | Check remaining credits |
| `get_styles()` | List available styles |
| `get_categories()` | List available categories |

### Options Dictionary

| Key | Type | Description |
|-----|------|-------------|
| `prompt` | String | Description of the asset |
| `category` | String | Asset category |
| `subcategory` | String | Asset subcategory |
| `style` | String | Art style ID |
| `color_palette` | String | Optional color palette |
| `seed` | int | Optional seed for reproducibility |

### Result Dictionary

| Key | Type | Description |
|-----|------|-------------|
| `success` | bool | Whether generation succeeded |
| `texture` | ImageTexture | The generated texture |
| `image_url` | String | URL of the generated image |
| `seed` | int | Seed used for generation |
| `credits_used` | int | Credits consumed |
| `credits_remaining` | int | Remaining credits |

## Troubleshooting

### "API Key Invalid"
- Ensure you've copied the full API key
- Check that your subscription is active

### "Plugin Not Showing"
- Make sure the addon is in `addons/spritelab`
- Enable it in Project Settings → Plugins

### "Rate Limited"
- Wait a few seconds between requests
- Use batch generation for multiple assets

## File Structure

```
addons/
└── spritelab/
    ├── plugin.cfg
    ├── spritelab.gd
    ├── spritelab_dock.gd
    ├── spritelab_dock.tscn
    └── icons/
        └── spritelab_icon.svg
```

## Support

- Documentation: [sprite-lab.com/docs](https://sprite-lab.com/docs)
- Discord: [discord.gg/spritelab](https://discord.gg/spritelab)
- Email: support@sprite-lab.com

## License

This plugin is provided for use with a valid SpriteLab subscription.
Generated assets can be used in commercial projects.
