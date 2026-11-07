/** Copy for the optional, explicit publish action. Assets stay private until the person asks. */

export const COMMUNITY_SEEN_KEY = "sl:community-seen";

export function shareActionLabel(isPublic: boolean): string {
  return isPublic ? "Make private again" : "Share to the community gallery";
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

export function shareCaption(isPublic: boolean): { title: string; body: string } {
  if (isPublic) {
    return {
      title: "In the community gallery",
      body: "Anyone can see this image and its prompt. Your other sprites stay private.",
    };
  }
  return {
    title: "Saved privately in Assets",
    body: "Only you can see it. Sharing is optional and publishes this image and its prompt.",
  };
}
