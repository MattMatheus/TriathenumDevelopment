import { describe, expect, it, vi } from "vitest";

import type { RetrievalAdapterSet, ResolvedEntity } from "./types.js";
import { buildGroundingBundleWithAdapters, resolveEntityWithAdapters } from "./orchestration.js";

const actorNote = {
  path: "canon/characters/Eliana Tanaka.md",
  title: "Eliana Tanaka",
  body: "# Eliana Tanaka\nEliana is a council representative.\n- How much political risk will she accept?",
  excerpt: "Eliana is a council representative.",
  wikilinks: ["Council of Twelve Regions"],
};

const councilNote = {
  path: "canon/politics/Council of Twelve Regions.md",
  title: "Council of Twelve Regions",
  body: "# Council of Twelve Regions\nThe council coordinates governance.\n- How often does the public reject the council's preferred outcome?",
  excerpt: "The council coordinates governance.",
  wikilinks: [],
};

const actorEntity = {
  id: actorNote.path,
  name: actorNote.title,
  entityType: "character" as const,
  primaryNotePath: actorNote.path,
};

function resolvedActor(): ResolvedEntity {
  return {
    kind: "resolved",
    entity: actorEntity,
    note: actorNote,
    score: 120,
    resolver: "structural",
    scoreBreakdown: {
      identity: 120,
      link: 0,
      query: 0,
      domain: 0,
      operational: 0,
      total: 120,
    },
  };
}

describe("resolveEntityWithAdapters", () => {
  it("prefers the structural adapter before falling back", async () => {
    const adapters: RetrievalAdapterSet = {
      structural: {
        kind: "structural",
        name: "structural",
        resolveEntity: vi.fn().mockResolvedValue(resolvedActor()),
        loadLinkedNotes: vi.fn().mockResolvedValue([]),
      },
      fallback: {
        kind: "fallback",
        name: "filesystem",
        resolveEntity: vi.fn().mockResolvedValue({ kind: "not_found", query: "Eliana Tanaka" }),
        searchContext: vi.fn().mockResolvedValue([]),
      },
    };

    const result = await resolveEntityWithAdapters(adapters, "Eliana Tanaka");

    expect(result.kind).toBe("resolved");
    expect(adapters.structural?.resolveEntity).toHaveBeenCalledOnce();
    expect(adapters.fallback.resolveEntity).not.toHaveBeenCalled();
  });

  it("falls back when structural retrieval cannot resolve the actor", async () => {
    const adapters: RetrievalAdapterSet = {
      structural: {
        kind: "structural",
        name: "structural",
        resolveEntity: vi.fn().mockResolvedValue({ kind: "not_found", query: "Eliana Tanaka" }),
        loadLinkedNotes: vi.fn().mockResolvedValue([]),
      },
      fallback: {
        kind: "fallback",
        name: "filesystem",
        resolveEntity: vi.fn().mockResolvedValue(resolvedActor()),
        searchContext: vi.fn().mockResolvedValue([]),
      },
    };

    const result = await resolveEntityWithAdapters(adapters, "Eliana Tanaka");

    expect(result.kind).toBe("resolved");
    expect(adapters.fallback.resolveEntity).toHaveBeenCalledOnce();
  });

  it("surfaces ranked ambiguity results with score reasons", async () => {
    const adapters: RetrievalAdapterSet = {
      structural: {
        kind: "structural",
        name: "structural",
        resolveEntity: vi.fn().mockResolvedValue({
          kind: "ambiguous",
          query: "Eliana Tanaka",
          resolver: "structural",
          matches: [
            {
              entity: actorEntity,
              notePath: actorNote.path,
              resolver: "structural",
              score: {
                identity: 80,
                link: 0,
                query: 0,
                domain: 0,
                operational: 0,
                total: 80,
              },
              reasons: ["identity:80"],
            },
          ],
        }),
        loadLinkedNotes: vi.fn().mockResolvedValue([]),
      },
      fallback: {
        kind: "fallback",
        name: "filesystem",
        resolveEntity: vi.fn().mockResolvedValue({ kind: "not_found", query: "Eliana Tanaka" }),
        searchContext: vi.fn().mockResolvedValue([]),
      },
    };

    const result = await resolveEntityWithAdapters(adapters, "Eliana Tanaka");

    expect(result.kind).toBe("ambiguous");
    if (result.kind !== "ambiguous") {
      return;
    }

    expect(result.resolver).toBe("structural");
    expect(result.matches[0]?.score.total).toBe(80);
    expect(result.matches[0]?.reasons).toContain("identity:80");
    expect(adapters.fallback.resolveEntity).not.toHaveBeenCalled();
  });

  it("preserves ambiguity when the top structural candidates are too close to separate safely", async () => {
    const ambiguousMatches: ResolvedEntity = {
      kind: "ambiguous",
      query: "Eliana",
      resolver: "structural",
      matches: [
        {
          entity: actorEntity,
          notePath: actorNote.path,
          resolver: "structural",
          score: {
            identity: 80,
            link: 0,
            query: 8,
            domain: 10,
            operational: 0,
            total: 98,
          },
          reasons: ["identity:80", "query:8", "domain:10"],
        },
        {
          entity: {
            id: "canon/characters/Eliana Marr.md",
            name: "Eliana Marr",
            entityType: "character",
            primaryNotePath: "canon/characters/Eliana Marr.md",
          },
          notePath: "canon/characters/Eliana Marr.md",
          resolver: "structural",
          score: {
            identity: 80,
            link: 0,
            query: 8,
            domain: 10,
            operational: 0,
            total: 98,
          },
          reasons: ["identity:80", "query:8", "domain:10"],
        },
      ],
    };
    const adapters: RetrievalAdapterSet = {
      structural: {
        kind: "structural",
        name: "structural",
        resolveEntity: vi.fn().mockResolvedValue(ambiguousMatches),
        loadLinkedNotes: vi.fn().mockResolvedValue([]),
      },
      fallback: {
        kind: "fallback",
        name: "filesystem",
        resolveEntity: vi.fn().mockResolvedValue(resolvedActor()),
        searchContext: vi.fn().mockResolvedValue([]),
      },
    };

    const result = await resolveEntityWithAdapters(adapters, "Eliana");

    expect(result.kind).toBe("ambiguous");
    expect(adapters.fallback.resolveEntity).not.toHaveBeenCalled();
  });
});

