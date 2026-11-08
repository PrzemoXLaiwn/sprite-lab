import { describe, expect, it, vi } from "vitest";
import { memoryPurchaseStore } from "./purchase";
import {
  applyMeasurementChoice,
  consentSignals,
  mayLoadAds,
  measurementAllowed,
  parseMeasurementChoice,
  readCountryCookie,
  regionRequiresChoice,
  storedChoiceBootstrap,
} from "./consent";

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

  it("does not grant from the bootstrap when nothing is stored", () => {
    const script = storedChoiceBootstrap();
    expect(script).toContain('localStorage.getItem("sl:measurement-choice")');
    expect(script).toContain('slc==="granted"||slc==="denied"');
    expect(script).not.toContain("client_secret");
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