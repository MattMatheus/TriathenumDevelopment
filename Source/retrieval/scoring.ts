import path from "node:path";

import type { EntityRef } from "../contracts/index.js";
import { normalizeText } from "./text.js";
import type { NoteDocument, RetrievalScoreBreakdown } from "./types.js";

export type ScoredNote = {
  note: NoteDocument;
  score: number;
  breakdown?: RetrievalScoreBreakdown;
};

const DEFAULT_SCORE_BREAKDOWN: RetrievalScoreBreakdown = {
  identity: 0,
  link: 0,
  query: 0,
  domain: 0,
  operational: 0,
  total: 0,
};

export function basenameTitle(filePath: string): string {
  return path.basename(filePath, ".md");
}

export function inferEntityType(filePath: string): EntityRef["entityType"] {
  const normalizedPath = filePath.replace(/\\/g, "/");

  if (normalizedPath.includes("/characters/")) {
    return "character";
  }
  if (normalizedPath.includes("/factions/")) {
    return "faction";
  }
  if (normalizedPath.includes("/locations/")) {
    return "location";
  }
  if (normalizedPath.includes("/politics/") || normalizedPath.includes("/education/")) {
    return "institution";
  }
  if (normalizedPath.includes("/systems")) {
    return "system";
  }

  return "unknown";
}

export function noteToEntityRef(note: NoteDocument): EntityRef {
  return {
    id: note.path,
    name: note.title,
    entityType: inferEntityType(note.path),
    primaryNotePath: note.path,
    aliases: [basenameTitle(note.path)].filter((alias) => alias !== note.title),
  };
}

export function compareScoredNotes(a: ScoredNote, b: ScoredNote): number {
  if (b.score !== a.score) {
    return b.score - a.score;
  }

  return a.note.path.localeCompare(b.note.path);
}

export function emptyScoreBreakdown(): RetrievalScoreBreakdown {
  return { ...DEFAULT_SCORE_BREAKDOWN };
}

function finalizeScore(breakdown: RetrievalScoreBreakdown): RetrievalScoreBreakdown {
  breakdown.total =
    breakdown.identity +
    breakdown.link +
    breakdown.query +
    breakdown.domain +
    breakdown.operational;

  return breakdown;
}

export function scoreEntityMatch(note: NoteDocument, query: string): RetrievalScoreBreakdown {
  const normalizedQuery = normalizeText(query);
  const normalizedTitle = normalizeText(note.title);
  const normalizedBase = normalizeText(basenameTitle(note.path));
  const normalizedBody = normalizeText(note.body);
  const breakdown = emptyScoreBreakdown();

  if (!normalizedQuery) {
    return breakdown;
  }

  if (normalizedTitle === normalizedQuery) {
    breakdown.identity = 120;
  } else if (normalizedBase === normalizedQuery) {
    breakdown.identity = 110;
  } else if (normalizedTitle.includes(normalizedQuery)) {
    breakdown.identity = 80;
  } else if (normalizedBase.includes(normalizedQuery)) {
    breakdown.identity = 70;
  }

  if (normalizedBody.includes(normalizedQuery)) {
    breakdown.query = normalizedTitle.includes(normalizedQuery) ? 8 : 30;
  }

  if (breakdown.identity > 0 || breakdown.query > 0) {
    const entityType = inferEntityType(note.path);
    if (entityType === "character") {
      breakdown.domain += 10;
    } else if (entityType !== "unknown") {
      breakdown.domain += 4;
    }

    if (normalizedBody.includes("aliases") || normalizedBody.includes("known as")) {
      breakdown.operational += 3;
    }
  }

  return finalizeScore(breakdown);
}

export function scoreSearchMatch(note: NoteDocument, queryTerms: string[]): RetrievalScoreBreakdown {
  const normalizedTitle = normalizeText(note.title);
  const normalizedBody = normalizeText(note.body);
  const breakdown = emptyScoreBreakdown();

  for (const term of queryTerms) {
    if (normalizedTitle.includes(term)) {
      breakdown.identity += 12;
      breakdown.query += 6;
    } else if (normalizedBody.includes(term)) {
      breakdown.query += 10;
    }
  }

  const entityType = inferEntityType(note.path);
  if (entityType === "character" || entityType === "institution" || entityType === "system") {
    breakdown.domain += 5;
  } else if (entityType !== "unknown") {
    breakdown.domain += 2;
  }

  if (normalizedBody.includes("council") || normalizedBody.includes("govern")) {
    breakdown.operational += 4;
  }

  return finalizeScore(breakdown);
}

export function scoreDirectLink(note: NoteDocument): RetrievalScoreBreakdown {
  return finalizeScore({
    identity: 0,
    link: 60,
    query: 0,
    domain: 0,
    operational: 0,
    total: 0,
  });
}

export function shouldTreatAsAmbiguous(scored: ScoredNote[], minimumGap = 15): boolean {
  if (scored.length < 2) {
    return false;
  }

  return scored[0].score - scored[1].score < minimumGap;
}

export function explainScoreBreakdown(score: RetrievalScoreBreakdown): string[] {
  const reasons: string[] = [];

  if (score.identity > 0) {
    reasons.push(`identity:${score.identity}`);
  }
  if (score.link > 0) {
    reasons.push(`link:${score.link}`);
  }
  if (score.query > 0) {
    reasons.push(`query:${score.query}`);
  }
  if (score.domain > 0) {
    reasons.push(`domain:${score.domain}`);
  }
  if (score.operational > 0) {
    reasons.push(`operational:${score.operational}`);
  }

  if (reasons.length === 0) {
    reasons.push("no strong scoring signals");
  }

  return reasons;
}
