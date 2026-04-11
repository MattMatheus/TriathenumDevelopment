import type { GroundingBundle, NoteRef } from "../contracts/index.js";
import { createDefaultRetrievalAdapters } from "./adapters.js";
import { buildGroundingBundleWithAdapters } from "./orchestration.js";
import type { ResolvedEntity, RetrievalOptions, VaultReader } from "./types.js";

export type RetrievalDiagnosticsResult = {
  actorQuery: string;
  decisionPrompt: string;
  outcome: "resolved" | "ambiguous" | "not_found";
  resolution: ResolvedEntity;
  bundle?: GroundingBundle;
};

function formatSource(source: NoteRef): string {
  const scoreText = source.score !== undefined ? ` score=${source.score}` : "";
  const roleText = source.sourceRole ? ` role=${source.sourceRole}` : "";
  const adapterText = source.retrievalAdapter ? ` adapter=${source.retrievalAdapter}` : "";
  const reasonsText =
    source.inclusionReasons && source.inclusionReasons.length > 0
      ? ` reasons=${source.inclusionReasons.join(", ")}`
      : "";

  return `- ${source.title}${roleText}${adapterText}${scoreText}\n  path: ${source.path}\n  ${reasonsText.trim()}`.trimEnd();
}

function formatGroupedSources(bundle: GroundingBundle): string[] {
  return [
    `subjectNote: ${bundle.sourceGroups.subjectNote.length}`,
    `linkedCanon: ${bundle.sourceGroups.linkedCanon.length}`,
    `searchHits: ${bundle.sourceGroups.searchHits.length}`,
    `operationalContext: ${bundle.sourceGroups.operationalContext.length}`,
  ];
}

export async function buildRetrievalDiagnostics(
  reader: VaultReader,
  actorQuery: string,
  decisionPrompt: string,
  options: RetrievalOptions = {},
): Promise<RetrievalDiagnosticsResult> {
  const adapters = createDefaultRetrievalAdapters(reader);
  const result = await buildGroundingBundleWithAdapters(adapters, actorQuery, decisionPrompt, options);

  if ("kind" in result) {
    return {
      actorQuery,
      decisionPrompt,
      outcome: result.kind,
      resolution: result,
    };
  }

  return {
    actorQuery,
    decisionPrompt,
    outcome: "resolved",
    resolution: result.resolution,
    bundle: result.bundle,
  };
}

export function formatRetrievalDiagnostics(result: RetrievalDiagnosticsResult): string {
  const lines = [`Actor Query: ${result.actorQuery}`, `Decision Prompt: ${result.decisionPrompt}`, `Outcome: ${result.outcome}`];

  if (result.resolution.kind === "not_found") {
    lines.push(`Query '${result.resolution.query}' did not match any candidate notes.`);
    return lines.join("\n");
  }

  if (result.resolution.kind === "ambiguous") {
    lines.push(`Resolver: ${result.resolution.resolver}`);
    lines.push("Ambiguous Matches:");
    for (const match of result.resolution.matches) {
      lines.push(
        `- ${match.entity.name} adapter=${match.resolver} score=${match.score.total} reasons=${match.reasons.join(", ")}`,
      );
      lines.push(`  path: ${match.notePath}`);
    }

    return lines.join("\n");
  }

  lines.push(`Resolved Entity: ${result.resolution.entity.name}`);
  lines.push(`Resolver: ${result.resolution.resolver}`);
  lines.push(`Resolution Score: ${result.resolution.score}`);

  if (!result.bundle) {
    return lines.join("\n");
  }

  lines.push("Source Groups:");
  lines.push(...formatGroupedSources(result.bundle).map((line) => `- ${line}`));
  lines.push("Selected Sources:");
  lines.push(...result.bundle.sources.map((source) => formatSource(source)));

  if (result.bundle.unresolvedQuestions.length > 0) {
    lines.push("Unresolved Questions:");
    lines.push(...result.bundle.unresolvedQuestions.map((question) => `- ${question}`));
  }

  return lines.join("\n");
}
