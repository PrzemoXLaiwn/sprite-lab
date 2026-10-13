import { renderOgImage } from "@/components/landing/og-image";
import { GUIDES, getGuide, guideReadingMinutes } from "@/data/guides";

export const alt = "SpriteLab game dev guide";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuide(slug);
  return renderOgImage({
    title: guide?.title ?? "Game Dev Guides",
    subtitle: guide ? `Game dev guide · ${guideReadingMinutes(guide)} min read` : "Practical guides for 2D game art",
  });
}
