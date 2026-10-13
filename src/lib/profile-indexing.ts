// Public profiles are user-generated pages. A profile with only one or two
// images is thin content to a search engine (and to AdSense reviewers), so it
// stays visible to people but out of the index and the sitemap.

/** Public assets a profile needs before it is indexed and listed in the sitemap. */
export const MIN_INDEXED_PROFILE_ASSETS = 6;

export function shouldIndexProfile(publicAssets: number): boolean {
  return publicAssets >= MIN_INDEXED_PROFILE_ASSETS;
}
