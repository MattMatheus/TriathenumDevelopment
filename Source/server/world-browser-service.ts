import path from "node:path";

import type {
  AuthSessionPayload,
  EntityDocument,
  EntityMediaAsset,
  EntityVisibility,
  WorldBrowserEntityDetail,
  WorldBrowserMediaUploadRequest,
  WorldBrowserEntitySaveRequest,
  WorldBrowserEntitySummary,
  WorldBrowserPayload,
  WorldEntityType,
} from "../contracts/index.js";
import { FileSystemWorldDocumentStore, SqliteWorldIndex } from "../world/index.js";
import {
  AuthError,
  canAssignVisibility,
  canEditEntity,
  canViewEntity,
  getViewerVisibilityOptions,
  type AuthenticatedViewer,
} from "./auth-service.js";

const defaultFixtureWorldRoot = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  "..",
  "world",
  "__fixtures__",
  "world",
);

export function defaultWorldRoot(): string {
  return process.env.TRIATHENUM_WORLD_ROOT ?? defaultFixtureWorldRoot;
}

function buildSessionPayload(viewer: AuthenticatedViewer): AuthSessionPayload {
  return {
    viewer,
    visibilityOptions: getViewerVisibilityOptions(viewer),
    canManageAccounts: viewer.role === "owner",
  };
}

function buildMediaUrl(entityId: string, mediaId: string): string {
  return `/api/world/entities/${encodeURIComponent(entityId)}/media/${encodeURIComponent(mediaId)}`;
}

export async function loadWorldBrowserPayload(
  worldRoot: string,
  viewer: AuthenticatedViewer,
  searchQuery?: string,
): Promise<WorldBrowserPayload> {
  const store = new FileSystemWorldDocumentStore(worldRoot);
  const documents = await store.loadEntityDocuments();
  const index = new SqliteWorldIndex();

  try {
    index.rebuild(documents);

    const sourceEntities = (searchQuery?.trim() ? index.searchEntities(searchQuery) : index.listEntities()).filter((entity) =>
      canViewEntity(viewer, entity.visibility),
    );
    const entities: WorldBrowserEntitySummary[] = sourceEntities.map((entity) => ({
      id: entity.id,
      name: entity.name,
      entityType: entity.entityType,
      visibility: entity.visibility,
      tags: entity.tags,
      aliases: entity.aliases,
      excerpt: entity.excerpt,
    }));

    const availableTypes = [...new Set(entities.map((entity) => entity.entityType))].sort((left, right) =>
      left.localeCompare(right),
    ) as WorldEntityType[];

    return {
      session: buildSessionPayload(viewer),
      entities,
      availableTypes,
      availableTags: [...new Set(entities.flatMap((entity) => entity.tags))].sort((left, right) => left.localeCompare(right)),
      unresolvedReferences:
        viewer.role === "owner"
          ? index.listUnresolvedReferences()
          : index.listUnresolvedReferences().filter((reference) => {
              const sourceEntity = documents.find((item) => item.envelope.id === reference.sourceEntityId);
              return sourceEntity ? canViewEntity(viewer, sourceEntity.envelope.visibility) : false;
            }),
    };
  } finally {
    index.close();
  }
}

export async function loadWorldEntityDetail(
  worldRoot: string,
  viewer: AuthenticatedViewer,
  entityId: string,
): Promise<WorldBrowserEntityDetail | null> {
  const store = new FileSystemWorldDocumentStore(worldRoot);
  const documents = await store.loadEntityDocuments();
  const index = new SqliteWorldIndex();

  try {
    index.rebuild(documents);
    const summary = index.listEntities().find((entity) => entity.id === entityId);
    const document = documents.find((item) => item.envelope.id === entityId);

    if (!summary || !document || !canViewEntity(viewer, summary.visibility)) {
      return null;
    }

    return {
      id: summary.id,
      name: summary.name,
      entityType: summary.entityType,
      visibility: summary.visibility,
      aliases: summary.aliases,
      tags: summary.tags,
      excerpt: summary.excerpt,
      body: document.body,
      path: document.path,
      fields: document.fields,
      media: document.envelope.media.map((asset) => ({
        ...asset,
        url: buildMediaUrl(summary.id, asset.id),
      })),
      relationships: document.envelope.relationships,
      backlinks: index.listBacklinks(entityId).filter((backlink) => {
        const sourceEntity = documents.find((item) => item.envelope.id === backlink.sourceEntityId);
        return sourceEntity ? canViewEntity(viewer, sourceEntity.envelope.visibility) : false;
      }),
    };
  } finally {
    index.close();
  }
}

function deriveId(name: string, entityType: WorldEntityType): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "untitled-entity";

  return `${entityType}-${slug}`;
}

function coerceFields(fields: Record<string, string>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(fields)
      .map(([key, value]) => [key.trim(), value.trim()])
      .filter(([key, value]) => key && value),
  );
}

