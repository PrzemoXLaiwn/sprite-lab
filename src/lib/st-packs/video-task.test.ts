import { describe, expect, it } from "vitest";
import { buildStVideoTask } from "./video-task";

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
});
