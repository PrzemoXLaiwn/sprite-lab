import Script from "next/script";
import { Suspense } from "react";
import { GoogleAnalyticsPageViews } from "./google-analytics-client";
import { GA_MEASUREMENT_ID } from "@/lib/analytics/measurement-id";
import { consentBootstrap } from "@/lib/analytics/consent";

// The inline script denies storage for every visitor first. A known country
// outside the UK, EEA and Switzerland, or a stored Accept, grants in that
// same script. A missing country or a stored Reject never grants.
const GA_ID = GA_MEASUREMENT_ID;

export function GoogleAnalytics() {
  if (!GA_ID || process.env.NODE_ENV !== "production") return null;
  return (
    <>
      <script id="ga-consent" dangerouslySetInnerHTML={{ __html: consentBootstrap(GA_ID) }} />
      <Script
        id="ga-loader"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="lazyOnload"
      />
      <Suspense fallback={null}>
        <GoogleAnalyticsPageViews />
      </Suspense>
    </>
  );
}
