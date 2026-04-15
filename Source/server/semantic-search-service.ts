import type { WorldBrowserEntitySummary, WorldSemanticCitation, WorldSemanticSearchPayload } from "../contracts/index.js";
import type { EntityDocument, WorldEntityType } from "../contracts/index.js";
import { normalizeText } from "../retrieval/text.js";
import { FileSystemWorldDocumentStore, SqliteWorldIndex } from "../world/index.js";
import { canViewEntity, type AuthenticatedViewer } from "./auth-service.js";
import { FileSystemAISettingsStore } from "./ai-service.js";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "can",
  "do",
  "does",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "me",
  "of",
  "on",
  "or",
  "tell",
  "the",
  "to",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
]);

type RankedSemanticDocument = {
  document: EntityDocument;
  summary: WorldBrowserEntitySummary;
  score: number;
  matchedTerms: string[];
};

function tokenizeQuery(query: string): string[] {
  return normalizeText(query)
    .split(" ")
    .filter((term) => term.length >= 3 && !STOP_WORDS.has(term));
}

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

function buildSemanticMaterial(document: EntityDocument): {
  primary: string;
  secondary: string;
} {
  const relationships = document.envelope.relationships.flatMap((relationship) => [
    relationship.type,
    relationship.target,
    relationship.summary ?? "",
  ]);

  return {
    primary: normalizeText(
      [
        document.envelope.name,
        ...document.envelope.aliases,
        ...document.envelope.tags,
        document.envelope.entityType,
        ...relationships,
      ].join(" "),
    ),
    secondary: normalizeText(
      [
        JSON.stringify(document.fields),
        document.body,
      ].join(" "),
    ),
  };
}

function questionTypeBonus(query: string, entityType: WorldEntityType): number {
  const normalized = normalizeText(query);

  if (normalized.includes("who") && (entityType === "character" || entityType === "faction")) {
    return 1.5;
  }

  if (normalized.includes("where") && entityType === "location") {
    return 1.5;
  }

  if ((normalized.includes("crisis") || normalized.includes("history")) && entityType === "lore_article") {
    return 1.5;
  }

  return 0;
}

function rankSemanticDocuments(documents: EntityDocument[], query: string): RankedSemanticDocument[] {
  const terms = tokenizeQuery(query);
  if (!terms.length) {
    return [];
  }

  return documents
    .map((document) => {
      const material = buildSemanticMaterial(document);
      let score = questionTypeBonus(query, document.envelope.entityType);
      const matchedTerms: string[] = [];

      if (material.primary.includes(normalizeText(query))) {
        score += 4;
      }

      for (const term of terms) {
        let matched = false;

        if (material.primary.includes(term)) {
          score += 2.5;
          matched = true;
        }

        if (material.secondary.includes(term)) {
          score += 1.2;
          matched = true;
        }

        if (matched) {
          matchedTerms.push(term);
        }
      }

      return {
        document,
        summary: buildEntitySummary(document),
        score,
        matchedTerms: [...new Set(matchedTerms)],
      };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.summary.name.localeCompare(right.summary.name));
}

function buildSemanticAnswer(query: string, ranked: RankedSemanticDocument[]): {
  answer: string | null;
  uncertainty: WorldSemanticSearchPayload["uncertainty"];
  uncertaintyReason: string;
} {
  const top = ranked[0];
  if (!top) {
    return {
      answer: null,
      uncertainty: "insufficient",
      uncertaintyReason: "No visible canon surfaced enough matching evidence for this question.",
    };
  }

  const second = ranked[1];
  const normalizedQuery = normalizeText(query);
  const governingRelationship = top.document.envelope.relationships.find((relationship) =>
    normalizedQuery.includes("govern") && relationship.type === "governed_by",
  );

  if (governingRelationship) {
    return {
      answer: `${top.document.envelope.name} is governed by ${governingRelationship.target}.`,
      uncertainty: top.score >= 7 ? "grounded" : "limited",
      uncertaintyReason:
        top.score >= 7
          ? "The answer is grounded by a direct structured relationship on the strongest matching entity."
          : "The answer uses a direct relationship, but the overall query match is still fairly narrow.",
    };
  }

  const excerpt = top.summary.excerpt || `${top.summary.name} is the strongest visible canon match.`;
  const answer = second
    ? `The strongest canon match is ${top.summary.name}. ${excerpt} Related evidence also points to ${second.summary.name}. ${second.summary.excerpt}`
    : `The strongest canon match is ${top.summary.name}. ${excerpt}`;

  if (top.score >= 7) {
    return {
      answer,
      uncertainty: "grounded",
      uncertaintyReason: "Multiple matching terms and visible citations support this answer.",
    };
  }

  return {
    answer,
    uncertainty: "limited",
    uncertaintyReason: "The answer is citation-backed, but the available evidence is still somewhat sparse or indirect.",
  };
}

export async function searchWorldSemantically(
  worldRoot: string,
  viewer: AuthenticatedViewer,
  query: string,
): Promise<WorldSemanticSearchPayload> {
  const normalizedQuery = query.trim();
  const aiSettingsStore = new FileSystemAISettingsStore(worldRoot);
  const aiSettings = await aiSettingsStore.load();

  if (!aiSettings.provider.status.configured) {
    return {
      mode: "semantic",
      query: normalizedQuery,
      status: "unavailable",
      unavailableReason: "Semantic search is optional and stays unavailable until an AI provider baseline is configured.",
      answer: null,
      uncertainty: "insufficient",
      uncertaintyReason: "No semantic infrastructure is currently configured for this world.",
      citations: [],
      matches: [],
    };
  }

  const store = new FileSystemWorldDocumentStore(worldRoot);
  const documents = (await store.loadEntityDocuments()).filter((document) =>
    canViewEntity(viewer, document.envelope.visibility),
  );

  if (!normalizedQuery) {
    return {
      mode: "semantic",
      query: normalizedQuery,
      status: "ready",
      answer: null,
      uncertainty: "insufficient",
      uncertaintyReason: "Ask a lore question to run semantic search.",
      citations: [],
      matches: [],
    };
  }

  const ranked = rankSemanticDocuments(documents, normalizedQuery).slice(0, 4);
  const citations: WorldSemanticCitation[] = ranked.slice(0, 3).map((candidate) => ({
    entityId: candidate.summary.id,
    entityName: candidate.summary.name,
    entityType: candidate.summary.entityType,
    path: candidate.document.path,
    excerpt: candidate.summary.excerpt,
    matchedTerms: candidate.matchedTerms,
  }));

  return {
    mode: "semantic",
    query: normalizedQuery,
    status: "ready",
    ...buildSemanticAnswer(normalizedQuery, ranked),
    citations,
    matches: ranked.map((candidate) => candidate.summary),
  };
}
