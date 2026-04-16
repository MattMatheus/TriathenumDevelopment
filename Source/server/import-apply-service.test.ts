import path from "node:path";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import type { AuthenticatedViewer } from "./auth-service.js";
import { applyImportPackage } from "./import-apply-service.js";
import { buildWorldExportPackage } from "./export-package-service.js";
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

describe("applyImportPackage", () => {
  it("imports clean package entries and reports created actions", async () => {
    const sourceRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-import-source-"));
    const targetRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-import-target-"));
    tempDirs.push(sourceRoot, targetRoot);
    await cp(fixtureRoot, sourceRoot, { recursive: true });
    await cp(fixtureRoot, targetRoot, { recursive: true });

    await saveWorldEntity(sourceRoot, ownerViewer, {
      id: "location-new-port",
      name: "New Port",
      entityType: "location",
      visibility: "all_users",
      aliases: [],
      tags: ["port"],
      body: "A newly charted harbor.",
      fields: {},
      media: [],
      relationships: [],
    });

    const exportPackage = await buildWorldExportPackage(sourceRoot, ownerViewer);
    const result = await applyImportPackage(targetRoot, ownerViewer, {
      fileName: exportPackage.fileName,
      base64Data: exportPackage.contents.toString("base64"),
      conflictPolicy: "skip_on_conflict",
    });

    expect(result.createdCount).toBeGreaterThan(0);
    expect(result.failedCount).toBe(0);
    expect(result.actions.some((action) => action.kind === "created" && action.path === "locations/new-port.md")).toBe(true);
    expect(await readFile(path.join(targetRoot, "locations", "new-port.md"), "utf8")).toContain("New Port");
  });

  it("skips conflicting entries under skip-on-conflict policy", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-import-apply-"));
    tempDirs.push(tempRoot);
    await cp(fixtureRoot, tempRoot, { recursive: true });

    const exportPackage = await buildWorldExportPackage(tempRoot, ownerViewer);
    const result = await applyImportPackage(tempRoot, ownerViewer, {
      fileName: exportPackage.fileName,
      base64Data: exportPackage.contents.toString("base64"),
      conflictPolicy: "skip_on_conflict",
    });

    expect(result.skippedCount).toBeGreaterThan(0);
    expect(result.actions.some((action) => action.kind === "skipped" && action.targetType === "document")).toBe(true);
  });

  it("rejects collaborator apply attempts", async () => {
    const exportPackage = await buildWorldExportPackage(fixtureRoot, ownerViewer);

    await expect(
      applyImportPackage(fixtureRoot, collaboratorViewer, {
        fileName: exportPackage.fileName,
        base64Data: exportPackage.contents.toString("base64"),
        conflictPolicy: "skip_on_conflict",
      }),
    ).rejects.toThrow(/only the owner/i);
  });
});
