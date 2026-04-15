import type {
  UnresolvedEntityReference,
  EntityBacklinkRecord,
  EntityMediaAsset,
  EntityRelationshipReference,
  EntityVisibility,
  WorldEntityType,
} from "./world.js";
import type { AuthSessionPayload } from "./auth.js";

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
  media: Array<EntityMediaAsset & { url: string }>;
  relationships: EntityRelationshipReference[];
  backlinks: EntityBacklinkRecord[];
};

export type WorldBrowserPayload = {
  session: AuthSessionPayload;
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
  media: EntityMediaAsset[];
  relationships: EntityRelationshipReference[];
};

export type WorldBrowserMediaUploadRequest = {
  fileName: string;
  contentType: string;
  base64Data: string;
  alt?: string;
  caption?: string;
};
