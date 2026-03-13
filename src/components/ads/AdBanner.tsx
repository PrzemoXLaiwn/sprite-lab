"use client";

import { useEffect, useRef } from "react";

interface AdBannerProps {
  slot: string;
  format?: "auto" | "horizontal" | "vertical" | "rectangle";
  responsive?: boolean;
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle: Array<Record<string, unknown>>;
  }
}

export function AdBanner({ slot, format = "auto", responsive = true, className = "" }: AdBannerProps) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense not loaded yet
    }
  }, []);

  return (
    <div className={`ad-container overflow-hidden ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-3053243391231414"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
    </div>
  );
}

export function AdBannerHorizontal({ className = "" }: { className?: string }) {
  return (
    <div className={`w-full max-w-6xl mx-auto px-3 sm:px-4 my-6 sm:my-8 ${className}`}>
      <p className="text-[10px] text-white/20 text-center mb-1 uppercase tracking-wider">Advertisement</p>
      <AdBanner slot="auto" format="horizontal" className="min-h-[90px] sm:min-h-[100px] rounded-lg overflow-hidden" />
    </div>
  );
}

export function AdBannerSidebar({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <p className="text-[10px] text-muted-foreground/40 text-center mb-1 uppercase tracking-wider">Sponsored</p>
      <AdBanner slot="auto" format="rectangle" className="min-h-[250px] rounded-lg overflow-hidden" />
    </div>
  );
}
