"use client";

import type { GenerateSubcategory } from "@/data/generate-categories";

interface Props {
  subcategories: GenerateSubcategory[];
  selectedId: string;
  onSelect: (sub: GenerateSubcategory) => void;
}

export function SubcategoryChips({ subcategories, selectedId, onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {subcategories.map((sub) => {
        const isActive = sub.subcategoryId === selectedId;
        return (
          <button
            key={sub.subcategoryId}
            onClick={() => onSelect(sub)}
            className={`px-3 py-1.5 text-xs rounded-full border transition-all duration-150 ${
              isActive
                ? "border-primary bg-primary/10 text-primary"
                : "border-white/10 bg-white/[0.03] text-white/40 hover:border-white/20 hover:text-white/60"
            }`}
          >
            {sub.label}
          </button>
        );
      })}
    </div>
  );
}
