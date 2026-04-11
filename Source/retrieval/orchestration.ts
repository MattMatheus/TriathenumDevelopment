import type {
  EntityRef,
  GroundingFact,
  GroundingRetrievalAdapter,
  GroundingRelationship,
  GroundingSourceGroups,
  GroundingSourceRole,
  GroundingTension,
  NoteRef,
} from "../contracts/index.js";
import { explainScoreBreakdown, inferEntityType, scoreDirectLink, scoreSearchMatch } from "./scoring.js";
import { uniqueStrings } from "./text.js";
import type { GroundingResult, NoteDocument, ResolvedEntity, RetrievalAdapterSet, RetrievalOptions } from "./types.js";

function emptySourceGroups(): GroundingSourceGroups {
  return {
    subjectNote: [],
    linkedCanon: [],
    searchHits: [],
    operationalContext: [],
  };
}

function toNoteRef(
  note: NoteDocument,
  role: GroundingSourceRole,
  retrievalAdapter: GroundingRetrievalAdapter,
  inclusionReasons: string[],
  score?: number,
): NoteRef {
  return {
    path: note.path,
    title: note.title,
    noteType: inferEntityType(note.path),
    excerpt: note.excerpt,
    score,
    sourceRole: role,
    retrievalAdapter,
    inclusionReasons,
  };
}

