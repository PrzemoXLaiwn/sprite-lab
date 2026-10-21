import { renderOgImage } from "@/components/landing/og-image";
import { SIGNUP_CREDITS } from "@/config/signup";

export const alt = "SpriteLab pricing — plans from £5/month";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    title: "SpriteLab Pricing",
    subtitle: `${SIGNUP_CREDITS} free credits · plans from £5/month`,
  });
}
