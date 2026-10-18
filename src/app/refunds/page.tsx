import { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { REFUNDS_MARKDOWN } from "@/content/legal/refunds";

export const metadata: Metadata = {
  title: "Refund and Cancellation Policy",
  description:
    "How to cancel a SpriteLab subscription, the 14-day cooling-off period, and refunds for credit packs.",
  alternates: { canonical: "https://www.sprite-lab.com/refunds" },
  openGraph: {
    title: "Refund and Cancellation Policy | SpriteLab",
    description:
      "How to cancel a SpriteLab subscription, the 14-day cooling-off period, and refunds for credit packs.",
    url: "https://www.sprite-lab.com/refunds",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Refund and Cancellation Policy | SpriteLab",
    description:
      "How to cancel a SpriteLab subscription, the 14-day cooling-off period, and refunds for credit packs.",
  },
};

export default function RefundsPage() {
  return <LegalDocument markdown={REFUNDS_MARKDOWN} />;
}
