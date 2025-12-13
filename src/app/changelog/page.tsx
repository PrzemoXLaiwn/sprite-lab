import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Sparkles, Zap, Bug, Star } from "lucide-react";

export const metadata: Metadata = {
  title: "Changelog - SpriteLab",
  description: "SpriteLab Changelog - See what's new and improved in our AI game asset generator.",
};

const CHANGELOG = [
  {
    date: "December 2024",
    version: "1.2.0",
    title: "Community Gallery & Social Features",
    type: "feature" as const,
    changes: [
      "New Community Gallery - share your creations with other developers",
      "Like and comment on community assets",
      "Bulk delete in personal gallery",
      "Share button to publish assets to community",
    ],
  },
  {
    date: "December 2024",
    version: "1.1.0",
    title: "3D Model Generation",
    type: "feature" as const,
    changes: [
      "3D model generation with TRELLIS AI",
      "GLB/PLY format export for game engines",
      "Support for Unity, Unreal, Godot, and Blender",
      "Improved 3D preview in gallery",
    ],
  },
  {
    date: "November 2024",
    version: "1.0.0",
    title: "Public Launch",
    type: "release" as const,
    changes: [
      "10+ art styles for 2D sprite generation",
      "12 asset categories (weapons, armor, characters, etc.)",
      "Transparent PNG export with background removal",
      "Stripe payments integration",
      "User dashboard with personal gallery",
      "Credit-based pricing system",
      "Free tier with 5 credits",
    ],
  },
];

const typeConfig = {
  feature: { icon: Sparkles, color: "text-[#00ff88]", bg: "bg-[#00ff88]/10" },
  improvement: { icon: Zap, color: "text-[#00d4ff]", bg: "bg-[#00d4ff]/10" },
  fix: { icon: Bug, color: "text-[#ff6b6b]", bg: "bg-[#ff6b6b]/10" },
  release: { icon: Star, color: "text-[#c084fc]", bg: "bg-[#c084fc]/10" },
};

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Changelog</h1>
          <p className="text-muted-foreground text-lg">
            All the latest updates, improvements, and fixes to SpriteLab.
          </p>
        </div>

        <div className="space-y-12">
          {CHANGELOG.map((release, index) => {
            const config = typeConfig[release.type];
            const Icon = config.icon;

            return (
              <div key={index} className="relative">
                {/* Timeline line */}
                {index < CHANGELOG.length - 1 && (
                  <div className="absolute left-[19px] top-12 bottom-0 w-px bg-border" />
                )}

                <div className="flex gap-6">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-8">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-mono text-muted-foreground">
                        v{release.version}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {release.date}
                      </span>
                    </div>

                    <h2 className="text-xl font-semibold mb-4">{release.title}</h2>

                    <ul className="space-y-2">
                      {release.changes.map((change, changeIndex) => (
                        <li
                          key={changeIndex}
                          className="flex items-start gap-2 text-muted-foreground"
                        >
                          <span className={`mt-2 w-1.5 h-1.5 rounded-full ${config.bg.replace('/10', '')} flex-shrink-0`} />
                          {change}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-16 p-8 rounded-2xl bg-card border border-border text-center">
          <h3 className="text-xl font-semibold mb-2">Want to see more features?</h3>
          <p className="text-muted-foreground mb-4">
            Have a feature request or found a bug? Let us know!
          </p>
          <a
            href="mailto:support@sprite-lab.com"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Send Feedback
          </a>
        </div>
      </div>
    </div>
  );
}
