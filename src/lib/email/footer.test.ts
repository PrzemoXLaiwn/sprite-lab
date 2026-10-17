import { afterEach, describe, expect, it, vi } from "vitest";
import * as React from "react";
import { render } from "@react-email/render";
import { renderLifecycleHtml } from "./lifecycle/content";
import { sampleLifecycleMessages } from "./lifecycle/samples";
import { ReEngagementEmail } from "./templates/ReEngagementEmail";
import { WeeklyDigestEmail } from "./templates/WeeklyDigestEmail";
import { DailyReminderEmail } from "./templates/DailyReminderEmail";

// Placeholder address for the test only — not a real one
const ADDRESS = "Test Address Line, Nowhere 00-000";

describe("postal address in marketing footers (EMAIL_POSTAL_ADDRESS)", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is printed in lifecycle HTML and plain text when set", async () => {
    vi.stubEnv("EMAIL_POSTAL_ADDRESS", ADDRESS);
    const msg = sampleLifecycleMessages().winback;
    expect(await renderLifecycleHtml(msg)).toContain(ADDRESS);
    expect(msg.text).toContain(ADDRESS);
  });

  it("is printed in the older marketing templates when set", async () => {
    vi.stubEnv("EMAIL_POSTAL_ADDRESS", ADDRESS);
    const html = await Promise.all([
      render(React.createElement(ReEngagementEmail, { credits: 5, daysSinceLastVisit: 9 })),
      render(React.createElement(WeeklyDigestEmail, { credits: 5, weeklyStats: { assetsCreated: 3 }, communityStats: { totalAssetsThisWeek: 40 } })),
      render(React.createElement(DailyReminderEmail, { credits: 5 })),
    ]);
    for (const h of html) expect(h).toContain(ADDRESS);
  });

  it("is never invented when unset", async () => {
    vi.stubEnv("EMAIL_POSTAL_ADDRESS", "");
    const msg = sampleLifecycleMessages().winback;
    const html = await renderLifecycleHtml(msg);
    expect(html).not.toContain(ADDRESS);
    expect(msg.text.trim().split("\n").at(-1)).toMatch(/^Email settings: /);
  });
});
