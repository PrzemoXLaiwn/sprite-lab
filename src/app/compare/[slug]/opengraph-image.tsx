import { renderOgImage } from "@/components/landing/og-image";
import { COMPARISONS, COMPARE_CHECKED_ON_LABEL, getComparison } from "@/data/compare";

export const alt = "SpriteLab comparison with another AI sprite tool";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return COMPARISONS.map((c) => ({ slug: c.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = getComparison(slug);
  return renderOgImage({
    title: c ? `SpriteLab vs ${c.competitor}` : "AI Sprite Tools Compared",
    subtitle: `Features and pricing from official sources · checked ${COMPARE_CHECKED_ON_LABEL}`,
  });
}
