import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  AIProviderConfiguration,
  AIProviderKind,
  AISettingsPayload,
  AISettingsUpdateRequest,
  AIWorldContextPayload,
} from "../contracts/index.js";
import type { WorldBrowserEntityDetail } from "../contracts/index.js";
import type { AuthenticatedViewer } from "./auth-service.js";
import { loadWorldBrowserPayload, loadWorldEntityDetail } from "./world-browser-service.js";

type StoredAISettings = {
  kind: AIProviderKind;
  label?: string;
  endpoint?: string;
  model?: string;
  mcpServerName?: string;
  apiKey?: string;
};

const DEFAULT_CANON_POLICY = {
  approvalRequired: true,
  citationsRequired: true,
  autonomousWritesAllowed: false,
} as const;

const DEFAULT_GUARDRAILS = {
  canonBoundary: "Treat markdown files as canon. Do not claim a new fact is canonical unless a human approves it.",
  approvalBoundary: "AI can draft or summarize, but canon-changing edits require explicit human review before save.",
  citationBoundary: "Ground suggestions in visible world context and cite the specific subject fields or related notes used.",
  mutationBoundary: "If provider settings are missing or disabled, no AI action should execute and the app should stay fully usable.",
} as const;

function defaultProviderConfiguration(): AIProviderConfiguration {
  return {
    kind: "disabled",
    label: "AI disabled",
    apiKeyConfigured: false,
    status: {
      configured: false,
      available: false,
      reason: "AI features stay disabled until a provider is configured.",
    },
  };
}

function normalizeLabel(kind: AIProviderKind, label?: string): string {
  if (label?.trim()) {
    return label.trim();
  }

  if (kind === "hosted") {
    return "Hosted provider";
  }

  if (kind === "local") {
    return "Local model runtime";
  }

  if (kind === "mcp") {
    return "MCP mediated provider";
  }

  return "AI disabled";
}

function buildProviderStatus(settings: StoredAISettings): AIProviderConfiguration {
  if (settings.kind === "disabled") {
    return defaultProviderConfiguration();
  }

  const label = normalizeLabel(settings.kind, settings.label);
  const endpoint = settings.endpoint?.trim() || undefined;
  const model = settings.model?.trim() || undefined;
  const mcpServerName = settings.mcpServerName?.trim() || undefined;
  const apiKeyConfigured = Boolean(settings.apiKey?.trim());

  if (settings.kind === "hosted") {
    const configured = Boolean(endpoint && model && apiKeyConfigured);
    return {
      kind: settings.kind,
      label,
      endpoint,
      model,
      apiKeyConfigured,
      status: {
        configured,
        available: configured,
        reason: configured
          ? "Hosted provider baseline is configured."
          : "Hosted providers need an endpoint, model, and API key before AI can run.",
      },
    };
  }

  if (settings.kind === "local") {
    const configured = Boolean(endpoint && model);
    return {
      kind: settings.kind,
      label,
      endpoint,
      model,
      apiKeyConfigured,
      status: {
        configured,
        available: configured,
        reason: configured
          ? "Local provider baseline is configured."
          : "Local providers need an endpoint and model before AI can run.",
      },
    };
  }

  const configured = Boolean(mcpServerName && model);
  return {
    kind: settings.kind,
    label,
    model,
    mcpServerName,
    apiKeyConfigured,
    status: {
      configured,
      available: configured,
      reason: configured
        ? "MCP provider baseline is configured."
        : "MCP providers need a server name and model before AI can run.",
    },
  };
}

function sanitizeStoredSettings(settings: StoredAISettings): StoredAISettings {
  if (settings.kind === "disabled") {
    return { kind: "disabled" };
  }

  return {
    kind: settings.kind,
    label: settings.label?.trim() || undefined,
    endpoint: settings.endpoint?.trim() || undefined,
    model: settings.model?.trim() || undefined,
    mcpServerName: settings.mcpServerName?.trim() || undefined,
    apiKey: settings.apiKey?.trim() || undefined,
  };
}