describe("buildGroundingBundleWithAdapters", () => {
  it("uses structural linked notes and indexed search together", async () => {
    const infrastructureNote = {
      path: "canon/politics/Regional Infrastructure Authority.md",
      title: "Regional Infrastructure Authority",
      body: "# Regional Infrastructure Authority\nThe authority manages infrastructure rollouts.\n- Which districts receive priority access?",
      excerpt: "The authority manages infrastructure rollouts.",
      wikilinks: [],
    };
    const adapters: RetrievalAdapterSet = {
      structural: {
        kind: "structural",
        name: "structural",
        resolveEntity: vi.fn().mockResolvedValue(resolvedActor()),
        loadLinkedNotes: vi.fn().mockResolvedValue([councilNote]),
      },
      indexed: {
        kind: "indexed",
        name: "indexed",
        searchContext: vi.fn().mockResolvedValue([infrastructureNote]),
      },
      fallback: {
        kind: "fallback",
        name: "filesystem",
        resolveEntity: vi.fn().mockResolvedValue({ kind: "not_found", query: "Eliana Tanaka" }),
        searchContext: vi.fn().mockResolvedValue([]),
      },
    };

    const result = await buildGroundingBundleWithAdapters(
      adapters,
      "Eliana Tanaka",
      "Support a controversial council infrastructure vote",
    );

    if ("kind" in result) {
      throw new Error("expected grounding result");
    }

    expect(result.bundle.subject.name).toBe("Eliana Tanaka");
    expect(result.bundle.sources.map((source) => source.title)).toContain("Council of Twelve Regions");
    expect(result.bundle.sources.map((source) => source.title)).toContain("Regional Infrastructure Authority");
    expect(result.bundle.sources[0]?.score).toBe(120);
    expect(result.bundle.sources[0]?.sourceRole).toBe("subject_note");
    expect(result.bundle.sources[1]?.score).toBe(60);
    expect(result.bundle.sources[1]?.sourceRole).toBe("linked_canon");
    expect(result.bundle.sources[2]?.title).toBe("Regional Infrastructure Authority");
    expect(result.bundle.sources[2]?.score).toBe(23);
    expect(result.bundle.sources[2]?.sourceRole).toBe("operational_context");
    expect(result.bundle.sources[2]?.inclusionReasons).toContain("adds operational or institutional context");
    expect(result.bundle.sourceGroups.operationalContext.map((source) => source.title)).toContain(
      "Regional Infrastructure Authority",
    );
    expect(adapters.indexed?.searchContext).toHaveBeenCalledOnce();
  });
});
