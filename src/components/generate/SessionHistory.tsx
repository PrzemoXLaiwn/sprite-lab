"use client";

import Image from "next/image";

interface HistoryItem {
  id: string;
  imageUrl: string;
  prompt: string;
}

interface Props {
  items: HistoryItem[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export function SessionHistory({ items, selectedIndex, onSelect }: Props) {
  if (items.length === 0) return null;

  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-white/25 mb-2">
        Session History
      </p>
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {items.map((item, i) => {
          const isActive = i === selectedIndex;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(i)}
              title={item.prompt}
              className={`relative w-14 h-14 rounded-lg border overflow-hidden flex-shrink-0 transition-all duration-150 ${
                isActive
                  ? "border-primary ring-1 ring-primary/40"
                  : "border-white/10 hover:border-white/20"
              }`}
            >
              <Image
                src={item.imageUrl}
                alt={item.prompt}
                fill
                className="object-contain"
                unoptimized
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
