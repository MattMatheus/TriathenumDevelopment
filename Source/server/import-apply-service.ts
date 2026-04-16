import type {
  WorldImportApplyAction,
  WorldImportApplyPayload,
  WorldImportApplyRequest,
} from "../contracts/index.js";
import { FileSystemWorldDocumentStore } from "../world/index.js";
import { AuthError, type AuthenticatedViewer } from "./auth-service.js";
import { analyzeImportPackage, type ImportPackageDocument } from "./import-review-service.js";

function summaryFor(createdCount: number, skippedCount: number, failedCount: number): string {
  return `Import apply created ${createdCount} item${createdCount === 1 ? "" : "s"}, skipped ${skippedCount} item${skippedCount === 1 ? "" : "s"}, and failed ${failedCount} item${failedCount === 1 ? "" : "s"}.`;
}

function hasErrorIssue(worldRoot: string, document: ImportPackageDocument, issues: Awaited<ReturnType<typeof analyzeImportPackage>>["issues"]): boolean {
  const relativePath = document.entryPath;
  return issues.some(
    (issue) =>
      issue.severity === "error" &&
      ((issue.entityId !== undefined && issue.entityId === document.document.envelope.id) ||
        (issue.path !== undefined && issue.path === relativePath)),
  );
}

function hasConflictWarning(document: ImportPackageDocument, issues: Awaited<ReturnType<typeof analyzeImportPackage>>["issues"]): boolean {
  return issues.some(
    (issue) =>
      issue.severity === "warning" &&
      issue.entityId === document.document.envelope.id &&
      (issue.kind === "duplicate_entity_id" || issue.kind === "path_conflict"),
  );
}

function pushAction(
  actions: WorldImportApplyAction[],
  kind: WorldImportApplyAction["kind"],
  targetType: WorldImportApplyAction["targetType"],
  path: string,
  message: string,
  entityId?: string,
) {
  actions.push({
    id: `${kind}-${targetType}-${path}`,
    kind,
    targetType,
    path,
    entityId,
    message,
  });
}

export async function applyImportPackage(
  worldRoot: string,
  viewer: AuthenticatedViewer,
  request: WorldImportApplyRequest,
): Promise<WorldImportApplyPayload> {
  if (viewer.role !== "owner") {
    throw new AuthError(403, "Only the owner can apply import packages.");
  }

  if (request.conflictPolicy !== "skip_on_conflict") {
    throw new AuthError(400, "Unsupported conflict policy.");
  }

  const analysis = await analyzeImportPackage(worldRoot, request);
  const store = new FileSystemWorldDocumentStore(worldRoot);
  const mediaEntries = new Map(analysis.mediaEntries.map((entry) => [entry.path, entry.contents]));
  const actions: WorldImportApplyAction[] = [];

  for (const documentEntry of analysis.documents) {
    const { document, entryPath } = documentEntry;

    if (hasErrorIssue(worldRoot, documentEntry, analysis.issues)) {
      pushAction(actions, "failed", "document", entryPath, "Document was not imported because the package review found blocking errors.", document.envelope.id);
      continue;
    }

    if (hasConflictWarning(documentEntry, analysis.issues)) {
      pushAction(actions, "skipped", "document", entryPath, "Document was skipped because the skip-on-conflict policy does not overwrite existing ids or paths.", document.envelope.id);
      continue;
    }

    const writableDocument = store.withRootDocumentPath(document, entryPath);
    await store.writeEntityDocument(writableDocument);
    pushAction(actions, "created", "document", entryPath, "Document imported successfully.", document.envelope.id);

    for (const asset of document.envelope.media) {
      const contents = mediaEntries.get(asset.path);
      if (!contents) {
        pushAction(actions, "failed", "media", asset.path, "Media file was missing from the package.", document.envelope.id);
        continue;
      }

      try {
        await store.writeMediaAsset(asset.path, contents);
        pushAction(actions, "created", "media", asset.path, "Media imported successfully.", document.envelope.id);
      } catch (error) {
        pushAction(
          actions,
          "failed",
          "media",
          asset.path,
          error instanceof Error ? error.message : "Media import failed.",
          document.envelope.id,
        );
      }
    }
  }

  const createdCount = actions.filter((action) => action.kind === "created").length;
  const skippedCount = actions.filter((action) => action.kind === "skipped").length;
  const failedCount = actions.filter((action) => action.kind === "failed").length;

  return {
    status: "ready",
    summary: summaryFor(createdCount, skippedCount, failedCount),
    conflictPolicy: request.conflictPolicy,
    createdCount,
    skippedCount,
    failedCount,
    actions,
  };
}
