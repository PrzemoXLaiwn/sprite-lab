"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Download,
  RefreshCw,
  Loader2,
  Dices,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Wand2,
  Rocket,
  Flame,
  Crown,
  Sparkles,
  Gem,
  Zap,
  Lightbulb,
  Box,
  Image as ImageIcon,
  Cuboid,
  Clock,
  FileBox,
  ExternalLink,
  Play,
  Upload,
  X,
  Camera,
  MessageSquare,
  Bug,
  Star,
  Send,
  AlertCircle,
  Settings2,
} from "lucide-react";
import { triggerCreditsRefresh } from "@/components/dashboard/CreditsDisplay";
import { generateRandomPrompt, generatePromptSuggestions } from "@/lib/random-prompts";
import { FeedbackPopup } from "@/components/dashboard/FeedbackPopup";
import { PremiumFeatures } from "@/components/generate/PremiumFeatures";
import { ItemBuilder } from "@/components/generate/ItemBuilder";
import { CategoryExamples } from "@/components/generate/CategoryExamples";
import { InfoTooltip, GENERATOR_INFO } from "@/components/ui/InfoTooltip";
import { StyleButton } from "@/components/generate/StylePreviewTooltip";
import { PromptHistory } from "@/components/generate/PromptHistory";
import { usePromptHistory } from "@/hooks/usePromptHistory";
import {
  ALL_CATEGORIES,
  STYLES_2D_UI,
  STYLES_3D,
  MODELS_3D,
  QUALITY_3D_PRESETS,
  ICON_MAP,
  hasBuilder,
} from "@/config";

// ===========================================
// 3D FILE FORMAT HELPERS
// ===========================================
const is3DFormat = (url: string | null): boolean => {
  if (!url) return false;
  const lower = url.toLowerCase();
  return [".ply", ".glb", ".gltf", ".obj", ".fbx", ".usdz"].some(ext => lower.includes(ext));
};

const get3DFormat = (url: string | null): string => {
  if (!url) return "GLB";
  const lower = url.toLowerCase();
  if (lower.includes(".ply")) return "PLY";
  if (lower.includes(".glb") || lower.includes(".gltf")) return "GLB";
  if (lower.includes(".obj")) return "OBJ";
  if (lower.includes(".fbx")) return "FBX";
  if (lower.includes(".usdz")) return "USDZ";
  return "GLB";
};

