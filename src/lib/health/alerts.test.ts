import { describe, expect, it } from "vitest";
import { HEALTHY, REMIND_MS, homeLooksHealthy, nextHealthState } from "./alerts";

const t0 = new Date("2026-10-17T10:00:00Z");
const later = (ms: number) => new Date(t0.getTime() + ms);

describe("nextHealthState", () => {
  it("stays quiet while everything is fine", () => {
    expect(nextHealthState(HEALTHY, [], t0)).toEqual({ state: HEALTHY, alert: null });
  });

  it("alerts once when a check starts failing, then waits", () => {
    const first = nextHealthState(HEALTHY, ["database"], t0);
    expect(first.alert).toBe("down");
    expect(first.state.since).toBe(t0.toISOString());
    const second = nextHealthState(first.state, ["database"], later(5 * 60 * 1000));
    expect(second.alert).toBeNull();
    expect(second.state.since).toBe(t0.toISOString());
  });

  it("reminds after the reminder interval", () => {
    const first = nextHealthState(HEALTHY, ["home"], t0);
    expect(nextHealthState(first.state, ["home"], later(REMIND_MS)).alert).toBe("still-down");
  });

  it("alerts again when another check joins the outage", () => {
    const first = nextHealthState(HEALTHY, ["database"], t0);
    const second = nextHealthState(first.state, ["database", "home"], later(60_000));
    expect(second.alert).toBe("down");
    expect(second.state.since).toBe(t0.toISOString());
  });

  it("sends a recovery note only after an alert went out", () => {
    const down = nextHealthState(HEALTHY, ["auth"], t0);
    expect(nextHealthState(down.state, [], later(60_000))).toEqual({ state: HEALTHY, alert: "recovered" });
    expect(nextHealthState({ failing: ["auth"], since: t0.toISOString(), lastAlertAt: null }, [], t0).alert).toBeNull();
  });
});

describe("homeLooksHealthy", () => {
  it("needs a 200 with a heading", () => {
    expect(homeLooksHealthy(200, "<main><h1 class=\"x\">Type a character.</h1></main>")).toBe(true);
    expect(homeLooksHealthy(200, "<div id=\"root\"></div>")).toBe(false);
    expect(homeLooksHealthy(500, "<h1>Error</h1>")).toBe(false);
  });
});
