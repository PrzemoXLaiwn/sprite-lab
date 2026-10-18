import { LegalChrome } from "@/components/legal/LegalChrome";

export default function CookiesLayout({ children }: { children: React.ReactNode }) {
  return <LegalChrome>{children}</LegalChrome>;
}
