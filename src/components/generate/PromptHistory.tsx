"use client";

import { useState } from "react";
import { History, X, Clock, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import type { PromptHistoryItem } from "@/hooks/usePromptHistory";

// ===========================================
// PROMPT HISTORY DROPDOWN
// ===========================================
// Shows recent prompts with quick reuse

interface PromptHistoryProps {
  history: PromptHistoryItem[];
  onSelect: (item: PromptHistoryItem) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  maxItems?: number;
}

export function PromptHistory({
  history,
  onSelect,
  onRemove,
  onClear,
  maxItems = 5,
}: PromptHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);

  const recentItems = history.slice(0, maxItems);
  const hasHistory = recentItems.length > 0;

  // Format relative time
  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (!hasHistory) {
    return null;
  }

  return (
    <div className="relative">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
          isOpen
            ? "bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/40"
            : "bg-white/5 text-[#a0a0b0] hover:text-white hover:bg-white/10 border border-transparent"
        }`}
      >
        <History className="w-4 h-4" />
        <span>Recent</span>
        {isOpen ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Content */}
          <div className="absolute top-full left-0 mt-2 w-80 bg-[#1a1a2e] border border-[#2a2a3d] rounded-xl shadow-xl z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a3d]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#00ff88]" />
                <span className="font-medium text-white text-sm">Recent Prompts</span>
              </div>
              <button
                onClick={() => {
                  onClear();
                  setIsOpen(false);
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-[#a0a0b0] hover:text-red-400 hover:bg-red-400/10 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            </div>

            {/* Items */}
            <div className="max-h-[300px] overflow-y-auto">
              {recentItems.map((item) => (
                <div
                  key={item.id}
                  className="group relative px-4 py-3 hover:bg-white/5 border-b border-[#2a2a3d]/50 last:border-b-0 cursor-pointer transition-colors"
                  onClick={() => {
                    onSelect(item);
                    setIsOpen(false);
                  }}
                >
                  {/* Remove button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(item.id);
                    }}
                    className="absolute top-2 right-2 p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-400/20 text-[#a0a0b0] hover:text-red-400 transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>

                  {/* Prompt text */}
                  <p className="text-sm text-white mb-1.5 pr-6 line-clamp-2">
                    {item.prompt}
                  </p>

                  {/* Meta info */}
                  <div className="flex items-center gap-2 text-[10px] text-[#a0a0b0]">
                    <span className={`px-1.5 py-0.5 rounded ${
                      item.mode === "3d"
                        ? "bg-[#c084fc]/20 text-[#c084fc]"
                        : "bg-[#00ff88]/20 text-[#00ff88]"
                    }`}>
                      {item.mode.toUpperCase()}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-white/10">
                      {item.styleName}
                    </span>
                    <span className="ml-auto">{formatTime(item.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            {history.length > maxItems && (
              <div className="px-4 py-2 border-t border-[#2a2a3d] text-center">
                <span className="text-xs text-[#a0a0b0]">
                  +{history.length - maxItems} more prompts saved
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ===========================================
// INLINE RECENT PROMPTS (compact chips)
// ===========================================

interface RecentPromptsChipsProps {
  history: PromptHistoryItem[];
  onSelect: (item: PromptHistoryItem) => void;
  maxItems?: number;
}

export function RecentPromptsChips({
  history,
  onSelect,
  maxItems = 3,
}: RecentPromptsChipsProps) {
  const recentItems = history.slice(0, maxItems);

  if (recentItems.length === 0) {
    return null;
  }

  // Truncate prompt text for chip display
  const truncate = (text: string, maxLen: number = 30) => {
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen).trim() + "...";
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-[#a0a0b0] flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Recent:
      </span>
      {recentItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item)}
          className="px-2 py-1 rounded-lg text-xs bg-white/5 text-[#a0a0b0] hover:text-white hover:bg-white/10 border border-[#2a2a3d] hover:border-[#00ff88]/50 transition-all truncate max-w-[150px]"
          title={item.prompt}
        >
          {truncate(item.prompt)}
        </button>
      ))}
    </div>
  );
}
