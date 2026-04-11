import path from "node:path";
import { fileURLToPath } from "node:url";

import type { ActorReactionRequest, ReactionOption, ReactionResponse } from "../contracts/index.js";
import { buildGroundingBundle } from "../retrieval/index.js";
import type { VaultReader } from "../retrieval/index.js";
import { uniqueStrings } from "../retrieval/text.js";

export class ActorReactionError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ActorReactionError";
  }
}

function resolveSignal(request: ActorReactionRequest, basisText: string): {
  posture: "support" | "resist" | "cautious";
  emphasis: string;
} {
  const promptText = `${request.decisionPrompt} ${basisText}`.toLowerCase();

  if (promptText.includes("ratification") || promptText.includes("public legitimacy")) {
    return {
      posture: "cautious",
      emphasis: "public legitimacy and procedural clarity",
    };
  }

  if (promptText.includes("emergency") || promptText.includes("crisis")) {
    return {
      posture: "support",
      emphasis: "coordination under pressure",
    };
  }

  if (promptText.includes("reject") || promptText.includes("oppose")) {
    return {
      posture: "resist",
      emphasis: "political risk and downstream trust",
    };
  }

  return {
    posture: "cautious",
    emphasis: "regional trust and visible accountability",
  };
}

function buildLikelyReactionSummary(
  actorName: string,
  posture: "support" | "resist" | "cautious",
  emphasis: string,
): string {
  if (posture === "support") {
    return `${actorName} is likely to support the proposal if it can be framed around ${emphasis}.`;
  }

  if (posture === "resist") {
    return `${actorName} is likely to resist the proposal if it appears to weaken ${emphasis}.`;
  }

  return `${actorName} is likely to respond cautiously, emphasizing ${emphasis}.`;
}

function buildAlternative(
  actorName: string,
  uncertainty: string | undefined,
  emphasis: string,
): ReactionOption {
  return {
    summary: `Delay commitment until ${uncertainty ? "the open question is clarified" : "procedural safeguards are explicit"}.`,
    rationale: [
      `${actorName} may avoid a hard position when ${emphasis} still feels unresolved.`,
    ],
  };
}

export async function createActorReactionResponse(
  reader: VaultReader,
  request: ActorReactionRequest,
): Promise<ReactionResponse> {
  const result = await buildGroundingBundle(reader, request.actor.name, request.decisionPrompt, {
    maxSearchNotes: request.options?.maxSources ?? 3,
  });

  if ("kind" in result) {
    if (result.kind === "not_found") {
      throw new ActorReactionError(404, `Could not resolve actor '${request.actor.name}'.`, result);
    }

    if (result.kind === "ambiguous") {
      throw new ActorReactionError(409, `Actor '${request.actor.name}' matched multiple notes.`, result);
    }
  }

  if (!("bundle" in result)) {
    throw new ActorReactionError(500, "Resolved actor did not produce a grounding bundle.", result);
  }

  const facts = result.bundle.facts.slice(0, 4);
  const tensions = result.bundle.tensions.slice(0, 3);
  const uncertainties = result.bundle.unresolvedQuestions.slice(0, 3);
  const basisSources = [
    ...result.bundle.sourceGroups.subjectNote,
    ...result.bundle.sourceGroups.linkedCanon,
    ...result.bundle.sourceGroups.operationalContext,
  ];
  const basisText = [...facts.map((fact) => fact.statement), ...tensions.map((item) => item.statement)].join(" ");
  const signal = resolveSignal(request, basisText);

  const likelyReaction: ReactionOption = {
    summary: buildLikelyReactionSummary(result.bundle.subject.name, signal.posture, signal.emphasis),
    rationale: [
      ...facts.slice(0, 2).map((fact) => fact.statement),
      ...tensions.slice(0, 2).map((tension) => `Tension: ${tension.statement}`),
    ].slice(0, 3),
  };

  const alternatives =
    request.options?.includeAlternatives === false
      ? []
      : [buildAlternative(result.bundle.subject.name, uncertainties[0], signal.emphasis)];

  return {
    summary: `${result.bundle.subject.name} is likely to approach this decision through the lens of ${signal.emphasis}.`,
    likelyReaction,
    alternatives,
    canonBasis: uniqueStrings([
      ...facts.map((fact) => fact.statement),
      ...basisSources.flatMap((source) => source.inclusionReasons ?? []),
    ]).slice(0, 5),
    inferredElements: uniqueStrings([
      ...tensions.map((tension) => tension.statement),
      ...result.bundle.sourceGroups.searchHits.flatMap((source) => source.inclusionReasons ?? []),
    ]).slice(0, 5),
    uncertainties,
    sources: result.sources.slice(0, request.options?.maxSources ?? 5),
  };
}

export function defaultVaultRoot(): string {
  const serverDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(serverDir, "../../Triathenum/canon");
}
