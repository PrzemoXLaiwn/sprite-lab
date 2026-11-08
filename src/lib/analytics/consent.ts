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

/**
 * Runs inside the consent stub, before gtag.js. Replays a stored choice.
 * A missing key does not grant anything.
 */
export function storedChoiceBootstrap(): string {
  const key = JSON.stringify(MEASUREMENT_CHOICE_KEY);
  return `try{var slc=localStorage.getItem(${key});if(slc==="granted"||slc==="denied"){var slv=slc==="granted"?"granted":"denied";gtag("consent","update",{ad_storage:slv,ad_user_data:slv,ad_personalization:slv,analytics_storage:slv});}}catch(e){}`;
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
