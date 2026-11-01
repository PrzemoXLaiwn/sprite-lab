import { describe, expect, it } from "vitest";
import { buildStVideoTask, videoProviderExtra } from "./video-task";

describe("buildStVideoTask", () => {
  const still = "data:image/png;base64,abc";

  it("pins the same still as the first and the last frame", () => {
    const task = buildStVideoTask({
      taskUUID: "11111111-1111-4111-8111-111111111111",
      model: "vidu:3@2",
      prompt: "idle",
      stillDataUri: still,
      width: 720,
      height: 1280,
      seconds: 4,
      extra: { providerSettings: { vidu: { movementAmplitude: "small", bgm: false } } },
    });
    expect(task.inputs).toEqual({
      frameImages: [
        { image: still, frame: "first" },
        { image: still, frame: "last" },
      ],
    });
    expect(task.duration).toBe(4);
    expect(task.numberResults).toBe(1);
    expect(JSON.stringify(task)).not.toContain("referenceImages");
  });

  it("keeps the pinned frames when extra tries to replace inputs", () => {
    const task = buildStVideoTask({
      taskUUID: "11111111-1111-4111-8111-111111111111",
      model: "vidu:3@2",
      prompt: "idle",
      stillDataUri: still,
      width: 720,
      height: 1280,
      seconds: 4,
      extra: { inputs: { frameImages: [{ image: "other", frame: "first" }] } },
    });
    const frames = (task.inputs as { frameImages: { image: string }[] }).frameImages;
    expect(frames).toHaveLength(2);
    expect(frames[0].image).toBe(still);
    expect(frames[1].image).toBe(still);
  });

  it("asks Vidu for large motion on an expressive clip and still pins both frames", () => {
    const extra = videoProviderExtra("vidu:3@2", "expressive", { providerSettings: { vidu: { movementAmplitude: "small", bgm: false } } });
    const task = buildStVideoTask({
      taskUUID: "11111111-1111-4111-8111-111111111111",
      model: "vidu:3@2",
      prompt: "act",
      stillDataUri: still,
      width: 720,
      height: 1280,
      seconds: 8,
      extra,
    });
    expect(task.duration).toBe(8);
    expect(task.providerSettings).toEqual({ vidu: { movementAmplitude: "large", bgm: false } });
    const frames = (task.inputs as { frameImages: { frame: string }[] }).frameImages;
    expect(frames.map((f) => f.frame)).toEqual(["first", "last"]);
    expect(videoProviderExtra("vidu:3@2", "subtle", extra)).toBe(extra);
    expect(videoProviderExtra("lightricks:ltx@2.3-fast", "expressive", { settings: { enhancePrompt: false } })).toEqual({ settings: { enhancePrompt: false } });
  });
});
