# SpriteLab Unity Plugin

Generate AI game assets directly in the Unity Editor.

## Requirements

- Unity 2021.3 LTS or newer
- .NET 4.x or .NET Standard 2.1
- Internet connection

## Installation

1. Download the `.unitypackage` file
2. In Unity, go to `Assets → Import Package → Custom Package`
3. Select the downloaded file and import all assets
4. Open `Window → SpriteLab` to access the generator

## Setup

1. Get your API key from [sprite-lab.com/settings](https://sprite-lab.com/settings)
2. Paste your API key in the SpriteLab window
3. Click "Verify" to confirm connection

## Features

- **Editor Window**: Generate sprites without leaving Unity
- **Drag & Drop**: Generated sprites appear in your Assets folder
- **Import Settings**: Automatic pixel-art friendly import configuration
- **Bulk Generation**: Generate multiple assets at once
- **Style Presets**: Save and reuse your favorite settings

## Usage

### From Editor Window

1. Open `Window → SpriteLab`
2. Select category and style
3. Enter your prompt
4. Click "Generate"
5. Drag the result into your scene

### From Code

```csharp
using SpriteLab;

public class MyScript : MonoBehaviour
{
    async void GenerateSprite()
    {
        var options = new GenerateOptions
        {
            Prompt = "fire sword with magical glow",
            Category = "WEAPONS",
            Subcategory = "SWORDS",
            Style = "PIXEL_ART_32"
        };

        var result = await SpriteLabAPI.GenerateAsync(options);

        if (result.Success)
        {
            // Use the generated sprite
            GetComponent<SpriteRenderer>().sprite = result.Sprite;

            // Or save to project
            result.SaveToAssets("Assets/Sprites/fire_sword.png");
        }
    }
}
```

## API Reference

### SpriteLabAPI

| Method | Description |
|--------|-------------|
| `GenerateAsync(options)` | Generate a single sprite |
| `GenerateBatchAsync(options[])` | Generate multiple sprites |
| `GetCredits()` | Check remaining credits |
| `GetStyles()` | List available styles |
| `GetCategories()` | List available categories |

### GenerateOptions

| Property | Type | Description |
|----------|------|-------------|
| `Prompt` | string | Description of the asset |
| `Category` | string | Asset category |
| `Subcategory` | string | Asset subcategory |
| `Style` | string | Art style ID |
| `ColorPalette` | string? | Optional color palette |
| `Seed` | int? | Optional seed for reproducibility |

## Troubleshooting

### "API Key Invalid"
- Ensure you've copied the full API key from settings
- Check that your subscription is active

### "Rate Limited"
- Wait a few seconds between requests
- Consider batch generation for multiple assets

### "Import Settings Wrong"
- Check `Edit → Project Settings → SpriteLab`
- Enable "Auto Configure Import Settings"

## Support

- Documentation: [sprite-lab.com/docs](https://sprite-lab.com/docs)
- Discord: [discord.gg/spritelab](https://discord.gg/spritelab)
- Email: support@sprite-lab.com

## License

This plugin is provided for use with a valid SpriteLab subscription.
Generated assets can be used in commercial projects.
