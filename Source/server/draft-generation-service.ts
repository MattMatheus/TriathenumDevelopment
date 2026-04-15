import type {
  UnresolvedEntityReference,
  WorldBrowserEntitySaveRequest,
  WorldEntityDraftPayload,
  WorldEntityDraftRequest,
  WorldEntityType,
} from "../contracts/index.js";
import { FileSystemWorldDocumentStore } from "../world/index.js";
import { canViewEntity, type AuthenticatedViewer } from "./auth-service.js";
import { FileSystemAISettingsStore, loadAIWorldContext } from "./ai-service.js";

function slugWords(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function inferEntityTypeFromText(input: string): WorldEntityType {
  const words = slugWords(input);
  if (words.some((word) => ["city", "harbor", "river", "archive", "keep"].includes(word))) {
    return "location";
  }
  if (words.some((word) => ["council", "order", "guild", "faction"].includes(word))) {
    return "faction";
  }
  if (words.some((word) => ["crisis", "history", "chronicle", "tale"].includes(word))) {
    return "lore_article";
  }
  if (words.some((word) => ["blade", "artifact", "relic"].includes(word))) {
    return "artifact";
  }
  if (words.some((word) => ["engine", "ritual", "network", "system"].includes(word))) {
    return "magic_system_or_technology";
  }
  return "lore_article";
}

function defaultFieldsForType(entityType: WorldEntityType, focus?: string): Record<string, string> {
  switch (entityType) {
    case "character":
      return {
        status: "unknown",
        motivation: focus ?? "Define the character's driving goal.",
      };
    case "location":
      return {
        location_type: "site",
        parent_location: focus ?? "Place this location inside the larger region.",
      };
    case "faction":
      return {
        faction_type: "organization",
        goals: focus ?? "List the faction's immediate priorities.",
      };
    case "artifact":
      return {
        artifact_type: "relic",
        significance: focus ?? "Explain why this artifact matters in canon.",
      };
    case "magic_system_or_technology":
      return {
        system_type: "discipline",
        principle: focus ?? "Summarize the central operating principle.",
      };
    case "lore_article":
    default:
      return {
        era: focus ?? "unknown",
      };
  }
}

function summarizeBody(
  name: string,
  entityType: WorldEntityType,
  sourceEntityName?: string,
  unresolvedTargetText?: string,
): string {
  const introByType: Record<WorldEntityType, string> = {
    character: `${name} is a draft character entry that needs confirmed relationships, motivations, and point-of-view details.`,
    location: `${name} is a draft location entry that needs confirmed regional placement, purpose, and notable features.`,
    faction: `${name} is a draft faction entry that needs confirmed membership, goals, and authority boundaries.`,
    artifact: `${name} is a draft artifact entry that needs confirmed origin, capabilities, and present ownership.`,
    magic_system_or_technology: `${name} is a draft system entry that needs confirmed principles, limitations, and cultural role.`,
    lore_article: `${name} is a draft lore entry that needs confirmed chronology, participants, and consequences.`,
  };

  const contextLine =
    sourceEntityName && unresolvedTargetText
      ? `This draft was generated from the unresolved reference "${unresolvedTargetText}" mentioned by ${sourceEntityName}.`
      : sourceEntityName
        ? `This draft was generated with nearby canon context from ${sourceEntityName}.`
        : `This draft was generated as a reviewable starting point for a new ${entityType.replace(/_/g, " ")} entry.`;

  return `${introByType[entityType]}\n\n${contextLine}\n\nReview this draft carefully before saving it into canon.`;
}

function buildRelationships(sourceEntityName?: string, unresolvedTargetText?: string): Array<{ type: string; target: string }> {
  if (!sourceEntityName) {
    return [];
  }

  return [
    {
      type: unresolvedTargetText ? "referenced_by" : "connected_to",
      target: sourceEntityName,
    },
  ];
}

function findVisibleSourceDocument(
  documents: Awaited<ReturnType<FileSystemWorldDocumentStore["loadEntityDocuments"]>>,
  viewer: AuthenticatedViewer,
  sourceEntityId?: string,
) {
  if (!sourceEntityId) {
    return undefined;
  }

  return documents.find((document) => document.envelope.id === sourceEntityId && canViewEntity(viewer, document.envelope.visibility));
}

function findUnresolvedReference(
  documents: Awaited<ReturnType<FileSystemWorldDocumentStore["loadEntityDocuments"]>>,
  viewer: AuthenticatedViewer,
  request: WorldEntityDraftRequest,
): UnresolvedEntityReference | undefined {
  if (!request.unresolvedTargetText) {
    return undefined;
  }

  const normalizedTarget = request.unresolvedTargetText.trim().toLowerCase();

  for (const document of documents) {
    if (!canViewEntity(viewer, document.envelope.visibility)) {
      continue;
    }

    const wikilinkMatch = document.body.matchAll(/\[\[([^\]]+)\]\]/g);
    for (const match of wikilinkMatch) {
      const raw = (match[1] ?? "").split("|", 1)[0]?.trim();
      if (raw?.toLowerCase() === normalizedTarget) {
        return {
          sourceEntityId: document.envelope.id,
          sourceName: document.envelope.name,
          sourcePath: document.path,
          targetText: raw,
          referenceKind: "wikilink",
        };
      }
    }
  }

  return undefined;
}

