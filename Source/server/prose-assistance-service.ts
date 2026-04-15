import type {
  WorldEditorProseAction,
  WorldEditorProseAssistPayload,
  WorldEditorProseAssistRequest,
} from "../contracts/index.js";
import { FileSystemAISettingsStore, loadAIWorldContext } from "./ai-service.js";
import type { AuthenticatedViewer } from "./auth-service.js";

function extractSentences(input: string): string[] {
  return input
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function truncateAtWord(input: string, limit: number): string {
  if (input.length <= limit) {
    return input;
  }

  const truncated = input.slice(0, limit).replace(/\s+\S*$/, "").trim();
  return `${truncated}...`;
}

function buildContextNotes(context: Awaited<ReturnType<typeof loadAIWorldContext>>): WorldEditorProseAssistPayload["contextNotes"] {
  const notes: WorldEditorProseAssistPayload["contextNotes"] = [
    {
      label: "Viewer",
      value: `${context.viewer.displayName} (${context.viewer.role})`,
    },
    {
      label: "Visible world",
      value: `${context.world.entityCount} entities across ${context.world.availableTypes.length} visible types`,
    },
  ];

  if (context.subject) {
    notes.push({
      label: "Subject",
      value: `${context.subject.name} • ${context.subject.entityType.replace(/_/g, " ")}`,
    });

    if (context.subject.relationships[0]) {
      notes.push({
        label: "Relationship cue",
        value: `${context.subject.relationships[0].type.replace(/_/g, " ")} -> ${context.subject.relationships[0].target}`,
      });
    }

    if (context.subject.tags.length) {
      notes.push({
        label: "Tags",
        value: context.subject.tags.slice(0, 3).join(", "),
      });
    }
  }

  notes.push({
    label: "Guardrail",
    value: context.guardrails.approvalBoundary,
  });

  return notes;
}

function summarizeBody(sourceText: string): string {
  const sentences = extractSentences(sourceText);
  if (!sentences.length) {
    return truncateAtWord(sourceText.trim(), 240);
  }

  return truncateAtWord(sentences.slice(0, 2).join(" "), 260);
}

function rephraseBody(sourceText: string, request: WorldEditorProseAssistRequest): string {
  const sentences = extractSentences(sourceText);
  if (!sentences.length) {
    return sourceText.trim();
  }

  const [firstSentence, ...rest] = sentences;
  const tightenedFirstSentence = firstSentence
    .replace(/\bvery\b/gi, "")
    .replace(/\breally\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  const opening = tightenedFirstSentence.toLowerCase().startsWith(request.name.toLowerCase())
    ? tightenedFirstSentence
    : `${request.name} anchors this ${request.entityType.replace(/_/g, " ")} entry. ${tightenedFirstSentence}`;

  return [opening, ...rest].join(" ").replace(/\s{2,}/g, " ").trim();
}

function continueBody(
  sourceText: string,
  request: WorldEditorProseAssistRequest,
  context: Awaited<ReturnType<typeof loadAIWorldContext>>,
): string {
  const relationship = context.subject?.relationships[0];
  const tagCue = context.subject?.tags[0];
  const fieldCue = Object.entries(context.subject?.fields ?? {})[0];
  const continuation = [
    `${request.name} should be read against the surrounding canon rather than as an isolated note.`,
    relationship
      ? `Its visible relationship to ${relationship.target} offers the clearest next thread for expansion.`
      : null,
    tagCue ? `Current tagging keeps the focus on ${tagCue}.` : null,
    fieldCue ? `A later pass can confirm ${fieldCue[0].replace(/_/g, " ")} without overstating new facts.` : null,
  ]
    .filter(Boolean)
    .join(" ");

  if (!sourceText.trim()) {
    return continuation;
  }

  return continuation;
}

function buildSuggestion(
  request: WorldEditorProseAssistRequest,
  context: Awaited<ReturnType<typeof loadAIWorldContext>>,
): Pick<WorldEditorProseAssistPayload, "applyMode" | "summary" | "suggestedText"> {
  if (request.action === "summarize") {
    return {
      applyMode: "replace",
      summary: "Condenses the current body into a shorter reviewable summary.",
      suggestedText: summarizeBody(request.body),
    };
  }

  if (request.action === "rephrase") {
    return {
      applyMode: "replace",
      summary: "Tightens the current prose without silently changing canon on save.",
      suggestedText: rephraseBody(request.body, request),
    };
  }

  return {
    applyMode: "append",
    summary: "Adds one bounded continuation paragraph grounded in the current subject context.",
    suggestedText: continueBody(request.body, request, context),
  };
}

export async function assistEditorProse(
  worldRoot: string,
  viewer: AuthenticatedViewer,
  request: WorldEditorProseAssistRequest,
): Promise<WorldEditorProseAssistPayload> {
  const settingsStore = new FileSystemAISettingsStore(worldRoot);
  const settings = await settingsStore.load();

  if (!settings.provider.status.configured) {
    return {
      status: "unavailable",
      unavailableReason: "In-editor prose assistance stays unavailable until an AI provider baseline is configured.",
      action: request.action,
      applyMode: request.action === "continue" ? "append" : "replace",
      summary: "No prose assistance is available yet.",
      sourceText: request.body.trim(),
      contextNotes: [],
    };
  }

  const sourceText = request.body.trim();
  if (!sourceText) {
    return {
      status: "unavailable",
      unavailableReason: "Add some body text before requesting prose assistance.",
      action: request.action,
      applyMode: request.action === "continue" ? "append" : "replace",
      summary: "The editor body is still empty.",
      sourceText,
      contextNotes: [],
    };
  }

  const context = await loadAIWorldContext(worldRoot, viewer, request.entityId);
  const suggestion = buildSuggestion(
    {
      ...request,
      body: sourceText,
    },
    context,
  );

  return {
    status: "ready",
    action: request.action,
    applyMode: suggestion.applyMode,
    summary: suggestion.summary,
    providerLabel: settings.provider.label,
    sourceText,
    suggestedText: suggestion.suggestedText,
    contextNotes: buildContextNotes(context),
  };
}
