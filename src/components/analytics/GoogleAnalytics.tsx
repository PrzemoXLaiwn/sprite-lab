import Script from "next/script";
import { Suspense } from "react";
import { GoogleAnalyticsPageViews } from "./google-analytics-client";

// Google Analytics 4. Consent Mode v2: in the UK, EEA and Switzerland nothing
// is stored until the visitor accepts in Google's consent message (the same
// CMP AdSense uses); elsewhere measurement starts right away.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-DSMJ4N3BSQ";
const CONSENT_REGIONS = [
  "GB", "CH", "NO", "IS", "LI", "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE",
  "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
];

/**
 * One consent default, then one config. `send_page_view` is off so the route
 * listener is the only page_view (including client navigations). The guard
 * skips a second run of this stub. gtag.js itself is lazyOnload, which does
 * not emit a preload link the way afterInteractive does.
 */
function consentBootstrap(measurementId: string): string {
  return `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
if(!window.__slGtagBoot){window.__slGtagBoot=true;
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500,region:${JSON.stringify(CONSENT_REGIONS)}});
gtag('consent','default',{ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted',analytics_storage:'granted'});
gtag('js',new Date());gtag('config','${measurementId}',{send_page_view:false});}`;
}

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