function buildContextSubject(detail: WorldBrowserEntityDetail) {
  return {
    id: detail.id,
    name: detail.name,
    entityType: detail.entityType,
    visibility: detail.visibility,
    path: detail.path,
    excerpt: detail.excerpt,
    tags: detail.tags,
    aliases: detail.aliases,
    relationships: detail.relationships,
    fields: detail.fields,
  };
}

export class AISettingsError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AISettingsError";
  }
}

export class FileSystemAISettingsStore {
  private readonly settingsRoot: string;
  private readonly settingsPath: string;

  constructor(worldRoot: string) {
    this.settingsRoot = process.env.TRIATHENUM_AI_SETTINGS_ROOT ?? path.join(worldRoot, ".worldforge");
    this.settingsPath = path.join(this.settingsRoot, "ai-settings.json");
  }

  async load(): Promise<AISettingsPayload> {
    const stored = await this.readState();

    return {
      provider: buildProviderStatus(stored),
      availableProviderKinds: ["disabled", "hosted", "local", "mcp"],
      canonPolicy: { ...DEFAULT_CANON_POLICY },
    };
  }

  async save(request: AISettingsUpdateRequest): Promise<AISettingsPayload> {
    const current = await this.readState();
    const nextKind = request.kind;
    const hasApiKeyField = Object.prototype.hasOwnProperty.call(request, "apiKey");
    const apiKey =
      hasApiKeyField && request.apiKey !== undefined
        ? request.apiKey === null
          ? undefined
          : request.apiKey.trim() || undefined
        : current.apiKey;

    const next: StoredAISettings = sanitizeStoredSettings({
      kind: nextKind,
      label: request.label,
      endpoint: request.endpoint,
      model: request.model,
      mcpServerName: request.mcpServerName,
      apiKey,
    });

    this.validate(next);
    await this.writeState(next);
    return this.load();
  }

  private validate(settings: StoredAISettings): void {
    if (settings.kind === "disabled") {
      return;
    }

    if (settings.kind === "hosted" && (!settings.endpoint || !settings.model || !settings.apiKey)) {
      throw new AISettingsError(400, "Hosted providers require an endpoint, model, and API key.");
    }

    if (settings.kind === "local" && (!settings.endpoint || !settings.model)) {
      throw new AISettingsError(400, "Local providers require an endpoint and model.");
    }

    if (settings.kind === "mcp" && (!settings.mcpServerName || !settings.model)) {
      throw new AISettingsError(400, "MCP providers require a server name and model.");
    }
  }

  private async readState(): Promise<StoredAISettings> {
    await mkdir(this.settingsRoot, { recursive: true });

    try {
      const raw = await readFile(this.settingsPath, "utf8");
      return sanitizeStoredSettings(JSON.parse(raw) as StoredAISettings);
    } catch {
      return { kind: "disabled" };
    }
  }

  private async writeState(state: StoredAISettings): Promise<void> {
    await mkdir(this.settingsRoot, { recursive: true });
    await writeFile(this.settingsPath, JSON.stringify(state, null, 2), "utf8");
  }
}

export async function loadAIWorldContext(
  worldRoot: string,
  viewer: AuthenticatedViewer,
  entityId?: string,
): Promise<AIWorldContextPayload> {
  const settingsStore = new FileSystemAISettingsStore(worldRoot);
  const settings = await settingsStore.load();
  const browserPayload = await loadWorldBrowserPayload(worldRoot, viewer);
  const subject = entityId ? await loadWorldEntityDetail(worldRoot, viewer, entityId) : null;

  return {
    provider: settings.provider,
    viewer: {
      role: viewer.role,
      displayName: viewer.displayName,
    },
    guardrails: { ...DEFAULT_GUARDRAILS },
    world: {
      entityCount: browserPayload.entities.length,
      availableTypes: browserPayload.availableTypes,
      visibleTagCount: browserPayload.availableTags.length,
    },
    subject: subject ? buildContextSubject(subject) : null,
    promptScaffold: [
      "Use only the provided world context as evidence.",
      "Separate cited canon from inference.",
      "If context is missing or conflicting, say so explicitly instead of inventing certainty.",
      settings.provider.status.configured
        ? "Return a reviewable draft that a human can approve before any canon update."
        : "Provider is not configured, so keep AI actions disabled and surface only the context contract.",
    ],
  };
}
