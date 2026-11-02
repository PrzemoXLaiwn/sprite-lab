import { describe, expect, it } from "vitest";
import { parseSignalKind } from "./asset-signal";

describe("parseSignalKind", () => {
  it("accepts download, thumbs and clear", () => {
    expect(parseSignalKind("download")).toBe("download");
    expect(parseSignalKind("up")).toBe("up");
    expect(parseSignalKind("down")).toBe("down");
    expect(parseSignalKind("clear")).toBe("clear");
  });

  it("rejects anything else, including empty and non-strings", () => {
    expect(parseSignalKind("view")).toBeNull();
    expect(parseSignalKind("")).toBeNull();
    expect(parseSignalKind(1)).toBeNull();
    expect(parseSignalKind(null)).toBeNull();
  });
});
