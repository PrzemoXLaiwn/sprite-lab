import { SiteNav } from "@/components/layout/SiteNav";
import { Footer } from "@/components/layout/Footer";

// Metadata (title, description, canonical, Open Graph) lives in page.tsx. The layout adds the public site chrome.

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#131A31] text-[#FFF1E8]">
      <SiteNav />
      <main className="pt-16">{children}</main>
      <Footer />
    </div>
  );
}