// ===========================================
// 3D MODEL VIEWER COMPONENT
// ===========================================
function Model3DViewer({ 
  modelUrl, 
  thumbnailUrl, 
  videoUrl,
  format 
}: { 
  modelUrl: string; 
  thumbnailUrl?: string;
  videoUrl?: string;
  format: string;
}) {
  const [showVideo, setShowVideo] = useState(false);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center relative">
      {/* Thumbnail or Video Preview */}
      {thumbnailUrl && !showVideo && (
        <div className="absolute inset-0 overflow-hidden">
          <img 
            src={thumbnailUrl} 
            alt="3D Preview" 
            className="w-full h-full object-contain opacity-30"
          />
        </div>
      )}

      {/* Video Preview */}
      {videoUrl && showVideo && (
        <div className="absolute inset-0 overflow-hidden">
          <video 
            src={videoUrl} 
            autoPlay 
            loop 
            muted 
            className="w-full h-full object-contain"
          />
        </div>
      )}

      {/* Content Overlay */}
      <div className="relative z-10">
        <div className="relative mb-4">
          <div className="absolute inset-0 bg-[#c084fc]/30 rounded-full blur-xl animate-pulse" />
          <FileBox className="relative w-20 h-20 text-[#c084fc]" />
        </div>
        
        <h3 className="text-xl font-bold text-white mb-2">
          3D Model Ready!
        </h3>
        
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#c084fc]/20 border border-[#c084fc]/40 mb-4">
          <Cuboid className="w-4 h-4 text-[#c084fc]" />
          <span className="text-[#c084fc] font-mono font-bold">{format}</span>
        </div>
        
        <p className="text-sm text-[#a0a0b0] max-w-xs mb-4">
          Download to view in Unity, Unreal, Blender, or Godot
        </p>

        {/* Video toggle button */}
        {videoUrl && (
          <button
            onClick={() => setShowVideo(!showVideo)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors mx-auto"
          >
            <Play className="w-4 h-4" />
            {showVideo ? "Hide Preview" : "Show 360° Preview"}
          </button>
        )}
        
        {/* Compatibility badges */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-[#a0a0b0]">
          <div className="flex items-center gap-1 justify-center">
            <Check className="w-3 h-3 text-[#00ff88]" />
            Unity
          </div>
          <div className="flex items-center gap-1 justify-center">
            <Check className="w-3 h-3 text-[#00ff88]" />
            Unreal
          </div>
          <div className="flex items-center gap-1 justify-center">
            <Check className="w-3 h-3 text-[#00ff88]" />
            Blender
          </div>
          <div className="flex items-center gap-1 justify-center">
            <Check className="w-3 h-3 text-[#00ff88]" />
            Godot
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================
// MAIN COMPONENT
// ===========================================
export default function GeneratePage() {
  const [mode, setMode] = useState<"2d" | "3d">("2d");
  const [categoryId, setCategoryId] = useState<string>("");
  const [subcategoryId, setSubcategoryId] = useState<string>("");
  const [styleId, setStyleId] = useState<string>("PIXEL_ART_16");
  const [style3DId, setStyle3DId] = useState<string>("STYLIZED");
  const [model3D, setModel3D] = useState<string>("rodin");
  const [quality3D, setQuality3D] = useState<string>("medium"); // low, medium, high
  const [prompt, setPrompt] = useState<string>("");
  const [seed, setSeed] = useState<string>("");

  // Output Controls State (2D)
  const [outputSize, setOutputSize] = useState<string>("512");
  const [bgOption, setBgOption] = useState<string>("transparent");
  const [outlineOption, setOutlineOption] = useState<string>("none");
  const [paletteOption, setPaletteOption] = useState<string>("original");
  const [qualityPreset, setQualityPreset] = useState<string>("normal"); // draft, normal, hd
  const [batchSize, setBatchSize] = useState<number>(1); // 1-4 variations
  
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [error, setError] = useState<string>("");

  // Result state
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [generatedFormat, setGeneratedFormat] = useState<string | null>(null);
  const [is3DModel, setIs3DModel] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [lastSeed, setLastSeed] = useState<number | null>(null);
  const [copiedSeed, setCopiedSeed] = useState(false);

  // Batch generation results
  const [batchResults, setBatchResults] = useState<Array<{ imageUrl: string; seed: number }>>([]);
  const [selectedBatchIndex, setSelectedBatchIndex] = useState<number>(0);

  // 3D Generation streaming state
  const [currentStep, setCurrentStep] = useState(0);
  const [stepTitle, setStepTitle] = useState("");
  const [stepDescription, setStepDescription] = useState("");
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Image upload state (for 3D from custom image)
  const [inputMode, setInputMode] = useState<"text" | "image">("text");
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Feedback modal state
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState<"bug" | "feature" | "other">("bug");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackEmail, setFeedbackEmail] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  // No credits modal state
  const [showNoCredits, setShowNoCredits] = useState(false);

  // Random prompt suggestions
  const [promptSuggestions, setPromptSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Generation count for smart feedback popup
  const [sessionGenerationCount, setSessionGenerationCount] = useState(0);

  // Prompt mismatch warning
  const [promptMismatchWarning, setPromptMismatchWarning] = useState<string | null>(null);

  // Quick Generate mode (simplified UI)
  const [quickMode, setQuickMode] = useState(true);

  // Show advanced options toggle
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Auto-suggested category from prompt
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);

  // Premium Features State
  const [enableSpriteSheet, setEnableSpriteSheet] = useState(false);
  const [animationTypeId, setAnimationTypeId] = useState("WALK");
  const [enableStyleMix, setEnableStyleMix] = useState(false);
  const [style2Id, setStyle2Id] = useState("");
  const [style1Weight, setStyle1Weight] = useState(70);
  const [colorPaletteId, setColorPaletteId] = useState("");

  // Item Builder State (Advanced Mode for Weapons/Armor)
  const [builderEnabled, setBuilderEnabled] = useState(false);
  const [builderPrompt, setBuilderPrompt] = useState("");

  // User plan for premium features
  const [userPlan, setUserPlan] = useState<string>("FREE");

  // Prompt history hook
  const {
    history: promptHistory,
    addToHistory: addPromptToHistory,
    removeFromHistory: removePromptFromHistory,
    clearHistory: clearPromptHistory,
  } = usePromptHistory();

  const currentCategory = ALL_CATEGORIES.find(c => c.id === categoryId);
  const currentSubcategory = currentCategory?.subcategories.find(s => s.id === subcategoryId);
  const categorySupports3D = currentCategory?.supports3D ?? true;
  const selected3DModel = MODELS_3D.find(m => m.id === model3D) || MODELS_3D[0];

  // Load generation count from localStorage on mount
  useEffect(() => {
    const savedCount = localStorage.getItem("spritelab_generation_count");
    if (savedCount) {
      setSessionGenerationCount(parseInt(savedCount, 10));
    }
  }, []);

  // Fetch user plan for premium features
  useEffect(() => {
    const fetchUserPlan = async () => {
      try {
        const res = await fetch("/api/user/stats");
        if (res.ok) {
          const data = await res.json();
          setUserPlan(data.plan || "FREE");
        }
      } catch (err) {
        console.error("Failed to fetch user plan:", err);
      }
    };
    fetchUserPlan();
  }, []);

  // Generate prompt suggestions when subcategory changes
  useEffect(() => {
    if (categoryId && subcategoryId) {
      const suggestions = generatePromptSuggestions(categoryId, subcategoryId, 6);
      setPromptSuggestions(suggestions);
    } else {
      setPromptSuggestions([]);
    }
  }, [categoryId, subcategoryId]);

  // Keywords that suggest different categories - COMPREHENSIVE LIST
  const categoryKeywords: Record<string, string[]> = {
    // WEAPONS - swords, axes, bows, guns, etc.
    WEAPONS: [
      "sword", "axe", "bow", "staff", "wand", "gun", "pistol", "rifle", "dagger", "spear", "hammer", "mace", "blade", "knife", "scythe", "crossbow",
      "katana", "rapier", "saber", "claymore", "longsword", "shortsword", "greatsword", "broadsword", "cutlass", "machete", "falchion",
      "battleaxe", "hatchet", "tomahawk", "pickaxe", "warhammer", "maul", "flail", "morningstar", "club", "baton",
      "halberd", "glaive", "pike", "trident", "lance", "javelin", "polearm", "naginata",
      "longbow", "shortbow", "compound bow", "recurve bow", "arbalest",
      "wizard staff", "magic staff", "scepter", "rod", "cane", "orb staff",
      "shotgun", "sniper", "blaster", "musket", "revolver", "smg", "assault rifle", "cannon", "bazooka",
      "shuriken", "kunai", "throwing knife", "boomerang", "chakram",
      "weapon", "armament", "firearm", "melee"
    ],
    // ARMOR - helmets, chest armor, shields, accessories
    ARMOR: [
      "helmet", "armor", "shield", "gauntlet", "boots", "gloves", "ring", "amulet", "cape", "crown", "chestplate", "leggings",
      "plate armor", "chainmail", "leather armor", "scale armor", "brigandine", "cuirass", "breastplate", "hauberk",
      "tower shield", "round shield", "buckler", "kite shield", "heater shield", "pavise",
      "knight helmet", "viking helm", "samurai helmet", "barbute", "sallet", "great helm", "wizard hat", "hood", "tiara", "circlet",
      "pauldrons", "vambraces", "greaves", "sabatons", "cuisses", "gorget", "coif",
      "bracers", "hand wraps", "armguard", "wristband",
      "necklace", "pendant", "brooch", "earring", "belt", "sash", "cloak", "mantle", "robe", "tunic", "vest",
      "equipment", "gear", "protective"
    ],
    // CONSUMABLES - potions, food, scrolls
    CONSUMABLES: [
      "potion", "food", "scroll", "bread", "apple", "drink", "elixir", "flask", "vial", "meat", "cheese",
      "health potion", "mana potion", "stamina potion", "poison", "antidote", "buff potion", "speed potion",
      "pie", "cake", "soup", "stew", "fish", "chicken", "turkey", "ham", "steak", "sausage", "egg", "milk", "wine", "beer", "ale", "mead", "juice", "water bottle",
      "fruit", "vegetable", "carrot", "tomato", "potato", "corn", "grapes", "orange", "banana", "berry", "strawberry", "cherry",
      "spell scroll", "treasure map", "ancient tome", "recipe", "blueprint", "letter", "document", "parchment",
      "consumable", "edible", "drinkable", "usable item"
    ],
    // RESOURCES - gems, ores, crafting materials
    RESOURCES: [
      "gem", "ore", "wood", "stone", "crystal", "herb", "flower", "mushroom", "diamond", "ruby", "gold bar", "ingot", "coal",
      "emerald", "sapphire", "amethyst", "topaz", "opal", "pearl", "onyx", "jade", "garnet", "turquoise", "quartz",
      "iron ore", "copper ore", "silver ore", "gold ore", "mithril", "adamantite", "titanium", "platinum", "bronze",
      "wood log", "plank", "lumber", "timber", "oak", "pine", "birch", "mahogany", "ebony",
      "marble", "granite", "obsidian", "sandstone", "limestone", "slate", "brick", "cobblestone",
      "magical herb", "rare flower", "healing herb", "poison herb", "lotus", "rose", "lily", "daisy", "sunflower",
      "magic mushroom", "truffle", "moss", "vine", "root", "seed", "leaf", "bark", "sap", "resin",
      "dragon scale", "fang", "feather", "claw", "horn", "bone", "hide", "leather", "fur", "wool", "silk", "thread", "cloth", "fabric",
      "soul gem", "magic dust", "essence", "mana crystal", "arcane shard", "elemental core", "enchanting material",
      "material", "resource", "crafting", "ingredient", "component"
    ],
    // QUEST_ITEMS - keys, artifacts, containers, collectibles
    QUEST_ITEMS: [
      "key", "chest", "artifact", "coin", "trophy", "crate", "backpack", "map", "compass", "letter", "book",
      "golden key", "skeleton key", "crystal key", "ancient key", "rusty key", "master key", "dungeon key",
      "treasure chest", "wooden crate", "barrel", "pouch", "satchel", "bag", "sack", "box", "case", "container",
      "ancient idol", "holy grail", "magic mirror", "orb", "relic", "sacred item", "legendary item", "cursed item",
      "gold coin", "silver coin", "medal", "badge", "token", "stamp", "seal", "emblem", "insignia", "crest",
      "quest item", "collectible", "loot", "treasure", "reward", "bounty"
    ],
    // CHARACTERS - heroes, enemies, NPCs, bosses
    CHARACTERS: [
      "knight", "mage", "wizard", "warrior", "rogue", "archer", "hero", "villager", "guard", "merchant", "npc", "person", "man", "woman", "boy", "girl", "king", "queen", "princess",
      "paladin", "barbarian", "berserker", "monk", "cleric", "priest", "priestess", "druid", "shaman", "necromancer", "warlock", "sorcerer", "sorceress",
      "thief", "assassin", "ranger", "hunter", "scout", "ninja", "samurai", "pirate", "viking", "gladiator", "soldier", "general", "captain",
      "prince", "nobleman", "peasant", "farmer", "blacksmith", "shopkeeper", "innkeeper", "bartender", "baker", "tailor", "alchemist", "herbalist",
      "elder", "sage", "oracle", "prophet", "bard", "minstrel", "jester", "fool", "beggar", "thug", "bandit", "raider",
      "child", "baby", "teenager", "adult", "old man", "old woman", "grandmother", "grandfather",
      "human", "humanoid", "adventurer", "traveler", "explorer", "wanderer", "pilgrim",
      "character", "sprite", "avatar", "player", "enemy", "boss", "minion", "henchman"
    ],
    // CREATURES - animals, mythical beasts, pets, elementals
    CREATURES: [
      "dragon", "wolf", "bear", "cat", "dog", "phoenix", "griffin", "slime", "elemental", "golem", "animal", "beast", "monster",
      "horse", "deer", "rabbit", "bunny", "fox", "lion", "tiger", "elephant", "bird", "eagle", "owl", "snake", "spider", "bat",
      "rat", "mouse", "frog", "fish", "shark", "whale", "dolphin", "turtle", "crab", "octopus", "squid", "jellyfish",
      "bee", "butterfly", "ant", "beetle", "dragonfly", "moth", "wasp", "scorpion", "centipede",
      "cow", "pig", "sheep", "chicken", "duck", "goose", "turkey", "rooster", "donkey", "mule", "ox", "bull",
      "gorilla", "monkey", "ape", "chimpanzee", "orangutan", "panda", "koala", "kangaroo", "platypus",
      "crocodile", "alligator", "lizard", "chameleon", "gecko", "iguana", "komodo",
      "unicorn", "pegasus", "centaur", "minotaur", "satyr", "harpy", "siren", "sphinx", "manticore",
      "werewolf", "vampire", "demon", "devil", "angel", "fairy", "pixie", "sprite", "nymph", "dryad",
      "elf", "dwarf", "gnome", "halfling", "hobbit", "orc", "troll", "giant", "ogre", "cyclops", "titan",
      "goblin", "kobold", "gremlin", "imp", "ghoul", "wraith", "specter", "ghost", "spirit", "phantom", "poltergeist",
      "skeleton", "zombie", "mummy", "lich", "death knight", "undead", "revenant", "wight",
      "merfolk", "mermaid", "merman", "triton", "sea serpent", "leviathan", "kraken",
      "hydra", "chimera", "basilisk", "cockatrice", "wyvern", "drake", "wyrm", "serpent",
      "cerberus", "hellhound", "fenrir", "dire wolf",
      "pet", "companion", "familiar", "mount", "steed", "creature", "critter", "wildlife"
    ],
    // ENVIRONMENT - trees, rocks, buildings, props, dungeon
    ENVIRONMENT: [
      "tree", "rock", "house", "building", "bridge", "tower", "dungeon", "grass", "bush", "fence", "castle", "cabin", "cave",
      "oak tree", "pine tree", "palm tree", "willow", "birch tree", "cherry tree", "apple tree", "dead tree", "stump",
      "boulder", "cliff", "mountain", "hill", "crystal formation", "stalagmite", "stalactite",
      "cottage", "villa", "mansion", "palace", "fortress", "keep", "citadel", "temple", "church", "chapel", "shrine", "monastery",
      "shop", "store", "tavern", "inn", "pub", "bakery", "blacksmith shop", "apothecary", "library", "bank", "guild hall",
      "barn", "stable", "farm", "windmill", "watermill", "sawmill", "mine entrance", "warehouse", "factory",
      "wall", "gate", "door", "window", "roof", "chimney", "balcony", "porch", "stairs", "ladder",
      "chair", "table", "bed", "desk", "shelf", "bookshelf", "cabinet", "wardrobe", "dresser", "mirror", "painting",
      "barrel", "crate", "box", "sack", "basket", "pot", "vase", "urn", "jar", "bottle", "cup", "plate", "bowl",
      "torch", "lantern", "candle", "chandelier", "lamp", "brazier", "campfire", "fireplace", "firepit",
      "sign", "signpost", "banner", "flag", "statue", "fountain", "well", "bench", "gravestone", "tombstone",
      "spike trap", "lever", "switch", "pressure plate", "altar", "pedestal", "cage", "chain", "rope",
      "environment", "scenery", "background", "prop", "furniture", "decoration", "structure"
    ],
    // ISOMETRIC - dedicated 2.5D isometric assets
    ISOMETRIC: [
      "isometric", "iso building", "iso house", "iso tree", "iso prop", "iso tile",
      "strategy game", "city builder", "clash of clans", "age of empires", "sim city", "civilization",
      "iso cottage", "iso villa", "iso castle", "iso tower", "iso wall", "iso gate",
      "iso shop", "iso tavern", "iso blacksmith", "iso farm", "iso windmill", "iso mine",
      "iso barracks", "iso fortress", "iso monument", "iso temple", "iso wonder",
      "iso oak", "iso pine", "iso palm", "iso bush", "iso flowers", "iso crops",
      "iso lamp post", "iso fountain", "iso bench", "iso statue", "iso well",
      "iso cliff", "iso water", "iso path", "iso road", "iso bridge",
      "iso grass", "iso sand", "iso snow", "iso dirt",
      "2.5d", "top down", "bird's eye", "aerial view", "diorama"
    ],
    // TILESETS - tileable textures and platforms
    TILESETS: [
      "tile", "tileset", "tilemap", "tileable", "seamless", "repeating", "pattern",
      "grass tile", "dirt tile", "stone tile", "sand tile", "snow tile", "water tile", "lava tile",
      "floor tile", "ground tile", "terrain tile", "path tile", "road tile", "cobblestone tile",
      "stone wall", "brick wall", "wooden wall", "dungeon wall", "castle wall", "cave wall",
      "grass platform", "stone platform", "wooden platform", "floating island", "cloud platform",
      "window tile", "door tile", "crack overlay", "moss overlay", "decoration tile",
      "autotile", "terrain", "ground", "floor", "platform", "platformer"
    ],
    // UI_ELEMENTS - buttons, icons, frames, bars, panels
    UI_ELEMENTS: [
      "button", "icon", "frame", "bar", "cursor", "interface", "menu", "hud", "health bar", "mana bar",
      "play button", "start button", "menu button", "settings button", "close button", "back button", "next button",
      "sword icon", "potion icon", "gold icon", "gem icon", "coin icon", "key icon", "heart icon", "star icon",
      "skill icon", "ability icon", "spell icon", "buff icon", "debuff icon", "status icon",
      "inventory icon", "map icon", "quest icon", "achievement icon", "notification icon",
      "hp bar", "mp bar", "xp bar", "stamina bar", "energy bar", "progress bar", "loading bar",
      "dialog frame", "menu frame", "tooltip frame", "window frame", "border", "panel",
      "inventory panel", "equipment panel", "storage panel", "shop panel", "crafting panel",
      "slot", "item slot", "equipment slot", "inventory grid", "slot grid", "hotbar",
      "ui", "gui", "user interface", "game ui", "mobile ui"
    ],
    // EFFECTS - visual effects, particles, magic
    EFFECTS: [
      "fire", "explosion", "lightning", "magic effect", "spark", "smoke", "particle", "spell", "aura",
      "fireball", "flame", "blaze", "inferno", "ember", "fire burst", "fire trail",
      "ice", "frost", "freeze", "ice spike", "snowflake", "blizzard", "ice shard",
      "lightning bolt", "thunder", "electric", "shock", "spark", "static", "chain lightning",
      "water", "splash", "wave", "bubble", "rain", "drop", "puddle", "waterfall",
      "wind", "tornado", "cyclone", "gust", "breeze", "air slash",
      "earth", "rock throw", "earthquake", "mud", "sand storm", "dust cloud",
      "light", "holy", "divine", "radiant", "beam", "ray", "shine", "glow", "flash", "flare",
      "dark", "shadow", "void", "corruption", "curse", "hex", "doom",
      "heal", "healing", "restore", "regenerate", "cure", "purify", "cleanse",
      "buff", "shield", "barrier", "protection", "ward", "enchant", "empower",
      "debuff", "poison", "bleed", "burn", "slow", "stun", "freeze effect", "petrify",
      "slash", "cut", "hit", "impact", "strike", "combo", "critical hit",
      "blood", "gore", "splatter",
      "teleport", "portal", "warp", "blink", "phase",
      "summon", "conjure", "spawn", "appear", "vanish", "disappear",
      "dust", "sparkle", "glitter", "shimmer", "twinkle", "floating", "hover",
      "effect", "vfx", "fx", "visual effect", "magic", "magical"
    ],
    // PROJECTILES - arrows, bullets, magic projectiles
    PROJECTILES: [
      "arrow", "bullet", "projectile", "missile", "shot", "bolt",
      "fire arrow", "ice arrow", "poison arrow", "explosive arrow", "magic arrow",
      "cannonball", "rocket", "grenade", "bomb", "mortar", "shell",
      "energy shot", "laser", "plasma", "beam projectile",
      "fireball projectile", "ice bolt", "shadow ball", "arcane missile", "magic orb",
      "thrown knife", "shuriken projectile", "boomerang projectile", "chakram projectile",
      "stone", "rock throw", "pebble",
      "spear throw", "javelin throw", "dart",
      "bullet trail", "tracer", "projectile trail"
    ],
  };

  // Auto-suggest category from prompt keywords
  useEffect(() => {
    if (!prompt.trim()) {
      setSuggestedCategory(null);
      return;
    }

    const lowerPrompt = prompt.toLowerCase();

    // Find which category the prompt likely belongs to
    // Priority order: more specific categories first (WEAPONS, ARMOR before RESOURCES)
    const categoryPriority = [
      "WEAPONS", "ARMOR", "CHARACTERS", "CREATURES", "CONSUMABLES",
      "ENVIRONMENT", "PROJECTILES", "EFFECTS", "UI_ELEMENTS",
      "ISOMETRIC", "TILESETS", "QUEST_ITEMS", "RESOURCES"
    ];

    let detectedCategory: string | null = null;
    let highestScore = 0;

    for (const category of categoryPriority) {
      const keywords = categoryKeywords[category];
      if (!keywords) continue;

      let score = 0;
      for (const keyword of keywords) {
        if (lowerPrompt.includes(keyword)) {
          // Longer keywords = higher score (more specific match)
          score += keyword.length;
        }
      }

      // Give priority bonus to categories earlier in the list
      const priorityBonus = (categoryPriority.length - categoryPriority.indexOf(category)) * 0.5;
      const finalScore = score + (score > 0 ? priorityBonus : 0);

      if (finalScore > highestScore) {
        highestScore = finalScore;
        detectedCategory = category;
      }
    }

    if (detectedCategory && highestScore > 0) {
      setSuggestedCategory(detectedCategory);
      // In Quick Mode: Always auto-select the detected category
      if (quickMode) {
        setCategoryId(detectedCategory);
        // Auto-select first subcategory
        const cat = ALL_CATEGORIES.find(c => c.id === detectedCategory);
        if (cat && cat.subcategories.length > 0) {
          setSubcategoryId(cat.subcategories[0].id);
        }
      }
    } else {
      setSuggestedCategory(null);
      // In Quick Mode with no detected category - default to CHARACTERS (most generic)
      // This ensures the user can always generate something
      if (quickMode && prompt.trim()) {
        setCategoryId("CHARACTERS");
        const cat = ALL_CATEGORIES.find(c => c.id === "CHARACTERS");
        if (cat && cat.subcategories.length > 0) {
          setSubcategoryId(cat.subcategories[0].id);
        }
      }
    }
  }, [prompt, quickMode]);

  // Check prompt vs category mismatch (only in Advanced Mode)
  useEffect(() => {
    // In Quick Mode, we auto-adjust category, so no warnings needed
    if (quickMode || !prompt.trim() || !categoryId) {
      setPromptMismatchWarning(null);
      return;
    }

    const lowerPrompt = prompt.toLowerCase();

    // Find which category the prompt likely belongs to
    let detectedCategory: string | null = null;
    let matchedKeyword: string | null = null;

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      for (const keyword of keywords) {
        if (lowerPrompt.includes(keyword)) {
          if (category !== categoryId) {
            detectedCategory = category;
            matchedKeyword = keyword;
            break;
          }
        }
      }
      if (detectedCategory) break;
    }

    if (detectedCategory && matchedKeyword) {
      const suggestedCatName = ALL_CATEGORIES.find(c => c.id === detectedCategory)?.name || detectedCategory;
      const currentCatName = ALL_CATEGORIES.find(c => c.id === categoryId)?.name || categoryId;
      setPromptMismatchWarning(`Your prompt mentions "${matchedKeyword}" which sounds like ${suggestedCatName}, but you selected ${currentCatName}. The result may not match your expectation.`);
    } else {
      setPromptMismatchWarning(null);
    }
  }, [prompt, categoryId, quickMode]);

  // Progress simulation for 2D only (3D uses real streaming)
  useEffect(() => {
    if (loading && mode === "2d") {
      const messages = [
        "Initializing...",
        "Generating sprite...",
        "Applying style...",
        "Finalizing...",
      ];
      let messageIndex = 0;

      const messageInterval = setInterval(() => {
        if (messageIndex < messages.length - 1) {
          messageIndex++;
          setProgressMessage(messages[messageIndex]);
        }
      }, 4000);

      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) return prev;
          return Math.min(prev + Math.random() * 4, 95);
        });
      }, 1000);

      return () => {
        clearInterval(messageInterval);
        clearInterval(progressInterval);
      };
    }
  }, [loading, mode]);

  const handleCategoryChange = (newCategoryId: string) => {
    setCategoryId(newCategoryId);
    setSubcategoryId("");
    // Reset builder when category changes
    setBuilderEnabled(false);
    setBuilderPrompt("");
    const newCategory = ALL_CATEGORIES.find(c => c.id === newCategoryId);
    if (mode === "3d" && !newCategory?.supports3D) {
      setMode("2d");
    }
  };

  const handleModeChange = (newMode: "2d" | "3d") => {
    if (newMode === "3d" && !categorySupports3D) return;
    setMode(newMode);
    // Reset results when switching mode
    setGeneratedUrl(null);
    setIs3DModel(false);
    setThumbnailUrl(null);
    setVideoUrl(null);
    setError("");
  };

  const generateRandomSeed = () => {
    const newSeed = Math.floor(Math.random() * 2147483647);
    setSeed(newSeed.toString());
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadedImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to server
    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setUploadedImageUrl(data.url);
      setInputMode("image");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploadedImagePreview(null);
    } finally {
      setUploading(false);
    }
  };

  const clearUploadedImage = () => {
    setUploadedImageUrl(null);
    setUploadedImagePreview(null);
    setInputMode("text");
  };

  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) return;

    setFeedbackSending(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: feedbackType,
          message: feedbackText.trim(),
          email: feedbackEmail.trim() || undefined,
          context: JSON.stringify({
            page: "generate",
            mode,
            categoryId,
            subcategoryId,
            styleId: mode === "2d" ? styleId : style3DId,
            error: error || undefined,
          }),
        }),
      });

      if (response.ok) {
        setFeedbackSent(true);
        setTimeout(() => {
          setShowFeedback(false);
          setFeedbackText("");
          setFeedbackEmail("");
          setFeedbackSent(false);
        }, 2000);
      }
    } catch (err) {
      console.error("Failed to send feedback:", err);
    } finally {
      setFeedbackSending(false);
    }
  };

  const handleGenerate = async () => {
    // Determine which prompt to use: builder prompt (if enabled and has content) or manual prompt
    const effectivePrompt = (builderEnabled && builderPrompt.trim()) ? builderPrompt.trim() : prompt.trim();

    // In Quick Mode, auto-assign default category if not detected
    let finalCategoryId = categoryId;
    let finalSubcategoryId = subcategoryId;

    if (quickMode && !finalCategoryId && effectivePrompt) {
      // Default to CHARACTERS if no category detected
      finalCategoryId = "CHARACTERS";
      const cat = ALL_CATEGORIES.find(c => c.id === "CHARACTERS");
      finalSubcategoryId = cat?.subcategories[0]?.id || "HERO";
    }

    if (!finalCategoryId) {
      setError("Please select a category first! Your prompt doesn't match any known category - scroll down to pick one.");
      return;
    }
    if (!finalSubcategoryId) {
      setError("Please select a type/subcategory!");
      return;
    }

    // For 3D mode with image upload, prompt is optional
    if (mode === "2d" && !effectivePrompt) { setError("Enter a description or use the Advanced Builder!"); return; }
    if (mode === "3d" && !effectivePrompt && !uploadedImageUrl) { setError("Enter a description or upload an image!"); return; }

    setLoading(true);
    setProgress(0);
    setError("");
    setGeneratedUrl(null);
    setGeneratedFormat(null);
    setIs3DModel(false);
    setThumbnailUrl(null);
    setVideoUrl(null);
    setLastSeed(null);
    setProgressMessage("Initializing...");
    setCurrentStep(0);
    setStepTitle("");
    setStepDescription("");
    setReferenceImageUrl(null);
    setCompletedSteps([]);

    try {
      if (mode === "2d") {
        // Use batch API if generating multiple variations
        const useBatchApi = batchSize > 1;
        const apiUrl = useBatchApi ? "/api/generate-batch" : "/api/generate";

        // Frontend timeout (3 minutes for batch, 2 minutes for single)
        const timeoutMs = useBatchApi ? 180000 : 120000;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        // 2D generation - standard fetch (or batch)
        let response: Response;
        try {
          response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              prompt: effectivePrompt,
              categoryId: finalCategoryId,
              subcategoryId: finalSubcategoryId,
              styleId,
              seed: seed ? Number(seed) : undefined,
              // Quality preset (draft/normal/hd)
              qualityPreset,
              // Batch size (for batch API)
              ...(useBatchApi && { batchSize }),
              // Premium features
              enableStyleMix,
              style2Id: enableStyleMix ? style2Id : undefined,
              style1Weight: enableStyleMix ? style1Weight : undefined,
              colorPaletteId: colorPaletteId || undefined,
            }),
          });
        } catch (fetchError) {
          clearTimeout(timeoutId);
          if (fetchError instanceof Error && fetchError.name === "AbortError") {
            throw new Error("Request timed out. Please try again.");
          }
          throw fetchError;
        }
        clearTimeout(timeoutId);

        const data = await response.json();
        if (!response.ok) {
          // Check if it's a no-credits error
          if (data.noCredits || response.status === 402) {
            setShowNoCredits(true);
            return;
          }
          throw new Error(data.error || "Generation failed");
        }

        setProgress(100);
        setProgressMessage("Complete!");

        if (useBatchApi && data.images && data.images.length > 0) {
          // Batch generation - store all results
          setBatchResults(data.images);
          setSelectedBatchIndex(0);
          setGeneratedUrl(data.images[0].imageUrl);
          setLastSeed(data.images[0].seed);
          if (data.images[0].seed) setSeed(data.images[0].seed.toString());
        } else {
          // Single generation
          setBatchResults([]);
          setGeneratedUrl(data.imageUrl);
          setLastSeed(data.seed);
          if (data.seed) setSeed(data.seed.toString());
        }

        setGeneratedFormat("png");
        setIs3DModel(false);

        // Save to prompt history
        const currentStyle = STYLES_2D_UI.find(s => s.id === styleId);
        addPromptToHistory(
          effectivePrompt,
          styleId,
          currentStyle?.name || styleId,
          "2d"
        );
      } else {
        // 3D generation - use streaming SSE
        const response = await fetch("/api/generate-3d-stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: effectivePrompt || undefined,
            categoryId: finalCategoryId,
            subcategoryId: finalSubcategoryId,
            modelId: model3D,
            styleId: style3DId,
            qualityPreset: quality3D, // low, medium, high
            seed: seed ? Number(seed) : undefined,
            customImageUrl: uploadedImageUrl || undefined,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          // Check if it's a no-credits error
          if (errorData.noCredits || response.status === 402) {
            setShowNoCredits(true);
            return;
          }
          throw new Error(errorData.error || "Generation failed");
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) throw new Error("No response stream");

        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              const eventType = line.slice(7);
              const dataLineIndex = lines.indexOf(line) + 1;
              if (dataLineIndex < lines.length && lines[dataLineIndex].startsWith("data: ")) {
                try {
                  const data = JSON.parse(lines[dataLineIndex].slice(6));

                  switch (eventType) {
                    case "step":
                      setCurrentStep(data.step);
                      setStepTitle(data.title);
                      setStepDescription(data.description);
                      setProgress((data.step / data.total) * 100 * (data.completed ? 1 : 0.8));
                      setProgressMessage(data.title);
                      if (data.completed) {
                        setCompletedSteps(prev => [...prev, data.step]);
                      }
                      break;

                    case "reference":
                      setReferenceImageUrl(data.imageUrl);
                      setLastSeed(data.seed);
                      if (data.seed) setSeed(data.seed.toString());
                      break;

                    case "complete":
                      setProgress(100);
                      setProgressMessage("Complete!");
                      setGeneratedUrl(data.modelUrl);
                      setGeneratedFormat(data.format || "glb");
                      setIs3DModel(true);
                      setThumbnailUrl(data.referenceImageUrl);

                      // Save to prompt history (3D)
                      const current3DStyle = STYLES_3D.find(s => s.id === style3DId);
                      addPromptToHistory(
                        effectivePrompt,
                        style3DId,
                        current3DStyle?.name || style3DId,
                        "3d"
                      );
                      break;

                    case "error":
                      if (data.noCredits) {
                        setShowNoCredits(true);
                        setLoading(false);
                        return;
                      }
                      throw new Error(data.message);
                  }
                } catch (parseError) {
                  // Skip parse errors for incomplete data
                }
              }
            }
          }
        }
      }

      triggerCreditsRefresh();

      // Increment generation count for smart feedback popup
      const newCount = sessionGenerationCount + 1;
      setSessionGenerationCount(newCount);
      localStorage.setItem("spritelab_generation_count", newCount.toString());

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong";
      setError(errorMessage);
      setProgressMessage("");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedUrl) return;

    try {
      const response = await fetch(generatedUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      
      // Use correct extension
      const ext = generatedFormat?.toLowerCase() || (mode === "2d" ? "png" : "glb");
      a.download = `spritelab-${mode}-${categoryId}-${lastSeed || Date.now()}.${ext}`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download failed:", err);
      window.open(generatedUrl, "_blank");
    }
  };

  const copySeed = () => {
    if (lastSeed) {
      navigator.clipboard.writeText(lastSeed.toString());
      setCopiedSeed(true);
      setTimeout(() => setCopiedSeed(false), 2000);
    }
  };

  const getCredits = () => mode === "2d" ? batchSize : selected3DModel.credits;

  return (
    <div className="min-h-screen bg-[#030305] relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 gradient-mesh pointer-events-none" />
      <div className="fixed inset-0 grid-pattern pointer-events-none opacity-50" />
      <div className="fixed top-20 left-10 w-96 h-96 bg-[#00ff88]/10 rounded-full blur-[120px] animate-glow-pulse pointer-events-none" />
      <div className="fixed bottom-20 right-10 w-80 h-80 bg-[#00d4ff]/10 rounded-full blur-[100px] animate-glow-pulse pointer-events-none" style={{ animationDelay: "1s" }} />

      <div className="relative z-10 p-4 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-4 mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[#00ff88] to-[#00d4ff] rounded-xl blur-lg opacity-60 animate-pulse-glow" />
              <div className="relative w-14 h-14 rounded-xl gradient-primary flex items-center justify-center">
                <Zap className="w-8 h-8 text-[#030305]" />
              </div>
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-display font-black gradient-text neon-text">
                ASSET GENERATOR
              </h1>
              <p className="text-sm text-[#a0a0b0]">Create 2D sprites & 3D models for your games</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-3 space-y-5">

            {/* STEP 0: OUTPUT TYPE - 2D vs 3D (ALWAYS FIRST) */}
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#00ff88] to-[#c084fc] flex items-center justify-center text-white font-bold text-sm">
                  <Zap className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-white">Output Type</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {/* 2D Button */}
                <button
                  onClick={() => handleModeChange("2d")}
                  className={`relative p-4 rounded-xl border-2 transition-all ${
                    mode === "2d"
                      ? "border-[#00ff88] bg-[#00ff88]/10 neon-glow"
                      : "border-[#2a2a3d] hover:border-[#00ff88]/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      mode === "2d" ? "bg-[#00ff88] text-[#030305]" : "bg-[#1a1a28] text-[#00ff88]"
                    }`}>
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <span className={`font-bold text-lg block ${mode === "2d" ? "text-[#00ff88]" : "text-white"}`}>2D Sprite</span>
                      <span className="text-sm text-[#a0a0b0]">PNG • 1 credit</span>
                    </div>
                  </div>
                </button>

                {/* 3D Button */}
                <button
                  onClick={() => handleModeChange("3d")}
                  className={`relative p-4 rounded-xl border-2 transition-all ${
                    mode === "3d"
                      ? "border-[#c084fc] bg-[#c084fc]/10"
                      : "border-[#2a2a3d] hover:border-[#c084fc]/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      mode === "3d" ? "bg-[#c084fc] text-[#030305]" : "bg-[#1a1a28] text-[#c084fc]"
                    }`}>
                      <Cuboid className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <span className={`font-bold text-lg block ${mode === "3d" ? "text-[#c084fc]" : "text-white"}`}>3D Model</span>
                      <span className="text-sm text-[#a0a0b0]">GLB • {selected3DModel.credits} credits</span>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* QUICK MODE TOGGLE */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#00ff88] to-[#c084fc] flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-white">Quick Generate</span>
              </div>
              <button
                onClick={() => setQuickMode(!quickMode)}
                className={`relative w-14 h-7 rounded-full transition-all ${
                  quickMode ? "bg-[#00ff88]" : "bg-[#2a2a3d]"
                }`}
              >
                <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${
                  quickMode ? "left-8" : "left-1"
                }`} />
              </button>
            </div>

            {/* STEP 1: PROMPT (ALWAYS FIRST) */}
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-[#030305] font-bold text-sm">1</div>
                  <h3 className="font-semibold text-white">Describe Your Asset</h3>
                  <InfoTooltip {...GENERATOR_INFO.prompt} />
                </div>
                {/* Prompt History */}
                {promptHistory.length > 0 && (
                  <PromptHistory
                    history={promptHistory}
                    onSelect={(item) => {
                      setPrompt(item.prompt);
                      if (item.mode === "2d") {
                        setMode("2d");
                        setStyleId(item.styleId);
                      } else {
                        setMode("3d");
                        setStyle3DId(item.styleId);
                      }
                    }}
                    onRemove={removePromptFromHistory}
                    onClear={clearPromptHistory}
                    maxItems={5}
                  />
                )}
              </div>

              <div className="relative">
                <Input
                  placeholder="e.g. golden sword with glowing runes, magical healing potion, fire dragon..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="h-14 text-base input-gaming pr-12"
                  autoFocus
                />
                <Wand2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#00ff88]" />
              </div>

              {/* Auto-detected category suggestion - Only show in Advanced Mode when category not yet selected */}
              {!quickMode && suggestedCategory && !categoryId && (
                <div className="mt-3 p-3 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#00ff88]" />
                    <span className="text-sm text-[#00ff88]">
                      Detected: <strong>{ALL_CATEGORIES.find(c => c.id === suggestedCategory)?.name}</strong>
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setCategoryId(suggestedCategory);
                      const cat = ALL_CATEGORIES.find(c => c.id === suggestedCategory);
                      if (cat && cat.subcategories.length > 0) {
                        setSubcategoryId(cat.subcategories[0].id);
                      }
                    }}
                    className="text-xs px-3 py-1 rounded-full bg-[#00ff88] text-[#030305] font-semibold hover:opacity-90"
                  >
                    Use This
                  </button>
                </div>
              )}

              {/* Quick Mode: Show detected category as info (not warning) */}
              {quickMode && suggestedCategory && categoryId && (
                <div className="mt-3 p-2 rounded-lg bg-[#00ff88]/5 border border-[#00ff88]/20 flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-[#00ff88]" />
                  <span className="text-xs text-[#00ff88]">
                    Auto-detected: <strong>{ALL_CATEGORIES.find(c => c.id === categoryId)?.name}</strong>
                  </span>
                </div>
              )}

              {/* Prompt Category Mismatch Warning - Only in Advanced Mode */}
              {!quickMode && promptMismatchWarning && (
                <div className="mt-3 p-3 rounded-lg bg-[#ff9500]/10 border border-[#ff9500]/30 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-[#ff9500] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-[#ff9500]">{promptMismatchWarning}</p>
                </div>
              )}

              {/* Quick Prompt Presets */}
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-3 h-3 text-[#a0a0b0]" />
                  <span className="text-xs text-[#a0a0b0]">Quick start:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "⚔️ Weapon", prompt: "legendary golden sword with glowing blue runes, crystal handle" },
                    { label: "🏠 Building", prompt: "medieval stone cottage with thatched roof, chimney smoke, flower garden" },
                    { label: "🧙 Character", prompt: "wizard with purple robes, long white beard, holding magical staff" },
                    { label: "💎 Icon", prompt: "shiny red health potion bottle, glowing liquid, cork stopper" },
                    { label: "🌲 Environment", prompt: "mystical forest clearing with ancient oak tree, glowing mushrooms" },
                    { label: "👾 Monster", prompt: "cute slime creature, green translucent body, friendly expression" },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => setPrompt(preset.prompt)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70 hover:bg-white/10 hover:border-[#00ff88]/30 hover:text-[#00ff88] transition-all"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pro tip */}
              <div className="mt-3 p-3 rounded-lg bg-[#00d4ff]/10 border border-[#00d4ff]/20 flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-[#00d4ff] mt-0.5 shrink-0" />
                <span className="text-xs text-[#00d4ff]">
                  Be specific! "golden sword with ruby gems, glowing blade" works better than "sword"
                </span>
              </div>
            </div>

            {/* STEP 2: Art Style (2D) - Moved up */}
            {mode === "2d" && (
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#00ff88] to-[#00d4ff] flex items-center justify-center text-[#030305] font-bold text-sm">2</div>
                  <h3 className="font-semibold text-white">Art Style</h3>
                  <InfoTooltip {...GENERATOR_INFO.artStyle} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {STYLES_2D_UI.map((style) => (
                    <StyleButton
                      key={style.id}
                      style={style}
                      isSelected={styleId === style.id}
                      onClick={() => setStyleId(style.id)}
                      showPreviewOnHover={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* OUTPUT CONTROLS (2D only) */}
            {mode === "2d" && (
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#c084fc] to-[#00d4ff] flex items-center justify-center">
                    <Settings2 className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-semibold text-white">Output Settings</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#c084fc]/20 text-[#c084fc]">New</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Quality Preset */}
                  <div className="col-span-2">
                    <label className="text-xs text-[#a0a0b0] mb-2 block">Quality</label>
                    <div className="flex gap-2">
                      {[
                        { id: "draft", label: "Draft", desc: "Fast (~3s)", emoji: "⚡", steps: 15, guidance: 2.5 },
                        { id: "normal", label: "Normal", desc: "Balanced (~5s)", emoji: "✨", steps: 25, guidance: 3.0 },
                        { id: "hd", label: "HD", desc: "Best (~10s)", emoji: "💎", steps: 35, guidance: 3.5 },
                      ].map((quality) => (
                        <button
                          key={quality.id}
                          onClick={() => setQualityPreset(quality.id)}
                          className={`flex-1 p-3 rounded-xl text-center transition-all border ${
                            qualityPreset === quality.id
                              ? "border-[#00ff88] bg-[#00ff88]/10"
                              : "border-[#2a2a3d] hover:border-[#00ff88]/50"
                          }`}
                        >
                          <div className="text-xl mb-1">{quality.emoji}</div>
                          <div className={`text-sm font-medium ${qualityPreset === quality.id ? "text-[#00ff88]" : "text-white"}`}>
                            {quality.label}
                          </div>
                          <div className="text-[10px] text-[#a0a0b0]">{quality.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Batch Size - Generate Multiple Variations */}
                  <div className="col-span-2">
                    <label className="text-xs text-[#a0a0b0] mb-2 block flex items-center gap-2">
                      Variations
                      <span className="px-1.5 py-0.5 rounded bg-[#c084fc]/20 text-[#c084fc] text-[10px]">Pro</span>
                    </label>
                    <div className="flex gap-2">
                      {[
                        { count: 1, label: "1x", desc: "Single", credits: 1 },
                        { count: 2, label: "2x", desc: "Pair", credits: 2 },
                        { count: 3, label: "3x", desc: "Triple", credits: 3 },
                        { count: 4, label: "4x", desc: "Quad", credits: 4 },
                      ].map((option) => (
                        <button
                          key={option.count}
                          onClick={() => setBatchSize(option.count)}
                          className={`flex-1 p-2 rounded-xl text-center transition-all border ${
                            batchSize === option.count
                              ? "border-[#c084fc] bg-[#c084fc]/10"
                              : "border-[#2a2a3d] hover:border-[#c084fc]/50"
                          }`}
                        >
                          <div className={`text-lg font-bold ${batchSize === option.count ? "text-[#c084fc]" : "text-white"}`}>
                            {option.label}
                          </div>
                          <div className="text-[10px] text-[#a0a0b0]">{option.credits} credit{option.credits > 1 ? "s" : ""}</div>
                        </button>
                      ))}
                    </div>
                    {batchSize > 1 && (
                      <p className="text-[10px] text-[#c084fc] mt-2 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Generate {batchSize} unique variations with different seeds
                      </p>
                    )}
                  </div>

                  {/* Output Size */}
                  <div>
                    <label className="text-xs text-[#a0a0b0] mb-2 block">Size</label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: "64", label: "64px" },
                        { id: "128", label: "128px" },
                        { id: "256", label: "256px" },
                        { id: "512", label: "512px" },
                      ].map((size) => (
                        <button
                          key={size.id}
                          onClick={() => setOutputSize(size.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            outputSize === size.id
                              ? "bg-[#00ff88] text-[#030305]"
                              : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          {size.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Background */}
                  <div>
                    <label className="text-xs text-[#a0a0b0] mb-2 block">Background</label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: "transparent", label: "None", emoji: "🔲" },
                        { id: "white", label: "White", emoji: "⬜" },
                        { id: "black", label: "Black", emoji: "⬛" },
                      ].map((bg) => (
                        <button
                          key={bg.id}
                          onClick={() => setBgOption(bg.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                            bgOption === bg.id
                              ? "bg-[#00d4ff] text-[#030305]"
                              : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          <span>{bg.emoji}</span>
                          {bg.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Outline */}
                  <div>
                    <label className="text-xs text-[#a0a0b0] mb-2 block">Outline</label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: "none", label: "None" },
                        { id: "thin", label: "Thin" },
                        { id: "medium", label: "Medium" },
                        { id: "thick", label: "Thick" },
                      ].map((outline) => (
                        <button
                          key={outline.id}
                          onClick={() => setOutlineOption(outline.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            outlineOption === outline.id
                              ? "bg-[#c084fc] text-[#030305]"
                              : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          {outline.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color Palette */}
                  <div>
                    <label className="text-xs text-[#a0a0b0] mb-2 block">Color Palette</label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: "original", label: "Full" },
                        { id: "limited16", label: "16 colors" },
                        { id: "limited8", label: "8 colors" },
                        { id: "gameboy", label: "Gameboy" },
                      ].map((palette) => (
                        <button
                          key={palette.id}
                          onClick={() => setPaletteOption(palette.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            paletteOption === palette.id
                              ? "bg-[#ffd93d] text-[#030305]"
                              : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          {palette.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Active settings summary */}
                <div className="mt-4 pt-3 border-t border-[#2a2a3d] flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 rounded bg-[#00ff88]/10 text-[#00ff88]">{outputSize}x{outputSize}</span>
                  <span className="px-2 py-1 rounded bg-[#00d4ff]/10 text-[#00d4ff]">
                    {bgOption === "transparent" ? "Transparent BG" : bgOption === "white" ? "White BG" : "Black BG"}
                  </span>
                  {outlineOption !== "none" && (
                    <span className="px-2 py-1 rounded bg-[#c084fc]/10 text-[#c084fc]">{outlineOption} outline</span>
                  )}
                  {paletteOption !== "original" && (
                    <span className="px-2 py-1 rounded bg-[#ffd93d]/10 text-[#ffd93d]">{paletteOption}</span>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: Category (Optional - can be auto-detected) */}
            {!quickMode && (
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#00d4ff] flex items-center justify-center text-[#030305] font-bold text-sm">{mode === "2d" ? "3" : "2"}</div>
                  <h3 className="font-semibold text-white">Category</h3>
                  <InfoTooltip {...GENERATOR_INFO.category} />
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#00ff88]/20 text-[#00ff88]">Optional</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {ALL_CATEGORIES.map((cat) => {
                    const Icon = ICON_MAP[cat.icon] || Box;
                    const isSelected = categoryId === cat.id;
                    const isSuggested = suggestedCategory === cat.id && !categoryId;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => handleCategoryChange(cat.id)}
                        className={`group relative p-3 rounded-xl text-center transition-all duration-300 ${
                          isSelected
                            ? "neon-border bg-[#00ff88]/10"
                            : isSuggested
                              ? "border-2 border-dashed border-[#00ff88]/50 bg-[#00ff88]/5"
                              : "border border-transparent hover:border-[#00ff88]/30 hover:bg-white/5"
                        }`}
                      >
                        {cat.supports3D && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#c084fc] flex items-center justify-center" title="Supports 3D">
                            <Box className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                        <div className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center mb-2 transition-all ${
                          isSelected
                            ? "gradient-primary shadow-lg neon-glow"
                            : "bg-[#1a1a28] group-hover:bg-[#2a2a3d]"
                        }`}>
                          <Icon className={`w-5 h-5 ${isSelected ? "text-[#030305]" : "text-[#00ff88]"}`} />
                        </div>
                        <span className={`text-xs font-medium ${isSelected ? "text-[#00ff88]" : "text-[#a0a0b0] group-hover:text-white"}`}>
                          {cat.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="text-xs text-[#a0a0b0] mt-3 flex items-center gap-1">
                  <Box className="w-3 h-3 text-[#c084fc]" />
                  Purple badge = supports 3D generation
                </div>
              </div>
            )}

            {/* Subcategory - only when not in quick mode and category selected */}
            {!quickMode && currentCategory && (
              <div className="glass-card rounded-2xl p-5 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#c084fc] flex items-center justify-center text-white font-bold text-sm">{mode === "2d" ? "4" : "3"}</div>
                  <h3 className="font-semibold text-white">Type</h3>
                  <InfoTooltip {...GENERATOR_INFO.subcategory} />
                  <ChevronRight className="w-4 h-4 text-[#a0a0b0]" />
                  <span className="text-sm text-[#00ff88]">{currentCategory.name}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {currentCategory.subcategories.map((sub) => {
                    const isSelected = subcategoryId === sub.id;
                    return (
                      <button
                        key={sub.id}
                        onClick={() => setSubcategoryId(sub.id)}
                        className={`p-3 rounded-xl text-left transition-all duration-200 border ${
                          isSelected
                            ? "border-[#00d4ff] bg-[#00d4ff]/10"
                            : "border-[#2a2a3d] hover:border-[#00d4ff]/50 hover:bg-white/5"
                        }`}
                      >
                        <span className={`font-medium text-sm ${isSelected ? "text-[#00d4ff]" : "text-white"}`}>{sub.name}</span>
                        <span className="text-xs text-[#a0a0b0] block mt-1 truncate">
                          {sub.examples.slice(0, 3).join(", ")}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Example gallery for selected category/subcategory */}
                <CategoryExamples
                  categoryId={categoryId}
                  subcategoryId={subcategoryId}
                  onPromptClick={(p) => setPrompt(p)}
                />
              </div>
            )}

            {/* 3D MODE SECTIONS */}
            {mode === "3d" && (
              <>
                {/* 3D Style Selection */}
                <div className="glass-card rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#c084fc] to-[#00d4ff] flex items-center justify-center text-white font-bold text-sm">2</div>
                    <h3 className="font-semibold text-white">Visual Style</h3>
                    <InfoTooltip {...GENERATOR_INFO.artStyle} />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {STYLES_3D.map((style) => {
                      const isSelected = style3DId === style.id;
                      return (
                        <button
                          key={style.id}
                          onClick={() => setStyle3DId(style.id)}
                          className={`p-3 rounded-xl text-center transition-all duration-200 border ${
                            isSelected
                              ? "border-[#c084fc] bg-[#c084fc]/10"
                              : "border-[#2a2a3d] hover:border-[#c084fc]/50 hover:bg-white/5"
                          }`}
                        >
                          <div className="text-2xl mb-1">{style.emoji}</div>
                          <span className={`text-xs font-medium block ${isSelected ? "text-[#c084fc]" : "text-white"}`}>
                            {style.name}
                          </span>
                          <span className="text-[10px] text-[#a0a0b0] block mt-0.5">{style.description}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3D Engine Selection */}
                <div className="glass-card rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-[#c084fc] flex items-center justify-center text-white font-bold text-sm">3</div>
                    <h3 className="font-semibold text-white">3D Engine</h3>
                  </div>
                  <div className="space-y-3">
                    {MODELS_3D.map((model) => {
                      const isSelected = model3D === model.id;
                      return (
                        <button
                          key={model.id}
                          onClick={() => setModel3D(model.id)}
                          className={`w-full p-4 rounded-xl text-left transition-all duration-200 border-2 ${
                            isSelected
                              ? "border-[#c084fc] bg-[#c084fc]/10"
                              : "border-[#2a2a3d] hover:border-[#c084fc]/50"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`font-bold ${isSelected ? "text-[#c084fc]" : "text-white"}`}>{model.name}</span>
                              {model.recommended && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-[#00ff88]/20 text-[#00ff88]">Best</span>
                              )}
                              {model.online ? (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-[#00ff88]/20 text-[#00ff88] flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
                                  Online
                                </span>
                              ) : (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-[#ff4444]/20 text-[#ff4444]">Offline</span>
                              )}
                            </div>
                            <span className="text-xs text-[#a0a0b0]">{model.credits} credits</span>
                          </div>
                          <p className="text-xs text-[#a0a0b0] mb-2">{model.description}</p>
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-[#a0a0b0]" />
                              <span className="text-[#a0a0b0]">{model.time}</span>
                            </div>
                            <div className="flex gap-1">
                              {model.formats.map(fmt => (
                                <span key={fmt} className="px-2 py-0.5 rounded bg-[#c084fc]/20 text-[#c084fc] font-mono font-bold">{fmt}</span>
                              ))}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Workflow info */}
                  <div className="mt-4 p-3 rounded-lg bg-[#c084fc]/10 border border-[#c084fc]/20">
                    <div className="flex items-center gap-2 text-xs text-[#c084fc]">
                      <Sparkles className="w-3 h-3" />
                      <span className="font-medium">How it works:</span>
                    </div>
                    <p className="text-xs text-[#a0a0b0] mt-1">
                      Your text → AI generates styled reference image → Converts to 3D model with textures
                    </p>
                  </div>
                </div>

                {/* 3D Quality Selection */}
                <div className="glass-card rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#00d4ff] to-[#c084fc] flex items-center justify-center text-white font-bold text-sm">4</div>
                    <h3 className="font-semibold text-white">Mesh Quality</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#00ff88]/20 text-[#00ff88]">Polygon Count</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {QUALITY_3D_PRESETS.map((preset) => {
                      const isSelected = quality3D === preset.id;
                      return (
                        <button
                          key={preset.id}
                          onClick={() => setQuality3D(preset.id)}
                          className={`p-3 rounded-xl text-center transition-all duration-200 border-2 ${
                            isSelected
                              ? "border-[#c084fc] bg-[#c084fc]/10"
                              : "border-[#2a2a3d] hover:border-[#c084fc]/50"
                          }`}
                        >
                          <div className={`text-lg font-bold mb-1 ${isSelected ? "text-[#c084fc]" : "text-white"}`}>
                            {preset.polyCount}
                          </div>
                          <div className={`text-xs font-medium ${isSelected ? "text-[#c084fc]" : "text-[#a0a0b0]"}`}>
                            {preset.name}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-[#a0a0b0] mt-3 text-center">
                    Lower = faster & better for mobile/web | Higher = more detail for AAA games
                  </p>
                </div>

                {/* 3D Image Upload Option */}
                <div className="glass-card rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#00d4ff] to-[#c084fc] flex items-center justify-center text-white font-bold text-sm">5</div>
                      <h3 className="font-semibold text-white">Input Mode</h3>
                    </div>
                    <div className="flex rounded-lg bg-[#1a1a28] p-1">
                      <button
                        onClick={() => setInputMode("text")}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                          inputMode === "text"
                            ? "bg-[#c084fc] text-white"
                            : "text-[#a0a0b0] hover:text-white"
                        }`}
                      >
                        <Wand2 className="w-3 h-3 inline mr-1" />
                        Text
                      </button>
                      <button
                        onClick={() => setInputMode("image")}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                          inputMode === "image"
                            ? "bg-[#c084fc] text-white"
                            : "text-[#a0a0b0] hover:text-white"
                        }`}
                      >
                        <Camera className="w-3 h-3 inline mr-1" />
                        Image
                      </button>
                    </div>
                  </div>

                  {inputMode === "image" && (
                    <div className="space-y-3">
                      {uploadedImagePreview ? (
                        // Show uploaded image preview
                        <div className="relative rounded-xl overflow-hidden border-2 border-[#c084fc]/50 bg-[#0a0a0f]">
                          <img
                            src={uploadedImagePreview}
                            alt="Uploaded"
                            className="w-full h-48 object-contain"
                          />
                          <button
                            onClick={clearUploadedImage}
                            className="absolute top-2 right-2 p-2 rounded-full bg-[#ff4444] text-white hover:bg-[#ff4444]/80 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          {uploading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f]/80">
                              <Loader2 className="w-8 h-8 text-[#c084fc] animate-spin" />
                            </div>
                          )}
                          {uploadedImageUrl && !uploading && (
                            <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-[#00ff88]/90 text-[#030305] text-xs font-bold flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              Ready
                            </div>
                          )}
                        </div>
                      ) : (
                        // Upload dropzone with drag & drop
                        <div
                          className="border-2 border-dashed border-[#c084fc]/30 rounded-xl p-8 text-center hover:border-[#c084fc]/60 hover:bg-[#c084fc]/5 transition-all cursor-pointer"
                          onClick={() => document.getElementById("image-upload-input")?.click()}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            e.currentTarget.classList.add("border-[#c084fc]", "bg-[#c084fc]/10");
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            e.currentTarget.classList.remove("border-[#c084fc]", "bg-[#c084fc]/10");
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            e.currentTarget.classList.remove("border-[#c084fc]", "bg-[#c084fc]/10");
                            const files = e.dataTransfer.files;
                            if (files && files.length > 0) {
                              const input = document.getElementById("image-upload-input") as HTMLInputElement;
                              if (input) {
                                const dataTransfer = new DataTransfer();
                                dataTransfer.items.add(files[0]);
                                input.files = dataTransfer.files;
                                input.dispatchEvent(new Event("change", { bubbles: true }));
                              }
                            }
                          }}
                        >
                          <Upload className="w-12 h-12 mx-auto text-[#c084fc]/50 mb-3" />
                          <p className="text-white font-medium mb-1">Drop your image here</p>
                          <p className="text-sm text-[#a0a0b0]">or click to browse</p>
                          <p className="text-xs text-[#a0a0b0] mt-2">JPG, PNG, WebP • Max 10MB</p>
                        </div>
                      )}
                      <input
                        id="image-upload-input"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handleImageUpload}
                        className="hidden"
                      />

                      {/* Optional prompt for image mode */}
                      <div className="relative">
                        <Input
                          placeholder="Optional: add description to guide 3D generation..."
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          className="h-12 text-sm input-gaming"
                        />
                      </div>
                    </div>
                  )}

                  {/* 3D Pro tip */}
                  <div className="mt-4 p-3 rounded-lg bg-[#c084fc]/10 border border-[#c084fc]/20 flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-[#c084fc] mt-0.5 shrink-0" />
                    <span className="text-xs text-[#c084fc]">
                      {inputMode === "image"
                        ? "Upload a clear image of a single object with good lighting. White or simple backgrounds work best!"
                        : 'Simple single objects work best. "medieval iron sword" > "battle scene"'
                      }
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Seed & Generate */}
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                  <InfoTooltip {...GENERATOR_INFO.seed} />
                </div>
                <Input
                  placeholder="Seed (optional)"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value.replace(/\D/g, ""))}
                  className="h-12 font-mono input-gaming pl-10"
                />
                <button
                  onClick={generateRandomSeed}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title="Generate random seed"
                >
                  <Dices className="w-4 h-4 text-[#a0a0b0]" />
                </button>
              </div>
              <Button
                onClick={handleGenerate}
                disabled={
                  loading ||
                  (!quickMode && (!categoryId || !subcategoryId)) ||
                  (mode === "2d" && !prompt.trim()) ||
                  (mode === "3d" && inputMode === "text" && !prompt.trim()) ||
                  (mode === "3d" && inputMode === "image" && !uploadedImageUrl)
                }
                className={`h-12 px-8 font-display font-bold text-base disabled:opacity-50 ${
                  mode === "2d"
                    ? "btn-primary"
                    : "bg-gradient-to-r from-[#c084fc] to-[#00d4ff] hover:opacity-90 text-white"
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    {mode === "2d" ? <Rocket className="w-5 h-5 mr-2" /> : <Cuboid className="w-5 h-5 mr-2" />}
                    GENERATE ({getCredits()} {getCredits() === 1 ? "credit" : "credits"})
                  </>
                )}
              </Button>
            </div>

            {/* PREMIUM FEATURES - Now below generate button */}
            {mode === "2d" && !quickMode && (
              <PremiumFeatures
                userPlan={userPlan}
                styleId={styleId}
                enableSpriteSheet={enableSpriteSheet}
                onSpriteSheetChange={setEnableSpriteSheet}
                animationTypeId={animationTypeId}
                onAnimationTypeChange={setAnimationTypeId}
                enableStyleMix={enableStyleMix}
                onStyleMixChange={setEnableStyleMix}
                style2Id={style2Id}
                onStyle2Change={setStyle2Id}
                style1Weight={style1Weight}
                onStyle1WeightChange={setStyle1Weight}
                colorPaletteId={colorPaletteId}
                onColorPaletteChange={setColorPaletteId}
              />
            )}

            {/* ADVANCED OPTIONS - Output Type Toggle (Hidden by default) */}
            {!quickMode && (
              <div className="glass-card rounded-2xl p-4">
                <button
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="w-full flex items-center justify-between text-white"
                >
                  <div className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-[#a0a0b0]" />
                    <span className="text-sm font-medium">Advanced Options</span>
                    {mode === "3d" && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#c084fc]/20 text-[#c084fc]">3D Mode</span>
                    )}
                  </div>
                  {showAdvancedOptions ? (
                    <ChevronUp className="w-4 h-4 text-[#a0a0b0]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#a0a0b0]" />
                  )}
                </button>

                {showAdvancedOptions && (
                  <div className="mt-4 pt-4 border-t border-[#2a2a3d]">
                    {/* Item Builder (only for specific categories) */}
                    {mode === "2d" && hasBuilder(categoryId, subcategoryId) && (
                      <ItemBuilder
                        categoryId={categoryId}
                        subcategoryId={subcategoryId}
                        enabled={builderEnabled}
                        onEnabledChange={(enabled) => {
                          setBuilderEnabled(enabled);
                          if (!enabled) setBuilderPrompt("");
                        }}
                        onPromptGenerated={setBuilderPrompt}
                      />
                    )}
                    {/* Placeholder if no builder available */}
                    {!(mode === "2d" && hasBuilder(categoryId, subcategoryId)) && (
                      <p className="text-sm text-[#a0a0b0]">No additional options available for current selection.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="p-4 rounded-xl bg-[#ff4444]/10 border border-[#ff4444]/30 text-[#ff4444] text-sm flex items-center gap-3">
                <Flame className="w-5 h-5 shrink-0" />
                {error}
              </div>
            )}

            {/* Progress Bar - Enhanced for 3D */}
            {loading && (
              <div className="glass-card rounded-xl p-4">
                {mode === "3d" ? (
                  // Enhanced 3D Progress with Steps
                  <div className="space-y-4">
                    {/* Step indicators */}
                    <div className="flex items-center justify-between">
                      {[
                        { step: 1, label: "Reference", icon: ImageIcon },
                        { step: 2, label: "3D Mesh", icon: Box },
                        { step: 3, label: "Complete", icon: Check },
                      ].map(({ step, label, icon: Icon }, index) => (
                        <div key={step} className="flex items-center">
                          <div className={`flex flex-col items-center ${index > 0 ? "flex-1" : ""}`}>
                            {index > 0 && (
                              <div className={`h-0.5 w-full mb-2 transition-all duration-500 ${
                                completedSteps.includes(step - 1)
                                  ? "bg-gradient-to-r from-[#c084fc] to-[#00d4ff]"
                                  : "bg-[#2a2a3d]"
                              }`} />
                            )}
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                              completedSteps.includes(step)
                                ? "bg-[#00ff88] text-[#030305]"
                                : currentStep === step
                                  ? "bg-[#c084fc] text-white animate-pulse"
                                  : "bg-[#1a1a28] text-[#a0a0b0]"
                            }`}>
                              {completedSteps.includes(step) ? (
                                <Check className="w-5 h-5" />
                              ) : (
                                <Icon className="w-5 h-5" />
                              )}
                            </div>
                            <span className={`text-xs mt-1 ${
                              currentStep === step ? "text-[#c084fc]" : "text-[#a0a0b0]"
                            }`}>{label}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Current step info */}
                    <div className="text-center py-2">
                      <h4 className="text-white font-semibold">{stepTitle || progressMessage}</h4>
                      <p className="text-sm text-[#a0a0b0]">{stepDescription}</p>
                    </div>

                    {/* Reference image preview */}
                    {referenceImageUrl && (
                      <div className="relative rounded-lg overflow-hidden border border-[#c084fc]/30 bg-[#0a0a0f]">
                        <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded bg-[#00ff88]/90 text-[#030305] text-xs font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Reference Ready
                        </div>
                        <img
                          src={referenceImageUrl}
                          alt="Reference"
                          className="w-full h-32 object-contain"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] to-transparent opacity-50" />
                      </div>
                    )}

                    {/* Progress bar */}
                    <div>
                      <div className="flex justify-between text-xs text-[#a0a0b0] mb-1">
                        <span>Step {currentStep}/3</span>
                        <span className="font-mono text-[#c084fc]">{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full h-2 bg-[#1a1a28] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#c084fc] to-[#00d4ff] transition-all duration-500 ease-out"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  // Enhanced 2D progress with visual steps
                  <div className="space-y-4">
                    {/* Step indicators for 2D */}
                    <div className="flex items-center justify-between px-4">
                      {[
                        { step: 1, label: "Processing", threshold: 0 },
                        { step: 2, label: "Generating", threshold: 30 },
                        { step: 3, label: "Finalizing", threshold: 80 },
                      ].map(({ step, label, threshold }, index) => (
                        <div key={step} className="flex items-center flex-1">
                          {index > 0 && (
                            <div className={`h-0.5 flex-1 mx-2 transition-all duration-500 ${
                              progress > threshold
                                ? "bg-gradient-to-r from-[#00ff88] to-[#00d4ff]"
                                : "bg-[#2a2a3d]"
                            }`} />
                          )}
                          <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                              progress >= threshold + 20
                                ? "bg-[#00ff88] text-[#030305]"
                                : progress >= threshold
                                  ? "bg-[#00ff88]/30 text-[#00ff88] animate-pulse"
                                  : "bg-[#1a1a28] text-[#a0a0b0]"
                            }`}>
                              {progress >= threshold + 20 ? (
                                <Check className="w-4 h-4" />
                              ) : progress >= threshold ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <span className="text-xs font-bold">{step}</span>
                              )}
                            </div>
                            <span className={`text-[10px] mt-1 ${
                              progress >= threshold ? "text-[#00ff88]" : "text-[#a0a0b0]"
                            }`}>{label}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Progress message and bar */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-[#00ff88] animate-pulse" />
                          <span className="text-sm font-medium text-white">{progressMessage}</span>
                        </div>
                        <span className="text-sm font-mono text-[#00ff88]">{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full h-2 bg-[#1a1a28] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#00ff88] to-[#00d4ff] transition-all duration-500 ease-out relative"
                          style={{ width: `${progress}%` }}
                        >
                          <div className="absolute inset-0 bg-white/20 animate-pulse" />
                        </div>
                      </div>
                    </div>

                    {/* Helpful tip while waiting */}
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-[#00ff88]/5 border border-[#00ff88]/10">
                      <Lightbulb className="w-3 h-3 text-[#00ff88]" />
                      <span className="text-xs text-[#a0a0b0]">
                        {progress < 50
                          ? "AI is analyzing your prompt and style preferences..."
                          : progress < 80
                            ? "Creating your sprite with pixel-perfect details..."
                            : "Almost done! Applying final touches..."}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN - Preview */}
          <div className="lg:col-span-2 lg:sticky lg:top-4 space-y-4">
            <div className="relative">
              <div className={`absolute -inset-0.5 rounded-2xl blur opacity-30 animate-pulse-glow ${
                mode === "2d" 
                  ? "bg-gradient-to-r from-[#00ff88] to-[#00d4ff]" 
                  : "bg-gradient-to-r from-[#c084fc] to-[#00d4ff]"
              }`} />
              <div className="relative glass-card rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-[#2a2a3d] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#ff4444]" />
                    <div className="w-3 h-3 rounded-full bg-[#ffd93d]" />
                    <div className="w-3 h-3 rounded-full bg-[#00ff88]" />
                  </div>
                  <span className="text-xs text-[#a0a0b0] font-mono">
                    {mode === "2d" 
                      ? "sprite.png" 
                      : `model.${generatedFormat?.toLowerCase() || "glb"}`
                    }
                  </span>
                </div>

                <div className="aspect-square bg-[#0a0a0f] flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 grid-pattern-dense opacity-30" />

                  {loading ? (
                    <div className="text-center p-6 relative z-10 w-full h-full flex flex-col items-center justify-center">
                      {/* Show reference image during 3D generation */}
                      {mode === "3d" && referenceImageUrl ? (
                        <div className="relative w-full h-full">
                          <img
                            src={referenceImageUrl}
                            alt="Reference"
                            className="w-full h-full object-contain opacity-40"
                          />
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0f]/70">
                            <div className="relative w-20 h-20 mb-4">
                              <div className="absolute inset-0 rounded-full bg-[#c084fc]/30 blur-xl animate-pulse" />
                              <div className="relative w-full h-full rounded-full border-4 border-[#2a2a3d] animate-spin border-t-[#c084fc]" />
                              <Cuboid className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-[#c084fc]" />
                            </div>
                            <span className="font-display font-bold text-white block">
                              Converting to 3D...
                            </span>
                            <span className="text-sm text-[#a0a0b0] mt-1 block">
                              {stepDescription || progressMessage}
                            </span>
                            <div className="mt-3 px-3 py-1 rounded-full bg-[#c084fc]/20 text-[#c084fc] text-xs">
                              Step {currentStep}/3
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Default loading with Coreling working
                        <>
                          <div className="relative w-32 h-32 mx-auto mb-4">
                            {/* Glow effect */}
                            <div className={`absolute inset-0 rounded-full blur-2xl opacity-40 animate-pulse ${
                              mode === "2d" ? "bg-[#00ff88]" : "bg-[#c084fc]"
                            }`} />
                            {/* Coreling working mascot */}
                            <img
                              src="/coreling-working.png"
                              alt="Coreling Working"
                              className="relative w-full h-full object-contain animate-bounce drop-shadow-xl"
                              style={{ animationDuration: "1.5s" }}
                            />
                            {/* Spinning ring around Coreling */}
                            <div className={`absolute inset-0 rounded-full border-4 border-transparent animate-spin ${
                              mode === "2d" ? "border-t-[#00ff88] border-r-[#00ff88]/30" : "border-t-[#c084fc] border-r-[#c084fc]/30"
                            }`} style={{ animationDuration: "2s" }} />
                          </div>
                          <span className="font-display font-bold text-white block">
                            {mode === "2d" ? "Generating Sprite..." : "Creating 3D Model..."}
                          </span>
                          <span className="text-sm text-[#a0a0b0] mt-1 block">
                            {progressMessage}
                          </span>
                        </>
                      )}
                    </div>
                  ) : generatedUrl ? (
                    is3DModel ? (
                      <Model3DViewer
                        modelUrl={generatedUrl}
                        thumbnailUrl={thumbnailUrl || undefined}
                        videoUrl={videoUrl || undefined}
                        format={get3DFormat(generatedUrl)}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col">
                        {/* Main image */}
                        <img
                          src={generatedUrl}
                          alt="Generated sprite"
                          className="flex-1 w-full object-contain p-4"
                        />

                        {/* Batch thumbnails - if multiple variations generated */}
                        {batchResults.length > 1 && (
                          <div className="p-3 border-t border-[#2a2a3d] bg-[#0a0a0f]/50">
                            <div className="flex items-center gap-2 mb-2">
                              <Sparkles className="w-3 h-3 text-[#c084fc]" />
                              <span className="text-xs text-[#a0a0b0]">
                                {batchResults.length} variations generated
                              </span>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              {batchResults.map((result, index) => (
                                <button
                                  key={result.seed}
                                  onClick={() => {
                                    setSelectedBatchIndex(index);
                                    setGeneratedUrl(result.imageUrl);
                                    setLastSeed(result.seed);
                                    setSeed(result.seed.toString());
                                  }}
                                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                                    selectedBatchIndex === index
                                      ? "border-[#c084fc] ring-2 ring-[#c084fc]/30"
                                      : "border-[#2a2a3d] hover:border-[#c084fc]/50"
                                  }`}
                                >
                                  <img
                                    src={result.imageUrl}
                                    alt={`Variation ${index + 1}`}
                                    className="w-full h-full object-contain bg-[#0a0a0f]"
                                  />
                                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                                    <span className="text-[8px] text-white font-mono">#{index + 1}</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  ) : (
                    <div className="text-center p-8 relative z-10">
                      {/* Coreling waving as empty state */}
                      <div className="w-28 h-28 mx-auto mb-4 relative">
                        <div className="absolute inset-0 bg-[#c084fc]/20 rounded-full blur-xl" />
                        <img
                          src="/coreling-wave.png"
                          alt="Coreling Waving"
                          className="relative w-full h-full object-contain opacity-60 hover:opacity-100 hover:scale-110 transition-all duration-300 cursor-pointer animate-float"
                        />
                      </div>
                      <div className="hidden">
                        {mode === "2d" ? (
                          <ImageIcon className="w-12 h-12 text-[#00ff88]/50" />
                        ) : (
                          <Cuboid className="w-12 h-12 text-[#c084fc]/50" />
                        )}
                      </div>
                      <span className="text-[#a0a0b0]">
                        {mode === "2d" ? "Your sprite will appear here" : "Your 3D model will appear here"}
                      </span>
                    </div>
                  )}
                </div>

                {generatedUrl && (
                  <div className="p-4 border-t border-[#2a2a3d] space-y-3">
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleDownload} 
                        className={`flex-1 ${is3DModel ? "bg-gradient-to-r from-[#c084fc] to-[#00d4ff] hover:opacity-90 text-white" : "btn-primary"}`}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download {is3DModel ? get3DFormat(generatedUrl) : "PNG"}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={handleGenerate} 
                        disabled={loading}
                        className="border-[#00ff88]/30 hover:bg-[#00ff88]/10"
                        title="Generate again"
                      >
                        <RefreshCw className={`w-4 h-4 text-[#00ff88] ${loading ? "animate-spin" : ""}`} />
                      </Button>
                      {generatedUrl && (
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => window.open(generatedUrl, "_blank")}
                          className="border-[#00d4ff]/30 hover:bg-[#00d4ff]/10"
                          title="Open in new tab"
                        >
                          <ExternalLink className="w-4 h-4 text-[#00d4ff]" />
                        </Button>
                      )}
                    </div>

                    {/* View in Gallery button */}
                    <Button 
                      variant="outline" 
                      onClick={() => window.location.href = '/gallery'}
                      className="w-full border-[#c084fc]/30 hover:bg-[#c084fc]/10 text-[#c084fc]"
                    >
                      <ImageIcon className="w-4 h-4 mr-2" />
                      View in Gallery
                    </Button>

                    {lastSeed && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-[#0a0a0f] border border-[#2a2a3d] text-sm">
                        <Dices className="w-4 h-4 text-[#a0a0b0]" />
                        <code className="flex-1 text-[#00ff88] font-mono">{lastSeed}</code>
                        <button onClick={copySeed} className="p-1 hover:bg-white/10 rounded">
                          {copiedSeed ? <Check className="w-3 h-3 text-[#00ff88]" /> : <Copy className="w-3 h-3 text-[#a0a0b0]" />}
                        </button>
                      </div>
                    )}

                    {/* 3D Format Info */}
                    {is3DModel && (
                      <div className="p-3 rounded-lg bg-[#c084fc]/10 border border-[#c084fc]/30">
                        <div className="flex items-center gap-2 mb-2">
                          <FileBox className="w-4 h-4 text-[#c084fc]" />
                          <span className="text-sm font-medium text-[#c084fc]">Game-Ready 3D Model</span>
                        </div>
                        <p className="text-xs text-[#a0a0b0]">
                          {get3DFormat(generatedUrl)} file with textures. Import directly into Unity, Unreal, Godot, or Blender.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Pro Tips */}
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="w-4 h-4 text-[#ffd93d]" />
                <span className="font-display font-semibold text-sm text-[#ffd93d]">PRO TIPS</span>
              </div>
              <ul className="text-xs text-[#a0a0b0] space-y-2">
                {mode === "2d" ? (
                  <>
                    <li className="flex items-start gap-2">
                      <Sparkles className="w-3 h-3 text-[#00ff88] mt-0.5 shrink-0" />
                      <span>Be detailed: <span className="text-[#00ff88]">"golden sword with ruby gems"</span></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Flame className="w-3 h-3 text-[#00d4ff] mt-0.5 shrink-0" />
                      <span>Add effects: <span className="text-[#00d4ff]">glowing, magical, enchanted</span></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Gem className="w-3 h-3 text-[#c084fc] mt-0.5 shrink-0" />
                      <span>Output: <span className="text-[#c084fc]">High-res PNG with transparency</span></span>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-start gap-2">
                      <Box className="w-3 h-3 text-[#c084fc] mt-0.5 shrink-0" />
                      <span>Single objects work best - <span className="text-[#c084fc]">avoid complex scenes</span></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Zap className="w-3 h-3 text-[#00ff88] mt-0.5 shrink-0" />
                      <span><span className="text-[#00ff88]">TRELLIS</span> gives best quality for final assets</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <FileBox className="w-3 h-3 text-[#00d4ff] mt-0.5 shrink-0" />
                      <span>GLB format works with <span className="text-[#00d4ff]">all major game engines</span></span>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Button - Left side vertical tab (non-intrusive) */}
      <button
        onClick={() => setShowFeedback(true)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-40 flex items-center gap-2 px-2 py-4 rounded-r-xl bg-gradient-to-b from-[#c084fc] to-[#00d4ff] text-white font-medium shadow-lg hover:shadow-xl hover:pl-3 transition-all duration-200 group"
      >
        <MessageSquare className="w-4 h-4" />
        <span className="writing-vertical text-xs tracking-wider opacity-80 group-hover:opacity-100">FEEDBACK</span>
      </button>

      {/* Periodic Feedback Popup - Shows automatically based on time */}
      <FeedbackPopup />

      {/* Feedback Modal */}
      {showFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md glass-card rounded-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200">
            {/* Close button */}
            <button
              onClick={() => setShowFeedback(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 text-[#a0a0b0] hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {feedbackSent ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-[#00ff88]/20 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-[#00ff88]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Thank you!</h3>
                <p className="text-[#a0a0b0]">Your feedback helps us improve.</p>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold text-white mb-1">Send Feedback</h3>
                <p className="text-sm text-[#a0a0b0] mb-6">Help us improve Sprite Lab</p>

                {/* Feedback Type */}
                <div className="flex gap-2 mb-4">
                  {[
                    { id: "bug", icon: Bug, label: "Bug", color: "#ff4444" },
                    { id: "feature", icon: Star, label: "Feature", color: "#ffd93d" },
                    { id: "other", icon: MessageSquare, label: "Other", color: "#00d4ff" },
                  ].map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setFeedbackType(type.id as "bug" | "feature" | "other")}
                      className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                        feedbackType === type.id
                          ? `border-[${type.color}] bg-[${type.color}]/10`
                          : "border-[#2a2a3d] hover:border-[#3a3a4d]"
                      }`}
                      style={{
                        borderColor: feedbackType === type.id ? type.color : undefined,
                        backgroundColor: feedbackType === type.id ? `${type.color}15` : undefined,
                      }}
                    >
                      <type.icon className="w-4 h-4" style={{ color: type.color }} />
                      <span className={`text-sm font-medium ${feedbackType === type.id ? "text-white" : "text-[#a0a0b0]"}`}>
                        {type.label}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Message */}
                <div className="mb-4">
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder={
                      feedbackType === "bug"
                        ? "Describe what went wrong..."
                        : feedbackType === "feature"
                        ? "What feature would you like to see?"
                        : "Tell us anything..."
                    }
                    className="w-full h-32 px-4 py-3 rounded-xl bg-[#0a0a0f] border border-[#2a2a3d] text-white placeholder:text-[#606070] focus:outline-none focus:border-[#c084fc] resize-none"
                    maxLength={2000}
                  />
                  <div className="text-xs text-[#606070] text-right mt-1">
                    {feedbackText.length}/2000
                  </div>
                </div>

                {/* Email (optional) */}
                <div className="mb-6">
                  <Input
                    type="email"
                    value={feedbackEmail}
                    onChange={(e) => setFeedbackEmail(e.target.value)}
                    placeholder="Email (optional - for follow-up)"
                    className="h-12 bg-[#0a0a0f] border-[#2a2a3d] text-white placeholder:text-[#606070]"
                  />
                </div>

                {/* Error context info */}
                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-[#ff4444]/10 border border-[#ff4444]/30">
                    <div className="flex items-center gap-2 text-xs text-[#ff4444]">
                      <AlertCircle className="w-4 h-4" />
                      <span>Current error will be included: {error.slice(0, 50)}...</span>
                    </div>
                  </div>
                )}

                {/* Submit */}
                <Button
                  onClick={handleSendFeedback}
                  disabled={!feedbackText.trim() || feedbackSending}
                  className="w-full h-12 bg-gradient-to-r from-[#c084fc] to-[#00d4ff] hover:opacity-90 text-white font-semibold"
                >
                  {feedbackSending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Feedback
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* No Credits Modal */}
      {showNoCredits && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md glass-card rounded-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200 text-center">
            {/* Close button */}
            <button
              onClick={() => setShowNoCredits(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 text-[#a0a0b0] hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Sad Coreling */}
            <div className="w-32 h-32 mx-auto mb-4 relative">
              <div className="absolute inset-0 bg-[#ff4444]/20 rounded-full blur-xl animate-pulse" />
              <img
                src="/coreling-sad.png"
                alt="Sad Coreling"
                className="relative w-full h-full object-contain"
              />
            </div>

            <h3 className="text-2xl font-bold text-white mb-2">Out of Credits!</h3>
            <p className="text-[#a0a0b0] mb-6">
              You don't have enough credits to generate.
              <br />
              <span className="text-sm">Get more credits to continue creating!</span>
            </p>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={() => window.location.href = "/pricing"}
                className="w-full h-12 bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-[#030305] font-bold hover:opacity-90"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Get More Credits
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowNoCredits(false)}
                className="w-full h-10 border-[#2a2a3d] hover:bg-white/5"
              >
                Maybe Later
              </Button>
            </div>

            {/* Current plan info */}
            <p className="text-xs text-[#606070] mt-4">
              Tip: Upgrade to a subscription for monthly credits!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
