import path from "node:path";
import { cp, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import type { AuthenticatedViewer } from "./auth-service.js";
import { loadWorldMapNavigation } from "./map-navigation-service.js";
import { attachMediaToEntity, saveWorldEntity } from "./world-browser-service.js";

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

describe("loadWorldMapNavigation", () => {
  it("returns a clean empty-state when no backdrop or pins are configured", async () => {
    const result = await loadWorldMapNavigation(fixtureRoot, ownerViewer);

    expect(result.hasBackdrop).toBe(false);
    expect(result.pins).toEqual([]);
    expect(result.summary).toMatch(/no map asset or pinned locations/i);
  });

  it("returns persisted location pins and optional map backdrop", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-map-"));
    tempDirs.push(tempRoot);
    await cp(fixtureRoot, tempRoot, { recursive: true });

    const silverkeep = await saveWorldEntity(tempRoot, ownerViewer, {
      id: "location-silverkeep",
      name: "Silverkeep",
      entityType: "location",
      visibility: "all_users",
      aliases: ["The River City"],
      tags: ["city", "river"],
      body: "Silverkeep is the trade city at the center of the river provinces.",
      fields: {
        location_type: "city",
        parent_location: "River Provinces",
        map_x: "42",
        map_y: "58",
        map_region: "Central Reach",
        map_backdrop: "true",
      },
      media: [],
      relationships: [
        {
          type: "governed_by",
          target: "Council of Twelve Regions",
        },
      ],
    });

    await attachMediaToEntity(tempRoot, ownerViewer, silverkeep.id, {
      fileName: "world-map.png",
      contentType: "image/png",
      base64Data: Buffer.from("map-bytes").toString("base64"),
      alt: "World map",
      caption: "Campaign map",
    });

    const result = await loadWorldMapNavigation(tempRoot, ownerViewer);

    expect(result.hasBackdrop).toBe(true);
    expect(result.backdropUrl).toContain(`/api/world/entities/${silverkeep.id}/media/`);
    expect(result.pins).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityId: "location-silverkeep",
          region: "Central Reach",
          x: 42,
          y: 58,
        }),
      ]),
    );
  });

  it("hides owner-only pinned locations from collaborators", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-map-"));
    tempDirs.push(tempRoot);
    await cp(fixtureRoot, tempRoot, { recursive: true });

    await saveWorldEntity(tempRoot, ownerViewer, {
      name: "Hidden Harbor",
      entityType: "location",
      visibility: "owner_only",
      aliases: [],
      tags: ["port"],
      body: "A concealed harbor location.",
      fields: {
        map_x: "20",
        map_y: "15",
      },
      media: [],
      relationships: [],
    });

    const result = await loadWorldMapNavigation(tempRoot, collaboratorViewer);

    expect(result.pins.map((pin) => pin.entityName)).not.toContain("Hidden Harbor");
  });
});
