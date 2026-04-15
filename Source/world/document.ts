import path from "node:path";

import type {
  EntityDocument,
  EntityDocumentEnvelope,
  EntityRelationshipReference,
  EntityVisibility,
  WorldEntityType,
} from "../contracts/index.js";
import { parseFrontmatterDocument, serializeFrontmatterDocument } from "./frontmatter.js";
import type { FrontmatterObject, FrontmatterValue } from "./types.js";

const ENTITY_TYPES = new Set<WorldEntityType>([
  "character",
  "location",
  "faction",
  "magic_system_or_technology",
  "artifact",
  "lore_article",
]);

const VISIBILITY_VALUES = new Set<EntityVisibility>(["all_users", "owner_only", "hidden"]);

function asRecord(value: FrontmatterValue | undefined): FrontmatterObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asStringArray(value: FrontmatterValue | undefined): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function asRelationshipArray(value: FrontmatterValue | undefined): EntityRelationshipReference[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return [];
    }

    const target = typeof item.target === "string" ? item.target : "";
    const type = typeof item.type === "string" ? item.type : "";
    if (!target || !type) {
      return [];
    }

    return [
      {
        type,
        target,
        summary: typeof item.summary === "string" ? item.summary : undefined,
      },
    ];
  });
}

function deriveEntityType(value: FrontmatterValue | undefined): WorldEntityType {
  if (typeof value === "string" && ENTITY_TYPES.has(value as WorldEntityType)) {
    return value as WorldEntityType;
  }

  return "lore_article";
}

function deriveVisibility(value: FrontmatterValue | undefined): EntityVisibility {
  if (typeof value === "string" && VISIBILITY_VALUES.has(value as EntityVisibility)) {
    return value as EntityVisibility;
  }

  return "all_users";
}

function deriveString(value: FrontmatterValue | undefined, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function deriveId(frontmatter: FrontmatterObject, filePath: string): string {
  if (typeof frontmatter.id === "string" && frontmatter.id.trim()) {
    return frontmatter.id;
  }

  return path.basename(filePath, ".md");
}

function deriveName(frontmatter: FrontmatterObject, filePath: string): string {
  if (typeof frontmatter.name === "string" && frontmatter.name.trim()) {
    return frontmatter.name;
  }

  if (typeof frontmatter.title === "string" && frontmatter.title.trim()) {
    return frontmatter.title;
  }

  return path.basename(filePath, ".md");
}

function buildEnvelope(frontmatter: FrontmatterObject, filePath: string): EntityDocumentEnvelope {
  return {
    id: deriveId(frontmatter, filePath),
    entityType: deriveEntityType(frontmatter.entity_type),
    name: deriveName(frontmatter, filePath),
    aliases: asStringArray(frontmatter.aliases),
    tags: asStringArray(frontmatter.tags),
    visibility: deriveVisibility(frontmatter.visibility),
    relationships: asRelationshipArray(frontmatter.relationships),
    extensions: asRecord(frontmatter.extensions),
  };
}

function extractFields(frontmatter: FrontmatterObject): Record<string, unknown> {
  const fields: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(frontmatter)) {
    if (
      key === "id" ||
      key === "entity_type" ||
      key === "name" ||
      key === "aliases" ||
      key === "tags" ||
      key === "visibility" ||
      key === "relationships" ||
      key === "extensions"
    ) {
      continue;
    }

    fields[key] = value;
  }

  return fields;
}

function orderedFrontmatter(document: EntityDocument): FrontmatterObject {
  return {
    id: document.envelope.id,
    entity_type: document.envelope.entityType,
    name: document.envelope.name,
    aliases: document.envelope.aliases,
    tags: document.envelope.tags,
    visibility: document.envelope.visibility,
    relationships: document.envelope.relationships.map((relationship) => ({
      type: relationship.type,
      target: relationship.target,
      ...(relationship.summary ? { summary: relationship.summary } : {}),
    })),
    extensions: document.envelope.extensions as FrontmatterObject,
    ...(document.fields as FrontmatterObject),
  };
}

export function parseEntityDocument(filePath: string, input: string): EntityDocument {
  const { frontmatter, body } = parseFrontmatterDocument(input);
  const envelope = buildEnvelope(frontmatter, filePath);

  return {
    path: filePath,
    envelope,
    fields: extractFields(frontmatter),
    body,
  };
}

export function serializeEntityDocument(document: EntityDocument): string {
  const frontmatter = orderedFrontmatter(document);

  return serializeFrontmatterDocument(frontmatter, document.body);
}

export function updateEntityDocumentPath(document: EntityDocument, nextPath: string): EntityDocument {
  return {
    ...document,
    path: nextPath,
  };
}

export function getEntityDocumentTitle(document: EntityDocument): string {
  return deriveString(document.fields.title as FrontmatterValue | undefined, document.envelope.name);
}
