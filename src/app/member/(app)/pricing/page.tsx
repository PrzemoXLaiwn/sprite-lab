import type { Metadata } from "next";
import { metadata as publicMetadata } from "@/app/(public-app)/pricing/layout";

// Signed-in /pricing (rewritten here by the session proxy): same page, app frame
export { default } from "@/app/(public-app)/pricing/page";

export const metadata: Metadata = { ...publicMetadata, robots: { index: false, follow: true } };
