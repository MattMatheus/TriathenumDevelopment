import { Buffer } from "node:buffer";
import path from "node:path";

import type {
  EntityDocument,
  WorldImportReviewIssue,
  WorldImportReviewPayload,
  WorldImportReviewRequest,
} from "../contracts/index.js";
import { FileSystemWorldDocumentStore, parseEntityDocument } from "../world/index.js";
import { AuthError, type AuthenticatedViewer } from "./auth-service.js";

type TarEntry = {
  path: string;
  contents: Buffer;
};

type ExportManifest = {
  packageKind?: string;
  schemaVersion?: number;
};

function normalizeArchivePath(value: string): string {
  return value.split("\\").join("/");
}

function decodeBase64Data(base64Data: string): Buffer {
  const normalized = base64Data.includes(",") ? base64Data.split(",").at(-1) ?? "" : base64Data;
  return Buffer.from(normalized, "base64");
}

function readTarEntries(contents: Buffer): TarEntry[] {
  const entries: TarEntry[] = [];
  let offset = 0;

  while (offset + 512 <= contents.length) {
    const header = contents.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) {
      break;
    }

    const entryPath = header.subarray(0, 100).toString("utf8").replace(/\0.*$/, "");
    const rawSize = header.subarray(124, 136).toString("ascii").replace(/\0.*$/, "").trim();
    const size = rawSize ? Number.parseInt(rawSize, 8) : 0;
    if (!entryPath || Number.isNaN(size) || size < 0) {
      throw new AuthError(400, "The import package could not be read as a supported tar archive.");
    }

    const bodyStart = offset + 512;
    const bodyEnd = bodyStart + size;
    entries.push({
      path: normalizeArchivePath(entryPath),
      contents: contents.subarray(bodyStart, bodyEnd),
    });
    offset = bodyEnd + ((512 - (size % 512)) % 512);
  }

  return entries;
}

function issue(
  id: string,
  kind: WorldImportReviewIssue["kind"],
  severity: WorldImportReviewIssue["severity"],
  message: string,
  extras: Partial<Pick<WorldImportReviewIssue, "path" | "entityId">> = {},
): WorldImportReviewIssue {
  return { id, kind, severity, message, ...extras };
}

function hasRequiredExportFrontmatter(input: string): boolean {
  if (!input.startsWith("---\n")) {
    return false;
  }

  return [/^id:/m, /^entity_type:/m, /^name:/m, /^visibility:/m].every((pattern) => pattern.test(input));
}

function summaryFor(validDocumentCount: number, validMediaCount: number, issues: WorldImportReviewIssue[]): string {
  const errors = issues.filter((entry) => entry.severity === "error").length;
  const warnings = issues.length - errors;
  return `Dry-run review found ${validDocumentCount} valid document${validDocumentCount === 1 ? "" : "s"}, ${validMediaCount} valid media asset${validMediaCount === 1 ? "" : "s"}, ${errors} error${errors === 1 ? "" : "s"}, and ${warnings} warning${warnings === 1 ? "" : "s"}.`;
}

