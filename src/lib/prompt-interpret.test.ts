import { describe, expect, it } from "vitest";
import { keepsIntent } from "./prompt-interpret";

describe("keepsIntent", () => {
  it("accepts a rewrite that keeps the subject and fixes spelling", () => {
    expect(keepsIntent(
      "hedgegog african pygmy standing, weaing armour and have aura",
      "a real African pygmy hedgehog standing on its hind legs, wearing fitted steel armour, surrounded by a glowing aura",
    )).toBe(true);
  });

  it("rejects a rewrite that drops what the user asked for", () => {
    expect(keepsIntent("gaming keyboard as an enemy with a fire sword", "an armoured knight in a steel helmet")).toBe(false);
  });
});
