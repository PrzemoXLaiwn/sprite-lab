import type { Metadata } from "next";
import { metadata as publicMetadata } from "@/app/(public-app)/community/layout";

// Signed-in /community (rewritten here by the session proxy): same page, app frame
export { default } from "@/app/(public-app)/community/page";

export const metadata: Metadata = { ...publicMetadata, robots: { index: false, follow: true } };
