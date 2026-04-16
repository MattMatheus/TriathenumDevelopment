import path from "node:path";
import { cp, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import type { AuthenticatedViewer } from "./auth-service.js";
import { buildWorldExportPackage } from "./export-package-service.js";
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

function readTarEntries(contents: Buffer): Map<string, Buffer> {
  const entries = new Map<string, Buffer>();
  let offset = 0;

  while (offset + 512 <= contents.length) {
    const header = contents.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) {
      break;
    }

    const rawName = header.subarray(0, 100).toString("utf8").replace(/\0.*$/, "");
    const rawSize = header.subarray(124, 136).toString("ascii").replace(/\0.*$/, "").trim();
    const size = rawSize ? Number.parseInt(rawSize, 8) : 0;
    const bodyStart = offset + 512;
    const bodyEnd = bodyStart + size;
    entries.set(rawName, contents.subarray(bodyStart, bodyEnd));
    offset = bodyEnd + ((512 - (size % 512)) % 512);
  }

  return entries;
}

describe("buildWorldExportPackage", () => {
  it("creates a deterministic tar package with manifest and markdown documents", async () => {
    const first = await buildWorldExportPackage(fixtureRoot, ownerViewer);
    const second = await buildWorldExportPackage(fixtureRoot, ownerViewer);

    expect(first.contentType).toBe("application/x-tar");
    expect(first.fileName).toBe("worldforge-export.tar");
    expect(first.contents.equals(second.contents)).toBe(true);

    const entries = readTarEntries(first.contents);
    expect(entries.has("manifest.json")).toBe(true);
    expect([...entries.keys()].some((entry) => entry.endsWith(".md"))).toBe(true);

    const manifest = JSON.parse(entries.get("manifest.json")!.toString("utf8")) as {
      packageKind: string;
      schemaVersion: number;
      entityCount: number;
      mediaCount: number;
    };

    expect(manifest.packageKind).toBe("worldforge-export");
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.entityCount).toBe(first.entityCount);
  });

  it("includes referenced media assets in the export package", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-export-"));
    tempDirs.push(tempRoot);
    await cp(fixtureRoot, tempRoot, { recursive: true });

    const entity = await saveWorldEntity(tempRoot, ownerViewer, {
      id: "location-silverkeep",
      name: "Silverkeep",
      entityType: "location",
      visibility: "all_users",
      aliases: [],
      tags: ["city"],
      body: "Silverkeep anchors the river trade routes.",
      fields: {},
      media: [],
      relationships: [],
    });

    await attachMediaToEntity(tempRoot, ownerViewer, entity.id, {
      fileName: "city-map.png",
      contentType: "image/png",
      base64Data: Buffer.from("png-bytes").toString("base64"),
      alt: "City map",
      caption: "Silverkeep plan",
    });

    const result = await buildWorldExportPackage(tempRoot, ownerViewer);
    const entries = readTarEntries(result.contents);

    expect([...entries.keys()].some((entry) => entry.startsWith(`media/${entity.id}/city-map-`))).toBe(true);
    expect(result.mediaCount).toBeGreaterThan(0);
  });

  it("respects viewer visibility boundaries in exported content", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-export-"));
    tempDirs.push(tempRoot);
    await cp(fixtureRoot, tempRoot, { recursive: true });

    await saveWorldEntity(tempRoot, ownerViewer, {
      id: "location-hidden-harbor",
      name: "Hidden Harbor",
      entityType: "location",
      visibility: "owner_only",
      aliases: [],
      tags: ["port"],
      body: "A concealed harbor known only to the inner fleet.",
      fields: {},
      media: [],
      relationships: [],
    });

    const ownerPackage = await buildWorldExportPackage(tempRoot, ownerViewer);
    const collaboratorPackage = await buildWorldExportPackage(tempRoot, collaboratorViewer);

    const ownerEntries = readTarEntries(ownerPackage.contents);
    const collaboratorEntries = readTarEntries(collaboratorPackage.contents);

    expect([...ownerEntries.keys()]).toContain("locations/hidden-harbor.md");
    expect([...collaboratorEntries.keys()]).not.toContain("locations/hidden-harbor.md");
  });
});
