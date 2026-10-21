// =============================================================================
// Readable error text for a failed request in the browser
// =============================================================================
// fetch() rejects with a TypeError when the network is gone ("Failed to
// fetch" in Chrome, "NetworkError when attempting to fetch resource." in
// Firefox, "Load failed" in Safari). Those strings mean nothing to a user, so
// they're replaced; server messages (thrown as Error) are shown as they are.
// Client-safe, no I/O.
// =============================================================================

export const OFFLINE_MESSAGE = "You're offline or the connection dropped. Check it and try again.";

const NETWORK_FAILURE = /failed to fetch|networkerror|network error|load failed|network request failed|err_internet_disconnected|err_network/i;

export function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError && NETWORK_FAILURE.test(err.message);
}

/** The message to show for `err`: offline text for network failures, else its message, else `fallback`. */
export function userErrorMessage(err: unknown, fallback: string): string {
  if (isNetworkError(err)) return OFFLINE_MESSAGE;
  return err instanceof Error && err.message ? err.message : fallback;
}
