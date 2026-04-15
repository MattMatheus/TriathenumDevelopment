import path from "node:path";

import type {
  EntityDocument,
  EntityVisibility,
  WorldBrowserEntityDetail,
  WorldBrowserEntitySaveRequest,
  WorldBrowserEntitySummary,
  WorldBrowserPayload,
  WorldEntityType,
} from "../contracts/index.js";
import { collectIndexedTags, FileSystemWorldDocumentStore, SqliteWorldIndex } from "../world/index.js";

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

export async function loadWorldBrowserPayload(worldRoot: string, searchQuery?: string): Promise<WorldBrowserPayload> {
  const store = new FileSystemWorldDocumentStore(worldRoot);
  const documents = await store.loadEntityDocuments();
  const index = new SqliteWorldIndex();

  try {
    index.rebuild(documents);

    const sourceEntities = searchQuery?.trim() ? index.searchEntities(searchQuery) : index.listEntities();
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
      entities,
      availableTypes,
      availableTags: collectIndexedTags(documents),
      unresolvedReferences: index.listUnresolvedReferences(),
    };
  } finally {
    index.close();
  }
}

export async function loadWorldEntityDetail(worldRoot: string, entityId: string): Promise<WorldBrowserEntityDetail | null> {
  const store = new FileSystemWorldDocumentStore(worldRoot);
  const documents = await store.loadEntityDocuments();
  const index = new SqliteWorldIndex();

  try {
    index.rebuild(documents);
    const summary = index.listEntities().find((entity) => entity.id === entityId);
    const document = documents.find((item) => item.envelope.id === entityId);

    if (!summary || !document) {
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
      relationships: document.envelope.relationships,
      backlinks: index.listBacklinks(entityId),
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
  saveRequest: WorldBrowserEntitySaveRequest,
): Promise<WorldBrowserEntityDetail> {
  const store = new FileSystemWorldDocumentStore(worldRoot);
  const documents = await store.loadEntityDocuments();
  const existing = saveRequest.id ? documents.find((item) => item.envelope.id === saveRequest.id) : undefined;
  const targetPath = existing?.path ?? store.buildEntityPath(saveRequest.entityType, saveRequest.name);
  const nextDocument = createDocumentFromSaveRequest(existing, saveRequest, targetPath);

  await store.writeEntityDocument(nextDocument);

  return (await loadWorldEntityDetail(worldRoot, nextDocument.envelope.id))!;
}
