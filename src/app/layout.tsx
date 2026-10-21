import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next, JetBrains_Mono, Tektur } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { FirstTouch } from "@/components/analytics/FirstTouch";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";
import { BRAND_DEFINITION, BRAND_SUMMARY, FEATURE_LIST } from "@/data/brand";

// Optimized font loading with next/font (no render-blocking!)
// Body + UI: built for legibility (distinct I/l/1, 0/O) — small labels and
// numbers stay readable without a monospace face.
const body = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains",
  weight: ["400", "500", "600"],
});

// Display face: angular, game-UI flavoured, but not a pixel font (pixel
// fonts were tried and rejected — unreadable, esp. digits).
const display = Tektur({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-tektur",
});

const baseUrl = "https://www.sprite-lab.com";

export const metadata: Metadata = {
  title: {
    default: "SpriteLab — AI Game Asset Generator for Indie Developers",
    template: "%s | SpriteLab",
  },
  description:
    "Generate game-ready sprites, pixel art, sprite-sheet animations and seamless tiles with AI. Transparent PNG for Unity, Godot and GameMaker. Free credits to start.",
  keywords: [
    "AI game asset generator",
    "AI sprite generator",
    "AI pixel art generator",
    "sprite sheet generator",
    "AI sprite animation",
    "game asset generator",
    "indie game sprites",
    "2D game assets",
    "Unity sprites",
    "Godot sprites",
    "RPG sprites",
    "game icon generator",
    "AI tileset generator",
    "game weapon generator",
    "RPG character creator",
    "transparent PNG sprites",
    "commercial game assets",
  ],
  authors: [{ name: "SpriteLab", url: baseUrl }],
  creator: "SpriteLab",
  publisher: "SpriteLab",
  metadataBase: new URL(baseUrl),
  // No site-wide canonical: a root `canonical: "/"` is inherited by every page
  // that doesn't set its own, telling Google they're all copies of the
  // homepage. Each indexable page sets its own canonical instead.
  openGraph: {
    title: "SpriteLab — AI Game Asset Generator for Indie Developers",
    description:
      "Game-ready sprites, pixel art, sprite-sheet animations and seamless tiles from a text prompt. Transparent PNG, commercial license included.",
    url: baseUrl,
    siteName: "SpriteLab",
    // Image is generated dynamically by `src/app/opengraph-image.tsx` —
    // do NOT set `images:` here, the explicit array overrides the
    // file-based convention and would re-introduce the missing-PNG bug.
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SpriteLab — AI Game Asset Generator",
    description:
      "Game-ready sprites, pixel art and sprite-sheet animations from a text prompt. Free to start.",
    // Same deal — `src/app/twitter-image.tsx` (or the opengraph-image
    // fallback) renders this. Don't hardcode a static path.
    // Add `creator: "@handle"` once SpriteLab has a confirmed X account.
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

// Site-wide structured data: who we are and what the product is. Page-specific
// data (FAQPage, per-tool SoftwareApplication) lives on the pages themselves,
// next to the visible content it describes. Keep every claim here true —
// it is read by search engines and AI assistants as a description of us.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${baseUrl}/#website`,
      url: baseUrl,
      name: "SpriteLab",
      description: BRAND_DEFINITION,
      publisher: { "@id": `${baseUrl}/#organization` },
      inLanguage: "en",
    },
    {
      "@type": "Organization",
      "@id": `${baseUrl}/#organization`,
      name: "SpriteLab",
      url: baseUrl,
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/logo.png`,
        width: 512,
        height: 512,
      },
      description: "SpriteLab makes an AI 2D game asset creator for game developers (sprite-lab.com). Not affiliated with Code.org's Sprite Lab.",
      foundingDate: "2024",
      // sameAs: list SpriteLab's own social profiles here once they exist
      // (a handle we don't control would tell search engines it's ours).
      sameAs: ["https://github.com/PrzemoXLaiwn/sprite-lab", "https://www.tiktok.com/@spritelab1"],
      contactPoint: {
        "@type": "ContactPoint",
        email: "spritelab.contact@gmail.com",
        contactType: "Customer Support",
        availableLanguage: ["English", "Polish"],
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${baseUrl}/#software`,
      name: "SpriteLab",
      applicationCategory: "DesignApplication",
      applicationSubCategory: "2D game asset creator",
      operatingSystem: "Web Browser",
      browserRequirements: "Requires JavaScript. Requires HTML5.",
      publisher: { "@id": `${baseUrl}/#organization` },
      offers: [
        {
          "@type": "Offer",
          price: "0",
          priceCurrency: "GBP",
          name: "Free",
          description: "10 free credits on signup, plus 3 tries without an account",
        },
        {
          "@type": "Offer",
          price: "5.00",
          priceCurrency: "GBP",
          name: "Starter",
          description: "250 credits per month",
          priceValidUntil: "2027-12-31",
        },
        {
          "@type": "Offer",
          price: "12.00",
          priceCurrency: "GBP",
          name: "Pro",
          description: "500 credits per month",
          priceValidUntil: "2027-12-31",
        },
        {
          "@type": "Offer",
          price: "25.00",
          priceCurrency: "GBP",
          name: "Studio",
          description: "1,200 credits per month",
          priceValidUntil: "2027-12-31",
        },
      ],
      description: BRAND_SUMMARY,
      url: baseUrl,
      screenshot: `${baseUrl}/opengraph-image`,
      // aggregateRating intentionally omitted until we have real verifiable
      // reviews. Google penalises fabricated rich-result data.
      featureList: [...FEATURE_LIST],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${body.variable} ${jetbrainsMono.variable} ${display.variable}`}>
      <head>
        {/* Resource Hints - Performance Optimization */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://js.stripe.com" />
        <link rel="dns-prefetch" href="https://replicate.delivery" />
        <link rel="preconnect" href="https://va.vercel-scripts.com" />
        
        {/* Favicon - wszystkie rozmiary dla różnych przeglądarek i Google */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icon-16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icon-32.png" />
        <link rel="icon" type="image/png" sizes="48x48" href="/icon-48.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0F1529" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        {/* Structured Data - static, no hydration issues */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className="font-sans antialiased min-h-screen bg-background text-foreground pb-10 md:has-[.app-main]:pb-0"
        suppressHydrationWarning
      >
        {children}
        <Toaster />
        <Analytics />
        <SpeedInsights />
        <GoogleAnalytics />
        <FirstTouch />

      </body>
    </html>
  );
}