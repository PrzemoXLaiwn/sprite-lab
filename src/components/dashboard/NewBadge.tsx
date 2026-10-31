/** Small "NEW" (or other short label, e.g. "BETA") pill for navigation items (see src/config/new-features.ts). */
export function NewBadge({ className = "", label = "NEW" }: { className?: string; label?: string }) {
  return (
    <span className={`rounded-[4px] bg-[#FFA300] px-1 py-[1px] text-[9px] font-bold leading-none text-[#131A31] ${className}`}>
      {label}
    </span>
  );
}
