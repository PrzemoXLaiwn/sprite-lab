// =============================================================================
// "NEW" badges in the app navigation. Each entry shows until its date passes,
// then disappears on its own — no follow-up deploy needed.
// =============================================================================

export const NEW_UNTIL: Record<string, string> = {
  // Sprite Dungeon launched 2026-10-17: two weeks of badge
  "/play": "2026-10-31T23:59:59Z",
};

export function isNewFeature(href: string, now: Date = new Date()): boolean {
  const until = NEW_UNTIL[href];
  return Boolean(until) && now.getTime() <= new Date(until).getTime();
}
