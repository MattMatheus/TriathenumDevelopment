import type {
  EntityBacklinkRecord,
  EntityDocument,
  EntityDocumentEnvelope,
  EntityIndexRecord,
  EntityReferenceRecord,
  UnresolvedEntityReference,
} from "../contracts/index.js";

export type FrontmatterValue =
  | string
  | number
  | boolean
  | null
  | FrontmatterObject
  | FrontmatterValue[];

export interface FrontmatterObject {
  [key: string]: FrontmatterValue;
}

export type ParsedFrontmatterDocument = {
  frontmatter: FrontmatterObject;
  body: string;
};

export type ParsedEntityDocument = EntityDocument;

export interface WorldIndexStore {
  rebuild(documents: EntityDocument[]): void;
  listEntities(): EntityIndexRecord[];
  searchEntities(query: string): EntityIndexRecord[];
  listBacklinks(targetEntityId: string): EntityBacklinkRecord[];
  listUnresolvedReferences(): UnresolvedEntityReference[];
  listReferences(): EntityReferenceRecord[];
  close(): void;
}

export interface WorldDocumentStore {
  listEntityPaths(): Promise<string[]>;
  readEntityDocument(path: string): Promise<EntityDocument>;
  writeEntityDocument(document: EntityDocument): Promise<void>;
  loadEntityDocuments(): Promise<EntityDocument[]>;
}
