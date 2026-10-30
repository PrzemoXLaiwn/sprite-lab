// =============================================================================
// "What you'll learn / what you need" box shown at the top of every guide.
// Keep it short and concrete: outcomes the reader can check, and the tools or
// knowledge the guide assumes. Every guide in GUIDES must have an entry
// (guide-intros.test.ts).
// =============================================================================

export interface GuideIntro {
  /** Concrete outcomes, 3–4 items. */
  learn: string[];
  /** What the reader needs before starting, 1–3 items. */
  needs: string[];
}

export const GUIDE_INTROS: Record<string, GuideIntro> = {
  "how-to-make-a-sprite-sheet-with-ai": {
    learn: [
      "Why animating one base sprite beats prompting for a whole sheet",
      "How to pick frame counts and a playback speed for each motion",
      "How to check a strip's frame size before slicing it",
      "The mistakes that make sheets jitter, slide or loop wrongly",
    ],
    needs: ["A 2D engine such as Unity, Godot or GameMaker", "Optional: a pixel editor (Aseprite, LibreSprite) for clean-up"],
  },
  "how-to-make-pixel-art-sprites-for-games": {
    learn: [
      "How to choose a sprite size and an internal resolution that scale cleanly",
      "How to build a limited palette with hue-shifted ramps",
      "How to keep pixels sharp in Unity and Godot",
      "How to fit generated sprites to your grid without mixels",
    ],
    needs: ["A pixel editor such as Aseprite or LibreSprite", "A rough idea of your game's camera and view"],
  },
  "how-to-import-sprite-sheets-into-unity": {
    learn: [
      "How to slice a sprite sheet with Grid By Cell Size",
      "Which import settings keep pixel art sharp",
      "How to build Animation clips from sheets or frame folders",
      "How to fix blur, bleeding, jitter and wrong slice counts",
    ],
    needs: ["Unity 2022 LTS or Unity 6 with the 2D Sprite package", "A sprite sheet with equal-size frames"],
  },
  "how-to-use-sprite-sheets-in-godot-4": {
    learn: [
      "How to animate a sheet with AnimatedSprite2D and SpriteFrames",
      "When to use Sprite2D with AnimationPlayer instead",
      "The project settings for pixel-perfect 2D",
      "How to load a ready-made SpriteFrames .tres file",
    ],
    needs: ["Godot 4.x (integer scaling needs 4.2 or later)", "A sprite sheet with equal-size frames"],
  },
  "how-to-make-seamless-tiles-for-2d-games": {
    learn: [
      "How to make a tile wrap with the offset trick",
      "How to hide repetition with variants and decoration",
      "How to set tiles up in Godot 4 TileMapLayer and Unity Tile Palette",
      "Why thin lines appear between tiles in the engine, and the fix",
    ],
    needs: ["An image editor with an offset/wrap filter (GIMP, Photoshop, Aseprite)", "Godot 4.3+ or Unity with the 2D Tilemap packages"],
  },
  "how-to-keep-ai-game-art-consistent": {
    learn: [
      "Which style decisions to lock before generating anything",
      "How to write a prompt template that keeps framing constant",
      "A ten-minute check for size, palette, outline and light",
      "The habits that make AI asset sets drift",
    ],
    needs: ["A short style sheet for your game (the guide shows what goes in it)", "Optional: Aseprite for palette clean-up"],
  },
  "how-to-import-sprite-strips-into-gamemaker": {
    learn: [
      "How the _stripN file name slices a strip automatically",
      "Why Bottom Centre origins and manual masks prevent bugs",
      "How to switch animations and keep pixel art sharp in GML",
      "How to read per-frame hitboxes from JSON",
    ],
    needs: ["GameMaker (current IDE)", "A horizontal strip with equal-width frames"],
  },
  "pixel-art-sprite-sizes-for-games": {
    learn: [
      "What 16, 32 and 64 pixel sprites are each good for",
      "How many tiles fit on screen at common resolutions",
      "How character size relates to tile size",
      "How to check a sprite's real pixel size",
    ],
    needs: ["A target screen resolution for your game", "No art skills required"],
  },
  "how-many-frames-per-sprite-animation": {
    learn: [
      "Typical frame counts and fps for idle, walk, run, attack and jump",
      "Which poses carry each motion",
      "How to match a walk cycle to movement speed",
      "When adding frames stops helping",
    ],
    needs: ["Basic familiarity with your engine's animation settings"],
  },
  "how-to-make-a-4-direction-top-down-rpg-character": {
    learn: [
      "How to order the rows of a 4-direction sheet",
      "When mirroring left from right works and when it does not",
      "How to choose the facing from player input",
      "When eight directions are worth the extra work",
    ],
    needs: ["A top-down or three-quarter view game", "A character sprite to start from"],
  },
  "hitboxes-and-hurtboxes-from-sprite-sheets": {
    learn: [
      "The difference between hitboxes, hurtboxes and collision boxes",
      "How startup, active and recovery frames map to sprite frames",
      "How to store boxes per frame in JSON",
      "How to apply them in Godot 4, Unity and GameMaker",
    ],
    needs: ["An action or fighting game with attack animations", "Basic scripting in your engine"],
  },
  "sprite-sheet-layout-and-texture-atlases": {
    learn: [
      "When to use strips, grids or packed atlases",
      "How padding and extrusion stop texture bleeding",
      "Texture size limits and whether powers of two still matter",
      "Naming and folder conventions that keep imports simple",
    ],
    needs: ["Sprites or frames you want to pack", "Any 2D engine"],
  },
  "what-is-a-sprite-in-gaming": {
    learn: [
      "What a sprite is and what isn't one",
      "Where the word comes from and why old games flicker",
      "The difference between a sprite, a sprite sheet and a texture atlas",
      "What to check before a sprite goes into your game",
    ],
    needs: ["No experience needed"],
  },
  "how-to-prompt-an-ai-sprite-generator": {
    learn: [
      "Which words belong in a sprite prompt and which the tool already decides",
      "How to set the camera without contradicting it in the sentence",
      "A reusable prompt skeleton for a whole cast",
      "Why a second pose should be an animation, not a new prompt",
    ],
    needs: ["A target camera: side view, front view or top-down", "One art style for the game"],
  },
  "can-you-use-ai-sprites-in-a-commercial-game": {
    learn: [
      "When SpriteLab sprites can go in a game you sell",
      "Why a free-plan file stays non-commercial after you subscribe",
      "The difference between selling a game and selling a sprite pack",
      "What changed on 17 October 2026",
    ],
    needs: ["The terms, if you need the clauses rather than this summary"],
  },
  "free-game-sprites-without-an-artist": {
    learn: [
      "When to draw, when to use a CC0 pack, and when to generate",
      "How to check a 'free' pack's licence before you ship",
      "What SpriteLab's free credit grant does and does not allow",
      "A weekend order that gets a loop on screen",
    ],
    needs: ["No art budget required", "A licence check on anything you did not draw"],
  },
  "how-to-make-an-8-direction-walk-cycle": {
    learn: [
      "Which five directions to draw and which three to mirror",
      "A row order and the input angle for each direction",
      "How many frames each direction needs and why they must match",
      "How to pick the facing from input in Godot and Unity",
    ],
    needs: ["A pixel editor such as Aseprite or LibreSprite", "A standing turnaround of your character"],
  },
};
