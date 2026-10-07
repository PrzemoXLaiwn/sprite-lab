import { SiteNav } from "./SiteNav";

/**
 * Legacy public header. Kept for backwards compatibility — renders the
 * current marketing nav so any remaining usage stays visually consistent.
 */
export function Header({ registerUrl = "/register" }: { registerUrl?: string } = {}) {
  return <SiteNav registerUrl={registerUrl} />;
}
