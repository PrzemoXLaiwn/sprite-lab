import { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { PRIVACY_MARKDOWN } from "@/content/legal/privacy";

export const metadata: Metadata = {
  title: "Privacy Policy — How We Handle Your Data",
  description:
    "How SpriteLab collects, uses and protects your personal data when you generate game sprites, animations and tiles, and how to exercise your UK GDPR rights.",
  alternates: { canonical: "https://www.sprite-lab.com/privacy" },
  openGraph: {
    title: "Privacy Policy — How We Handle Your Data | SpriteLab",
    description:
      "How SpriteLab collects, uses and protects your personal data when you generate game sprites, animations and tiles, and how to exercise your UK GDPR rights.",
    url: "https://www.sprite-lab.com/privacy",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy — How We Handle Your Data | SpriteLab",
    description:
      "How SpriteLab collects, uses and protects your personal data when you generate game sprites, animations and tiles, and how to exercise your UK GDPR rights.",
  },
};

export default function PrivacyPage() {
  return <LegalDocument markdown={PRIVACY_MARKDOWN} />;
}