function createDocumentFromSaveRequest(
  existing: EntityDocument | undefined,
  saveRequest: WorldBrowserEntitySaveRequest,
  targetPath: string,
): EntityDocument {
  const nextId = saveRequest.id ?? existing?.envelope.id ?? deriveId(saveRequest.name, saveRequest.entityType);
  const nextVisibility: EntityVisibility = saveRequest.visibility;

  return {
    path: existing?.path ?? targetPath,
    envelope: {
      id: nextId,
      entityType: saveRequest.entityType,
      name: saveRequest.name,
      aliases: saveRequest.aliases.filter(Boolean),
      tags: saveRequest.tags.filter(Boolean),
      visibility: nextVisibility,
      media: saveRequest.media ?? existing?.envelope.media ?? [],
      relationships: saveRequest.relationships.filter(
        (relationship) => relationship.type.trim() && relationship.target.trim(),
      ),
      extensions: existing?.envelope.extensions ?? {},
    },
    fields: coerceFields(saveRequest.fields),
    body: saveRequest.body,
  };
}

export async function saveWorldEntity(
  worldRoot: string,
  viewer: AuthenticatedViewer,
  saveRequest: WorldBrowserEntitySaveRequest,
): Promise<WorldBrowserEntityDetail> {
  if (!canAssignVisibility(viewer, saveRequest.visibility)) {
    throw new AuthError(403, "You cannot assign that visibility level.");
  }

  const store = new FileSystemWorldDocumentStore(worldRoot);
  const documents = await store.loadEntityDocuments();
  const existing = saveRequest.id ? documents.find((item) => item.envelope.id === saveRequest.id) : undefined;
  if (existing && !canEditEntity(viewer, existing.envelope.visibility)) {
    throw new AuthError(403, "You do not have permission to edit this entity.");
  }

  const targetPath = existing?.path ?? store.buildEntityPath(saveRequest.entityType, saveRequest.name);
  const nextDocument = createDocumentFromSaveRequest(existing, saveRequest, targetPath);
  if (!canEditEntity(viewer, nextDocument.envelope.visibility)) {
    throw new AuthError(403, "You do not have permission to save this entity with that visibility.");
  }

  await store.writeEntityDocument(nextDocument);

  return (await loadWorldEntityDetail(worldRoot, viewer, nextDocument.envelope.id))!;
}

function decodeUploadData(base64Data: string): Buffer {
  const normalized = base64Data.includes(",") ? base64Data.split(",").at(-1) ?? "" : base64Data;
  return Buffer.from(normalized, "base64");
}

export async function attachMediaToEntity(
  worldRoot: string,
  viewer: AuthenticatedViewer,
  entityId: string,
  uploadRequest: WorldBrowserMediaUploadRequest,
): Promise<WorldBrowserEntityDetail> {
  const store = new FileSystemWorldDocumentStore(worldRoot);
  const documents = await store.loadEntityDocuments();
  const existing = documents.find((item) => item.envelope.id === entityId);

  if (!existing) {
    throw new AuthError(404, `Entity not found for id ${entityId}`);
  }

  if (!canEditEntity(viewer, existing.envelope.visibility)) {
    throw new AuthError(403, "You do not have permission to attach media to this entity.");
  }

  const fileName = uploadRequest.fileName.trim();
  if (!fileName || !uploadRequest.base64Data.trim()) {
    throw new AuthError(400, "A file name and media data are required.");
  }

  const relativeMediaPath = store.buildMediaPath(entityId, fileName);
  await store.writeMediaAsset(relativeMediaPath, decodeUploadData(uploadRequest.base64Data));

  const asset: EntityMediaAsset = {
    id: path.basename(relativeMediaPath, path.extname(relativeMediaPath)),
    kind: uploadRequest.contentType.startsWith("image/") ? "image" : "file",
    path: relativeMediaPath,
    contentType: uploadRequest.contentType || "application/octet-stream",
    originalFileName: fileName,
    alt: uploadRequest.alt?.trim() || undefined,
    caption: uploadRequest.caption?.trim() || undefined,
  };

  const nextDocument: EntityDocument = {
    ...existing,
    envelope: {
      ...existing.envelope,
      media: [...existing.envelope.media, asset],
    },
  };

  await store.writeEntityDocument(nextDocument);
  return (await loadWorldEntityDetail(worldRoot, viewer, entityId))!;
}

export async function loadWorldEntityMedia(
  worldRoot: string,
  viewer: AuthenticatedViewer,
  entityId: string,
  mediaId: string,
): Promise<{ absolutePath: string; contentType: string; originalFileName: string } | null> {
  const store = new FileSystemWorldDocumentStore(worldRoot);
  const documents = await store.loadEntityDocuments();
  const existing = documents.find((item) => item.envelope.id === entityId);

  if (!existing || !canViewEntity(viewer, existing.envelope.visibility)) {
    return null;
  }

  const asset = existing.envelope.media.find((item) => item.id === mediaId);
  if (!asset) {
    return null;
  }

  return {
    absolutePath: store.resolveMediaPath(asset.path),
    contentType: asset.contentType,
    originalFileName: asset.originalFileName,
  };
}
