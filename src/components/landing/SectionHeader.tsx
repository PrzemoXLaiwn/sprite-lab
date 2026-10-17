import type { ReactNode } from "react";

/**
 * Shared marketing section header: display h2 and an optional intro line.
 * Left-aligned by default; no eyebrow labels (the heading says what the
 * section is). `eyebrow` is still accepted so older call sites compile, and
 * is used only as a colour key for the small pixel marker.
 */
const MARKER: Record<string, string> = {
  faq: "#29ADFF",
  pricing: "#00E436",
};

export function SectionHeader({
  eyebrow,
  title,
  intro,
  align = "left",
  className = "",
  id,
}: {
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  align?: "center" | "left";
  className?: string;
  id?: string;
}) {
  const center = align === "center";
  const marker = (eyebrow && MARKER[eyebrow.toLowerCase()]) || "#FFA300";
  return (
    <div className={`${center ? "mx-auto text-center" : ""} max-w-2xl ${className}`}>
      <h2 id={id} className="text-balance font-display text-[30px] font-semibold leading-[1.08] tracking-[-0.01em] text-white sm:text-[42px]">
        <span aria-hidden="true" className="mr-3 inline-block h-[0.42em] w-[0.42em] -translate-y-[0.12em] align-middle" style={{ background: marker }} />
        {title}
      </h2>
      {intro && (
        <p className={`mt-4 max-w-xl text-pretty text-[15px] leading-relaxed text-[#A7ADD4] sm:text-[16px] ${center ? "mx-auto" : ""}`}>
          {intro}
        </p>
      )}
    </div>
  );
}
