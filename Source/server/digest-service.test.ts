import path from "node:path";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import type { AuthenticatedViewer } from "./auth-service.js";
import { generateWorldDigest } from "./digest-service.js";
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

describe("generateWorldDigest", () => {
  it("returns unavailable when the AI provider baseline is not configured", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-digest-"));
    tempDirs.push(tempRoot);
    await cp(fixtureRoot, tempRoot, { recursive: true });

    const result = await generateWorldDigest(tempRoot, ownerViewer, { mode: "world" });

    expect(result.status).toBe("unavailable");
    expect(result.sections).toEqual([]);
  });

  it("returns a cited world digest with overview and open threads", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-digest-"));
    tempDirs.push(tempRoot);
    await cp(fixtureRoot, tempRoot, { recursive: true });
    await configureHostedBaseline(tempRoot);

    const result = await generateWorldDigest(tempRoot, ownerViewer, { mode: "world" });

    expect(result.status).toBe("ready");
    expect(result.sections.map((section) => section.id)).toEqual(
      expect.arrayContaining(["overview", "tag-momentum", "relationship-focus", "open-threads"]),
    );
    expect(result.sections.every((section) => section.citations.length > 0)).toBe(true);
  });

  it("supports tag-scoped review briefs", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-digest-"));
    tempDirs.push(tempRoot);
    await cp(fixtureRoot, tempRoot, { recursive: true });
    await configureHostedBaseline(tempRoot);

    await saveWorldEntity(tempRoot, ownerViewer, {
      name: "Lantern Harbor",
      entityType: "location",
      visibility: "all_users",
      aliases: [],
      tags: ["port"],
      body: "Lantern Harbor is a windswept port city.",
      fields: {},
      media: [],
      relationships: [],
    });

    const result = await generateWorldDigest(tempRoot, ownerViewer, { mode: "tag", tag: "port" });

    expect(result.status).toBe("ready");
    expect(result.scope).toEqual({ mode: "tag", tag: "port" });
    expect(result.sections[0]?.summary).toContain("1 visible entities");
    expect(result.sections.flatMap((section) => section.citations).map((citation) => citation.entityName)).toContain(
      "Lantern Harbor",
    );
  });
});
