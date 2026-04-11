import type { EntityRef, GroundingBundle, NoteRef } from "../contracts/index.js";

export type NoteDocument = {
  path: string;
  title: string;
  body: string;
  excerpt: string;
  wikilinks: string[];
};

export type ResolvedEntity =
  | {
      kind: "resolved";
      entity: EntityRef;
      note: NoteDocument;
      score: number;
      resolver: RetrievalAdapterName;
      scoreBreakdown?: RetrievalScoreBreakdown;
    }
  | {
      kind: "ambiguous";
      query: string;
      resolver: RetrievalAdapterName;
      matches: RankedEntityMatch[];
    }
  | {
      kind: "not_found";
      query: string;
    };

export type GroundingResult = {
  bundle: GroundingBundle;
  resolved: EntityRef;
  resolution: Extract<ResolvedEntity, { kind: "resolved" }>;
  sources: NoteRef[];
};

export type RetrievalOptions = {
  maxLinkedNotes?: number;
  maxSearchNotes?: number;
};

export interface VaultReader {
  listMarkdownFiles(): Promise<string[]>;
  readNote(path: string): Promise<NoteDocument>;
}

export type RetrievalScoreBreakdown = {
  identity: number;
  link: number;
  query: number;
  domain: number;
  operational: number;
  total: number;
};

export type RankedEntityMatch = {
  entity: EntityRef;
  notePath: string;
  resolver: RetrievalAdapterName;
  score: RetrievalScoreBreakdown;
  reasons: string[];
};

export type StructuralRetrievalContext = {
  query: string;
};

export type IndexedSearchContext = {
  subject: EntityRef;
  decisionPrompt: string;
  excludePaths: Set<string>;
  limit: number;
};

export type RetrievalAdapterName = "structural" | "indexed" | "filesystem";

export interface StructuralRetrievalAdapter {
  kind: "structural";
  name: RetrievalAdapterName;
  resolveEntity(context: StructuralRetrievalContext): Promise<ResolvedEntity>;
  loadLinkedNotes(note: NoteDocument, limit: number): Promise<NoteDocument[]>;
}

export interface IndexedRetrievalAdapter {
  kind: "indexed";
  name: RetrievalAdapterName;
  searchContext(context: IndexedSearchContext): Promise<NoteDocument[]>;
}

export interface FallbackRetrievalAdapter {
  kind: "fallback";
  name: RetrievalAdapterName;
  resolveEntity(context: StructuralRetrievalContext): Promise<ResolvedEntity>;
  searchContext(context: IndexedSearchContext): Promise<NoteDocument[]>;
}

export type RetrievalAdapterSet = {
  structural?: StructuralRetrievalAdapter;
  indexed?: IndexedRetrievalAdapter;
  fallback: FallbackRetrievalAdapter;
};
