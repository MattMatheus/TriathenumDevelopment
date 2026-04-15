import path from "node:path";
import { cp, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { loadWorldBrowserPayload, loadWorldEntityDetail, saveWorldEntity } from "./world-browser-service.js";

const fixtureRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "world",
  "__fixtures__",
  "world",
);

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("loadWorldBrowserPayload", () => {
  it("returns entity summaries with available filters", async () => {
    const payload = await loadWorldBrowserPayload(fixtureRoot);

    expect(payload.entities).toHaveLength(4);
    expect(payload.availableTypes).toEqual(["character", "faction", "location", "lore_article"]);
    expect(payload.availableTags).toEqual(["city", "council", "government", "history", "infrastructure", "river"]);
    expect(payload.unresolvedReferences).toEqual([
      expect.objectContaining({
        sourceEntityId: "character-eliana-tanaka",
        targetText: "Sunken Archive",
      }),
    ]);
  });

  it("searches the indexed entity corpus by keyword", async () => {
    const payload = await loadWorldBrowserPayload(fixtureRoot, "river");

    expect(payload.entities.map((entity) => entity.id)).toEqual([
      "faction-council-of-twelve-regions",
      "location-silverkeep",
      "lore-river-levy-crisis",
    ]);
  });
});

describe("loadWorldEntityDetail", () => {
  it("returns a readable entity detail with backlinks", async () => {
    const detail = await loadWorldEntityDetail(fixtureRoot, "location-silverkeep");

    expect(detail).not.toBeNull();
    expect(detail?.name).toBe("Silverkeep");
    expect(detail?.relationships).toEqual([
      {
        type: "governed_by",
        target: "Council of Twelve Regions",
      },
    ]);
    expect(detail?.backlinks.some((item) => item.sourceEntityId === "character-eliana-tanaka")).toBe(true);
  });
});

describe("saveWorldEntity", () => {
  it("updates an existing entity and persists readable changes", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-browser-"));
    tempDirs.push(tempRoot);
    await cp(fixtureRoot, tempRoot, { recursive: true });

    const saved = await saveWorldEntity(tempRoot, {
      id: "location-silverkeep",
      name: "Silverkeep",
      entityType: "location",
      visibility: "all_users",
      aliases: ["The River City", "North Gate"],
      tags: ["city", "river"],
      body: "Silverkeep remains the center of river trade.",
      fields: {
        location_type: "city",
        parent_location: "River Provinces",
      },
      relationships: [
        {
          type: "governed_by",
          target: "Council of Twelve Regions",
        },
      ],
    });

    expect(saved.aliases).toContain("North Gate");
    expect(saved.body).toContain("center of river trade");
  });

  it("creates a new entity document when one does not yet exist", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-browser-"));
    tempDirs.push(tempRoot);
    await cp(fixtureRoot, tempRoot, { recursive: true });

    const saved = await saveWorldEntity(tempRoot, {
      name: "Lantern Harbor",
      entityType: "location",
      visibility: "all_users",
      aliases: [],
      tags: ["port"],
      body: "Lantern Harbor is a windswept port city.",
      fields: {
        location_type: "city",
      },
      relationships: [],
    });

    expect(saved.id).toBe("location-lantern-harbor");
    expect(saved.path).toContain("locations/lantern-harbor.md");
  });
});
