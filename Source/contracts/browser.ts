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

export type WorldSearchMode = "keyword" | "semantic";

export type WorldSemanticCitation = {
  entityId: string;
  entityName: string;
  entityType: WorldEntityType;
  path: string;
  excerpt: string;
  matchedTerms: string[];
};

export type WorldSemanticSearchPayload = {
  mode: "semantic";
  query: string;
  status: "ready" | "unavailable";
  unavailableReason?: string;
  answer: string | null;
  uncertainty: "grounded" | "limited" | "insufficient";
  uncertaintyReason: string;
  citations: WorldSemanticCitation[];
  matches: WorldBrowserEntitySummary[];
};

export type WorldConsistencyReviewRequest = {
  entityId?: string;
};

export type WorldConsistencyReviewScope = {
  mode: "world" | "entity";
  entityId?: string;
  entityName?: string;
};

export type WorldConsistencyFinding = {
  id: string;
  findingType: "contradiction" | "missing_corroboration";
  title: string;
  summary: string;
  confidence: "high" | "medium";
  citations: WorldSemanticCitation[];
  relatedEntityIds: string[];
};

export type WorldConsistencyReviewPayload = {
  status: "ready" | "unavailable";
  unavailableReason?: string;
  providerLabel?: string;
  scope: WorldConsistencyReviewScope;
  summary: string;
  findings: WorldConsistencyFinding[];
};

export type WorldEntityDraftRequest = {
  entityType: WorldEntityType;
  proposedName?: string;
  unresolvedTargetText?: string;
  sourceEntityId?: string;
};

export type WorldEntityDraftProvenance = {
  mode: "new_entity" | "stub_fill";
  sourceEntityId?: string;
  sourceEntityName?: string;
  unresolvedTargetText?: string;
  providerLabel: string;
  approvalRequired: boolean;
  summary: string;
};

export type WorldEntityDraftPayload = {
  status: "ready" | "unavailable";
  unavailableReason?: string;
  draft?: WorldBrowserEntitySaveRequest;
  provenance?: WorldEntityDraftProvenance;
};

export type WorldEditorProseAction = "summarize" | "rephrase" | "continue";

export type WorldEditorProseAssistRequest = {
  action: WorldEditorProseAction;
  entityId?: string;
  name: string;
  entityType: WorldEntityType;
  body: string;
};

export type WorldEditorProseContextNote = {
  label: string;
  value: string;
};

export type WorldEditorProseAssistPayload = {
  status: "ready" | "unavailable";
  unavailableReason?: string;
  action: WorldEditorProseAction;
  applyMode: "replace" | "append";
  summary: string;
  providerLabel?: string;
  sourceText: string;
  suggestedText?: string;
  contextNotes: WorldEditorProseContextNote[];
};

export type WorldEditorSuggestionRequest = {
  entityId?: string;
  name: string;
  entityType: WorldEntityType;
  body: string;
  relationships: EntityRelationshipReference[];
  fields: Record<string, string>;
};

export type WorldEditorLinkSuggestion = {
  id: string;
  targetEntityId: string;
  targetName: string;
  matchedText: string;
  replacementText: string;
  reason: string;
};

export type WorldEditorRelationshipSuggestion = {
  id: string;
  relationship: EntityRelationshipReference;
  reason: string;
};

export type WorldEditorSummarySuggestion = {
  id: string;
  fieldKey: string;
  label: string;
  value: string;
  reason: string;
};

export type WorldEditorSuggestionPayload = {
  status: "ready" | "unavailable";
  unavailableReason?: string;
  providerLabel?: string;
  summary: string;
  linkSuggestions: WorldEditorLinkSuggestion[];
  relationshipSuggestions: WorldEditorRelationshipSuggestion[];
  summarySuggestion?: WorldEditorSummarySuggestion;
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
