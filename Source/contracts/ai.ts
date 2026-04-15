import type { AuthRole } from "./auth.js";
import type { EntityRelationshipReference, EntityVisibility, WorldEntityType } from "./world.js";

export type AIProviderKind = "disabled" | "hosted" | "local" | "mcp";

export type AIProviderStatus = {
  configured: boolean;
  available: boolean;
  reason: string;
};

export type AIProviderConfiguration = {
  kind: AIProviderKind;
  label: string;
  endpoint?: string;
  model?: string;
  mcpServerName?: string;
  apiKeyConfigured: boolean;
  status: AIProviderStatus;
};

export type AISettingsPayload = {
  provider: AIProviderConfiguration;
  availableProviderKinds: AIProviderKind[];
  canonPolicy: {
    approvalRequired: boolean;
    citationsRequired: boolean;
    autonomousWritesAllowed: boolean;
  };
};

export type AISettingsUpdateRequest = {
  kind: AIProviderKind;
  label?: string;
  endpoint?: string;
  model?: string;
  mcpServerName?: string;
  apiKey?: string | null;
};

export type AIWorldContextGuardrails = {
  canonBoundary: string;
  approvalBoundary: string;
  citationBoundary: string;
  mutationBoundary: string;
};

export type AIWorldContextSubject = {
  id: string;
  name: string;
  entityType: WorldEntityType;
  visibility: EntityVisibility;
  path: string;
  excerpt: string;
  tags: string[];
  aliases: string[];
  relationships: EntityRelationshipReference[];
  fields: Record<string, unknown>;
};

export type AIWorldContextPayload = {
  provider: AIProviderConfiguration;
  viewer: {
    role: AuthRole;
    displayName: string;
  };
  guardrails: AIWorldContextGuardrails;
  world: {
    entityCount: number;
    availableTypes: WorldEntityType[];
    visibleTagCount: number;
  };
  subject: AIWorldContextSubject | null;
  promptScaffold: string[];
};
