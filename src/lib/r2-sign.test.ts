import { describe, expect, it } from "vitest";
import { signedDownloadUrlOk, zipDelivery } from "./r2";

const ACCOUNT = "abc123";

describe("zip download delivery", () => {
  it("redirects only to this account's path-style R2 host", () => {
    const ok = `https://${ACCOUNT}.r2.cloudflarestorage.com/sprite-lab/st-packs/job/pack.zip?X-Amz-Signature=abc`;
    expect(signedDownloadUrlOk(ok, ACCOUNT)).toBe(true);
    expect(zipDelivery(ok, ACCOUNT)).toBe("redirect");
  });

  it("streams when the signer returns nothing or a host the browser cannot resolve", () => {
    const virtual = `https://sprite-lab.${ACCOUNT}.r2.cloudflarestorage.com/st-packs/job/pack.zip`;
    expect(signedDownloadUrlOk(virtual, ACCOUNT)).toBe(false);
    expect(zipDelivery(null, ACCOUNT)).toBe("stream");
    expect(zipDelivery(virtual, ACCOUNT)).toBe("stream");
    expect(zipDelivery("https://example.com/pack.zip", ACCOUNT)).toBe("stream");
    expect(zipDelivery("not a url", ACCOUNT)).toBe("stream");
    expect(zipDelivery(`https://${ACCOUNT}.r2.cloudflarestorage.com/x`, undefined)).toBe("stream");
  });
});
