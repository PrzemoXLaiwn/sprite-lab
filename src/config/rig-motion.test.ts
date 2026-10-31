// Rigid-item rigs (swing, thrust…) only apply to objects: a character drawn
// under Weapons must not be tipped over like a sword.
import { describe, expect, it } from "vitest";
import { describesLivingSubject, rigMotionFor } from "./animations";

describe("rigMotionFor", () => {
  it("swings a sword as one rigid piece", () => {
    expect(rigMotionFor("ai-1", "swing", "WEAPONS", "iron sword with red gem in the hilt")).toBe("swing");
    expect(rigMotionFor("ai-2", "thrust", "WEAPONS", "steel spear")).toBe("thrust");
  });

  it("sends a character filed under Weapons to the AI animator", () => {
    expect(rigMotionFor("ai-1", "zweihander slash", "WEAPONS", "Cavaleiro poderoso com armadura e uma espada longa zweihander")).toBeNull();
    expect(rigMotionFor("ai-1", "swing", "WEAPONS", "rpg lowpoly assassin character")).toBeNull();
    expect(rigMotionFor("ai-1", "swing", "WEAPONS", "simple warrior character no armor plain clothing")).toBeNull();
    expect(rigMotionFor("ai-1", "swing", "WEAPONS", "rycerz z mieczem")).toBeNull();
  });

  it("still rigs idles for a character (breathing is not an item motion)", () => {
    expect(rigMotionFor("idle", "Idle", "WEAPONS", "knight with a sword")).toBe("breathe");
    expect(rigMotionFor("idle", "Idle", "CHARACTERS", "knight")).toBe("breathe");
  });

  it("describesLivingSubject: whole words only, accents allowed", () => {
    expect(describesLivingSubject("a manor house key")).toBe(false); // "man" inside "manor"
    expect(describesLivingSubject("elfin blade")).toBe(false);
    expect(describesLivingSubject("Mężczyzna z toporem")).toBe(true);
    expect(describesLivingSubject("herói com lança")).toBe(true);
    expect(describesLivingSubject(null)).toBe(false);
  });
});
