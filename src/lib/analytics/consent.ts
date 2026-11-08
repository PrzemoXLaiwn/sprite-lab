/**
 * Explicit analytics/ads choice. Defaults in GoogleAnalytics stay as they are:
 * denied in the UK, EEA and Switzerland, granted elsewhere. This module only
 * records a choice the person made and the matching gtag consent update.
 * It never turns a missing choice in those regions into granted.
 */

export const MEASUREMENT_CHOICE_KEY = "sl:measurement-choice";
export const OPEN_MEASUREMENT_CHOICES = "sl:open-measurement-choices";
export const MEASUREMENT_CHOICE_CHANGED = "sl:measurement-choice";

export const CONSENT_REGIONS = [
  "GB", "CH", "NO", "IS", "LI", "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE",
  "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
] as const;

export type MeasurementChoice = "granted" | "denied";

export interface ConsentSignals {
  ad_storage: MeasurementChoice;
  ad_user_data: MeasurementChoice;
  ad_personalization: MeasurementChoice;
  analytics_storage: MeasurementChoice;
}

export function readCountryCookie(cookie: string): string | null {
  const match = cookie.match(/(?:^|; )sl-country=([A-Za-z]{2})(?:;|$)/);
  return match ? match[1].toUpperCase() : null;
}

export function regionRequiresChoice(country: string | null | undefined): boolean {
  if (!country) return true;
  return (CONSENT_REGIONS as readonly string[]).includes(country.toUpperCase());
}

export function parseMeasurementChoice(raw: unknown): MeasurementChoice | null {
  if (raw === "granted" || raw === "denied") return raw;
  return null;
}

export function consentSignals(choice: MeasurementChoice): ConsentSignals {
  return {
    ad_storage: choice,
    ad_user_data: choice,
    ad_personalization: choice,
    analytics_storage: choice,
  };
}

/** Whether we may hand a purchase to gtag. Refusal and an unanswered required region stay off. */
export function measurementAllowed(input: {
  choice: MeasurementChoice | null;
  regionRequiresChoice: boolean;
}): boolean {
  if (input.choice === "denied") return false;
  if (input.choice === "granted") return true;
  return !input.regionRequiresChoice;
}

export function mayLoadAds(input: {
  adsSlotAllowed: boolean;
  choice: MeasurementChoice | null;
  country: string | null;
}): boolean {
  return input.adsSlotAllowed && measurementAllowed({
    choice: input.choice,
    regionRequiresChoice: regionRequiresChoice(input.country),
  });
}

/** Cookie value written by the proxy. Anything that is not a country code is unknown. */
export function countryCookieValue(header: string | null | undefined): string {
  if (!header || !/^[A-Za-z]{2}$/.test(header)) return "";
  return header.toUpperCase();
}

export type PurchaseConsent = "allowed" | "awaiting" | "denied";

/** Denied and an unanswered required or unknown country wait or stop. A known other country may measure. */
export function purchaseConsent(input: {
  choice: MeasurementChoice | null;
  country: string | null | undefined;
}): PurchaseConsent {
  if (input.choice === "denied") return "denied";
  if (input.choice === "granted") return "allowed";
  if (regionRequiresChoice(input.country)) return "awaiting";
  return "allowed";
}

/**
 * First command is a global deny, including when the country cookie or header
 * is missing. A grant is a later update in the same script, only for an
 * explicit accept or a known country outside the consent list. A stored
 * refusal is never granted first.
 */
export function consentBootstrap(measurementId: string): string {
  const regions = JSON.stringify(CONSENT_REGIONS);
  const key = JSON.stringify(MEASUREMENT_CHOICE_KEY);
  return `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
if(!window.__slGtagBoot){window.__slGtagBoot=true;
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});
try{
var slm=document.cookie.match(/(?:^|; )sl-country=([A-Za-z]{2})(?:;|$)/);
var slCountry=slm?slm[1].toUpperCase():"";
var slChoice="";
try{slChoice=localStorage.getItem(${key})||"";}catch(e){}
var slRegions=${regions};
var slGrant=false;
if(slChoice==="granted") slGrant=true;
else if(slChoice==="denied") slGrant=false;
else if(slCountry && slRegions.indexOf(slCountry)<0) slGrant=true;
if(slGrant) gtag('consent','update',{ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted',analytics_storage:'granted'});
}catch(e){}
gtag('js',new Date());gtag('config','${measurementId}',{send_page_view:false});}`;
}

export function applyMeasurementChoice(
  choice: MeasurementChoice,
  deps: { store: { get(key: string): string | null; set(key: string, value: string): void }; gtag?: (...args: unknown[]) => void },
): ConsentSignals {
  const signals = consentSignals(choice);
  deps.store.set(MEASUREMENT_CHOICE_KEY, choice);
  if (typeof deps.gtag === "function") {
    deps.gtag("consent", "update", signals);
  }
  return signals;
}
