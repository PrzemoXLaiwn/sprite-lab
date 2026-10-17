import { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { COOKIES_MARKDOWN } from "@/content/legal/cookies";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "How SpriteLab uses cookies and similar technologies, which ones need consent, and how to change your choices.",
  alternates: { canonical: "https://www.sprite-lab.com/cookies" },
  openGraph: {
    title: "Cookie Policy | SpriteLab",
    description:
      "How SpriteLab uses cookies and similar technologies, which ones need consent, and how to change your choices.",
    url: "https://www.sprite-lab.com/cookies",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cookie Policy | SpriteLab",
    description:
      "How SpriteLab uses cookies and similar technologies, which ones need consent, and how to change your choices.",
  },
};

export default function CookiesPage() {
  return <LegalDocument markdown={COOKIES_MARKDOWN} />;
}
