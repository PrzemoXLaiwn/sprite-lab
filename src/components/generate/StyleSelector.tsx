"use client";

import { GENERATE_STYLES } from "@/data/generate-styles";

interface Props {
  selectedStyleId: string;
  onSelect: (styleId: string) => void;
}

export function StyleSelector({ selectedStyleId, onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
      {GENERATE_STYLES.map((style) => {
        const isActive = style.id === selectedStyleId;
        return (
          <button
            key={style.id}
            onClick={() => onSelect(style.id)}
            className={`px-3 py-2.5 text-xs rounded-xl border text-left transition-all duration-150 ${
              isActive
                ? "border-primary bg-primary/10 text-white shadow-sm shadow-primary/20"
                : "border-white/10 bg-white/[0.03] text-white/40 hover:border-white/20 hover:text-white/60"
            }`}
          >
            <div className="font-medium">{style.name}</div>
            <div className="text-[10px] mt-0.5 opacity-60">{style.description}</div>
          </button>
        );
      })}
    </div>
  );
}
