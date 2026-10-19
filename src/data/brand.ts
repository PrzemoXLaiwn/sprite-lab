// =============================================================================
// What SpriteLab is — one definition for structured data, llms.txt and copy
// =============================================================================
// Search engines and AI assistants describe a product from what its own pages
// say. Keep every sentence here true and in sync with the app (features,
// styles, exports). Pixel art is one style, not the whole product.
// =============================================================================

export const SITE_URL = "https://www.sprite-lab.com";

/** One sentence: the entity definition. */
export const BRAND_DEFINITION =
  "SpriteLab is an AI 2D game asset creator for game developers: it creates, animates and edits game artwork, from pixel art to hand-painted and realistic styles.";

/** A short paragraph for structured data and llms.txt. */
export const BRAND_SUMMARY =
  "SpriteLab is a web app for creating 2D game assets with AI. Describe a character, creature, weapon, item, icon, prop or tile and get a transparent PNG in one of 12 styles, from 16-bit pixel art to hand-painted and realistic. Animate any sprite into a sprite sheet and GIF, turn it to face 4 or 8 directions, edit it by describing the change, or upload your own sprite to animate and edit it. Exports work in Unity, Godot and GameMaker.";

/** Features that exist in the app today (structured data featureList, llms.txt). */
export const FEATURE_LIST = [
  "Text-to-sprite generation for 2D games: characters, creatures, weapons, armor, items, icons, props and seamless tiles",
  "12 art styles: Pixel 16-bit, Pixel HD, Isometric Pixel, Isometric, Isometric Cartoon, Hand Painted, Anime, Chibi, Dark Fantasy, Cartoon, Vector and Realistic",
  "Transparent PNG output; pixel styles snapped to a real pixel grid with a limited palette",
  "Sprite animation: idle, walk, run, attack, jump, cast, hurt and custom motions, 4 to 18 frames",
  "Sprite sheet PNG, single frames and GIF export",
  "4- and 8-direction views and a 4-direction walk sheet",
  "Engine pack: Godot SpriteFrames (.tres), Unity frame folders, GameMaker strips and per-frame hitboxes (hitboxes.json)",
  "Edit a sprite by describing the change, with an optional brush mask",
  "Upload your own sprite to animate or edit it",
  "Match the style of an existing sprite",
  "Background removal and upscaling (free pixel-perfect upscaling; AI upscaling on Pro and Studio)",
  "Projects with automatic folder sorting and ZIP export",
  "Commercial use of generated assets",
] as const;
