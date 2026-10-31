/** After the first successful sprite in this browser session, point at motion. */

export const FIRST_SESSION_NEXT_KEY = "spritelab.first-session-next";

export function shouldShowFirstSessionNext(input: { firstSuccess: boolean; alreadyShown: boolean }): boolean {
  return input.firstSuccess && !input.alreadyShown;
}
