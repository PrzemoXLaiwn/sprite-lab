// Godot SpriteFrames text for one horizontal strip. No image processing.
// The sheet file sits next to the .tres when the player drops both into the project.

export function godotSpriteFramesTres(input: {
  name: string;
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
  fps: number;
  loop: boolean;
  sheetFile: string;
}): string {
  const name = input.name.replace(/[^A-Za-z0-9_]/g, "_").slice(0, 40) || "anim";
  const frames = Math.max(1, Math.floor(input.frameCount));
  const speed = input.loop ? Math.max(0.01, frames / Math.max(1, input.fps)) : 0;
  const atlas = Array.from({ length: frames }, (_, i) => {
    const x = i * input.frameWidth;
    return `AtlasTexture,{
"atlas": ExtResource("2"),
"region": Rect2(${x}, 0, ${input.frameWidth}, ${input.frameHeight})
}`;
  });
  return `[gd_resource type="SpriteFrames" load_steps=3 format=3]

[ext_resource type="Texture2D" path="${input.sheetFile}" id="2"]

[sub_resource type="AtlasTexture" id="Atlas"]

[resource]
animations = [{
"frames": [${atlas.join(", ")}],
"loop": ${input.loop ? "true" : "false"},
"name": &"${name}",
"speed": ${speed.toFixed(4)}
}]
`;
}
