"use client";

import { useState, useRef, useCallback } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { LucideIcon } from "lucide-react";

export interface FancyOption {
  id: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
  color?: string;
}

interface FancySelectProps {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: FancyOption[];
  columns?: 1 | 2 | 3;
  placeholder?: string;
}

export function FancySelect({
  label,
  required,
  value,
  onChange,
  options,
  columns = 1,
  placeholder = "Select\u2026",
}: FancySelectProps) {
  const [open, setOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.id === value);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
        setFocusIndex(options.findIndex(o => o.id === value));
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusIndex(prev => {
          const next = prev < options.length - 1 ? prev + 1 : 0;
          scrollToIndex(next);
          return next;
        });
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusIndex(prev => {
          const next = prev > 0 ? prev - 1 : options.length - 1;
          scrollToIndex(next);
          return next;
        });
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (focusIndex >= 0 && focusIndex < options.length) {
          onChange(options[focusIndex].id);
          setOpen(false);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "Home":
        e.preventDefault();
        setFocusIndex(0);
        scrollToIndex(0);
        break;
      case "End":
        e.preventDefault();
        setFocusIndex(options.length - 1);
        scrollToIndex(options.length - 1);
        break;
      default: {
        // Type-ahead: jump to first option starting with typed character
        const char = e.key.toLowerCase();
        if (char.length === 1) {
          const idx = options.findIndex(o => o.label.toLowerCase().startsWith(char));
          if (idx >= 0) {
            setFocusIndex(idx);
            scrollToIndex(idx);
          }
        }
      }
    }
  }, [open, focusIndex, options, value, onChange]);

  const scrollToIndex = (index: number) => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-option]");
    items[index]?.scrollIntoView({ block: "nearest" });
  };

  const selectId = `fancy-select-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const listboxId = `${selectId}-listbox`;

  return (
    <div>
      <label id={`${selectId}-label`} className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">
        {label}
        {required && <span className="text-[#FF6B2C] ml-0.5">*</span>}
      </label>

      <Popover open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (isOpen) setFocusIndex(options.findIndex(o => o.id === value));
      }}>
        <PopoverTrigger asChild>
          <button
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-controls={listboxId}
            aria-labelledby={`${selectId}-label`}
            onKeyDown={handleKeyDown}
            className={`
              w-full flex items-center justify-between gap-2 px-3.5 py-3
              rounded-xl text-left text-[13px] font-medium
              transition-all duration-200 cursor-pointer
              shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B2C]/40
              ${open
                ? "bg-[#1a2030] border-2 border-[#FF6B2C]/40 shadow-[0_0_20px_rgba(255,107,44,0.1),inset_0_1px_0_rgba(255,255,255,0.05)]"
                : "bg-gradient-to-b from-[#171d28] to-[#141821] border-2 border-white/[0.08] hover:border-white/15 hover:from-[#1a2030] hover:to-[#161c26] hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
              }
            `}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {selected?.color && (
                <span className="w-3.5 h-3.5 rounded-full shrink-0 ring-2 ring-white/10 shadow-[0_0_6px_currentColor]"
                  style={{ backgroundColor: selected.color }} />
              )}
              {selected?.icon && (
                <selected.icon className={`w-4 h-4 shrink-0 transition-colors ${open ? "text-[#FF6B2C]" : "text-white/30"}`} />
              )}
              <span className={selected ? "text-white/90 truncate" : "text-white/30"}>
                {selected?.label || placeholder}
              </span>
              {selected?.description && (
                <span className="text-[10px] text-white/20 truncate hidden sm:inline">
                  {selected.description}
                </span>
              )}
            </div>
            <ChevronDown className={`w-4 h-4 shrink-0 text-white/25 transition-all duration-200 ${open ? "rotate-180 text-[#FF6B2C]" : ""}`} />
          </button>
        </PopoverTrigger>

        <PopoverContent
          className="p-1.5 bg-gradient-to-b from-[#1a2030] to-[#141821] border-2 border-white/[0.08] rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-xl w-(--radix-popover-trigger-width)"
          align="start"
          sideOffset={6}
          onKeyDown={handleKeyDown}
        >
          <div
            ref={listRef}
            role="listbox"
            id={listboxId}
            aria-labelledby={`${selectId}-label`}
            className={`
              ${columns === 2 ? "grid grid-cols-2 gap-1" : ""}
              ${columns === 3 ? "grid grid-cols-3 gap-1" : ""}
              ${columns === 1 ? "space-y-0.5" : ""}
              max-h-[320px] overflow-y-auto overscroll-contain scrollbar-thin
            `}
          >
            {options.map((option, index) => {
              const isActive = option.id === value;
              const isFocused = index === focusIndex;
              const Icon = option.icon;

              return (
                <button
                  key={option.id}
                  role="option"
                  aria-selected={isActive}
                  data-option
                  onClick={() => { onChange(option.id); setOpen(false); }}
                  onMouseEnter={() => setFocusIndex(index)}
                  className={`
                    w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left
                    transition-all duration-150 cursor-pointer
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B2C]/40
                    ${isActive
                      ? "bg-gradient-to-r from-[#FF6B2C]/15 to-[#FF6B2C]/5 border border-[#FF6B2C]/25 shadow-[inset_0_1px_0_rgba(255,107,44,0.1)]"
                      : isFocused
                        ? "bg-white/[0.08] border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                        : "border border-transparent hover:bg-white/[0.06] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                    }
                  `}
                >
                  {option.color && (
                    <span className="w-3.5 h-3.5 rounded-full shrink-0 ring-1 ring-white/10"
                      style={{ backgroundColor: option.color }} />
                  )}
                  {Icon && !option.color && (
                    <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? "text-[#FF6B2C]" : "text-white/20"}`} />
                  )}

                  <div className="min-w-0 flex-1">
                    <span className={`block text-[12px] font-semibold transition-colors ${isActive ? "text-white" : "text-white/70"}`}>
                      {option.label}
                    </span>
                    {option.description && (
                      <span className="block text-[10px] text-white/25 truncate">
                        {option.description}
                      </span>
                    )}
                  </div>

                  {isActive && (
                    <Check className="w-4 h-4 text-[#FF6B2C] shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