export async function reviewImportPackage(
  worldRoot: string,
  viewer: AuthenticatedViewer,
  request: WorldImportReviewRequest,
): Promise<WorldImportReviewPayload> {
  if (viewer.role !== "owner") {
    throw new AuthError(403, "Only the owner can review import packages.");
  }

  const fileName = request.fileName.trim() || "worldforge-import.tar";
  const entries = readTarEntries(decodeBase64Data(request.base64Data));
  const issues: WorldImportReviewIssue[] = [];
  const entryPaths = new Set<string>();

  for (const entry of entries) {
    if (entryPaths.has(entry.path)) {
      issues.push(issue(`duplicate-path-${entry.path}`, "duplicate_entry_path", "error", "Package contains duplicate entry paths.", { path: entry.path }));
      continue;
    }
    entryPaths.add(entry.path);
  }

  const manifestEntry = entries.find((entry) => entry.path === "manifest.json");
  let manifest: ExportManifest | null = null;

  if (!manifestEntry) {
    issues.push(issue("missing-manifest", "invalid_package", "error", "Package is missing manifest.json."));
  } else {
    try {
      manifest = JSON.parse(manifestEntry.contents.toString("utf8")) as ExportManifest;
      if (manifest.packageKind !== "worldforge-export" || manifest.schemaVersion !== 1) {
        issues.push(issue("invalid-manifest", "invalid_package", "error", "Package manifest does not match the supported export format."));
      }
    } catch {
      issues.push(issue("malformed-manifest", "invalid_package", "error", "Package manifest could not be parsed as JSON."));
    }
  }

  const store = new FileSystemWorldDocumentStore(worldRoot);
  const existingDocuments = await store.loadEntityDocuments();
  const existingIds = new Set(existingDocuments.map((document) => document.envelope.id));
  const existingPaths = new Set(existingDocuments.map((document) => normalizeArchivePath(path.relative(worldRoot, document.path))));
  const mediaEntryPaths = new Set(entries.filter((entry) => entry.path.startsWith("media/")).map((entry) => entry.path));

  const packageDocuments: EntityDocument[] = [];
  const packageIds = new Set<string>();
  let validMediaCount = 0;

  for (const entry of entries) {
    if (entry.path === "manifest.json") {
      continue;
    }

    if (entry.path.endsWith(".md")) {
      try {
        const source = entry.contents.toString("utf8");
        if (!hasRequiredExportFrontmatter(source)) {
          throw new Error("Document does not match the supported export-shaped frontmatter format.");
        }

        const document = parseEntityDocument(path.join(worldRoot, entry.path), source);
        packageDocuments.push(document);

        if (packageIds.has(document.envelope.id)) {
          issues.push(
            issue(`duplicate-id-${document.envelope.id}-${entry.path}`, "duplicate_entity_id", "error", "Entity id conflicts with an existing or duplicated document.", {
              entityId: document.envelope.id,
              path: entry.path,
            }),
          );
        } else {
          packageIds.add(document.envelope.id);
        }

        if (existingIds.has(document.envelope.id)) {
          issues.push(
            issue(
              `existing-id-${document.envelope.id}-${entry.path}`,
              "duplicate_entity_id",
              "warning",
              "Entity id already exists in the current world and would require conflict handling during apply.",
              {
                entityId: document.envelope.id,
                path: entry.path,
              },
            ),
          );
        }

        if (existingPaths.has(entry.path)) {
          issues.push(
            issue(
              `path-conflict-${entry.path}`,
              "path_conflict",
              "warning",
              "Document path already exists in the current world and would require conflict handling during apply.",
              { path: entry.path, entityId: document.envelope.id },
            ),
          );
        }
      } catch (error) {
        issues.push(
          issue(`malformed-document-${entry.path}`, "malformed_document", "error", error instanceof Error ? error.message : "Document could not be parsed.", { path: entry.path }),
        );
      }

      continue;
    }

    if (entry.path.startsWith("media/")) {
      validMediaCount += 1;
      continue;
    }

    issues.push(issue(`unsupported-${entry.path}`, "unsupported_entry", "warning", "Package contains an unsupported non-export entry.", { path: entry.path }));
  }

  for (const document of packageDocuments) {
    for (const asset of document.envelope.media) {
      const assetPath = normalizeArchivePath(asset.path);
      if (!mediaEntryPaths.has(assetPath)) {
        issues.push(
          issue(`missing-media-${document.envelope.id}-${assetPath}`, "media_missing", "error", "Document references media that is missing from the package.", {
            entityId: document.envelope.id,
            path: assetPath,
          }),
        );
      }
    }
  }

  const validDocumentCount = packageDocuments.filter((document) => {
    const hasError = issues.some(
      (entry) =>
        entry.severity === "error" &&
        ((entry.entityId && entry.entityId === document.envelope.id) || (entry.path && entry.path === normalizeArchivePath(path.relative(worldRoot, document.path)))),
    );
    return !hasError;
  }).length;

  return {
    status: "ready",
    summary: summaryFor(validDocumentCount, validMediaCount, issues),
    fileName,
    packageKind: manifest?.packageKind === "worldforge-export" ? "worldforge-export" : "unknown",
    validDocumentCount,
    validMediaCount,
    issueCount: issues.length,
    issues: issues.sort((left, right) => left.message.localeCompare(right.message) || (left.path ?? "").localeCompare(right.path ?? "")),
  };
}
