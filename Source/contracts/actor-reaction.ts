export type EntityType =
  | "character"
  | "faction"
  | "institution"
  | "location"
  | "system"
  | "unknown";

export type EntityRef = {
  id: string;
  name: string;
  entityType: EntityType;
  primaryNotePath?: string;
  aliases?: string[];
};

export type NoteRef = {
  path: string;
  title: string;
  noteType?: string;
  excerpt?: string;
  score?: number;
  sourceRole?: GroundingSourceRole;
  retrievalAdapter?: GroundingRetrievalAdapter;
  inclusionReasons?: string[];
};

export type GroundingSourceRole =
  | "subject_note"
  | "linked_canon"
  | "search_hit"
  | "operational_context";

export type GroundingRetrievalAdapter = "structural" | "indexed" | "filesystem";

export type GroundingSourceGroups = {
  subjectNote: NoteRef[];
  linkedCanon: NoteRef[];
  searchHits: NoteRef[];
  operationalContext: NoteRef[];
};

export type ActorReactionRequestOptions = {
  includeAlternatives?: boolean;
  maxSources?: number;
};

export type ActorReactionRequest = {
  actor: EntityRef;
  decisionPrompt: string;
  options?: ActorReactionRequestOptions;
};

export type GroundingFact = {
  statement: string;
  sourceNotePath: string;
};

export type GroundingTension = {
  statement: string;
  sourceNotePath?: string;
};

export type GroundingRelationship = {
  targetName: string;
  relationshipType?: string;
  summary: string;
  sourceNotePath?: string;
};

export type GroundingBundle = {
  subject: EntityRef;
  decisionPrompt: string;
  facts: GroundingFact[];
  tensions: GroundingTension[];
  relationships: GroundingRelationship[];
  unresolvedQuestions: string[];
  sources: NoteRef[];
  sourceGroups: GroundingSourceGroups;
};

export type ReactionOption = {
  summary: string;
  rationale: string[];
};

export type ReactionResponse = {
  summary: string;
  likelyReaction: ReactionOption;
  alternatives: ReactionOption[];
  canonBasis: string[];
  inferredElements: string[];
  uncertainties: string[];
  sources: NoteRef[];
};
