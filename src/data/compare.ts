/* ─────────────────────────────────────────────────────────────
   Comparison / alternatives data for /compare and /compare/[slug].

   Every competitor fact below was taken from the competitor's OWN
   pages (site, docs, pricing, official GitHub / itch.io) on the
   date in `checkedOn`. If a fact could not be verified it is left
   out or marked "Not listed on their site" — never guessed.
   Re-check before editing: competitor products change often.
   ───────────────────────────────────────────────────────────── */

export type CompareRow = { feature: string; spritelab: string; competitor: string };
export type CompareSource = { label: string; url: string };
export type CompareFaq = { q: string; a: string };

export type Comparison = {
  slug: string;
  competitor: string;
  competitorUrl: string;
  checkedOn: string;
  /** One-line positioning used on the overview page. */
  tagline: string;
  summary: string;
  rows: CompareRow[];
  chooseSpriteLabIf: string[];
  chooseCompetitorIf: string[];
  sources: CompareSource[];
  faq: CompareFaq[];
};

export const COMPARE_CHECKED_ON = "2026-10-08";
export const COMPARE_CHECKED_ON_LABEL = "8 Oct 2026";

/** SpriteLab's own facts, shared across every comparison. */
export const SPRITELAB_SUMMARY =
  "SpriteLab is an AI game asset generator for indie developers. Type a prompt and get a transparent PNG 2D sprite in one of 12 art styles — pixel art is placed on a real pixel grid with a limited palette. Any sprite can be animated into a sprite sheet and GIF, and you can also make seamless and animated tiles and icons. 3 free tries without an account, 10 credits on signup, paid plans from £5/month, commercial use included.";

const SL = {
  what: "2D game sprites, seamless tiles, animated tiles and icons as transparent PNGs",
  styles: "12 styles: pixel art (16-bit, HD, isometric), isometric, isometric cartoon, hand painted, anime, chibi, dark fantasy, cartoon, vector, realistic",
  pixel: "Yes — real pixel grid with a limited palette",
  animation: "Yes — any sprite to sprite sheet + GIF (4/6/9 key poses, smooth mode up to 18 frames, AI-suggested motions)",
  turnaround: "Turnaround animation; no 8-direction sets",
  tiles: "Seamless tiles and animated tiles; no autotile tilesets",
  threeD: "No",
  api: "No",
  mcp: "No",
  plugin: "No — web app",
  free: "3 tries without an account + 10 credits on signup",
  price: "From £5/month",
  commercial: "Yes",
  organise: "Projects with automatic folder sorting and ZIP export",
};

