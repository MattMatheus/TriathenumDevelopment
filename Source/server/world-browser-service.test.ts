import path from "node:path";
import { cp, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import type { AuthenticatedViewer } from "./auth-service.js";
import { attachMediaToEntity, loadWorldBrowserPayload, loadWorldEntityDetail, loadWorldEntityMedia, saveWorldEntity } from "./world-browser-service.js";

const fixtureRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "world",
  "__fixtures__",
  "world",
);

const tempDirs: string[] = [];
const ownerViewer: AuthenticatedViewer = {
  id: "account-owner",
  email: "owner@example.com",
  displayName: "Owner",
  role: "owner",
  createdAt: new Date().toISOString(),
};
const collaboratorViewer: AuthenticatedViewer = {
  id: "account-collaborator",
  email: "writer@example.com",
  displayName: "Writer",
  role: "collaborator",
  createdAt: new Date().toISOString(),
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("loadWorldBrowserPayload", () => {
  it("returns entity summaries with available filters", async () => {
    const payload = await loadWorldBrowserPayload(fixtureRoot, ownerViewer);

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
    const payload = await loadWorldBrowserPayload(fixtureRoot, ownerViewer, "river");

    expect(payload.entities.map((entity) => entity.id)).toEqual([
      "faction-council-of-twelve-regions",
      "location-silverkeep",
      "lore-river-levy-crisis",
    ]);
  });

  it("hides owner-only entities from collaborators", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-browser-"));
    tempDirs.push(tempRoot);
    await cp(fixtureRoot, tempRoot, { recursive: true });

    await saveWorldEntity(tempRoot, ownerViewer, {
      id: "location-silverkeep",
      name: "Silverkeep",
      entityType: "location",
      visibility: "owner_only",
      aliases: ["The River City"],
      tags: ["city", "river"],
      body: "Silverkeep is now private to the owner.",
      fields: {
        location_type: "city",
      },
      media: [],
      relationships: [],
    });

    const payload = await loadWorldBrowserPayload(tempRoot, collaboratorViewer);
    expect(payload.entities.map((entity) => entity.id)).not.toContain("location-silverkeep");
  });
});

describe("loadWorldEntityDetail", () => {
  it("returns a readable entity detail with backlinks", async () => {
    const detail = await loadWorldEntityDetail(fixtureRoot, ownerViewer, "location-silverkeep");

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

  it("returns media URLs for attached assets", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-browser-"));
    tempDirs.push(tempRoot);
    await cp(fixtureRoot, tempRoot, { recursive: true });

    const detail = await attachMediaToEntity(tempRoot, ownerViewer, "location-silverkeep", {
      fileName: "silverkeep-map.png",
      contentType: "image/png",
      base64Data: Buffer.from("png-bytes").toString("base64"),
      alt: "Map",
      caption: "Sketch",
    });

    expect(detail.media).toHaveLength(1);
    expect(detail.media[0]?.url).toContain("/api/world/entities/location-silverkeep/media/");
  });
});

describe("saveWorldEntity", () => {
  it("updates an existing entity and persists readable changes", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-browser-"));
    tempDirs.push(tempRoot);
    await cp(fixtureRoot, tempRoot, { recursive: true });

    const saved = await saveWorldEntity(tempRoot, ownerViewer, {
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
      media: [],
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

    const saved = await saveWorldEntity(tempRoot, ownerViewer, {
      name: "Lantern Harbor",
      entityType: "location",
      visibility: "all_users",
      aliases: [],
      tags: ["port"],
      body: "Lantern Harbor is a windswept port city.",
      fields: {
        location_type: "city",
      },
      media: [],
      relationships: [],
    });

    expect(saved.id).toBe("location-lantern-harbor");
    expect(saved.path).toContain("locations/lantern-harbor.md");
  });

  it("prevents collaborators from editing owner-only entities", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-browser-"));
    tempDirs.push(tempRoot);
    await cp(fixtureRoot, tempRoot, { recursive: true });

    await expect(
      saveWorldEntity(tempRoot, collaboratorViewer, {
        id: "location-silverkeep",
        name: "Silverkeep",
        entityType: "location",
        visibility: "owner_only",
        aliases: [],
        tags: ["city"],
        body: "Should not save.",
        fields: {},
        media: [],
        relationships: [],
      }),
    ).rejects.toThrow(/permission|visibility/i);
  });

  it("stores uploaded media on the local filesystem and resolves it for serving", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-browser-"));
    tempDirs.push(tempRoot);
    await cp(fixtureRoot, tempRoot, { recursive: true });

    const updated = await attachMediaToEntity(tempRoot, ownerViewer, "location-silverkeep", {
      fileName: "harbor-report.txt",
      contentType: "text/plain",
      base64Data: Buffer.from("harbor report").toString("base64"),
      caption: "A report",
    });

    const media = await loadWorldEntityMedia(tempRoot, ownerViewer, "location-silverkeep", updated.media[0]!.id);
    expect(media?.absolutePath).toContain("media/location-silverkeep/");
    expect(media?.contentType).toBe("text/plain");
  });
});