function noteLines(note: NoteDocument): string[] {
  const bodyWithoutFrontmatter = note.body.replace(/^---\n[\s\S]*?\n---\n?/, "");

  return bodyWithoutFrontmatter
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function extractFacts(note: NoteDocument, maxFacts = 3): GroundingFact[] {
  const facts: GroundingFact[] = [];

  for (const line of noteLines(note)) {
    if (line.startsWith("#") || line.startsWith("- ")) {
      continue;
    }
    facts.push({ statement: line, sourceNotePath: note.path });
    if (facts.length >= maxFacts) {
      break;
    }
  }

  return facts;
}

function extractTensions(note: NoteDocument, maxItems = 3): GroundingTension[] {
  const tensions: GroundingTension[] = [];

  for (const line of noteLines(note)) {
    if (!line.startsWith("- ")) {
      continue;
    }
    tensions.push({ statement: line.replace(/^- /, ""), sourceNotePath: note.path });
    if (tensions.length >= maxItems) {
      break;
    }
  }

  return tensions;
}

function extractRelationships(actor: NoteDocument, related: NoteDocument[]): GroundingRelationship[] {
  return related.slice(0, 4).map((note) => ({
    targetName: note.title,
    relationshipType: inferEntityType(note.path),
    summary: `Linked canon context from ${actor.title} to ${note.title}.`,
    sourceNotePath: note.path,
  }));
}

function extractUnresolvedQuestions(notes: NoteDocument[]): string[] {
  return uniqueStrings(
    notes.flatMap((note) =>
      noteLines(note)
        .filter((line) => line.startsWith("- ") && line.includes("?"))
        .map((line) => line.replace(/^- /, "")),
    ),
  ).slice(0, 5);
}

function queryTerms(subject: EntityRef, decisionPrompt: string): string[] {
  return uniqueStrings(
    `${subject.name} ${decisionPrompt}`
      .toLowerCase()
      .split(/[^a-z0-9]+/g)
      .filter((term) => term.length >= 4),
  );
}

function isOperationalContext(note: NoteDocument, decisionPrompt: string): boolean {
  const noteType = inferEntityType(note.path);
  if (noteType === "institution" || noteType === "system") {
    return true;
  }

  const text = `${note.title} ${note.body}`.toLowerCase();
  const prompt = decisionPrompt.toLowerCase();
  const operationalTerms = ["council", "ratification", "govern", "infrastructure", "authority", "policy"];

  return operationalTerms.some((term) => text.includes(term) && prompt.includes(term));
}

function addSourceToGroup(groups: GroundingSourceGroups, source: NoteRef): void {
  switch (source.sourceRole) {
    case "subject_note":
      groups.subjectNote.push(source);
      break;
    case "linked_canon":
      groups.linkedCanon.push(source);
      break;
    case "operational_context":
      groups.operationalContext.push(source);
      break;
    case "search_hit":
      groups.searchHits.push(source);
      break;
    default:
      break;
  }
}

export async function resolveEntityWithAdapters(
  adapters: RetrievalAdapterSet,
  query: string,
): Promise<ResolvedEntity> {
  if (adapters.structural) {
    const structural = await adapters.structural.resolveEntity({ query });
    if (structural.kind !== "not_found") {
      return structural;
    }
  }

  return adapters.fallback.resolveEntity({ query });
}

export async function buildGroundingBundleWithAdapters(
  adapters: RetrievalAdapterSet,
  query: string,
  decisionPrompt: string,
  options: RetrievalOptions = {},
): Promise<GroundingResult | ResolvedEntity> {
  const resolved = await resolveEntityWithAdapters(adapters, query);
  if (resolved.kind !== "resolved") {
    return resolved;
  }

  const maxLinkedNotes = options.maxLinkedNotes ?? 4;
  const maxSearchNotes = options.maxSearchNotes ?? 3;
  const linkedNotes = adapters.structural
    ? await adapters.structural.loadLinkedNotes(resolved.note, maxLinkedNotes)
    : [];
  const excluded = new Set<string>([resolved.note.path, ...linkedNotes.map((note) => note.path)]);
  const searchNotes = adapters.indexed
    ? await adapters.indexed.searchContext({
        subject: resolved.entity,
        decisionPrompt,
        excludePaths: excluded,
        limit: maxSearchNotes,
      })
    : await adapters.fallback.searchContext({
        subject: resolved.entity,
        decisionPrompt,
        excludePaths: excluded,
        limit: maxSearchNotes,
      });

  const dedupedSearchNotes = searchNotes.filter((note) => !excluded.has(note.path));
  const contextNotes = [resolved.note, ...linkedNotes, ...dedupedSearchNotes];
  const searchTerms = queryTerms(resolved.entity, decisionPrompt);
  const subjectInclusionReasons = [
    `resolved via ${resolved.resolver}`,
    ...(resolved.scoreBreakdown ? explainScoreBreakdown(resolved.scoreBreakdown) : []),
  ];
  const sources = [
    toNoteRef(
      resolved.note,
      "subject_note",
      resolved.resolver,
      subjectInclusionReasons,
      resolved.score,
    ),
    ...linkedNotes.map((note) => {
      const linkScore = scoreDirectLink(note);

      return toNoteRef(
        note,
        "linked_canon",
        "structural",
        ["linked directly from subject note", ...explainScoreBreakdown(linkScore)],
        linkScore.total,
      );
    }),
    ...dedupedSearchNotes.map((note) => {
      const breakdown = scoreSearchMatch(note, searchTerms);
      const role: GroundingSourceRole = isOperationalContext(note, decisionPrompt)
        ? "operational_context"
        : "search_hit";

      return toNoteRef(
        note,
        role,
        adapters.indexed ? "indexed" : "filesystem",
        [
          role === "operational_context" ? "adds operational or institutional context" : "matched decision prompt context",
          ...explainScoreBreakdown(breakdown),
        ],
        breakdown.total,
      );
    }),
  ];
  const sourceGroups = emptySourceGroups();
  for (const source of sources) {
    addSourceToGroup(sourceGroups, source);
  }

  return {
    bundle: {
      subject: resolved.entity,
      decisionPrompt,
      facts: contextNotes.flatMap((note, index) => extractFacts(note, index === 0 ? 4 : 2)).slice(0, 8),
      tensions: contextNotes.flatMap((note) => extractTensions(note, 2)).slice(0, 6),
      relationships: extractRelationships(resolved.note, [...linkedNotes, ...searchNotes]),
      unresolvedQuestions: extractUnresolvedQuestions(contextNotes),
      sources,
      sourceGroups,
    },
    resolved: resolved.entity,
    resolution: resolved,
    sources,
  };
}
