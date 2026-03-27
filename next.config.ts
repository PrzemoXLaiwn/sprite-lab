import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ===========================================
  // IMAGE OPTIMIZATION
  // ===========================================
  images: {
    // Allow external image sources
    remotePatterns: [
      {
        protocol: "https",
        hostname: "replicate.delivery",
      },
      {
        protocol: "https",
        hostname: "replicate.com",
      },
      {
        protocol: "https",
        hostname: "pbxt.replicate.delivery",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "**.supabase.in",
      },
      // Cloudflare R2 storage
      {
        protocol: "https",
        hostname: "**.r2.dev",
      },
      {
        protocol: "https",
        hostname: "**.cloudflare.com",
      },
      // Runware AI generated images
      {
        protocol: "https",
        hostname: "**.runware.ai",
      },
      {
        protocol: "https",
        hostname: "im.runware.ai",
      },
    ],
    // Modern image formats for better compression
    formats: ["image/avif", "image/webp"],
    // Minimize layout shift
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // ===========================================
  // SECURITY HEADERS
  // ===========================================
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent clickjacking
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          // Prevent MIME type sniffing
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // Enable XSS protection
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          // Referrer policy
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Permissions policy
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          // Content Security Policy — cleaned (removed AdSense, Google Ads, TikTok)
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://js.stripe.com https://va.vercel-scripts.com https://vercel.live",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data:",
              "img-src 'self' data: blob: https: http:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://replicate.delivery https://*.replicate.delivery https://va.vercel-scripts.com https://vitals.vercel-insights.com",
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://vercel.live",
              "worker-src 'self' blob:",
              "media-src 'self' blob: https:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
      // Cache static assets aggressively
      {
        source: "/(.*)\\.(ico|png|jpg|jpeg|gif|webp|svg|woff|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Cache JS/CSS bundles
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // API routes - short cache for dynamic content
      {
        source: "/api/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, must-revalidate",
          },
        ],
      },
    ];
  },

  // ===========================================
  // PERFORMANCE OPTIMIZATIONS
  // ===========================================

  // Enable compression
  compress: true,

  // Strict mode for better debugging
  reactStrictMode: true,

  // Experimental features for performance
  experimental: {
    // Optimize package imports - tree shaking for smaller bundles
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-avatar",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-label",
      "@radix-ui/react-progress",
      "@radix-ui/react-select",
      "@radix-ui/react-slot",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toast",
      "@stripe/react-stripe-js",
      "framer-motion",
      "date-fns",
      "zod",
    ],
  },

  // Powered by header - hide for security
  poweredByHeader: false,

  // Generate ETags for caching
  generateEtags: true,

  // Output standalone for smaller deployments
  output: "standalone",

  // ===========================================
  // REDIRECTS — route aliases
  // ===========================================
  async redirects() {
    return [
      {
        source: "/gallery",
        destination: "/assets",
        permanent: true,
      },
      {
        source: "/dashboard",
        destination: "/usage",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
