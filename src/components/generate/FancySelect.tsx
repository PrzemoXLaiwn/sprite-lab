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
  color?: string; // optional accent dot color
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
      <label className="block text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-1.5">
        {label}
        {required && <span className="text-[#FF6B2C] ml-0.5">*</span>}
      </label>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={`
              w-full flex items-center justify-between gap-2 px-3 py-2.5
              rounded-xl text-left text-[13px] font-medium
              bg-[#141821] border transition-all cursor-pointer
              ${open
                ? "border-[#FF6B2C]/30 shadow-[0_0_0_1px_rgba(255,107,44,0.1)]"
                : "border-white/8 hover:border-white/15"
              }
            `}
          >
            <div className="flex items-center gap-2 min-w-0">
              {selected?.color && (
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: selected.color }}
                />
              )}
              {selected?.icon && (
                <selected.icon className="w-3.5 h-3.5 text-white/30 shrink-0" />
              )}
              <span className={selected ? "text-white/85 truncate" : "text-white/25"}>
                {selected?.label || placeholder}
              </span>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 shrink-0 text-white/20 transition-transform duration-200 ${
                open ? "rotate-180" : ""
              }`}
            />
          </button>
        </PopoverTrigger>

        <PopoverContent
          className="p-1.5 bg-[#141821] border border-white/10 rounded-xl shadow-2xl shadow-black/50 w-[var(--radix-popover-trigger-width)]"
          align="start"
          sideOffset={4}
        >
          <div
            className={`
              ${columns === 2 ? "grid grid-cols-2 gap-1" : ""}
              ${columns === 3 ? "grid grid-cols-3 gap-1" : ""}
              ${columns === 1 ? "space-y-0.5" : ""}
              max-h-[280px] overflow-y-auto
            `}
          >
            {options.map((option) => {
              const isActive = option.id === value;
              const Icon = option.icon;

              return (
                <button
                  key={option.id}
                  onClick={() => {
                    onChange(option.id);
                    setOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left
                    transition-all duration-100
                    ${isActive
                      ? "bg-[#FF6B2C]/10 text-white"
                      : "text-white/60 hover:bg-white/5 hover:text-white/90"
                    }
                  `}
                >
                  {/* Color dot or icon */}
                  {option.color && (
                    <span
                      className="w-3 h-3 rounded-full shrink-0 border border-white/10"
                      style={{ backgroundColor: option.color }}
                    />
                  )}
                  {Icon && !option.color && (
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#FF6B2C]" : "text-white/25"}`} />
                  )}

                  {/* Label + description */}
                  <div className="min-w-0 flex-1">
                    <span className={`block text-[12px] font-medium truncate ${isActive ? "text-white" : ""}`}>
                      {option.label}
                    </span>
                    {option.description && (
                      <span className="block text-[10px] text-white/25 truncate mt-0.5">
                        {option.description}
                      </span>
                    )}
                  </div>

                  {/* Checkmark */}
                  {isActive && (
                    <Check className="w-3.5 h-3.5 text-[#FF6B2C] shrink-0" />
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
