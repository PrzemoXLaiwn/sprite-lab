import { 
  Zap, 
  Palette, 
  Download, 
  Layers, 
  Clock, 
  Shield,
  Sparkles,
  Wand2
} from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Generate assets in 5-10 seconds. No more waiting hours for custom graphics.",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
  {
    icon: Palette,
    title: "Multiple Styles",
    description: "Pixel art, hand-drawn, realistic, anime - choose the style that fits your game.",
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
  },
  {
    icon: Download,
    title: "Ready to Use",
    description: "Download PNG files with transparent backgrounds. Drag and drop into your game.",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    icon: Layers,
    title: "Consistent Style",
    description: "Save your favorite presets and generate assets that match your game's aesthetic.",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Clock,
    title: "Save Hours",
    description: "What used to take days now takes minutes. Focus on building, not drawing.",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    icon: Shield,
    title: "Commercial License",
    description: "Use generated assets in your commercial games. No attribution required.",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
];

const useCases = [
  {
    title: "Game Icons",
    description: "Weapons, items, abilities, skills",
    examples: ["⚔️", "🛡️", "💎", "🧪"],
  },
  {
    title: "UI Elements",
    description: "Buttons, frames, panels, borders",
    examples: ["🔘", "📋", "🏷️", "📱"],
  },
  {
    title: "Character Sprites",
    description: "Heroes, enemies, NPCs",
    examples: ["🧙", "👹", "🤖", "🧝"],
  },
  {
    title: "Environment",
    description: "Trees, rocks, buildings, props",
    examples: ["🌳", "🏠", "⛰️", "🏰"],
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 relative">
      <div className="absolute inset-0 grid-pattern opacity-30" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Wand2 className="w-4 h-4" />
            Powerful Features
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Everything You Need to
            <span className="gradient-text"> Create Game Assets</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From icons to sprites, our AI understands game art styles and generates 
            production-ready assets in seconds.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className={`w-12 h-12 rounded-xl ${feature.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Use Cases */}
        <div className="text-center mb-12">
          <h3 className="text-2xl font-bold mb-4">What Can You Create?</h3>
          <p className="text-muted-foreground">
            Generate any type of 2D game asset with simple text prompts
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {useCases.map((useCase) => (
            <div
              key={useCase.title}
              className="p-6 rounded-2xl bg-card border border-border text-center hover:border-primary/50 transition-colors"
            >
              <div className="flex justify-center gap-2 text-2xl mb-4">
                {useCase.examples.map((emoji, i) => (
                  <span key={i} className="animate-float" style={{ animationDelay: `${i * 0.2}s` }}>
                    {emoji}
                  </span>
                ))}
              </div>
              <h4 className="font-semibold mb-1">{useCase.title}</h4>
              <p className="text-xs text-muted-foreground">{useCase.description}</p>
            </div>
          ))}
        </div>

        {/* How It Works */}
        <div className="mt-24">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              Simple Process
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold">
              Three Steps to Amazing Assets
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Describe Your Asset",
                description: "Write a simple prompt describing what you need. Be as specific or creative as you want.",
                example: '"pixel art health potion, red liquid, glass bottle"',
              },
              {
                step: "02",
                title: "Choose Your Style",
                description: "Select from pixel art, hand-drawn, realistic, or anime styles. Pick the size you need.",
                example: "64x64 Pixel Art",
              },
              {
                step: "03",
                title: "Download & Use",
                description: "Get your PNG with transparent background. Ready to drag into your game engine.",
                example: "potion.png ↓",
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="text-6xl font-bold text-primary/10 absolute -top-4 -left-2">
                  {item.step}
                </div>
                <div className="relative z-10 pt-8">
                  <h4 className="text-lg font-semibold mb-2">{item.title}</h4>
                  <p className="text-sm text-muted-foreground mb-4">{item.description}</p>
                  <div className="px-4 py-2 rounded-lg bg-muted text-sm font-mono text-muted-foreground">
                    {item.example}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
