import { describe, expect, it } from "vitest";

import {
  applyLinkSuggestion,
  applyRelationshipSuggestion,
  applySummarySuggestion,
  buildEditorSuggestionRequest,
} from "./editor-suggestions.js";

describe("editor suggestion helpers", () => {
  it("builds a suggestion request from editor state", () => {
    const request = buildEditorSuggestionRequest({
      entityId: "character-eliana-tanaka",
      name: " Eliana Tanaka ",
      entityType: "character",
      body: "Eliana Tanaka serves on the Council of Twelve Regions.",
      relationships: [{ type: "member_of", target: "Council of Twelve Regions" }],
      fields: [{ key: " reference_summary ", value: " Civic councilor. " }],
    });

    expect(request).toEqual({
      entityId: "character-eliana-tanaka",
      name: "Eliana Tanaka",
      entityType: "character",
      body: "Eliana Tanaka serves on the Council of Twelve Regions.",
      relationships: [{ type: "member_of", target: "Council of Twelve Regions" }],
      fields: { reference_summary: "Civic councilor." },
    });
  });

  it("applies a link suggestion into the body draft", () => {
    expect(
      applyLinkSuggestion("Lives in Silverkeep.", {
        id: "link-silverkeep",
        targetEntityId: "location-silverkeep",
        targetName: "Silverkeep",
        matchedText: "Silverkeep",
        replacementText: "[[Silverkeep]]",
        reason: "Add a link.",
      }),
    ).toBe("Lives in [[Silverkeep]].");
  });

  it("applies a relationship suggestion without duplicating it", () => {
    const relationships = applyRelationshipSuggestion([], {
      id: "relationship-silverkeep",
      relationship: {
        type: "resides_in",
        target: "Silverkeep",
      },
      reason: "Add a structured relationship.",
    });

    expect(relationships).toEqual([{ type: "resides_in", target: "Silverkeep" }]);
    expect(
      applyRelationshipSuggestion(relationships, {
        id: "relationship-silverkeep",
        relationship: {
          type: "resides_in",
          target: "Silverkeep",
        },
        reason: "Add a structured relationship.",
      }),
    ).toEqual([{ type: "resides_in", target: "Silverkeep" }]);
  });

  it("adds or replaces a reference summary field", () => {
    expect(
      applySummarySuggestion([], {
        id: "summary-reference",
        fieldKey: "reference_summary",
        label: "Reference Summary",
        value: "Eliana Tanaka is a council member in Silverkeep.",
        reason: "Add summary.",
      }),
    ).toEqual([{ key: "reference_summary", value: "Eliana Tanaka is a council member in Silverkeep." }]);

    expect(
      applySummarySuggestion(
        [{ key: "reference_summary", value: "Old summary." }],
        {
          id: "summary-reference",
          fieldKey: "reference_summary",
          label: "Reference Summary",
          value: "New summary.",
          reason: "Refresh summary.",
        },
      ),
    ).toEqual([{ key: "reference_summary", value: "New summary." }]);
  });
});
