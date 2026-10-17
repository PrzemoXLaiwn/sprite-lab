import { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { TERMS_MARKDOWN } from "@/content/legal/terms";

export const metadata: Metadata = {
  title: "Terms of Service — Credits & Asset Use",
  description:
    "The terms for using SpriteLab: accounts, credits and payments, acceptable use, and the licence for assets you generate. Commercial use is on paid plans.",
  alternates: { canonical: "https://www.sprite-lab.com/terms" },
  openGraph: {
    title: "Terms of Service — Credits & Asset Use | SpriteLab",
    description:
      "The terms for using SpriteLab: accounts, credits and payments, acceptable use, and the licence for assets you generate. Commercial use is on paid plans.",
    url: "https://www.sprite-lab.com/terms",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms of Service — Credits & Asset Use | SpriteLab",
    description:
      "The terms for using SpriteLab: accounts, credits and payments, acceptable use, and the licence for assets you generate. Commercial use is on paid plans.",
  },
};

export default function TermsPage() {
  return <LegalDocument markdown={TERMS_MARKDOWN} />;
}
