// =============================================================================
// Where AdSense may load (docs/adsense-content-audit.md)
// =============================================================================
// Ads belong next to substantial original text, never on thin, transactional
// or app pages. Three rules, all required:
//   1. the path is a long-form content page: a guide article or a comparison
//      (the /compare index counts as a comparison page, the /guides index does
//      not — it is a list of links);
//   2. the visitor is signed out (members never see ads);
//   3. the page's main text is at least AD_MIN_WORDS words.
// The AdSense component checks all three in the browser; this module holds
// the rules so they can be unit-tested.
// =============================================================================

/** Minimum words of main text on a page that shows ads. */
export const AD_MIN_WORDS = 800;

const AD_PATHS: RegExp[] = [/^\/guides\/[a-z0-9-]+\/?$/, /^\/compare(\/[a-z0-9-]+)?\/?$/];

export function isAdPath(pathname: string): boolean {
  return AD_PATHS.some((re) => re.test(pathname));
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

export function adsAllowed(opts: { pathname: string; signedIn: boolean; mainWords: number }): boolean {
  return !opts.signedIn && isAdPath(opts.pathname) && opts.mainWords >= AD_MIN_WORDS;
}

/**
 * Selectors left out of the "main text" count: site chrome, scripts, and
 * anything a page marks with data-ads-ignore (CTAs, link lists, tables of
 * contents) so that only the article itself counts.
 */
export const AD_IGNORE_SELECTOR = "nav, footer, script, style, noscript, [data-ads-ignore]";
