import { describe, expect, it } from "vitest";
import { APP_NAV } from "./app-nav";

describe("app navigation", () => {
  it("names the community gallery Community, not Explore", () => {
    const community = APP_NAV.find((item) => item.href === "/community");
    expect(community?.label).toBe("Community");
    expect(APP_NAV.some((item) => item.label === "Explore")).toBe(false);
  });
});
