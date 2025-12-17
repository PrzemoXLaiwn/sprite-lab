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

// Enhanced structured data for better SEO
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${baseUrl}/#website`,
      url: baseUrl,
      name: "SpriteLab",
      description: "AI-powered game asset generator for indie developers",
      publisher: { "@id": `${baseUrl}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${baseUrl}/search?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
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
      description: "AI-powered game asset generator trusted by indie developers worldwide",
      foundingDate: "2024",
      sameAs: [
        "https://twitter.com/spritelab",
      ],
      contactPoint: {
        "@type": "ContactPoint",
        email: "support@sprite-lab.com",
        contactType: "Customer Support",
        availableLanguage: ["English", "Polish"],
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${baseUrl}/#software`,
      name: "SpriteLab",
      applicationCategory: "GameApplication",
      applicationSubCategory: "Game Development Tool",
      operatingSystem: "Web Browser",
      browserRequirements: "Requires JavaScript. Requires HTML5.",
      offers: [
        {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          name: "Free Plan",
          description: "5 free credits to start creating game assets",
        },
        {
          "@type": "Offer",
          price: "9",
          priceCurrency: "USD",
          name: "Starter Plan",
          description: "100 credits per month for indie developers",
          priceValidUntil: "2025-12-31",
        },
      ],
      description:
        "AI-powered game asset generator for indie developers. Create sprites, icons, and 3D models in seconds with multiple art styles.",
      url: baseUrl,
      screenshot: `${baseUrl}/og-image.png`,
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.8",
        ratingCount: "127",
        bestRating: "5",
        worstRating: "1",
      },
      featureList: [
        "AI-powered sprite generation",
        "Multiple art styles (pixel art, anime, realistic)",
        "2D and 3D asset creation",
        "Transparent backgrounds",
        "Commercial license included",
        "Fast generation (5-10 seconds)",
      ],
    },
    {
      "@type": "FAQPage",
      "@id": `${baseUrl}/#faq`,
      mainEntity: [
        {
          "@type": "Question",
          name: "Can I use generated assets commercially?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes! All assets you generate are yours to use in commercial projects with no attribution required. You have full ownership rights.",
          },
        },
        {
          "@type": "Question",
          name: "What formats are supported?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "2D assets export as PNG with transparent backgrounds. 3D models export as GLB, PLY, and OBJ formats compatible with all major game engines.",
          },
        },
        {
          "@type": "Question",
          name: "How long does generation take?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "2D sprites generate in about 5 seconds. 3D models take 30-60 seconds depending on complexity. Our AI is optimized for speed.",
          },
        },
        {
          "@type": "Question",
          name: "Do credits expire?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Credits on paid plans refresh monthly. Free tier credits never expire - use them whenever you're ready!",
          },
        },
      ],
    },
    {
      "@type": "Product",
      "@id": `${baseUrl}/#product`,
      name: "SpriteLab AI Game Asset Generator",
      description: "Create game-ready sprites, icons, and 3D assets in seconds with AI",
      brand: {
        "@type": "Brand",
        name: "SpriteLab",
      },
      offers: {
        "@type": "AggregateOffer",
        lowPrice: "0",
        highPrice: "299",
        priceCurrency: "USD",
        offerCount: "3",
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.8",
        reviewCount: "127",
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
        {/* Resource Hints - Performance Optimization */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        <link rel="dns-prefetch" href="https://pagead2.googlesyndication.com" />
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
        <meta name="theme-color" content="#030305" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        {/* Google AdSense */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3053243391231414"
          crossOrigin="anonymous"
        />
        {/* Google Tag (gtag.js) - Conversion Tracking + Remarketing */}
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=AW-17802754923"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'AW-17802754923', {
                'allow_enhanced_conversions': true
              });

              // Enable remarketing and dynamic remarketing
              gtag('config', 'AW-17802754923', {
                'send_page_view': true,
                'remarketing': true
              });
            `,
          }}
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