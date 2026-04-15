import type {
  WorldEditorProseAction,
  WorldEditorProseAssistPayload,
  WorldEditorProseAssistRequest,
  WorldEntityType,
} from "../contracts/index.js";

export type EditorProseAssistInput = {
  entityId?: string;
  name: string;
  entityType: WorldEntityType;
  body: string;
};

export function buildEditorProseAssistRequest(
  input: EditorProseAssistInput,
  action: WorldEditorProseAction,
): WorldEditorProseAssistRequest {
  return {
    action,
    entityId: input.entityId,
    name: input.name.trim(),
    entityType: input.entityType,
    body: input.body,
  };
}

export function previewEditorProseResult(
  currentBody: string,
  suggestion: WorldEditorProseAssistPayload,
): string {
  if (suggestion.status !== "ready" || !suggestion.suggestedText) {
    return currentBody;
  }

  if (suggestion.applyMode === "append") {
    const trimmedBody = currentBody.trimEnd();
    return trimmedBody ? `${trimmedBody}\n\n${suggestion.suggestedText}` : suggestion.suggestedText;
  }

  return suggestion.suggestedText;
}

export function applyEditorProseResult(
  currentBody: string,
  suggestion: WorldEditorProseAssistPayload,
): string {
  return previewEditorProseResult(currentBody, suggestion);
}

export function rejectEditorProseResult(): null {
  return null;
}
