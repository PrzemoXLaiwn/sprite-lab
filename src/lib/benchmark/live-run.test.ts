import { describe, expect, it } from "vitest";
import { runCappedLive } from "./live-run";

describe("runCappedLive", () => {
  it("does not send a call that would pass the cap", async () => {
    const seen: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      seen.push(url);
      if (url.includes("runware")) {
        return new Response(JSON.stringify({ data: [{ imageURL: "https://example.test/a.png", cost: 2 }] }), { status: 200 });
      }
      return new Response(Buffer.from([137, 80, 78, 71]), { status: 200 });
    };
    const out = await runCappedLive(
      [
        { id: "first", listUsd: 2, body: [{ taskType: "imageInference" }] },
        { id: "second", listUsd: 2, body: [{ taskType: "imageInference" }] },
      ],
      { capUsd: 3, apiKey: "test-key", fetchImpl },
    );
    expect(out.results.map((r) => r.id)).toEqual(["first"]);
    expect(out.skipped).toEqual(["second"]);
    expect(seen.filter((u) => u.includes("runware"))).toHaveLength(1);
    expect(out.spendUsd).toBeCloseTo(2, 6);
  });
});
