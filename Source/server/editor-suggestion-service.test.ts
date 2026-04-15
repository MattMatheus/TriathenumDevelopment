import path from "node:path";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import type { AuthenticatedViewer } from "./auth-service.js";
import { generateEditorSuggestions } from "./editor-suggestion-service.js";

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

describe("generateEditorSuggestions", () => {
  it("returns unavailable when the AI baseline is not configured", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-suggestions-"));
    tempDirs.push(tempRoot);
    await cp(fixtureRoot, tempRoot, { recursive: true });

    const result = await generateEditorSuggestions(tempRoot, ownerViewer, {
      entityId: "character-eliana-tanaka",
      name: "Eliana Tanaka",
      entityType: "character",
      body: "Eliana Tanaka serves on the Council of Twelve Regions and lives in Silverkeep.",
      relationships: [],
      fields: {},
    });

    expect(result.status).toBe("unavailable");
    expect(result.unavailableReason).toMatch(/provider baseline/i);
  });

  it("suggests reviewable links, relationships, and a reference summary for unstructured mentions", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-suggestions-"));
    tempDirs.push(tempRoot);
    await cp(fixtureRoot, tempRoot, { recursive: true });
    await configureHostedBaseline(tempRoot);

    const result = await generateEditorSuggestions(tempRoot, ownerViewer, {
      entityId: "character-eliana-tanaka",
      name: "Eliana Tanaka",
      entityType: "character",
      body: "Eliana Tanaka serves on the Council of Twelve Regions and lives in Silverkeep.",
      relationships: [],
      fields: {},
    });

    expect(result.status).toBe("ready");
    expect(result.linkSuggestions.map((item) => item.targetName)).toEqual(
      expect.arrayContaining(["Council of Twelve Regions", "Silverkeep"]),
    );
    expect(result.relationshipSuggestions.map((item) => item.relationship.type)).toEqual(
      expect.arrayContaining(["member_of", "resides_in"]),
    );
    expect(result.summarySuggestion?.fieldKey).toBe("reference_summary");
    expect(result.summarySuggestion?.value.length).toBeGreaterThan(0);
  });

  it("avoids duplicating already linked or structured relationships", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-suggestions-"));
    tempDirs.push(tempRoot);
    await cp(fixtureRoot, tempRoot, { recursive: true });
    await configureHostedBaseline(tempRoot);

    const result = await generateEditorSuggestions(tempRoot, ownerViewer, {
      entityId: "character-eliana-tanaka",
      name: "Eliana Tanaka",
      entityType: "character",
      body: "Eliana Tanaka serves on [[Council of Twelve Regions]] and lives in [[Silverkeep]].",
      relationships: [
        { type: "member_of", target: "Council of Twelve Regions" },
        { type: "resides_in", target: "Silverkeep" },
      ],
      fields: {
        reference_summary: "Eliana Tanaka is a council member in Silverkeep.",
      },
    });

    expect(result.status).toBe("ready");
    expect(result.linkSuggestions).toEqual([]);
    expect(result.relationshipSuggestions).toEqual([]);
  });
});
