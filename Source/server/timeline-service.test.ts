import path from "node:path";
import { cp, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import type { AuthenticatedViewer } from "./auth-service.js";
import { loadWorldTimeline } from "./timeline-service.js";
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

describe("loadWorldTimeline", () => {
  it("returns visible timeline items ordered across exact, range, and relative chronology", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-timeline-"));
    tempDirs.push(tempRoot);
    await cp(fixtureRoot, tempRoot, { recursive: true });

    await saveWorldEntity(tempRoot, ownerViewer, {
      name: "Founding of Lantern Watch",
      entityType: "lore_article",
      visibility: "all_users",
      aliases: [],
      tags: ["history"],
      body: "Lantern Watch was founded at the edge of the northern estuary.",
      fields: {
        date: "1021-03-15",
      },
      media: [],
      relationships: [],
    });

    await saveWorldEntity(tempRoot, ownerViewer, {
      name: "Siege of Pale Harbor",
      entityType: "lore_article",
      visibility: "all_users",
      aliases: [],
      tags: ["history"],
      body: "The siege stretched across two campaigning seasons.",
      fields: {
        start_date: "1022-04",
        end_date: "1022-08",
      },
      media: [],
      relationships: [],
    });

    await saveWorldEntity(tempRoot, ownerViewer, {
      name: "Succession Debate",
      entityType: "lore_article",
      visibility: "all_users",
      aliases: [],
      tags: ["history"],
      body: "The debate preceded the levy settlement.",
      fields: {
        chronology_order: "30",
        chronology_label: "Before the levy settlement",
      },
      media: [],
      relationships: [],
    });

    const result = await loadWorldTimeline(tempRoot, ownerViewer);

    expect(result.items.map((item) => item.title)).toEqual([
      "Founding of Lantern Watch",
      "Siege of Pale Harbor",
      "Succession Debate",
      "The River Levy Crisis",
    ]);
    expect(result.items.map((item) => item.chronologyLabel)).toEqual([
      "1021-03-15",
      "1022-04 to 1022-08",
      "Before the levy settlement",
      "Late Consolidation",
    ]);
    expect(result.items.map((item) => item.precision)).toEqual(["day", "range", "relative", "relative"]);
  });

  it("hides owner-only chronology items from collaborators", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-timeline-"));
    tempDirs.push(tempRoot);
    await cp(fixtureRoot, tempRoot, { recursive: true });

    await saveWorldEntity(tempRoot, ownerViewer, {
      name: "Secret War Council",
      entityType: "lore_article",
      visibility: "owner_only",
      aliases: [],
      tags: ["history"],
      body: "A closed council meeting set the covert campaign timeline.",
      fields: {
        date: "1020",
      },
      media: [],
      relationships: [],
    });

    const result = await loadWorldTimeline(tempRoot, collaboratorViewer);

    expect(result.items.map((item) => item.title)).not.toContain("Secret War Council");
    expect(result.items.map((item) => item.title)).toContain("The River Levy Crisis");
  });
});
