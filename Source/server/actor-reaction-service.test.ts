import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { FileSystemVaultReader } from "../retrieval/index.js";
import { createActorReactionResponse } from "./actor-reaction-service.js";

const fixtureRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "retrieval",
  "__fixtures__",
  "vault",
);

describe("createActorReactionResponse", () => {
  it("returns a structured response with citations and uncertainty", async () => {
    const reader = new FileSystemVaultReader(fixtureRoot);
    const response = await createActorReactionResponse(reader, {
      actor: {
        id: "eliana-tanaka",
        name: "Eliana Tanaka",
        entityType: "character",
      },
      decisionPrompt: "Support a controversial infrastructure vote that may require public ratification.",
      options: {
        includeAlternatives: true,
        maxSources: 4,
      },
    });

    expect(response.summary).toContain("Eliana Tanaka");
    expect(response.likelyReaction.summary.length).toBeGreaterThan(0);
    expect(response.canonBasis.length).toBeGreaterThan(0);
    expect(response.canonBasis.some((item) => item.includes("resolved via"))).toBe(true);
    expect(response.sources.length).toBeGreaterThan(0);
    expect(response.sources[0]?.sourceRole).toBe("subject_note");
    expect(response.uncertainties.length).toBeGreaterThan(0);
  });
});
