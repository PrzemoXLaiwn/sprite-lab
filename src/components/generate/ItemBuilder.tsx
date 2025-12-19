"use client";

import { useState, useEffect } from "react";
import { Wand2, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { getBuilder, buildPromptFromSelections, type BuilderCategory } from "@/config";

interface ItemBuilderProps {
  categoryId: string;
  subcategoryId: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onPromptGenerated: (prompt: string) => void;
}

export function ItemBuilder({
  categoryId,
  subcategoryId,
  enabled,
  onEnabledChange,
  onPromptGenerated,
}: ItemBuilderProps) {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const builder = getBuilder(categoryId, subcategoryId);

  // Reset selections when category/subcategory changes
  useEffect(() => {
    setSelections({});
    setExpandedCategories(new Set());
  }, [categoryId, subcategoryId]);

  // Generate prompt when selections change
  useEffect(() => {
    if (enabled && Object.keys(selections).length > 0) {
      const generatedPrompt = buildPromptFromSelections(categoryId, subcategoryId, selections);
      onPromptGenerated(generatedPrompt);
    }
  }, [selections, enabled, categoryId, subcategoryId, onPromptGenerated]);

  // Don't render if no builder available
  if (!builder) return null;

  const handleSelect = (categoryId: string, optionId: string) => {
    setSelections(prev => {
      // If same option clicked, deselect (unless required)
      const category = builder.categories.find(c => c.id === categoryId);
      if (prev[categoryId] === optionId && !category?.required) {
        const newSelections = { ...prev };
        delete newSelections[categoryId];
        return newSelections;
      }
      return { ...prev, [categoryId]: optionId };
    });
  };

  const toggleCategory = (catId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(catId)) {
        newSet.delete(catId);
      } else {
        newSet.add(catId);
      }
      return newSet;
    });
  };

  const selectedCount = Object.keys(selections).length;
  const totalCategories = builder.categories.length;

  return (
    <div className="space-y-3">
      {/* Toggle Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onEnabledChange(!enabled)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
            enabled
              ? "bg-[#c084fc]/20 text-[#c084fc] border border-[#c084fc]/50"
              : "bg-[#1a1a28] text-[#a0a0b0] border border-[#2a2a3d] hover:border-[#c084fc]/30"
          }`}
        >
          <Wand2 className="w-4 h-4" />
          <span className="text-sm font-medium">Advanced Builder</span>
          {enabled && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#c084fc]/30">
              {selectedCount}/{totalCategories}
            </span>
          )}
        </button>

        {enabled && selectedCount > 0 && (
          <button
            onClick={() => setSelections({})}
            className="text-xs text-[#a0a0b0] hover:text-white transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Builder Panel */}
      {enabled && (
        <div className="p-4 rounded-xl bg-[#0a0a0f] border border-[#2a2a3d] space-y-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 pb-2 border-b border-[#2a2a3d]">
            <Sparkles className="w-4 h-4 text-[#c084fc]" />
            <span className="text-sm text-white font-medium">Customize Your Item</span>
            <span className="text-xs text-[#a0a0b0]">Select options below</span>
          </div>

          {builder.categories.map((category: BuilderCategory) => {
            const isExpanded = expandedCategories.has(category.id) ||
                              category.required ||
                              selections[category.id];
            const selectedOption = category.options.find(o => o.id === selections[category.id]);

            return (
              <div key={category.id} className="space-y-2">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{category.label}</span>
                    {category.required && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ff4444]/20 text-[#ff4444]">
                        Required
                      </span>
                    )}
                    {selectedOption && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#00ff88]/20 text-[#00ff88]">
                        {selectedOption.label}
                      </span>
                    )}
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-[#a0a0b0]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#a0a0b0]" />
                  )}
                </button>

                {/* Options */}
                {isExpanded && (
                  <div className="flex flex-wrap gap-2 pl-2">
                    {category.options.map((option) => {
                      const isSelected = selections[category.id] === option.id;
                      return (
                        <button
                          key={option.id}
                          onClick={() => handleSelect(category.id, option.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            isSelected
                              ? "bg-[#00ff88] text-[#030305]"
                              : "bg-[#1a1a28] text-[#a0a0b0] hover:bg-[#2a2a3d] hover:text-white border border-[#2a2a3d]"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Preview of generated prompt */}
          {selectedCount > 0 && (
            <div className="mt-4 pt-3 border-t border-[#2a2a3d]">
              <div className="text-xs text-[#606070] mb-1">Generated description:</div>
              <div className="text-sm text-[#00ff88] bg-[#00ff88]/5 p-2 rounded-lg border border-[#00ff88]/20">
                {buildPromptFromSelections(categoryId, subcategoryId, selections) || "Select options above..."}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
