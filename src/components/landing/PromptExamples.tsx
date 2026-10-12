"use client";

import { HERO_PROMPT_EVENT } from "./HeroPrompt";

/** Example prompts on SEO pages: one tap puts the prompt into the hero input. */
export function PromptExamples({ prompts }: { prompts: string[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {prompts.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent(HERO_PROMPT_EVENT, { detail: { prompt: p.slice(0, 200) } }))}
          className="group flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-[#151922] px-4 py-3.5 text-left transition-colors hover:border-[#FF8A3D]/30"
        >
          <span className="font-mono text-[13px] text-[#FF8A3D]" aria-hidden="true">&gt;</span>
          <span className="font-mono text-[13px] leading-relaxed text-[#C9CFDB] group-hover:text-white">{p}</span>
        </button>
      ))}
    </div>
  );
}
