import type {
  EntityDocument,
  EntityRelationshipReference,
  WorldEditorLinkSuggestion,
  WorldEditorRelationshipSuggestion,
  WorldEditorSuggestionPayload,
  WorldEditorSuggestionRequest,
  WorldEditorSummarySuggestion,
} from "../contracts/index.js";
import { extractWikilinks, firstNonEmptyLine, makeExcerpt, normalizeText } from "../retrieval/text.js";
import { FileSystemWorldDocumentStore } from "../world/index.js";
import { FileSystemAISettingsStore } from "./ai-service.js";
import { canViewEntity, type AuthenticatedViewer } from "./auth-service.js";

type MentionedEntity = {
  document: EntityDocument;
  matchedText: string;
};

function existingRelationshipTargets(relationships: EntityRelationshipReference[]): Set<string> {
  return new Set(relationships.map((relationship) => normalizeText(relationship.target)));
}

function existingFieldValue(request: WorldEditorSuggestionRequest, key: string): string {
  return request.fields[key]?.trim() ?? "";
}

function mentionCandidates(
  documents: EntityDocument[],
  viewer: AuthenticatedViewer,
  request: WorldEditorSuggestionRequest,
): MentionedEntity[] {
  const normalizedBody = normalizeText(request.body);
  const seen = new Set<string>();
  const matches: MentionedEntity[] = [];

  for (const document of documents) {
    if (!canViewEntity(viewer, document.envelope.visibility)) {
      continue;
    }

    if (document.envelope.id === request.entityId) {
      continue;
    }

    const names = [document.envelope.name, ...document.envelope.aliases].filter(Boolean);
    const matchedText = names.find((name) => normalizedBody.includes(normalizeText(name)));
    if (!matchedText) {
      continue;
    }

    if (seen.has(document.envelope.id)) {
      continue;
    }

    seen.add(document.envelope.id);
    matches.push({
      document,
      matchedText,
    });
  }

  return matches.sort((left, right) => left.document.envelope.name.localeCompare(right.document.envelope.name));
}

function inferRelationshipType(
  request: WorldEditorSuggestionRequest,
  target: EntityDocument,
): string {
  const body = normalizeText(request.body);
  const targetType = target.envelope.entityType;

  if (request.entityType === "character" && targetType === "faction" && /(serves on|member of|council)/.test(body)) {
    return "member_of";
  }

  if (request.entityType === "character" && targetType === "location" && /(lives in|resides in|from )/.test(body)) {
    return "resides_in";
  }

  if (request.entityType === "location" && targetType === "faction" && /(govern|council|authority)/.test(body)) {
    return "governed_by";
  }

  if (request.entityType === "faction" && targetType === "location" && /(govern|controls|oversees)/.test(body)) {
    return "governs";
  }

  if (request.entityType === "lore_article" && /(crisis|history|event|tested|reshaped)/.test(body)) {
    return "concerns";
  }

  return "connected_to";
}

function relationshipSummary(request: WorldEditorSuggestionRequest, target: EntityDocument): string {
  return `${request.name} mentions ${target.envelope.name} in the current draft, so a structured relationship may help the browser and backlink surfaces stay aligned.`;
}

function suggestLinks(
  request: WorldEditorSuggestionRequest,
  mentions: MentionedEntity[],
): WorldEditorLinkSuggestion[] {
  const linkedTargets = new Set(extractWikilinks(request.body).map((item) => normalizeText(item)));

  return mentions.flatMap((mention) => {
    const normalizedTarget = normalizeText(mention.document.envelope.name);
    if (linkedTargets.has(normalizedTarget)) {
      return [];
    }

    return [
      {
        id: `link-${mention.document.envelope.id}`,
        targetEntityId: mention.document.envelope.id,
        targetName: mention.document.envelope.name,
        matchedText: mention.matchedText,
        replacementText: `[[${mention.document.envelope.name}]]`,
        reason: `${mention.document.envelope.name} is mentioned in the body without a wikilink, so adding one will strengthen navigation and backlinks.`,
      },
    ];
  });
}

function suggestRelationships(
  request: WorldEditorSuggestionRequest,
  mentions: MentionedEntity[],
): WorldEditorRelationshipSuggestion[] {
  const existingTargets = existingRelationshipTargets(request.relationships);

  return mentions.flatMap((mention) => {
    const normalizedTarget = normalizeText(mention.document.envelope.name);
    if (existingTargets.has(normalizedTarget)) {
      return [];
    }

    return [
      {
        id: `relationship-${mention.document.envelope.id}`,
        relationship: {
          type: inferRelationshipType(request, mention.document),
          target: mention.document.envelope.name,
          summary: relationshipSummary(request, mention.document),
        },
        reason: `${mention.document.envelope.name} appears in the prose but is missing from structured relationships.`,
      },
    ];
  });
}

function suggestReferenceSummary(request: WorldEditorSuggestionRequest): WorldEditorSummarySuggestion | undefined {
  const existing = existingFieldValue(request, "reference_summary");
  const firstLine = firstNonEmptyLine(request.body);
  if (!firstLine) {
    return undefined;
  }

  const body = normalizeText(request.body);
  const sentence = makeExcerpt(firstLine, 160);
  const contextualLine =
    /(govern|member|resides|history|crisis|artifact|system)/.test(body)
      ? makeExcerpt(request.body.replace(/\s+/g, " "), 160)
      : sentence;

  if (existing && normalizeText(existing) === normalizeText(contextualLine)) {
    return undefined;
  }

  return {
    id: "summary-reference",
    fieldKey: "reference_summary",
    label: "Reference Summary",
    value: contextualLine,
    reason: existing
      ? "A refreshed quick-reference summary is available without touching the main body text."
      : "A concise quick-reference summary can help the browser and editor surfaces stay scannable.",
  };
}

export async function generateEditorSuggestions(
  worldRoot: string,
  viewer: AuthenticatedViewer,
  request: WorldEditorSuggestionRequest,
): Promise<WorldEditorSuggestionPayload> {
  const settingsStore = new FileSystemAISettingsStore(worldRoot);
  const settings = await settingsStore.load();

  if (!settings.provider.status.configured) {
    return {
      status: "unavailable",
      unavailableReason: "Suggestions stay unavailable until an AI provider baseline is configured.",
      summary: "No suggestions are available yet.",
      linkSuggestions: [],
      relationshipSuggestions: [],
    };
  }

  const trimmedBody = request.body.trim();
  if (!trimmedBody) {
    return {
      status: "unavailable",
      unavailableReason: "Add some body text before reviewing suggestions.",
      summary: "Suggestions need body text to review.",
      providerLabel: settings.provider.label,
      linkSuggestions: [],
      relationshipSuggestions: [],
    };
  }

  const store = new FileSystemWorldDocumentStore(worldRoot);
  const documents = await store.loadEntityDocuments();
  const mentions = mentionCandidates(documents, viewer, request);
  const linkSuggestions = suggestLinks(request, mentions);
  const relationshipSuggestions = suggestRelationships(request, mentions);
  const summarySuggestion = suggestReferenceSummary(request);

  return {
    status: "ready",
    providerLabel: settings.provider.label,
    summary:
      linkSuggestions.length || relationshipSuggestions.length || summarySuggestion
        ? "Review the suggestions you want to keep. Nothing changes until you accept an item."
        : "No calm suggestions surfaced for this draft right now.",
    linkSuggestions,
    relationshipSuggestions,
    ...(summarySuggestion ? { summarySuggestion } : {}),
  };
}
