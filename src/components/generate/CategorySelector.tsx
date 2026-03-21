"use client";

import { GENERATE_CATEGORIES, type GenerateCategory } from "@/data/generate-categories";

interface Props {
  selectedCategoryId: string;
  onSelect: (category: GenerateCategory) => void;
}

export function CategorySelector({ selectedCategoryId, onSelect }: Props) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
      {GENERATE_CATEGORIES.map((cat) => {
        const Icon = cat.icon;
        const isActive = cat.id === selectedCategoryId;
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat)}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all duration-150 ${
              isActive
                ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/20"
                : "border-white/10 bg-white/[0.03] text-white/50 hover:border-white/20 hover:text-white/70 hover:bg-white/[0.05]"
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="truncate w-full text-center">{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
}
