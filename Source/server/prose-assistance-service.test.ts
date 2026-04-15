import path from "node:path";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import type { AuthenticatedViewer } from "./auth-service.js";
import { assistEditorProse } from "./prose-assistance-service.js";

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

describe("assistEditorProse", () => {
  it("returns unavailable when no AI baseline is configured", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-prose-"));
    tempDirs.push(tempRoot);
    await cp(fixtureRoot, tempRoot, { recursive: true });

    const result = await assistEditorProse(tempRoot, ownerViewer, {
      action: "summarize",
      entityId: "location-silverkeep",
      name: "Silverkeep",
      entityType: "location",
      body: "Silverkeep is the center of river trade.",
    });

    expect(result.status).toBe("unavailable");
    expect(result.unavailableReason).toMatch(/provider baseline/i);
  });

  it("returns a replacement preview for summarize with scoped context notes", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-prose-"));
    tempDirs.push(tempRoot);
    await cp(fixtureRoot, tempRoot, { recursive: true });
    await configureHostedBaseline(tempRoot);

    const result = await assistEditorProse(tempRoot, ownerViewer, {
      action: "summarize",
      entityId: "location-silverkeep",
      name: "Silverkeep",
      entityType: "location",
      body: "Silverkeep is the center of river trade. Its council oversight keeps the docks stable.",
    });

    expect(result.status).toBe("ready");
    expect(result.applyMode).toBe("replace");
    expect(result.suggestedText).toContain("Silverkeep is the center of river trade.");
    expect(result.contextNotes.map((note) => note.label)).toEqual(
      expect.arrayContaining(["Subject", "Guardrail"]),
    );
  });

  it("returns an appended continuation grounded in subject relationships", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-prose-"));
    tempDirs.push(tempRoot);
    await cp(fixtureRoot, tempRoot, { recursive: true });
    await configureHostedBaseline(tempRoot);

    const result = await assistEditorProse(tempRoot, ownerViewer, {
      action: "continue",
      entityId: "location-silverkeep",
      name: "Silverkeep",
      entityType: "location",
      body: "Silverkeep is the center of river trade.",
    });

    expect(result.status).toBe("ready");
    expect(result.applyMode).toBe("append");
    expect(result.suggestedText).toContain("Council of Twelve Regions");
    expect(result.providerLabel).toBeTruthy();
  });
});
