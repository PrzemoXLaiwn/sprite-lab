// Destinations shared by the desktop rail and the phone menu.
// The community gallery is named Community — "Explore" did not match the page.

export interface AppDestination {
  href: string;
  label: string;
}

export const APP_NAV: readonly AppDestination[] = [
  { href: "/", label: "Home" },
  { href: "/generate", label: "Create" },
  { href: "/assets", label: "Assets" },
  { href: "/projects", label: "Projects" },
  { href: "/quests", label: "Quests" },
  { href: "/play", label: "Dungeon" },
  { href: "/community", label: "Community" },
  { href: "/usage", label: "Usage" },
  { href: "/how-it-works", label: "Guide" },
  { href: "/settings", label: "Settings" },
];
