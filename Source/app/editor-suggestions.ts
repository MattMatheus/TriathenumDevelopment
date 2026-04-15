import type {
  WorldEditorLinkSuggestion,
  WorldEditorRelationshipSuggestion,
  WorldEditorSummarySuggestion,
  WorldEntityType,
} from "../contracts/index.js";

export type EditorSuggestionInput = {
  entityId?: string;
  name: string;
  entityType: WorldEntityType;
  body: string;
  relationships: Array<{ type: string; target: string }>;
  fields: Array<{ key: string; value: string }>;
};

export function buildEditorSuggestionRequest(input: EditorSuggestionInput) {
  return {
    entityId: input.entityId,
    name: input.name.trim(),
    entityType: input.entityType,
    body: input.body,
    relationships: input.relationships.map((relationship) => ({
      type: relationship.type.trim(),
      target: relationship.target.trim(),
    })),
    fields: Object.fromEntries(
      input.fields
        .map((field) => [field.key.trim(), field.value.trim()])
        .filter(([key, value]) => key && value),
    ),
  };
}

export function applyLinkSuggestion(body: string, suggestion: WorldEditorLinkSuggestion): string {
  return body.replace(suggestion.matchedText, suggestion.replacementText);
}

export function applyRelationshipSuggestion(
  relationships: Array<{ type: string; target: string }>,
  suggestion: WorldEditorRelationshipSuggestion,
) {
  if (relationships.some((item) => item.type === suggestion.relationship.type && item.target === suggestion.relationship.target)) {
    return relationships;
  }

  return [
    ...relationships,
    {
      type: suggestion.relationship.type,
      target: suggestion.relationship.target,
    },
  ];
}

export function applySummarySuggestion(
  fields: Array<{ key: string; value: string }>,
  suggestion: WorldEditorSummarySuggestion,
) {
  const existingIndex = fields.findIndex((field) => field.key.trim() === suggestion.fieldKey);
  if (existingIndex >= 0) {
    return fields.map((field, index) => (index === existingIndex ? { key: suggestion.fieldKey, value: suggestion.value } : field));
  }

  return [...fields, { key: suggestion.fieldKey, value: suggestion.value }];
}
