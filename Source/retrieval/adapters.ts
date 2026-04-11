import { normalizeText, uniqueStrings } from "./text.js";
import {
  compareScoredNotes,
  explainScoreBreakdown,
  noteToEntityRef,
  scoreEntityMatch,
  scoreSearchMatch,
  shouldTreatAsAmbiguous,
} from "./scoring.js";
import type {
  FallbackRetrievalAdapter,
  IndexedRetrievalAdapter,
  NoteDocument,
  RetrievalAdapterSet,
  ResolvedEntity,
  StructuralRetrievalAdapter,
  VaultReader,
} from "./types.js";

async function loadAllNotes(reader: VaultReader): Promise<NoteDocument[]> {
  const files = await reader.listMarkdownFiles();
  return Promise.all(files.map((file) => reader.readNote(file)));
}

export class FileSystemStructuralAdapter implements StructuralRetrievalAdapter {
  readonly kind = "structural" as const;
  readonly name = "structural" as const;

  constructor(private readonly reader: VaultReader) {}

  async resolveEntity({ query }: { query: string }): Promise<ResolvedEntity> {
    const docs = await loadAllNotes(this.reader);
    const scored = docs
      .map((note) => {
        const breakdown = scoreEntityMatch(note, query);
        return { note, score: breakdown.total, breakdown };
      })
      .filter((candidate) => candidate.score >= 70)
      .sort(compareScoredNotes);

    if (scored.length === 0) {
      return { kind: "not_found", query };
    }

    if (shouldTreatAsAmbiguous(scored)) {
      return {
        kind: "ambiguous",
        query,
        resolver: this.name,
        matches: scored.slice(0, 5).map(({ note, breakdown }) => ({
          entity: noteToEntityRef(note),
          notePath: note.path,
          resolver: this.name,
          score: breakdown ?? scoreEntityMatch(note, query),
          reasons: explainScoreBreakdown(breakdown ?? scoreEntityMatch(note, query)),
        })),
      };
    }

    const top = scored[0];
    return {
      kind: "resolved",
      entity: noteToEntityRef(top.note),
      note: top.note,
      score: top.score,
      resolver: this.name,
      scoreBreakdown: top.breakdown,
    };
  }

  async loadLinkedNotes(note: NoteDocument, limit: number): Promise<NoteDocument[]> {
    const docs = await loadAllNotes(this.reader);
    const titles = new Map<string, NoteDocument>();

    for (const doc of docs) {
      titles.set(normalizeText(doc.title), doc);
    }

    const linked: NoteDocument[] = [];
    for (const link of note.wikilinks) {
      const target = titles.get(normalizeText(link));
      if (target && target.path !== note.path) {
        linked.push(target);
      }
      if (linked.length >= limit) {
        break;
      }
    }

    return linked;
  }
}

export class FileSystemIndexedAdapter implements IndexedRetrievalAdapter {
  readonly kind = "indexed" as const;
  readonly name = "indexed" as const;

  constructor(private readonly reader: VaultReader) {}

  async searchContext({
    subject,
    decisionPrompt,
    excludePaths,
    limit,
  }: {
    subject: { name: string };
    decisionPrompt: string;
    excludePaths: Set<string>;
    limit: number;
  }): Promise<NoteDocument[]> {
    const docs = await loadAllNotes(this.reader);
    const queryTerms = uniqueStrings(
      normalizeText(`${subject.name} ${decisionPrompt}`)
        .split(" ")
        .filter((term) => term.length >= 4),
    );

    return docs
      .filter((note) => !excludePaths.has(note.path))
      .map((note) => {
        const breakdown = scoreSearchMatch(note, queryTerms);
        return { note, score: breakdown.total, breakdown };
      })
      .filter((candidate) => candidate.score > 0)
      .sort(compareScoredNotes)
      .slice(0, limit)
      .map(({ note }) => note);
  }
}

export class FileSystemFallbackAdapter implements FallbackRetrievalAdapter {
  readonly kind = "fallback" as const;
  readonly name = "filesystem" as const;

  constructor(private readonly reader: VaultReader) {}

  async resolveEntity({ query }: { query: string }): Promise<ResolvedEntity> {
    const docs = await loadAllNotes(this.reader);
    const scored = docs
      .map((note) => {
        const breakdown = scoreEntityMatch(note, query);
        return { note, score: breakdown.total, breakdown };
      })
      .filter((candidate) => candidate.score > 0)
      .sort(compareScoredNotes);

    if (scored.length === 0) {
      return { kind: "not_found", query };
    }

    if (shouldTreatAsAmbiguous(scored)) {
      return {
        kind: "ambiguous",
        query,
        resolver: this.name,
        matches: scored.slice(0, 5).map(({ note, breakdown }) => ({
          entity: noteToEntityRef(note),
          notePath: note.path,
          resolver: this.name,
          score: breakdown ?? scoreEntityMatch(note, query),
          reasons: explainScoreBreakdown(breakdown ?? scoreEntityMatch(note, query)),
        })),
      };
    }

    const top = scored[0];
    return {
      kind: "resolved",
      entity: noteToEntityRef(top.note),
      note: top.note,
      score: top.score,
      resolver: this.name,
      scoreBreakdown: top.breakdown,
    };
  }

  async searchContext({
    subject,
    decisionPrompt,
    excludePaths,
    limit,
  }: {
    subject: { name: string };
    decisionPrompt: string;
    excludePaths: Set<string>;
    limit: number;
  }): Promise<NoteDocument[]> {
    const indexed = new FileSystemIndexedAdapter(this.reader);
    return indexed.searchContext({ subject, decisionPrompt, excludePaths, limit });
  }
}

export function createDefaultRetrievalAdapters(reader: VaultReader): RetrievalAdapterSet {
  return {
    structural: new FileSystemStructuralAdapter(reader),
    indexed: new FileSystemIndexedAdapter(reader),
    fallback: new FileSystemFallbackAdapter(reader),
  };
}
