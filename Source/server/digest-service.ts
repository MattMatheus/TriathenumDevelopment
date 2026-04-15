import type {
  EntityDocument,
  WorldDigestPayload,
  WorldDigestRequest,
  WorldDigestSection,
  WorldSemanticCitation,
} from "../contracts/index.js";
import { FileSystemWorldDocumentStore, SqliteWorldIndex } from "../world/index.js";
import { canViewEntity, type AuthenticatedViewer } from "./auth-service.js";
import { FileSystemAISettingsStore } from "./ai-service.js";

function firstLine(document: EntityDocument): string {
  return document.body.trim().split("\n").find(Boolean)?.trim() ?? "No summary line is available yet.";
}

function buildCitation(document: EntityDocument, matchedTerms: string[]): WorldSemanticCitation {
  return {
    entityId: document.envelope.id,
    entityName: document.envelope.name,
    entityType: document.envelope.entityType,
    path: document.path,
    excerpt: firstLine(document),
    matchedTerms,
  };
}

function scopedDocuments(documents: EntityDocument[], request: WorldDigestRequest): EntityDocument[] {
  if (request.mode === "tag" && request.tag) {
    return documents.filter((document) => document.envelope.tags.includes(request.tag!));
  }

  return documents;
}

function overviewSection(documents: EntityDocument[]): WorldDigestSection | null {
  if (!documents.length) {
    return null;
  }

  const representative = [...documents].sort((left, right) => left.envelope.name.localeCompare(right.envelope.name))[0]!;
  const counts = new Map<string, number>();
  for (const document of documents) {
    counts.set(document.envelope.entityType, (counts.get(document.envelope.entityType) ?? 0) + 1);
  }
  const breakdown = [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([type, count]) => `${count} ${type.replace(/_/g, " ")}`)
    .join(", ");

  return {
    id: "overview",
    title: "Visible Scope Overview",
    summary: `${documents.length} visible entities are in scope right now, led by ${breakdown}. ${representative.envelope.name} is one representative anchor in this brief.`,
    citations: [buildCitation(representative, representative.envelope.tags)],
  };
}

function tagMomentumSection(documents: EntityDocument[]): WorldDigestSection | null {
  const tagCounts = new Map<string, number>();
  for (const document of documents) {
    for (const tag of document.envelope.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  const topTags = [...tagCounts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])).slice(0, 3);
  if (!topTags.length) {
    return null;
  }

  const citations = topTags.flatMap(([tag]) => {
    const document = documents.find((item) => item.envelope.tags.includes(tag));
    return document ? [buildCitation(document, [tag])] : [];
  });

  return {
    id: "tag-momentum",
    title: "Active Themes",
    summary: `The densest visible themes in this scope are ${topTags.map(([tag, count]) => `${tag} (${count})`).join(", ")}.`,
    citations,
  };
}

function openThreadsSection(documents: EntityDocument[], unresolvedTargetTexts: string[]): WorldDigestSection | null {
  if (!unresolvedTargetTexts.length) {
    return null;
  }

  const cited = documents.filter((document) =>
    unresolvedTargetTexts.some((target) => document.body.includes(`[[${target}]]`) || document.envelope.relationships.some((relationship) => relationship.target === target)),
  ).slice(0, 2);

  return {
    id: "open-threads",
    title: "Open Threads",
    summary: `Unresolved references still point toward ${unresolvedTargetTexts.slice(0, 3).join(", ")}${unresolvedTargetTexts.length > 3 ? ", and related follow-up threads." : "."}`,
    citations: cited.map((document) => buildCitation(document, unresolvedTargetTexts.slice(0, 3))),
  };
}

function relationshipTensionSection(documents: EntityDocument[]): WorldDigestSection | null {
  const relationshipHeavy = [...documents]
    .filter((document) => document.envelope.relationships.length > 0)
    .sort(
      (left, right) =>
        right.envelope.relationships.length - left.envelope.relationships.length ||
        left.envelope.name.localeCompare(right.envelope.name),
    )
    .slice(0, 2);

  if (!relationshipHeavy.length) {
    return null;
  }

  return {
    id: "relationship-focus",
    title: "Relationship Focus",
    summary: `${relationshipHeavy.map((document) => `${document.envelope.name} (${document.envelope.relationships.length} relationships)`).join(" and ")} currently provide the strongest connective structure in this scope.`,
    citations: relationshipHeavy.map((document) =>
      buildCitation(
        document,
        document.envelope.relationships.slice(0, 2).flatMap((relationship) => [relationship.type, relationship.target]),
      ),
    ),
  };
}

export async function generateWorldDigest(
  worldRoot: string,
  viewer: AuthenticatedViewer,
  request: WorldDigestRequest,
): Promise<WorldDigestPayload> {
  const settingsStore = new FileSystemAISettingsStore(worldRoot);
  const settings = await settingsStore.load();

  if (!settings.provider.status.configured) {
    return {
      status: "unavailable",
      unavailableReason: "World-state digests stay unavailable until an AI provider baseline is configured.",
      scope: request,
      summary: "No digest is available yet.",
      sections: [],
    };
  }

  const store = new FileSystemWorldDocumentStore(worldRoot);
  const allDocuments = await store.loadEntityDocuments();
  const visibleDocuments = allDocuments.filter((document) => canViewEntity(viewer, document.envelope.visibility));
  const documents = scopedDocuments(visibleDocuments, request);

  const index = new SqliteWorldIndex();

  try {
    index.rebuild(visibleDocuments);
    const unresolvedTargetTexts = index
      .listUnresolvedReferences()
      .filter((reference) => {
        if (request.mode !== "tag" || !request.tag) {
          return true;
        }

        return documents.some((document) => document.envelope.id === reference.sourceEntityId);
      })
      .map((reference) => reference.targetText);

    const sections = [
      overviewSection(documents),
      tagMomentumSection(documents),
      relationshipTensionSection(documents),
      openThreadsSection(documents, unresolvedTargetTexts),
    ].filter((section): section is WorldDigestSection => Boolean(section));

    return {
      status: "ready",
      providerLabel: settings.provider.label,
      scope: request,
      summary: sections.length
        ? `This digest is review-only and summarizes ${request.mode === "tag" ? `the '${request.tag}' scope` : "the visible world"} with citations.`
        : "No digest sections surfaced for the current scope.",
      sections,
    };
  } finally {
    index.close();
  }
}
