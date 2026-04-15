import { DatabaseSync } from "node:sqlite";

import type {
  EntityBacklinkRecord,
  EntityDocument,
  EntityIndexRecord,
  EntityReferenceRecord,
  UnresolvedEntityReference,
} from "../contracts/index.js";
import { extractWikilinks, firstNonEmptyLine, makeExcerpt, normalizeText, uniqueStrings } from "../retrieval/text.js";
import type { WorldIndexStore } from "./types.js";

type EntityLookupRecord = {
  id: string;
  name: string;
  aliases: string[];
};

function createLookup(documents: EntityDocument[]): Map<string, EntityLookupRecord> {
  const lookup = new Map<string, EntityLookupRecord>();

  for (const document of documents) {
    const record: EntityLookupRecord = {
      id: document.envelope.id,
      name: document.envelope.name,
      aliases: document.envelope.aliases,
    };

    lookup.set(normalizeText(document.envelope.id), record);
    lookup.set(normalizeText(document.envelope.name), record);

    for (const alias of document.envelope.aliases) {
      lookup.set(normalizeText(alias), record);
    }
  }

  return lookup;
}

function buildSearchMaterial(document: EntityDocument): string {
  const relationshipTargets = document.envelope.relationships.flatMap((relationship) => [
    relationship.type,
    relationship.target,
    relationship.summary ?? "",
  ]);

  return normalizeText(
    [
      document.envelope.name,
      ...document.envelope.aliases,
      ...document.envelope.tags,
      ...relationshipTargets,
      JSON.stringify(document.fields),
      document.body,
    ].join(" "),
  );
}

function bodyExcerpt(body: string): string {
  return makeExcerpt(firstNonEmptyLine(body) || body);
}

export class SqliteWorldIndex implements WorldIndexStore {
  private readonly database: DatabaseSync;

  constructor(databasePath = ":memory:") {
    this.database = new DatabaseSync(databasePath);
    this.initialize();
  }

