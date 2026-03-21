"use client";

import { PROMPT_CHIPS } from "@/data/prompt-chips";

interface Props {
  categoryId: string;
  onChipClick: (chip: string) => void;
}

export function PromptChips({ categoryId, onChipClick }: Props) {
  const groups = PROMPT_CHIPS[categoryId];
  if (!groups) return null;

  return (
    <div className="space-y-2 pt-1">
      {groups.map((group) => (
        <div key={group.label} className="flex flex-wrap items-center gap-1">
          <span className="text-[10px] uppercase tracking-wider text-white/25 mr-1 shrink-0">
            {group.label}
          </span>
          {group.chips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => onChipClick(chip)}
              className="px-2 py-0.5 text-[11px] rounded border border-white/8 bg-white/[0.02] text-white/40 hover:border-primary/30 hover:text-primary/70 hover:bg-primary/5 transition-all duration-150"
            >
              {chip}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
