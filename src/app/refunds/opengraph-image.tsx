import { renderOgImage } from "@/components/landing/og-image";

export const alt = "Refund and Cancellation Policy — SpriteLab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    title: "Refunds & cancellation",
    subtitle: "Cancel any time. 14-day cooling-off period.",
  });
}
