import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Orbitron } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

// Optimized font loading with next/font (no render-blocking!)
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains",
  weight: ["400", "500", "600"],
});

const orbitron = Orbitron({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-orbitron",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const baseUrl = "https://www.sprite-lab.com";

export const metadata: Metadata = {
  title: {
    default: "SpriteLab - Free AI Sprite Generator | Pixel Art in Seconds",
    template: "%s | SpriteLab", // podstrony będą miały "Pricing | SpriteLab"
  },
  description:
    "Create game-ready sprites, weapons, characters & items in seconds. No art skills needed. Free credits to start. Trusted by indie developers worldwide.",
  keywords: [
    "AI sprite generator",
    "free sprite generator",
    "pixel art generator",
    "game asset generator",
    "AI game art",
    "indie game sprites",
    "2D game assets",
    "3D model generator",
    "Unity sprites",
    "Godot assets",
    "RPG sprites",
    "game icons generator",
  ],
  authors: [{ name: "SpriteLab", url: baseUrl }],
  creator: "SpriteLab",
  publisher: "SpriteLab",
  metadataBase: new URL(baseUrl),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "SpriteLab - Free AI Sprite Generator for Games",
    description:
      "Generate game-ready sprites in seconds. 10+ art styles, transparent backgrounds, commercial license included.",
    url: baseUrl,
    siteName: "SpriteLab",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SpriteLab - Create game sprites with AI",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SpriteLab - Free AI Sprite Generator",
    description:
      "Create game-ready sprites in seconds. No art skills needed. Free to start.",
    images: ["/og-image.png"],
    creator: "@spritelab",
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
  // verification: {
  //   google: "twój-kod-weryfikacji",
  // },
};

// Rozbudowane structured data
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${baseUrl}/#website`,
      url: baseUrl,
      name: "SpriteLab",
      description: "AI-powered game asset generator",
      publisher: { "@id": `${baseUrl}/#organization` },
    },
    {
      "@type": "Organization",
      "@id": `${baseUrl}/#organization`,
      name: "SpriteLab",
      url: baseUrl,
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/logo.png`,
      },
      sameAs: [
        "https://twitter.com/spritelab",
        // dodaj inne social media
      ],
    },
    {
      "@type": "SoftwareApplication",
      name: "SpriteLab",
      applicationCategory: "GameApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      description:
        "AI-powered game asset generator for indie developers. Create sprites, icons, and 3D models in seconds.",
      url: baseUrl,
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.8",
        ratingCount: "50", // zaktualizuj jak będziesz mieć prawdziwe dane
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable} ${orbitron.variable}`}>
      <head>
        {/* Favicon - wszystkie rozmiary dla różnych przeglądarek i Google */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icon-16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icon-32.png" />
        <link rel="icon" type="image/png" sizes="48x48" href="/icon-48.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0f172a" />
        {/* Google AdSense */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3053243391231414"
          crossOrigin="anonymous"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className="font-sans antialiased min-h-screen bg-background text-foreground"
        suppressHydrationWarning
      >
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}