import path from "node:path";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import type { AuthenticatedViewer } from "./auth-service.js";
import { reviewWorldConsistency } from "./consistency-review-service.js";
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

async function configureHostedBaseline(worldRoot: string): Promise<void> {
  await mkdir(path.join(worldRoot, ".worldforge"), { recursive: true });
  await writeFile(
    path.join(worldRoot, ".worldforge", "ai-settings.json"),
    JSON.stringify(
      {
        kind: "hosted",
        endpoint: "https://api.example.test/v1",
        model: "gpt-test",
        apiKey: "secret-123",
      },
      null,
      2,
    ),
    "utf8",
  );
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("reviewWorldConsistency", () => {
  it("returns an unavailable response when the AI provider baseline is not configured", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-consistency-"));
    tempDirs.push(tempRoot);
    await cp(fixtureRoot, tempRoot, { recursive: true });

    const result = await reviewWorldConsistency(tempRoot, ownerViewer, {});

    expect(result.status).toBe("unavailable");
    expect(result.unavailableReason).toMatch(/provider baseline/i);
    expect(result.findings).toEqual([]);
  });

  it("returns an empty review queue when reciprocal governance claims stay aligned", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-consistency-"));
    tempDirs.push(tempRoot);
    await cp(fixtureRoot, tempRoot, { recursive: true });
    await configureHostedBaseline(tempRoot);

    const result = await reviewWorldConsistency(tempRoot, ownerViewer, {});

    expect(result.status).toBe("ready");
    expect(result.findings).toEqual([]);
    expect(result.summary).toMatch(/no consistency concerns/i);
  });

  it("flags contradictory reciprocal governance claims with citations", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-consistency-"));
    tempDirs.push(tempRoot);
    await cp(fixtureRoot, tempRoot, { recursive: true });
    await configureHostedBaseline(tempRoot);

    await saveWorldEntity(tempRoot, ownerViewer, {
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
      },
      media: [],
      relationships: [
        {
          type: "governed_by",
          target: "Harbor Senate",
        },
      ],
    });

    const result = await reviewWorldConsistency(tempRoot, ownerViewer, {});

    expect(result.status).toBe("ready");
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          findingType: "contradiction",
          confidence: "high",
          citations: expect.arrayContaining([
            expect.objectContaining({ entityName: "Council of Twelve Regions" }),
            expect.objectContaining({ entityName: "Silverkeep" }),
          ]),
        }),
      ]),
    );
  });

  it("does not leak owner-only targets into collaborator findings", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-consistency-"));
    tempDirs.push(tempRoot);
    await cp(fixtureRoot, tempRoot, { recursive: true });
    await configureHostedBaseline(tempRoot);

    await saveWorldEntity(tempRoot, ownerViewer, {
      id: "location-silverkeep",
      name: "Silverkeep",
      entityType: "location",
      visibility: "owner_only",
      aliases: ["The River City"],
      tags: ["city", "river"],
      body: "Silverkeep is the trade city at the center of the river provinces.",
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

    const result = await reviewWorldConsistency(tempRoot, collaboratorViewer, {});

    expect(result.status).toBe("ready");
    expect(result.findings).toEqual([]);
  });
});
