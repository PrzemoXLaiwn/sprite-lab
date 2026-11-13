import { describe, expect, it } from "vitest";
import { buildAnimationPrompt, buildInbetweenPrompt } from "./animations";

describe("animation prompt scale lock", () => {
  it("tells the model to keep one height and not slide the body", () => {
    const p = buildAnimationPrompt({
      motion: "walk cycle in place",
      pixel: true,
      subject: "a knight",
      cols: 2,
      rows: 2,
      frames: ["contact", "passing", "contact", "passing"],
    });
    expect(p).toMatch(/Scale lock/);
    expect(p).toMatch(/same in every frame/);
    expect(p).toMatch(/Do not zoom, crop, or slide the body/);
  });

  it("asks in-betweens not to zoom", () => {
    const p = buildInbetweenPrompt({ count: 4, cols: 2, rows: 2, pixel: true, subject: "a knight", loop: true });
    expect(p).toMatch(/Do not zoom or crop/);
  });
});
