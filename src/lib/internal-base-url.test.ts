import { describe, expect, it } from "vitest";
import { internalBaseUrl } from "./internal-base-url";

describe("internalBaseUrl", () => {
  it("ignores NEXT_PUBLIC_APP_URL in every environment", () => {
    const stranger = "https://someone-else.vercel.app";
    expect(internalBaseUrl({
      NEXT_PUBLIC_APP_URL: stranger,
      VERCEL_ENV: "production",
      VERCEL_PROJECT_PRODUCTION_URL: "www.sprite-lab.com",
      VERCEL_URL: "sprite-lab-abc.vercel.app",
    })).toBe("https://www.sprite-lab.com");
    expect(internalBaseUrl({
      NEXT_PUBLIC_APP_URL: stranger,
      VERCEL_ENV: "preview",
      VERCEL_URL: "sprite-lab-vert.vercel.app",
    })).toBe("https://sprite-lab-vert.vercel.app");
    expect(internalBaseUrl({ NEXT_PUBLIC_APP_URL: stranger })).toBe("http://localhost:3000");
    expect(internalBaseUrl({ ST_PACKS_WORKER_URL: "https://w.example/", NEXT_PUBLIC_APP_URL: stranger })).toBe("https://w.example");
  });
});
