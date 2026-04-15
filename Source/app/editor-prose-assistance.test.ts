import { describe, expect, it } from "vitest";

import type { WorldEditorProseAssistPayload } from "../contracts/index.js";
import {
  applyEditorProseResult,
  buildEditorProseAssistRequest,
  previewEditorProseResult,
  rejectEditorProseResult,
} from "./editor-prose-assistance.js";

const readyReplacement: WorldEditorProseAssistPayload = {
  status: "ready",
  action: "summarize",
  applyMode: "replace",
  summary: "Condenses the body.",
  providerLabel: "Hosted provider",
  sourceText: "Silverkeep is the center of river trade.",
  suggestedText: "Silverkeep anchors regional river trade.",
  contextNotes: [],
};

describe("editor prose assistance helpers", () => {
  it("builds an invoke request from the current editor state", () => {
    const request = buildEditorProseAssistRequest(
      {
        entityId: "location-silverkeep",
        name: " Silverkeep ",
        entityType: "location",
        body: "Silverkeep is the center of river trade.",
      },
      "summarize",
    );

    expect(request).toEqual({
      action: "summarize",
      entityId: "location-silverkeep",
      name: "Silverkeep",
      entityType: "location",
      body: "Silverkeep is the center of river trade.",
    });
  });

  it("builds a preview that appends continuation text without mutating the source body", () => {
    const preview = previewEditorProseResult("Existing canon paragraph.", {
      status: "ready",
      action: "continue",
      applyMode: "append",
      summary: "Adds one paragraph.",
      providerLabel: "Hosted provider",
      sourceText: "Existing canon paragraph.",
      suggestedText: "A second paragraph continues the thought.",
      contextNotes: [],
    });

    expect(preview).toBe("Existing canon paragraph.\n\nA second paragraph continues the thought.");
  });

  it("applies a replacement suggestion when the user accepts it", () => {
    const applied = applyEditorProseResult("Original body", readyReplacement);
    expect(applied).toBe("Silverkeep anchors regional river trade.");
  });

  it("rejects a suggestion by clearing the preview state", () => {
    expect(rejectEditorProseResult()).toBeNull();
  });
});
