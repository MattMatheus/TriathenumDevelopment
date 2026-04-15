import path from "node:path";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import type { AuthenticatedViewer } from "./auth-service.js";
import { searchWorldSemantically } from "./semantic-search-service.js";

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

describe("searchWorldSemantically", () => {
  it("returns an unavailable response when semantic infrastructure is not configured", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-semantic-"));
    tempDirs.push(tempRoot);
    await cp(fixtureRoot, tempRoot, { recursive: true });

    const result = await searchWorldSemantically(tempRoot, ownerViewer, "Who governs the river trade city?");

    expect(result.status).toBe("unavailable");
    expect(result.unavailableReason).toMatch(/optional/i);
    expect(result.matches).toEqual([]);
  });

  it("returns citation-backed semantic answers for representative lore questions", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-semantic-"));
    tempDirs.push(tempRoot);
    await cp(fixtureRoot, tempRoot, { recursive: true });
    await configureHostedBaseline(tempRoot);

    const result = await searchWorldSemantically(tempRoot, ownerViewer, "Who governs the river trade city?");

    expect(result.status).toBe("ready");
    expect(result.answer).toContain("Council of Twelve Regions");
    expect(result.uncertainty).not.toBe("insufficient");
    expect(result.citations.map((citation) => citation.entityName)).toEqual(
      expect.arrayContaining(["Silverkeep"]),
    );
    expect(result.matches[0]?.id).toBe("location-silverkeep");
  });

  it("surfaces lore-article answers with citations and explicit uncertainty language", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-semantic-"));
    tempDirs.push(tempRoot);
    await cp(fixtureRoot, tempRoot, { recursive: true });
    await configureHostedBaseline(tempRoot);

    const result = await searchWorldSemantically(tempRoot, ownerViewer, "What crisis tested the council's authority?");

    expect(result.status).toBe("ready");
    expect(result.answer).toContain("River Levy Crisis");
    expect(result.citations.map((citation) => citation.entityId)).toContain("lore-river-levy-crisis");
    expect(result.uncertaintyReason.length).toBeGreaterThan(0);
  });
});
