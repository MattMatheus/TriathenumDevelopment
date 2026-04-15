import type {
  EntityDocument,
  EntityRelationshipReference,
  WorldBrowserEntitySummary,
  WorldConsistencyFinding,
  WorldConsistencyReviewPayload,
  WorldSemanticCitation,
} from "../contracts/index.js";
import { normalizeText } from "../retrieval/text.js";
import { FileSystemWorldDocumentStore } from "../world/index.js";
import { canViewEntity, type AuthenticatedViewer } from "./auth-service.js";
import { FileSystemAISettingsStore } from "./ai-service.js";

const INVERSE_RELATIONSHIPS: Record<string, string> = {
  governed_by: "governs",
  governs: "governed_by",
};

type ReviewScope = {
  entityId?: string;
};

type ReviewCandidate = {
  source: EntityDocument;
  targetName: string;
  relationship: EntityRelationshipReference;
  familyKey: string;
};

function buildEntitySummary(document: EntityDocument): WorldBrowserEntitySummary {
  return {
    id: document.envelope.id,
    name: document.envelope.name,
    entityType: document.envelope.entityType,
    visibility: document.envelope.visibility,
    tags: document.envelope.tags,
    aliases: document.envelope.aliases,
    excerpt: document.body.trim().split("\n").find(Boolean)?.trim() ?? "",
  };
}

function buildCitation(document: EntityDocument, matchedTerms: string[]): WorldSemanticCitation {
  const summary = buildEntitySummary(document);
  return {
    entityId: summary.id,
    entityName: summary.name,
    entityType: summary.entityType,
    path: document.path,
    excerpt: summary.excerpt,
    matchedTerms,
  };
}

function relationshipFamilyKey(relationship: EntityRelationshipReference): string | null {
  const inverse = INVERSE_RELATIONSHIPS[relationship.type];
  if (!inverse) {
    return null;
  }

  return [relationship.type, inverse].sort().join(":");
}

function scopeDocuments(documents: EntityDocument[], entityId: string | undefined): EntityDocument[] {
  if (!entityId) {
    return documents;
  }

  return documents.filter((document) => document.envelope.id === entityId);
}

function findVisibleTarget(
  documents: EntityDocument[],
  targetName: string,
): EntityDocument | undefined {
  const normalizedTarget = normalizeText(targetName);

  return documents.find((document) =>
    [document.envelope.name, ...document.envelope.aliases].some((name) => normalizeText(name) === normalizedTarget),
  );
}

function findAnyTarget(
  documents: EntityDocument[],
  targetName: string,
): EntityDocument | undefined {
  const normalizedTarget = normalizeText(targetName);

  return documents.find((document) =>
    [document.envelope.name, ...document.envelope.aliases].some((name) => normalizeText(name) === normalizedTarget),
  );
}

function buildMissingCorroborationFinding(candidate: ReviewCandidate): WorldConsistencyFinding {
  return {
    id: `missing:${candidate.source.envelope.id}:${candidate.relationship.type}:${normalizeText(candidate.targetName)}`,
    findingType: "missing_corroboration",
    title: `${candidate.source.envelope.name} needs corroboration for ${candidate.relationship.target}`,
    summary: `${candidate.source.envelope.name} records ${candidate.relationship.type.replace(/_/g, " ")} -> ${candidate.relationship.target}, but no visible corroborating relationship surfaced yet.`,
    confidence: "medium",
    citations: [buildCitation(candidate.source, [candidate.relationship.type, candidate.relationship.target])],
    relatedEntityIds: [candidate.source.envelope.id],
  };
}

function buildContradictionFinding(
  candidate: ReviewCandidate,
  target: EntityDocument,
  conflictingTargets: string[],
): WorldConsistencyFinding {
  return {
    id: `contradiction:${[candidate.source.envelope.id, target.envelope.id, candidate.familyKey].join(":")}`,
    findingType: "contradiction",
    title: `${candidate.source.envelope.name} and ${target.envelope.name} disagree`,
    summary: `${candidate.source.envelope.name} records ${candidate.relationship.type.replace(/_/g, " ")} -> ${candidate.relationship.target}, but ${target.envelope.name} points its reciprocal relationship toward ${conflictingTargets.join(", ")} instead.`,
    confidence: "high",
    citations: [
      buildCitation(candidate.source, [candidate.relationship.type, candidate.relationship.target]),
      buildCitation(target, conflictingTargets),
    ],
    relatedEntityIds: [candidate.source.envelope.id, target.envelope.id],
  };
}