export async function generateWorldEntityDraft(
  worldRoot: string,
  viewer: AuthenticatedViewer,
  request: WorldEntityDraftRequest,
): Promise<WorldEntityDraftPayload> {
  const settingsStore = new FileSystemAISettingsStore(worldRoot);
  const settings = await settingsStore.load();

  if (!settings.provider.status.configured) {
    return {
      status: "unavailable",
      unavailableReason: "Draft generation stays unavailable until an AI provider baseline is configured.",
    };
  }

  const store = new FileSystemWorldDocumentStore(worldRoot);
  const documents = await store.loadEntityDocuments();
  const unresolvedReference = findUnresolvedReference(documents, viewer, request);
  const sourceDocument =
    findVisibleSourceDocument(documents, viewer, request.sourceEntityId) ??
    (unresolvedReference
      ? documents.find((document) => document.envelope.id === unresolvedReference.sourceEntityId)
      : undefined);

  const proposedName = request.proposedName?.trim() || unresolvedReference?.targetText || request.unresolvedTargetText?.trim();
  if (!proposedName) {
    return {
      status: "unavailable",
      unavailableReason: "A proposed entity name or unresolved stub target is required before generating a draft.",
    };
  }

  const entityType =
    request.entityType ||
    inferEntityTypeFromText(unresolvedReference?.targetText ?? proposedName);

  const context = await loadAIWorldContext(worldRoot, viewer, sourceDocument?.envelope.id);
  const draft: WorldBrowserEntitySaveRequest = {
    name: proposedName,
    entityType,
    visibility: viewer.role === "owner" ? "all_users" : "all_users",
    aliases: [],
    tags: sourceDocument ? sourceDocument.envelope.tags.slice(0, 2) : [],
    body: summarizeBody(proposedName, entityType, sourceDocument?.envelope.name, unresolvedReference?.targetText),
    fields: defaultFieldsForType(entityType, context.subject?.name),
    media: [],
    relationships: buildRelationships(sourceDocument?.envelope.name, unresolvedReference?.targetText),
  };

  return {
    status: "ready",
    draft,
    provenance: {
      mode: unresolvedReference ? "stub_fill" : "new_entity",
      sourceEntityId: sourceDocument?.envelope.id,
      sourceEntityName: sourceDocument?.envelope.name,
      unresolvedTargetText: unresolvedReference?.targetText,
      providerLabel: settings.provider.label,
      approvalRequired: context.guardrails.approvalBoundary.length > 0,
      summary: unresolvedReference
        ? `Draft generated for unresolved stub "${unresolvedReference.targetText}" using nearby canon from ${sourceDocument?.envelope.name ?? "the visible world"}.`
        : `Draft generated for ${proposedName} as a reviewable ${entityType.replace(/_/g, " ")} entry.`,
    },
  };
}
