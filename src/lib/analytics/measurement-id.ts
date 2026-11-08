/**
 * GA4 stream configured in `GoogleAnalytics`. Checkout measurement sends here
 * and nowhere else. Override with NEXT_PUBLIC_GA_ID only when the deployment
 * intentionally uses another GA4 stream.
 */
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || "G-DSMJ4N3BSQ";