function summarizeFindings(scopeMode: "world" | "entity", findings: WorldConsistencyFinding[]): string {
  if (!findings.length) {
    return scopeMode === "entity"
      ? "No consistency concerns surfaced for the current visible entity scope."
      : "No consistency concerns surfaced across the current visible world.";
  }

  const contradictions = findings.filter((finding) => finding.findingType === "contradiction").length;
  const corroboration = findings.length - contradictions;
  return `Review ${findings.length} finding${findings.length === 1 ? "" : "s"}: ${contradictions} contradiction${contradictions === 1 ? "" : "s"} and ${corroboration} missing-corroboration item${corroboration === 1 ? "" : "s"}.`;
}

export async function reviewWorldConsistency(
  worldRoot: string,
  viewer: AuthenticatedViewer,
  request: ReviewScope,
): Promise<WorldConsistencyReviewPayload> {
  const settingsStore = new FileSystemAISettingsStore(worldRoot);
  const settings = await settingsStore.load();
  const scopeMode = request.entityId ? "entity" : "world";

  if (!settings.provider.status.configured) {
    return {
      status: "unavailable",
      unavailableReason: "Consistency review stays unavailable until an AI provider baseline is configured.",
      scope: {
        mode: scopeMode,
        ...(request.entityId ? { entityId: request.entityId } : {}),
      },
      summary: "No review findings are available yet.",
      findings: [],
    };
  }

  const store = new FileSystemWorldDocumentStore(worldRoot);
  const allDocuments = await store.loadEntityDocuments();
  const visibleDocuments = allDocuments.filter((document) => canViewEntity(viewer, document.envelope.visibility));
  const reviewedDocuments = scopeDocuments(visibleDocuments, request.entityId);
  const findings = new Map<string, WorldConsistencyFinding>();

  for (const document of reviewedDocuments) {
    for (const relationship of document.envelope.relationships) {
      const familyKey = relationshipFamilyKey(relationship);
      if (!familyKey) {
        continue;
      }

      const candidate: ReviewCandidate = {
        source: document,
        targetName: relationship.target,
        relationship,
        familyKey,
      };

      const visibleTarget = findVisibleTarget(visibleDocuments, relationship.target);
      if (!visibleTarget) {
        const hiddenTarget = findAnyTarget(allDocuments, relationship.target);
        if (!hiddenTarget) {
          const finding = buildMissingCorroborationFinding(candidate);
          findings.set(finding.id, finding);
        }
        continue;
      }

      const inverseType = INVERSE_RELATIONSHIPS[relationship.type];
      const targetRelationships = visibleTarget.envelope.relationships.filter((item) => item.type === inverseType);
      const matchingReverse = targetRelationships.find((item) => normalizeText(item.target) === normalizeText(document.envelope.name));
      if (matchingReverse) {
        continue;
      }

      if (!targetRelationships.length) {
        const finding = buildMissingCorroborationFinding(candidate);
        findings.set(finding.id, finding);
        continue;
      }

      const conflictingTargets = targetRelationships
        .map((item) => normalizeText(item.target))
        .filter((name) => name !== normalizeText(document.envelope.name))
        .map((name) => {
          const targetDocument = findVisibleTarget(visibleDocuments, name);
          return targetDocument?.envelope.name ?? name;
        });

      const finding = buildContradictionFinding(candidate, visibleTarget, conflictingTargets.length ? conflictingTargets : [visibleTarget.envelope.name]);
      findings.set(finding.id, finding);
    }
  }

  const scopedEntity = request.entityId
    ? visibleDocuments.find((document) => document.envelope.id === request.entityId)
    : undefined;
  const orderedFindings = [...findings.values()].sort((left, right) =>
    left.title.localeCompare(right.title) || left.id.localeCompare(right.id),
  );

  return {
    status: "ready",
    providerLabel: settings.provider.label,
    scope: {
      mode: scopeMode,
      ...(scopedEntity ? { entityId: scopedEntity.envelope.id, entityName: scopedEntity.envelope.name } : {}),
    },
    summary: summarizeFindings(scopeMode, orderedFindings),
    findings: orderedFindings,
  };
}
