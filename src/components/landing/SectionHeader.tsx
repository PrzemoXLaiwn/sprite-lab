import type { ReactNode } from "react";

/**
 * Shared marketing section header: "// label" mono eyebrow, display h2 and an
 * optional intro line. One spec for every public section so sizes, leading
 * and spacing stay identical across the site.
 */
export function SectionHeader({
  eyebrow,
  title,
  intro,
  align = "center",
  className = "",
  id,
}: {
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
  align?: "center" | "left";
  className?: string;
  id?: string;
}) {
  const center = align === "center";
  return (
    <div className={`${center ? "mx-auto text-center" : ""} max-w-2xl ${className}`}>
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#8B93A5]">{`// ${eyebrow}`}</p>
      <h2 id={id} className="mt-3 text-balance font-display text-[32px] font-semibold leading-[1.08] tracking-[-0.01em] text-white sm:text-[44px]">
        {title}
      </h2>
      {intro && (
        <p className={`mt-4 max-w-xl text-pretty text-[15px] leading-relaxed text-[#8B93A5] sm:text-[16px] ${center ? "mx-auto" : ""}`}>
          {intro}
        </p>
      )}
    </div>
  );
}
