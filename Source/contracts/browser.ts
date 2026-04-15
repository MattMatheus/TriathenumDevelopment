import type {
  UnresolvedEntityReference,
  EntityBacklinkRecord,
  EntityRelationshipReference,
  EntityVisibility,
  WorldEntityType,
} from "./world.js";

export type WorldBrowserEntitySummary = {
  id: string;
  name: string;
  entityType: WorldEntityType;
  visibility: EntityVisibility;
  tags: string[];
  aliases: string[];
  excerpt: string;
};

export type WorldBrowserEntityDetail = {
  id: string;
  name: string;
  entityType: WorldEntityType;
  visibility: EntityVisibility;
  aliases: string[];
  tags: string[];
  excerpt: string;
  body: string;
  path: string;
  fields: Record<string, unknown>;
  relationships: EntityRelationshipReference[];
  backlinks: EntityBacklinkRecord[];
};

export type WorldBrowserPayload = {
  entities: WorldBrowserEntitySummary[];
  availableTypes: WorldEntityType[];
  availableTags: string[];
  unresolvedReferences: UnresolvedEntityReference[];
};

export type WorldBrowserEntitySaveRequest = {
  id?: string;
  name: string;
  entityType: WorldEntityType;
  visibility: EntityVisibility;
  aliases: string[];
  tags: string[];
  body: string;
  fields: Record<string, string>;
  relationships: EntityRelationshipReference[];
};
