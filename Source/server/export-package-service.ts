import { readFile } from "node:fs/promises";
import path from "node:path";

import type { EntityDocument } from "../contracts/index.js";
import { FileSystemWorldDocumentStore } from "../world/index.js";
import { canViewEntity, type AuthenticatedViewer } from "./auth-service.js";

type ExportPackageManifest = {
  packageKind: "worldforge-export";
  schemaVersion: 1;
  exportScope: "viewer_visible";
  viewerRole: AuthenticatedViewer["role"];
  entityCount: number;
  mediaCount: number;
};

type ExportPackageEntry = {
  path: string;
  contents: Buffer;
  mode?: number;
};

export type WorldExportPackage = {
  fileName: string;
  contentType: "application/x-tar";
  contents: Buffer;
  entityCount: number;
  mediaCount: number;
};

function normalizeArchivePath(value: string): string {
  return value.split(path.sep).join("/");
}

function encodeOctal(value: number, length: number): Buffer {
  const digits = Math.max(length - 2, 1);
  const encoded = value.toString(8).padStart(digits, "0");
  return Buffer.from(`${encoded}\0 `, "ascii");
}

function checksumFor(header: Buffer): Buffer {
  const copy = Buffer.from(header);
  copy.fill(0x20, 148, 156);
  const checksum = copy.reduce((total, byte) => total + byte, 0);
  return Buffer.from(checksum.toString(8).padStart(6, "0") + "\0 ", "ascii");
}

function tarHeader(entryPath: string, size: number, mode = 0o644): Buffer {
  const header = Buffer.alloc(512, 0);
  const truncatedPath = entryPath.slice(0, 100);
  header.write(truncatedPath, 0, "utf8");
  encodeOctal(mode, 8).copy(header, 100);
  encodeOctal(0, 8).copy(header, 108);
  encodeOctal(0, 8).copy(header, 116);
  encodeOctal(size, 12).copy(header, 124);
  encodeOctal(0, 12).copy(header, 136);
  header.fill(0x20, 148, 156);
  header.write("0", 156, "ascii");
  header.write("ustar", 257, "ascii");
  header.write("00", 263, "ascii");
  checksumFor(header).copy(header, 148);
  return header;
}

function buildTar(entries: ExportPackageEntry[]): Buffer {
  const parts: Buffer[] = [];

  for (const entry of entries) {
    const header = tarHeader(entry.path, entry.contents.length, entry.mode);
    parts.push(header, entry.contents);

    const remainder = entry.contents.length % 512;
    if (remainder !== 0) {
      parts.push(Buffer.alloc(512 - remainder, 0));
    }
  }

  parts.push(Buffer.alloc(1024, 0));
  return Buffer.concat(parts);
}

function relativeDocumentPath(worldRoot: string, document: EntityDocument): string {
  return normalizeArchivePath(path.relative(worldRoot, document.path));
}

function manifestFor(viewer: AuthenticatedViewer, entityCount: number, mediaCount: number): ExportPackageManifest {
  return {
    packageKind: "worldforge-export",
    schemaVersion: 1,
    exportScope: "viewer_visible",
    viewerRole: viewer.role,
    entityCount,
    mediaCount,
  };
}

export async function buildWorldExportPackage(
  worldRoot: string,
  viewer: AuthenticatedViewer,
): Promise<WorldExportPackage> {
  const store = new FileSystemWorldDocumentStore(worldRoot);
  const documents = (await store.loadEntityDocuments())
    .filter((document) => canViewEntity(viewer, document.envelope.visibility))
    .sort((left, right) => left.path.localeCompare(right.path));

  const mediaEntries = (
    await Promise.all(
      documents.flatMap((document) =>
        [...document.envelope.media]
          .sort((left, right) => left.path.localeCompare(right.path))
          .map(async (asset) => ({
            path: normalizeArchivePath(asset.path),
            contents: await readFile(store.resolveMediaPath(asset.path)),
          })),
      ),
    )
  ).sort((left, right) => left.path.localeCompare(right.path));

  const entityEntries = await Promise.all(
    documents.map(async (document) => ({
      path: relativeDocumentPath(worldRoot, document),
      contents: await readFile(document.path),
    })),
  );

  const manifest = manifestFor(viewer, entityEntries.length, mediaEntries.length);
  const manifestEntry: ExportPackageEntry = {
    path: "manifest.json",
    contents: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8"),
  };

  const contents = buildTar([manifestEntry, ...entityEntries, ...mediaEntries]);

  return {
    fileName: "worldforge-export.tar",
    contentType: "application/x-tar",
    contents,
    entityCount: entityEntries.length,
    mediaCount: mediaEntries.length,
  };
}