export const COMPARISONS: Comparison[] = [
  /* ═══ PixelLab ═══════════════════════════════════════════ */
  {
    slug: "spritelab-vs-pixellab",
    competitor: "PixelLab",
    competitorUrl: "https://www.pixellab.ai",
    checkedOn: COMPARE_CHECKED_ON,
    tagline: "Pixel-art specialist with directional characters, tilesets, an Aseprite extension, API and MCP.",
    summary:
      "PixelLab is a pixel-art-focused generator for indie game developers. Its site lists character sprites and animations, 4- and 8-directional views, connectable Wang tilesets and maps, UI elements, inpainting, an Aseprite extension, an API and an MCP integration. SpriteLab covers more art styles beyond pixel art and is built around fast prompt-to-sprite plus animation, but it has no API, no 8-direction sets and no autotile tilesets.",
    rows: [
      { feature: "What it generates", spritelab: SL.what, competitor: "Pixel art characters, animations, backgrounds, maps, tilesets and UI elements" },
      { feature: "Art styles", spritelab: SL.styles, competitor: "Pixel art (including isometric)" },
      { feature: "Pixel-accurate pixel art", spritelab: SL.pixel, competitor: "Yes — pixel-art-only product" },
      { feature: "Animation", spritelab: SL.animation, competitor: "Yes — text prompts, skeleton-based controls or automatic character creator" },
      { feature: "Directional views", spritelab: SL.turnaround, competitor: "Yes — 4 and 8 directional views" },
      { feature: "Tilesets", spritelab: SL.tiles, competitor: "Yes — connectable Wang tilesets (export to Wang, dual-grid 15 and 3x3 formats); requires a paid tier" },
      { feature: "Editing / inpainting", spritelab: "Yes — image editing on paid plans (Starter and up)", competitor: "Yes — inpainting with style-consistent generation" },
      { feature: "Editor plugin", spritelab: SL.plugin, competitor: "Yes — Aseprite extension (not available on the trial)" },
      { feature: "API", spritelab: SL.api, competitor: "Yes — priced per generation" },
      { feature: "MCP / vibe coding", spritelab: SL.mcp, competitor: "Yes" },
      { feature: "Free option", spritelab: SL.free, competitor: "Free trial, no credit card required" },
      { feature: "Paid pricing", spritelab: SL.price, competitor: "Subscription tiers (see their pricing page)" },
    ],
    chooseSpriteLabIf: [
      "You want styles beyond pixel art — hand painted, anime, chibi, vector, cartoon or realistic — from the same tool.",
      "You want to type a prompt and get a transparent PNG quickly, then animate it into a sprite sheet and GIF.",
      "You want to try it before signing up (3 free tries without an account).",
      "You like keeping assets in projects with automatic folder sorting and ZIP export.",
    ],
    chooseCompetitorIf: [
      "You need 4- or 8-directional character sets for a top-down game.",
      "You need connectable Wang / autotile tilesets and map building.",
      "You work inside Aseprite and want generation in your editor.",
      "You need an API or MCP integration to generate assets from code or an AI coding assistant.",
      "You only make pixel art and want inpainting and skeleton-based animation control.",
    ],
    sources: [
      { label: "PixelLab homepage", url: "https://www.pixellab.ai/" },
      { label: "PixelLab — Create tileset docs", url: "https://www.pixellab.ai/docs/tools/create-tileset" },
      { label: "PixelLab API", url: "https://www.pixellab.ai/pixellab-api" },
      { label: "PixelLab — Aseprite extension installation", url: "https://www.pixellab.ai/docs/installation" },
    ],
    faq: [
      {
        q: "Is SpriteLab a good PixelLab alternative?",
        a: "It depends on what you need. SpriteLab is a good fit if you want fast prompt-to-sprite generation in 12 art styles plus sprite sheet animation. PixelLab is the better choice if you need 8-directional characters, Wang tilesets, an Aseprite extension or an API — SpriteLab does not offer those.",
      },
      {
        q: "Does SpriteLab have an API or Aseprite plugin like PixelLab?",
        a: "No. SpriteLab is a web app only. PixelLab lists both an API and an Aseprite extension on its own site.",
      },
      {
        q: "Can both tools animate sprites?",
        a: "Yes. SpriteLab animates any sprite into a sprite sheet and GIF (4, 6 or 9 key poses, or a smooth mode up to 18 frames). PixelLab lists text-prompt, skeleton-based and automatic character animation.",
      },
    ],
  },

  /* ═══ Scenario ═══════════════════════════════════════════ */
  {
    slug: "spritelab-vs-scenario",
    competitor: "Scenario",
    competitorUrl: "https://www.scenario.com",
    checkedOn: COMPARE_CHECKED_ON,
    tagline: "Broad creative-production platform: image, video, 3D and audio, custom model training and workflows.",
    summary:
      "Scenario is a creative production platform for game studios, marketing teams and enterprises. Its site lists image, video, 3D and audio generation, custom model (LoRA) training on your own reference images, a node-based workflow editor, 650+ models, an API with SDKs and a Unity plugin. SpriteLab is much narrower: it focuses on 2D game sprites, animation and tiles for indie developers, with a simpler prompt-to-PNG flow.",
    rows: [
      { feature: "What it generates", spritelab: SL.what, competitor: "Images, video, 3D models and audio" },
      { feature: "Focus", spritelab: "2D game sprites for indie developers", competitor: "Creative production for game studios, marketing, e-commerce and enterprise teams" },
      { feature: "Pixel-accurate pixel art", spritelab: SL.pixel, competitor: "Not listed on their site" },
      { feature: "Sprite animation to sprite sheet", spritelab: SL.animation, competitor: "Not listed on their site" },
      { feature: "Custom model training", spritelab: "No", competitor: "Yes — train on 5–100 reference images (custom training on Pro and above)" },
      { feature: "Workflow builder", spritelab: "No", competitor: "Yes — visual node-based workflows" },
      { feature: "3D", spritelab: SL.threeD, competitor: "Yes" },
      { feature: "API / SDK", spritelab: SL.api, competitor: "Yes — API, SDKs, webhooks" },
      { feature: "Engine plugin", spritelab: "No", competitor: "Unity plugin" },
      { feature: "Free option", spritelab: SL.free, competitor: "Free plan: 50 daily credits, no card required" },
      { feature: "Paid pricing", spritelab: SL.price, competitor: "From $15/month billed monthly (less on annual billing)" },
      { feature: "Commercial use", spritelab: SL.commercial, competitor: "Yes on paid plans" },
    ],
    chooseSpriteLabIf: [
      "You are a solo or small indie team and just want game-ready 2D sprites without setting up models or workflows.",
      "You want pixel art on a real pixel grid with a limited palette.",
      "You want built-in sprite animation to sprite sheet + GIF.",
      "You want a lower starting price for a paid plan.",
    ],
    chooseCompetitorIf: [
      "You need to train a custom model on your studio's existing art style.",
      "You need 3D, video or audio as well as 2D images.",
      "You want an API, SDKs or a Unity plugin to build assets into your pipeline.",
      "You are a larger team that needs collaboration, automated workflows or enterprise controls.",
    ],
    sources: [
      { label: "Scenario homepage", url: "https://www.scenario.com/" },
      { label: "Scenario pricing", url: "https://www.scenario.com/pricing" },
    ],
    faq: [
      {
        q: "Is SpriteLab a Scenario alternative?",
        a: "For indie developers who mainly need 2D sprites, animation and tiles, yes. For studios that need custom model training, 3D, video, audio, an API or workflow automation, Scenario covers much more ground.",
      },
      {
        q: "Can I train SpriteLab on my own art style?",
        a: "No. SpriteLab offers 12 built-in art styles. Scenario lists custom model training on your own reference images.",
      },
    ],
  },

  /* ═══ Retro Diffusion ════════════════════════════════════ */
  {
    slug: "spritelab-vs-retro-diffusion",
    competitor: "Retro Diffusion",
    competitorUrl: "https://www.retrodiffusion.ai",
    checkedOn: COMPARE_CHECKED_ON,
    tagline: "Pixel-art models with pay-per-generation pricing, API, MCP and a one-time-purchase Aseprite extension.",
    summary:
      "Retro Diffusion makes pixel-art-specific AI models. Its official documentation lists sprites, animations, tilesets (including Wang tilesets and seamless tiles) and low-poly 3D models via a website and HTTP API, a hosted MCP server, and a separate Aseprite extension sold as a one-time purchase. Pricing on the web/API side is prepaid and pay-per-generation. SpriteLab covers 12 art styles (not just pixel art) on a monthly plan, but has no API, MCP or tileset autotiling.",
    rows: [
      { feature: "What it generates", spritelab: SL.what, competitor: "Pixel art images, animations, tilesets and low-poly 3D models" },
      { feature: "Art styles", spritelab: SL.styles, competitor: "Pixel art — 90+ styles listed in their MCP docs" },
      { feature: "Pixel-accurate pixel art", spritelab: SL.pixel, competitor: "Yes — grid-aligned pixels and controlled palettes" },
      { feature: "Animation", spritelab: SL.animation, competitor: "Yes — GIF or PNG sprite sheet (4 to 16 frames for advanced animations)" },
      { feature: "Directional views", spritelab: SL.turnaround, competitor: "Yes — \"Rotate\" generates the other seven directional views" },
      { feature: "Tilesets", spritelab: SL.tiles, competitor: "Yes — seamless tiles and Wang tilesets" },
      { feature: "3D", spritelab: SL.threeD, competitor: "Low-poly 3D models" },
      { feature: "API", spritelab: SL.api, competitor: "Yes — HTTP API" },
      { feature: "MCP", spritelab: SL.mcp, competitor: "Yes — hosted MCP server" },
      { feature: "Editor plugin", spritelab: SL.plugin, competitor: "Aseprite extension (runs locally, separate models)" },
      { feature: "Free option", spritelab: SL.free, competitor: "Starter credits for new accounts" },
      { feature: "Pricing model", spritelab: SL.price + " (subscription)", competitor: "Prepaid pay-per-generation; price varies by model (e.g. RD Fast about $0.03 per image). Aseprite extension $65 one-time (Lite $20)" },
    ],
    chooseSpriteLabIf: [
      "You want non-pixel styles too — hand painted, anime, chibi, vector, cartoon, realistic.",
      "You prefer a simple monthly plan with credits over a prepaid per-generation balance.",
      "You want sprites, animation, tiles and icons organised in projects with ZIP export.",
      "You want to try a few generations before creating an account.",
    ],
    chooseCompetitorIf: [
      "You only make pixel art and want a large range of pixel-specific styles and sizes.",
      "You need Wang tilesets or 8-direction rotations.",
      "You want an API or MCP server to generate from code or an AI assistant.",
      "You want an Aseprite extension you buy once and run locally.",
      "You prefer paying per generation with no subscription.",
    ],
    sources: [
      { label: "Retro Diffusion API examples (official GitHub)", url: "https://github.com/Retro-Diffusion/api-examples" },
      { label: "Retro Diffusion MCP server (official GitHub)", url: "https://github.com/Retro-Diffusion/retro-diffusion-mcp" },
      { label: "Retro Diffusion Aseprite extension (official itch.io)", url: "https://astropulse.itch.io/retrodiffusion" },
      { label: "Retro Diffusion website", url: "https://www.retrodiffusion.ai/" },
    ],
    faq: [
      {
        q: "Is SpriteLab a Retro Diffusion alternative?",
        a: "Partly. Both make real pixel art, but Retro Diffusion is pixel-art-only with an API, MCP, Wang tilesets and an Aseprite extension, while SpriteLab covers 12 art styles on a monthly plan and focuses on prompt-to-sprite plus animation.",
      },
      {
        q: "Is the Retro Diffusion Aseprite extension the same as their website?",
        a: "No. Retro Diffusion's own itch.io page says the extension and website are different tools using different models; the extension runs locally.",
      },
    ],
  },

  /* ═══ Leonardo AI ════════════════════════════════════════ */
  {
    slug: "spritelab-vs-leonardo-ai",
    competitor: "Leonardo AI",
    competitorUrl: "https://leonardo.ai",
    checkedOn: COMPARE_CHECKED_ON,
    tagline: "General-purpose AI image and video platform with many models and a production API.",
    summary:
      "Leonardo AI is a general-purpose creative platform. Its documentation lists image generation across many models (FLUX, GPT Image, Ideogram and others), video generation, plus audio, 3D and background-removal options, and a production REST API. It is not specific to games. SpriteLab is narrower: it is built for 2D game sprites with transparent backgrounds, real pixel-grid pixel art and sprite sheet animation.",
    rows: [
      { feature: "What it generates", spritelab: SL.what, competitor: "Images and video; docs also list audio, 3D and background removal" },
      { feature: "Focus", spritelab: "2D game sprites for indie developers", competitor: "General-purpose creative generation" },
      { feature: "Pixel-accurate pixel art", spritelab: SL.pixel, competitor: "Not listed on their site" },
      { feature: "Sprite animation to sprite sheet", spritelab: SL.animation, competitor: "Not listed on their site" },
      { feature: "Seamless game tiles", spritelab: SL.tiles, competitor: "Not listed on their site" },
      { feature: "Choice of models", spritelab: "SpriteLab picks the pipeline per style", competitor: "Yes — many third-party and in-house models" },
      { feature: "API", spritelab: SL.api, competitor: "Yes — REST API" },
      { feature: "Free option", spritelab: SL.free, competitor: "Free plan with 150 tokens per day (do not roll over)" },
      { feature: "Paid pricing", spritelab: SL.price, competitor: "Paid subscriptions and pay-as-you-go API (see their pricing page)" },
    ],
    chooseSpriteLabIf: [
      "You want sprites that drop straight into a game: transparent PNG, consistent framing, real pixel grid for pixel art.",
      "You want built-in animation to sprite sheet + GIF and seamless/animated tiles.",
      "You don't want to pick between dozens of general models and tune prompts for game assets.",
    ],
    chooseCompetitorIf: [
      "You need general images, marketing art or video as well as game assets.",
      "You want to choose between many image and video models yourself.",
      "You need an API.",
      "You want a free plan that refreshes daily.",
    ],
    sources: [
      { label: "Leonardo AI developer docs", url: "https://docs.leonardo.ai/" },
      { label: "Leonardo AI help — Tokens FAQ", url: "https://intercom.help/leonardo-ai/en/articles/9044700-tokens-frequently-asked-questions" },
      { label: "Leonardo AI pricing", url: "https://leonardo.ai/pricing" },
    ],
    faq: [
      {
        q: "Is SpriteLab a Leonardo AI alternative for game sprites?",
        a: "If you mainly need 2D game sprites, animations and tiles, SpriteLab is purpose-built for that. If you need general images, video or an API, Leonardo AI covers a much broader range.",
      },
      {
        q: "Does Leonardo AI have a free plan?",
        a: "Leonardo's help centre says free users get a daily allowance of 150 tokens that does not accumulate. SpriteLab gives 3 tries without an account and 10 credits on signup.",
      },
    ],
  },

  /* ═══ Ludo.ai ════════════════════════════════════════════ */
  {
    slug: "spritelab-vs-ludo-ai",
    competitor: "Ludo.ai",
    competitorUrl: "https://ludo.ai",
    checkedOn: COMPARE_CHECKED_ON,
    tagline: "All-in-one game asset suite: sprites, 3D, audio, video, motion presets, API and MCP.",
    summary:
      "Ludo.ai is an AI asset generator for game developers. Its site lists sprites and sprite sheet animations with 641+ motion presets, 2D assets in 30+ styles, 3D models with auto-rigging, audio, video, an image editor, and a CLI, MCP, REST API and Unity plugin. SpriteLab focuses on 2D sprites, animation and tiles with real pixel-grid pixel art and a lower starting price, but does not do 3D, audio, video or offer an API.",
    rows: [
      { feature: "What it generates", spritelab: SL.what, competitor: "Sprites and animations, 2D assets (UI, VFX, textures, tiles, icons, backgrounds), 3D models, audio and video" },
      { feature: "Art styles", spritelab: SL.styles, competitor: "30+ art styles" },
      { feature: "Pixel-accurate pixel art", spritelab: SL.pixel, competitor: "Not listed on their site" },
      { feature: "Sprite animation", spritelab: SL.animation, competitor: "Yes — sprite sheets with 641+ motion presets across 34 categories" },
      { feature: "3D", spritelab: SL.threeD, competitor: "Yes — PBR textures and auto-rigging" },
      { feature: "Audio / video", spritelab: "No", competitor: "Yes" },
      { feature: "API / MCP / CLI", spritelab: "No", competitor: "Yes — REST API (Pro plan and above), MCP, CLI" },
      { feature: "Engine plugin", spritelab: "No", competitor: "Unity plugin" },
      { feature: "Free option", spritelab: SL.free, competitor: "30 credits to start, no credit card required" },
      { feature: "Paid pricing", spritelab: SL.price, competitor: "From $15/month (Indie plan)" },
    ],
    chooseSpriteLabIf: [
      "You mainly need 2D sprites and want pixel art on a real pixel grid with a limited palette.",
      "You want a lower starting price for a paid plan.",
      "You want to try generations before creating an account.",
      "You prefer a focused 2D tool over a large all-in-one suite.",
    ],
    chooseCompetitorIf: [
      "You need 3D models, audio or video alongside 2D sprites.",
      "You want a large library of preset motions for sprite animation.",
      "You need an API, MCP, CLI or Unity plugin.",
      "You are a studio that needs multiple seats and collaboration.",
    ],
    sources: [
      { label: "Ludo.ai homepage", url: "https://ludo.ai/" },
      { label: "Ludo.ai pricing", url: "https://ludo.ai/pricing" },
    ],
    faq: [
      {
        q: "Is SpriteLab a Ludo.ai alternative?",
        a: "For 2D sprites, animation and tiles, yes — at a lower starting price. If you also need 3D, audio, video, an API or a Unity plugin, Ludo.ai covers more.",
      },
      {
        q: "Do SpriteLab and Ludo.ai both make sprite sheets?",
        a: "Yes. SpriteLab animates any sprite into a sprite sheet and GIF with AI-suggested motions; Ludo.ai lists sprite sheets with a library of 641+ motion presets.",
      },
    ],
  },
];

export function getComparison(slug: string): Comparison | undefined {
  return COMPARISONS.find((c) => c.slug === slug);
}