  private initialize(): void {
    this.database.exec(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS entities (
        id TEXT PRIMARY KEY,
        path TEXT NOT NULL UNIQUE,
        entity_type TEXT NOT NULL,
        name TEXT NOT NULL,
        visibility TEXT NOT NULL,
        aliases_json TEXT NOT NULL,
        tags_json TEXT NOT NULL,
        excerpt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS entity_references (
        source_entity_id TEXT NOT NULL,
        source_path TEXT NOT NULL,
        target_text TEXT NOT NULL,
        target_entity_id TEXT,
        reference_kind TEXT NOT NULL,
        FOREIGN KEY (source_entity_id) REFERENCES entities(id)
      );

      CREATE TABLE IF NOT EXISTS entity_search (
        entity_id TEXT PRIMARY KEY,
        haystack TEXT NOT NULL,
        FOREIGN KEY (entity_id) REFERENCES entities(id)
      );
    `);
  }

  rebuild(documents: EntityDocument[]): void {
    const lookup = createLookup(documents);

    this.database.exec(`
      DELETE FROM entity_references;
      DELETE FROM entity_search;
      DELETE FROM entities;
    `);

    const insertEntity = this.database.prepare(`
      INSERT INTO entities (id, path, entity_type, name, visibility, aliases_json, tags_json, excerpt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertSearch = this.database.prepare(`
      INSERT INTO entity_search (entity_id, haystack)
      VALUES (?, ?)
    `);

    const insertReference = this.database.prepare(`
      INSERT INTO entity_references (source_entity_id, source_path, target_text, target_entity_id, reference_kind)
      VALUES (?, ?, ?, ?, ?)
    `);

    try {
      this.database.exec("BEGIN");
      for (const document of documents) {
        insertEntity.run(
          document.envelope.id,
          document.path,
          document.envelope.entityType,
          document.envelope.name,
          document.envelope.visibility,
          JSON.stringify(document.envelope.aliases),
          JSON.stringify(document.envelope.tags),
          bodyExcerpt(document.body),
        );

        insertSearch.run(document.envelope.id, buildSearchMaterial(document));

        const wikilinks = extractWikilinks(document.body);
        for (const targetText of wikilinks) {
          const resolved = lookup.get(normalizeText(targetText));
          insertReference.run(
            document.envelope.id,
            document.path,
            targetText,
            resolved?.id ?? null,
            "wikilink",
          );
        }

        for (const relationship of document.envelope.relationships) {
          const resolved = lookup.get(normalizeText(relationship.target));
          insertReference.run(
            document.envelope.id,
            document.path,
            relationship.target,
            resolved?.id ?? null,
            "relationship",
          );
        }
      }
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  listEntities(): EntityIndexRecord[] {
    const statement = this.database.prepare(`
      SELECT id, path, entity_type, name, visibility, aliases_json, tags_json, excerpt
      FROM entities
      ORDER BY name COLLATE NOCASE ASC
    `);

    return statement.all().map((row) => ({
      id: String(row.id),
      path: String(row.path),
      entityType: String(row.entity_type) as EntityIndexRecord["entityType"],
      name: String(row.name),
      aliases: JSON.parse(String(row.aliases_json)) as string[],
      tags: JSON.parse(String(row.tags_json)) as string[],
      visibility: String(row.visibility) as EntityIndexRecord["visibility"],
      excerpt: String(row.excerpt),
    }));
  }

  searchEntities(query: string): EntityIndexRecord[] {
    const normalizedQuery = `%${normalizeText(query)}%`;
    const statement = this.database.prepare(`
      SELECT e.id, e.path, e.entity_type, e.name, e.visibility, e.aliases_json, e.tags_json, e.excerpt
      FROM entities e
      JOIN entity_search s ON s.entity_id = e.id
      WHERE s.haystack LIKE ?
      ORDER BY e.name COLLATE NOCASE ASC
    `);

    return statement.all(normalizedQuery).map((row) => ({
      id: String(row.id),
      path: String(row.path),
      entityType: String(row.entity_type) as EntityIndexRecord["entityType"],
      name: String(row.name),
      aliases: JSON.parse(String(row.aliases_json)) as string[],
      tags: JSON.parse(String(row.tags_json)) as string[],
      visibility: String(row.visibility) as EntityIndexRecord["visibility"],
      excerpt: String(row.excerpt),
    }));
  }

  listBacklinks(targetEntityId: string): EntityBacklinkRecord[] {
    const statement = this.database.prepare(`
      SELECT
        r.source_entity_id,
        e.name AS source_name,
        r.source_path,
        r.reference_kind,
        r.target_text
      FROM entity_references r
      JOIN entities e ON e.id = r.source_entity_id
      WHERE r.target_entity_id = ?
      ORDER BY e.name COLLATE NOCASE ASC, r.reference_kind ASC
    `);

    return statement.all(targetEntityId).map((row) => ({
      sourceEntityId: String(row.source_entity_id),
      sourceName: String(row.source_name),
      sourcePath: String(row.source_path),
      referenceKind: String(row.reference_kind) as EntityBacklinkRecord["referenceKind"],
      targetText: String(row.target_text),
    }));
  }

  listUnresolvedReferences(): UnresolvedEntityReference[] {
    const statement = this.database.prepare(`
      SELECT
        r.source_entity_id,
        e.name AS source_name,
        r.source_path,
        r.target_text,
        r.reference_kind
      FROM entity_references r
      JOIN entities e ON e.id = r.source_entity_id
      WHERE r.target_entity_id IS NULL
      ORDER BY e.name COLLATE NOCASE ASC, r.target_text COLLATE NOCASE ASC
    `);

    return statement.all().map((row) => ({
      sourceEntityId: String(row.source_entity_id),
      sourceName: String(row.source_name),
      sourcePath: String(row.source_path),
      targetText: String(row.target_text),
      referenceKind: String(row.reference_kind) as UnresolvedEntityReference["referenceKind"],
    }));
  }

  listReferences(): EntityReferenceRecord[] {
    const statement = this.database.prepare(`
      SELECT source_entity_id, source_path, target_text, target_entity_id, reference_kind
      FROM entity_references
      ORDER BY source_entity_id ASC, target_text COLLATE NOCASE ASC
    `);

    return statement.all().map((row) => ({
      sourceEntityId: String(row.source_entity_id),
      sourcePath: String(row.source_path),
      targetText: String(row.target_text),
      targetEntityId: row.target_entity_id ? String(row.target_entity_id) : null,
      referenceKind: String(row.reference_kind) as EntityReferenceRecord["referenceKind"],
    }));
  }

  close(): void {
    this.database.close();
  }
}

export function collectIndexedTags(documents: EntityDocument[]): string[] {
  return uniqueStrings(documents.flatMap((document) => document.envelope.tags)).sort((left, right) =>
    left.localeCompare(right),
  );
}
