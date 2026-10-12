import { renderOgImage } from "@/components/landing/og-image";

export const alt = "SpriteLab pricing — plans from £5/month";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    title: "SpriteLab Pricing",
    subtitle: "10 free credits on signup · plans from £5/month",
  });
}
