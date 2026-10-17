/** Small "NEW" pill for navigation items (see src/config/new-features.ts). */
export function NewBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`rounded-[4px] bg-[#FFA300] px-1 py-[1px] text-[9px] font-bold leading-none text-[#131A31] ${className}`}>
      NEW
    </span>
  );
}
