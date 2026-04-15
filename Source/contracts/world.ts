export type WorldEntityType =
  | "character"
  | "location"
  | "faction"
  | "magic_system_or_technology"
  | "artifact"
  | "lore_article";

export type EntityVisibility = "all_users" | "owner_only" | "hidden";

export type EntityRelationshipReference = {
  type: string;
  target: string;
  summary?: string;
};

export type EntityDocumentEnvelope = {
  id: string;
  entityType: WorldEntityType;
  name: string;
  aliases: string[];
  tags: string[];
  visibility: EntityVisibility;
  relationships: EntityRelationshipReference[];
  extensions: Record<string, unknown>;
};

export type EntityDocument = {
  path: string;
  envelope: EntityDocumentEnvelope;
  fields: Record<string, unknown>;
  body: string;
};

export type EntityIndexRecord = {
  id: string;
  path: string;
  entityType: WorldEntityType;
  name: string;
  aliases: string[];
  tags: string[];
  visibility: EntityVisibility;
  excerpt: string;
};

export type EntityReferenceRecord = {
  sourceEntityId: string;
  sourcePath: string;
  targetText: string;
  targetEntityId: string | null;
  referenceKind: "wikilink" | "relationship";
};

export type EntityBacklinkRecord = {
  sourceEntityId: string;
  sourceName: string;
  sourcePath: string;
  referenceKind: "wikilink" | "relationship";
  targetText: string;
};

export type UnresolvedEntityReference = {
  sourceEntityId: string;
  sourceName: string;
  sourcePath: string;
  targetText: string;
  referenceKind: "wikilink" | "relationship";
};
