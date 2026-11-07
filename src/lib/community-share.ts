/** Copy for the optional, explicit publish action. Assets stay private until the person asks. */

export const COMMUNITY_SEEN_KEY = "sl:community-seen";

/** true = server says public, false = server says private, null = not known yet. */
export type ConfirmedPublic = boolean | null;

export interface ShareView {
  published: ConfirmedPublic;
  pending: boolean;
  error: string | null;
}

export function idleShare(published: ConfirmedPublic): ShareView {
  return { published, pending: false, error: null };
}

/** Starts a request without claiming the server already changed visibility. */
export function shareRequested(view: ShareView): ShareView {
  return { published: view.published, pending: true, error: null };
}

/** Failure keeps the last confirmed visibility. */
export function shareFailed(view: ShareView, error: string): ShareView {
  return { published: view.published, pending: false, error };
}

export function shareSucceeded(view: ShareView, published: boolean): ShareView {
  return { published, pending: false, error: null };
}

/** History and old drafts: only a real boolean is a confirmed state. */
export function visibilityFromHistory(isPublic: unknown): ConfirmedPublic {
  return typeof isPublic === "boolean" ? isPublic : null;
}

export function shareActionLabel(published: boolean): string;
export function shareActionLabel(published: null): null;
export function shareActionLabel(published: ConfirmedPublic): string | null;
export function shareActionLabel(published: ConfirmedPublic): string | null {
  if (published === true) return "Make private again";
  if (published === false) return "Share to the community gallery";
  return null;
}

export function shareToast(isPublic: boolean): { title: string; body: string } {
  if (isPublic) {
    return {
      title: "Shared to the community gallery",
      body: "Anyone can see this image and its prompt. Your other sprites stay private.",
    };
  }
  return {
    title: "Private again",
    body: "Only you can see it in Assets.",
  };
}

export function shareCaption(published: ConfirmedPublic): { title: string; body: string } {
  if (published === true) {
    return {
      title: "In the community gallery",
      body: "Anyone can see this image and its prompt. Your other sprites stay private.",
    };
  }
  if (published === false) {
    return {
      title: "Saved privately in Assets",
      body: "Only you can see it. Sharing is optional and publishes this image and its prompt.",
    };
  }
  return {
    title: "Sharing status unknown",
    body: "This sprite might already be in the community gallery, so it is not marked private.",
  };
}
