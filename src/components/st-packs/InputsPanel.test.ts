import { createElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { InputsPanel, type InputsState } from "./InputsPanel";

vi.mock("@/components/tools/ToolWorkspace", () => ({
  ErrorNote: ({ children }: { children: ReactNode }) => createElement("p", null, children),
  Field: ({ label, children }: { label: string; children: ReactNode }) => createElement("fieldset", null, createElement("legend", null, label), children),
}));

const inputs: InputsState = {
  source: "upload",
  prompt: "",
  styleNotes: "",
  framing: "waist",
  expressionSet: "default8",
  customLabels: [],
  width: 720,
  height: 960,
  gif: false,
  png: false,
  grid: false,
  readme: true,
  matteMode: "key",
  lossless: false,
  videoSeconds: 6,
  motion: "expressive",
  candidateCount: 3,
};

describe("InputsPanel motion", () => {
  it("offers Subtle and Expressive, and the longer clip lengths, to the admin studio", () => {
    const html = renderToStaticMarkup(createElement(InputsPanel, {
      inputs,
      onChange: () => {},
      base: null,
      candidates: [],
      baseBusy: null,
      baseError: "",
      fileName: "",
      onUpload: () => {},
      onGenerateBases: () => {},
      onPickCandidate: () => {},
      submitting: false,
      submitError: "",
      jobRunning: false,
      onSubmit: () => {},
    }));
    expect(html).toContain("Subtle");
    expect(html).toContain("Expressive");
    expect(html).toContain(">6 s<");
    expect(html).toContain(">8 s<");
    expect(html).toContain("Admin test only");
    expect(html).toContain("$0.14");
  });
});
