"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    question: "What AI models do you use for generation?",
    answer: "We use state-of-the-art diffusion models including Stable Diffusion XL and FLUX, fine-tuned for game asset generation. Our models are optimized for pixel art, icons, and game-ready graphics.",
  },
  {
    question: "Can I use generated assets in commercial games?",
    answer: "Yes! All assets generated with SpriteLab come with a full commercial license. You can use them in your games, sell them on asset stores, or include them in your products. No attribution required.",
  },
  {
    question: "How long does generation take?",
    answer: "Most assets generate in 5-10 seconds. Complex prompts or larger sizes may take up to 30 seconds. Pro and Unlimited users get priority queue for even faster generation.",
  },
  {
    question: "What file formats do you support?",
    answer: "We export PNG files with transparent backgrounds by default - ready to use in Unity, Godot, Roblox Studio, or any game engine. We're working on sprite sheet exports and SVG support.",
  },
  {
    question: "Can I get a refund if I'm not satisfied?",
    answer: "We offer a 7-day money-back guarantee for Pro and Unlimited plans. If you're not happy with the service, contact us within 7 days of purchase for a full refund.",
  },
  {
    question: "Do unused credits roll over?",
    answer: "For Pro plans, unused credits expire at the end of each billing cycle. Unlimited plan has no credits to worry about - generate as much as you want!",
  },
  {
    question: "What sizes are available?",
    answer: "Free: 64x64, 128x128. Pro: up to 256x256. Unlimited: up to 512x512. All sizes are optimized for game use and can be scaled in your game engine.",
  },
  {
    question: "Can I fine-tune the style for my game?",
    answer: "Yes! Pro and Unlimited users can save custom style presets with specific colors, art styles, and modifiers. This ensures all your assets match your game's aesthetic.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 relative">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <HelpCircle className="w-4 h-4" />
            FAQ
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground">
            Got questions? We&apos;ve got answers.
          </p>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={cn(
                "rounded-xl border transition-all duration-200",
                openIndex === index
                  ? "bg-card border-primary/50"
                  : "bg-card/50 border-border hover:border-primary/30"
              )}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-4 flex items-center justify-between text-left"
              >
                <span className="font-medium pr-4">{faq.question}</span>
                <ChevronDown
                  className={cn(
                    "w-5 h-5 text-muted-foreground transition-transform duration-200 shrink-0",
                    openIndex === index && "rotate-180"
                  )}
                />
              </button>
              <div
                className={cn(
                  "overflow-hidden transition-all duration-200",
                  openIndex === index ? "max-h-96" : "max-h-0"
                )}
              >
                <div className="px-6 pb-4 text-muted-foreground text-sm leading-relaxed">
                  {faq.answer}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-12 text-center p-8 rounded-2xl bg-card border border-border">
          <h3 className="font-semibold mb-2">Still have questions?</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Can&apos;t find what you&apos;re looking for? We&apos;re here to help.
          </p>
          <a
            href="mailto:support@sprite-lab.com"
            className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
          >
            Contact Support
          </a>
        </div>
      </div>
    </section>
  );
}
