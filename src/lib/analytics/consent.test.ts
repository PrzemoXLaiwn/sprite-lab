import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import { GA_MEASUREMENT_ID } from "./measurement-id";
import { memoryPurchaseStore } from "./purchase";
import {
  applyMeasurementChoice,
  consentBootstrap,
  consentSignals,
  countryCookieValue,
  mayLoadAds,
  measurementAllowed,
  parseMeasurementChoice,
  readCountryCookie,
  regionRequiresChoice,
} from "./consent";

function runBootstrap(cookie: string, choice: string | null) {
  const sandbox = {
    document: { cookie },
    localStorage: { getItem: () => choice },
  } as { document: { cookie: string }; localStorage: { getItem: () => string | null }; window?: object; dataLayer?: unknown[][] };
  sandbox.window = sandbox;
  runInNewContext(consentBootstrap(GA_MEASUREMENT_ID), sandbox);
  return sandbox.dataLayer ?? [];
}

function asArgs(call: unknown): unknown[] {
  return Array.from(call as ArrayLike<unknown>);
}

function granted(calls: unknown[]): boolean {
  return calls.some((call) => {
    const args = asArgs(call);
    const signal = args[2] as { analytics_storage?: string } | undefined;
    return args[0] === "consent" && args[1] === "update" && signal?.analytics_storage === "granted";
  });
}

describe("measurement consent", () => {
  it("keeps a required region denied until an explicit accept", () => {
    expect(regionRequiresChoice("GB")).toBe(true);
    expect(regionRequiresChoice("pl")).toBe(true);
    expect(regionRequiresChoice("US")).toBe(false);
    expect(regionRequiresChoice(null)).toBe(true);
    expect(regionRequiresChoice("")).toBe(true);
    expect(measurementAllowed({ choice: null, regionRequiresChoice: true })).toBe(false);
    expect(measurementAllowed({ choice: "denied", regionRequiresChoice: true })).toBe(false);
    expect(measurementAllowed({ choice: "granted", regionRequiresChoice: true })).toBe(true);
  });

  it("allows the existing default only outside those regions, and a refusal overrides it", () => {
    expect(measurementAllowed({ choice: null, regionRequiresChoice: false })).toBe(true);
    expect(measurementAllowed({ choice: "denied", regionRequiresChoice: false })).toBe(false);
    expect(measurementAllowed({ choice: "granted", regionRequiresChoice: false })).toBe(true);
  });

  it("updates consent to the choice and does not send a purchase", () => {
    const store = memoryPurchaseStore();
    const gtag = vi.fn();
    expect(applyMeasurementChoice("denied", { store, gtag })).toEqual(consentSignals("denied"));
    expect(gtag).toHaveBeenCalledWith("consent", "update", consentSignals("denied"));
    expect(gtag.mock.calls.some((call) => call[0] === "event")).toBe(false);
    applyMeasurementChoice("granted", { store, gtag });
    expect(store.get("sl:measurement-choice")).toBe("granted");
    applyMeasurementChoice("denied", { store, gtag });
    expect(store.get("sl:measurement-choice")).toBe("denied");
    expect(parseMeasurementChoice("granted")).toBe("granted");
    expect(parseMeasurementChoice("yes")).toBeNull();
  });

  it("denies the real bootstrap when the country cookie or header is missing", () => {
    expect(countryCookieValue(null)).toBe("");
    expect(countryCookieValue("")).toBe("");
    expect(countryCookieValue("United Kingdom")).toBe("");
    expect(countryCookieValue("us")).toBe("US");
    for (const cookie of ["", "sl-country=", "theme=dark"]) {
      const calls = runBootstrap(cookie, null);
      expect(asArgs(calls[0]).slice(0, 2)).toEqual(["consent", "default"]);
      expect((asArgs(calls[0])[2] as { analytics_storage: string }).analytics_storage).toBe("denied");
      expect(granted(calls)).toBe(false);
    }
  });

  it("does not grant before a stored refusal, and does grant a known other country", () => {
    const refused = runBootstrap("sl-country=US", "denied");
    expect(asArgs(refused[0]).slice(0, 2)).toEqual(["consent", "default"]);
    expect(granted(refused)).toBe(false);
    const unitedStates = runBootstrap("sl-country=US", null);
    expect(asArgs(unitedStates[0]).slice(0, 2)).toEqual(["consent", "default"]);
    expect(granted(unitedStates)).toBe(true);
    expect(unitedStates.findIndex((call) => asArgs(call)[1] === "default")).toBeLessThan(
      unitedStates.findIndex((call) => asArgs(call)[1] === "update"),
    );
    const accepted = runBootstrap("sl-country=GB", "granted");
    expect(granted(accepted)).toBe(true);
    expect(granted(runBootstrap("sl-country=GB", null))).toBe(false);
  });

  it("reads a country cookie and ignores junk", () => {
    expect(readCountryCookie("sl-country=GB")).toBe("GB");
    expect(readCountryCookie("a=1; sl-country=us")).toBe("US");
    expect(readCountryCookie("sl-country=")).toBeNull();
    expect(readCountryCookie("sl-country=United%20Kingdom")).toBeNull();
  });

  it("does not load ads when the slot is allowed but measurement is refused or unanswered", () => {
    expect(mayLoadAds({ adsSlotAllowed: true, choice: null, country: "GB" })).toBe(false);
    expect(mayLoadAds({ adsSlotAllowed: true, choice: "denied", country: "GB" })).toBe(false);
    expect(mayLoadAds({ adsSlotAllowed: true, choice: "granted", country: "GB" })).toBe(true);
    expect(mayLoadAds({ adsSlotAllowed: true, choice: null, country: "US" })).toBe(true);
    expect(mayLoadAds({ adsSlotAllowed: true, choice: "denied", country: "US" })).toBe(false);
    expect(mayLoadAds({ adsSlotAllowed: false, choice: "granted", country: "US" })).toBe(false);
    expect(mayLoadAds({ adsSlotAllowed: true, choice: null, country: null })).toBe(false);
  });
});