import path from "node:path";
import { cp, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import type { AuthenticatedViewer } from "./auth-service.js";
import { loadEntityGraph } from "./graph-service.js";
import { saveWorldEntity } from "./world-browser-service.js";

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

describe("loadEntityGraph", () => {
  it("returns a selected-entity neighborhood with outbound relationships and inbound backlinks", async () => {
    const result = await loadEntityGraph(fixtureRoot, ownerViewer, "location-silverkeep");

    expect(result?.entityName).toBe("Silverkeep");
    expect(result?.nodes.map((node) => node.entityName)).toEqual(
      expect.arrayContaining(["Silverkeep", "Council of Twelve Regions", "Eliana Tanaka", "The River Levy Crisis"]),
    );
    expect(result?.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          direction: "outbound",
          label: "governed_by",
          targetEntityId: "faction-council-of-twelve-regions",
        }),
        expect.objectContaining({
          direction: "inbound",
          sourceEntityId: "character-eliana-tanaka",
        }),
      ]),
    );
  });

  it("suppresses owner-only neighbors for collaborators", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-graph-"));
    tempDirs.push(tempRoot);
    await cp(fixtureRoot, tempRoot, { recursive: true });

    await saveWorldEntity(tempRoot, ownerViewer, {
      id: "faction-council-of-twelve-regions",
      name: "Council of Twelve Regions",
      entityType: "faction",
      visibility: "owner_only",
      aliases: ["Regional Council"],
      tags: ["government"],
      body: "The council now has owner-only visibility.",
      fields: {
        faction_type: "government",
      },
      media: [],
      relationships: [
        {
          type: "governs",
          target: "Silverkeep",
        },
      ],
    });

    const result = await loadEntityGraph(tempRoot, collaboratorViewer, "location-silverkeep");

    expect(result?.nodes.map((node) => node.entityName)).not.toContain("Council of Twelve Regions");
    expect(result?.edges.some((edge) => edge.targetEntityId === "faction-council-of-twelve-regions")).toBe(false);
  });
});
