"use client";

import { useState, useEffect } from "react";
import { Loader2, Sparkles, Eye, ChevronDown, ChevronUp } from "lucide-react";

interface ExampleImage {
  id: string;
  imageUrl: string;
  prompt: string;
  styleId: string;
}

interface CategoryExamplesProps {
  categoryId: string;
  subcategoryId?: string;
  onPromptClick?: (prompt: string) => void;
}

export function CategoryExamples({
  categoryId,
  subcategoryId,
  onPromptClick,
}: CategoryExamplesProps) {
  const [examples, setExamples] = useState<ExampleImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    if (!categoryId) {
      setExamples([]);
      return;
    }

    const fetchExamples = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ categoryId });
        if (subcategoryId) params.append("subcategoryId", subcategoryId);

        const response = await fetch(`/api/examples?${params}`);
        if (response.ok) {
          const data = await response.json();
          setExamples(data.examples || []);
        }
      } catch (err) {
        console.error("Failed to fetch examples:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchExamples();
  }, [categoryId, subcategoryId]);

  if (!categoryId) return null;

  // Don't show if no examples
  if (!loading && examples.length === 0) return null;

  const visibleExamples = expanded ? examples : examples.slice(0, 4);

  return (
    <div className="mt-4 p-4 rounded-xl bg-[#0a0a0f]/80 border border-[#2a2a3d]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-[#c084fc]" />
          <span className="text-sm font-medium text-white">Example Results</span>
          <span className="text-xs text-[#606070]">
            ({examples.length} {subcategoryId ? "for this type" : "in category"})
          </span>
        </div>
        {examples.length > 4 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-[#a0a0b0] hover:text-white transition-colors"
          >
            {expanded ? (
              <>
                Show less <ChevronUp className="w-3 h-3" />
              </>
            ) : (
              <>
                Show all <ChevronDown className="w-3 h-3" />
              </>
            )}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-[#c084fc] animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {visibleExamples.map((example) => (
            <div
              key={example.id}
              className="relative aspect-square rounded-lg overflow-hidden border border-[#2a2a3d] hover:border-[#c084fc]/50 transition-all cursor-pointer group"
              onMouseEnter={() => setHoveredId(example.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onPromptClick?.(example.prompt)}
            >
              <img
                src={example.imageUrl}
                alt={example.prompt}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                loading="lazy"
              />

              {/* Hover overlay */}
              {hoveredId === example.id && (
                <div className="absolute inset-0 bg-[#030305]/90 flex flex-col items-center justify-center p-2 text-center animate-in fade-in duration-150">
                  <Sparkles className="w-4 h-4 text-[#c084fc] mb-1" />
                  <p className="text-[10px] text-white line-clamp-3 leading-tight">
                    "{example.prompt}"
                  </p>
                  <span className="text-[8px] text-[#00ff88] mt-1">Click to use</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-[#606070] mt-2 text-center">
        Click any example to use its prompt
      </p>
    </div>
  );
}
