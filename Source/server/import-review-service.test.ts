import path from "node:path";
import { cp, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import type { AuthenticatedViewer } from "./auth-service.js";
import { buildWorldExportPackage } from "./export-package-service.js";
import { reviewImportPackage } from "./import-review-service.js";
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

function entryHeader(entryPath: string, size: number): Buffer {
  const header = Buffer.alloc(512, 0);
  header.write(entryPath.slice(0, 100), 0, "utf8");
  Buffer.from("0000644\0 ", "ascii").copy(header, 100);
  Buffer.from("0000000\0 ", "ascii").copy(header, 108);
  Buffer.from("0000000\0 ", "ascii").copy(header, 116);
  Buffer.from(size.toString(8).padStart(11, "0") + "\0 ", "ascii").copy(header, 124);
  Buffer.from("00000000000\0 ", "ascii").copy(header, 136);
  header.fill(0x20, 148, 156);
  header.write("0", 156, "ascii");
  header.write("ustar", 257, "ascii");
  header.write("00", 263, "ascii");
  const checksum = Buffer.from(header).reduce((sum, byte) => sum + byte, 0);
  Buffer.from(checksum.toString(8).padStart(6, "0") + "\0 ", "ascii").copy(header, 148);
  return header;
}

function tar(entries: Array<{ path: string; contents: string | Buffer }>): Buffer {
  const parts: Buffer[] = [];
  for (const entry of entries) {
    const contents = typeof entry.contents === "string" ? Buffer.from(entry.contents, "utf8") : entry.contents;
    parts.push(entryHeader(entry.path, contents.length), contents);
    const remainder = contents.length % 512;
    if (remainder !== 0) {
      parts.push(Buffer.alloc(512 - remainder, 0));
    }
  }
  parts.push(Buffer.alloc(1024, 0));
  return Buffer.concat(parts);
}

describe("reviewImportPackage", () => {
  it("reviews an exported package without writing world files", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-import-review-"));
    tempDirs.push(tempRoot);
    await cp(fixtureRoot, tempRoot, { recursive: true });

    const exportPackage = await buildWorldExportPackage(tempRoot, ownerViewer);
    const result = await reviewImportPackage(tempRoot, ownerViewer, {
      fileName: exportPackage.fileName,
      base64Data: exportPackage.contents.toString("base64"),
    });

    expect(result.status).toBe("ready");
    expect(result.packageKind).toBe("worldforge-export");
    expect(result.validDocumentCount).toBeGreaterThan(0);
    expect(result.issueCount).toBeGreaterThanOrEqual(0);
  });

  it("reports malformed documents, missing media, and duplicate ids", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-import-review-"));
    tempDirs.push(tempRoot);
    await cp(fixtureRoot, tempRoot, { recursive: true });

    await saveWorldEntity(tempRoot, ownerViewer, {
      id: "location-duplicate",
      name: "Duplicate",
      entityType: "location",
      visibility: "all_users",
      aliases: [],
      tags: [],
      body: "Existing entity.",
      fields: {},
      media: [],
      relationships: [],
    });

    const bundle = tar([
      {
        path: "manifest.json",
        contents: JSON.stringify({ packageKind: "worldforge-export", schemaVersion: 1 }),
      },
      {
        path: "locations/duplicate.md",
        contents: `---\nid: location-duplicate\nentity_type: location\nname: Duplicate\nvisibility: all_users\nmedia:\n  - id: map\n    kind: image\n    path: media/location-duplicate/map.png\n---\nBody\n`,
      },
      {
        path: "locations/bad.md",
        contents: "---\nname: bad\nmedia: [\n---\nBroken\n",
      },
      {
        path: "notes/extra.txt",
        contents: "unsupported",
      },
    ]);

    const result = await reviewImportPackage(tempRoot, ownerViewer, {
      fileName: "review.tar",
      base64Data: bundle.toString("base64"),
    });

    expect(result.issues.some((entry) => entry.kind === "duplicate_entity_id")).toBe(true);
    expect(result.issues.some((entry) => entry.kind === "malformed_document")).toBe(true);
    expect(result.issues.some((entry) => entry.kind === "media_missing")).toBe(true);
    expect(result.issues.some((entry) => entry.kind === "unsupported_entry")).toBe(true);
  });

  it("rejects collaborator review attempts", async () => {
    const exportPackage = await buildWorldExportPackage(fixtureRoot, ownerViewer);

    await expect(
      reviewImportPackage(fixtureRoot, collaboratorViewer, {
        fileName: exportPackage.fileName,
        base64Data: exportPackage.contents.toString("base64"),
      }),
    ).rejects.toThrow(/only the owner/i);
  });
});
