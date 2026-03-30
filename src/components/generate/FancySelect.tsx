"use client";

import { useState } from "react";
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
  placeholder = "Select…",
}: FancySelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);

  return (
    <div>
      <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">
        {label}
        {required && <span className="text-[#FF6B2C] ml-0.5">*</span>}
      </label>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={`
              w-full flex items-center justify-between gap-2 px-3.5 py-3
              rounded-xl text-left text-[13px] font-medium
              transition-all duration-150 cursor-pointer
              ${open
                ? "bg-[#1a2030] border-2 border-[#FF6B2C]/40 shadow-[0_0_15px_rgba(255,107,44,0.08)]"
                : "bg-[#161c26] border-2 border-white/10 hover:border-white/20 hover:bg-[#1a2030]"
              }
            `}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {selected?.color && (
                <span className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white/10"
                  style={{ backgroundColor: selected.color }} />
              )}
              {selected?.icon && (
                <selected.icon className={`w-4 h-4 shrink-0 ${open ? "text-[#FF6B2C]" : "text-white/30"}`} />
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
            <ChevronDown className={`w-4 h-4 shrink-0 text-white/25 transition-transform duration-200 ${open ? "rotate-180 text-[#FF6B2C]" : ""}`} />
          </button>
        </PopoverTrigger>

        <PopoverContent
          className="p-2 bg-[#161c26] border-2 border-white/10 rounded-xl shadow-2xl shadow-black/60 backdrop-blur-xl w-(--radix-popover-trigger-width)"
          align="start"
          sideOffset={6}
        >
          <div className={`
            ${columns === 2 ? "grid grid-cols-2 gap-1" : ""}
            ${columns === 3 ? "grid grid-cols-3 gap-1" : ""}
            ${columns === 1 ? "space-y-0.5" : ""}
            max-h-[300px] overflow-y-auto overscroll-contain
          `}>
            {options.map((option) => {
              const isActive = option.id === value;
              const Icon = option.icon;

              return (
                <button
                  key={option.id}
                  onClick={() => { onChange(option.id); setOpen(false); }}
                  className={`
                    w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left
                    transition-all duration-100
                    ${isActive
                      ? "bg-[#FF6B2C]/15 border border-[#FF6B2C]/25"
                      : "border border-transparent hover:bg-white/5"
                    }
                  `}
                >
                  {option.color && (
                    <span className="w-3.5 h-3.5 rounded-full shrink-0 ring-1 ring-white/10"
                      style={{ backgroundColor: option.color }} />
                  )}
                  {Icon && !option.color && (
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#FF6B2C]" : "text-white/20"}`} />
                  )}

                  <div className="min-w-0 flex-1">
                    <span className={`block text-[12px] font-semibold ${isActive ? "text-white" : "text-white/70"}`}>
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
