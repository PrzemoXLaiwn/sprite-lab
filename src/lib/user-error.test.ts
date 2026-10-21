import { describe, expect, it } from "vitest";
import { OFFLINE_MESSAGE, userErrorMessage } from "./user-error";

describe("userErrorMessage", () => {
  it("maps browser network failures to the offline text", () => {
    expect(userErrorMessage(new TypeError("Failed to fetch"), "x")).toBe(OFFLINE_MESSAGE);
    expect(userErrorMessage(new TypeError("NetworkError when attempting to fetch resource."), "x")).toBe(OFFLINE_MESSAGE);
    expect(userErrorMessage(new TypeError("Load failed"), "x")).toBe(OFFLINE_MESSAGE);
  });

  it("keeps server messages and other errors as they are", () => {
    expect(userErrorMessage(new Error("Not enough credits"), "x")).toBe("Not enough credits");
    expect(userErrorMessage(new TypeError("Cannot read properties of undefined"), "x")).toBe("Cannot read properties of undefined");
    expect(userErrorMessage("nope", "Something went wrong")).toBe("Something went wrong");
    expect(userErrorMessage(new Error(""), "Something went wrong")).toBe("Something went wrong");
  });
});
