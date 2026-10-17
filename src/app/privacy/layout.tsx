import { LegalChrome } from "@/components/legal/LegalChrome";

// Metadata (title, description, canonical, Open Graph) lives in page.tsx. The layout adds the public site chrome.

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <LegalChrome>{children}</LegalChrome>;
}
