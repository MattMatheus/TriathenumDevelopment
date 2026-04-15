import { useEffect, useId, useMemo, useState, useTransition } from "react";

import type {
  AIProviderKind,
  AISettingsPayload,
  AIWorldContextPayload,
  AuthAccountSummary,
  AuthSessionPayload,
  EntityMediaAsset,
  EntityVisibility,
  WorldBrowserEntityDetail,
  WorldBrowserMediaUploadRequest,
  WorldBrowserEntitySaveRequest,
  WorldBrowserPayload,
  WorldEntityType,
} from "../contracts/index.js";
import { nextStoredSessionToken, SESSION_STORAGE_KEY, shouldAttemptWorldLoad } from "./session.js";

const typeLabels: Record<WorldEntityType, string> = {
  character: "Characters",
  location: "Locations",
  faction: "Factions",
  magic_system_or_technology: "Systems",
  artifact: "Artifacts",
  lore_article: "Lore",
};

type EditorFieldRow = {
  key: string;
  value: string;
};

type EditorRelationshipRow = {
  type: string;
  target: string;
};

type EditorState = {
  id?: string;
  name: string;
  entityType: WorldEntityType;
  visibility: EntityVisibility;
  aliasesText: string;
  tagsText: string;
  body: string;
  fields: EditorFieldRow[];
  media: EntityMediaAsset[];
  relationships: EditorRelationshipRow[];
};

type AISettingsFormState = {
  kind: AIProviderKind;
  label: string;
  endpoint: string;
  model: string;
  mcpServerName: string;
  apiKey: string;
};

function formatFieldLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatFieldValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => formatFieldValue(item)).join(", ");
  }

  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => `${formatFieldLabel(key)}: ${formatFieldValue(item)}`)
      .join(" • ");
  }

  return "";
}

function buildEditorState(detail: WorldBrowserEntityDetail): EditorState {
  return {
    id: detail.id,
    name: detail.name,
    entityType: detail.entityType,
    visibility: detail.visibility,
    aliasesText: detail.aliases.join(", "),
    tagsText: detail.tags.join(", "),
    body: detail.body,
    fields: Object.entries(detail.fields).map(([key, value]) => ({
      key,
      value: formatFieldValue(value),
    })),
    media: detail.media.map(({ url: _url, ...asset }) => asset),
    relationships: detail.relationships.map((relationship) => ({
      type: relationship.type,
      target: relationship.target,
    })),
  };
}

function buildNewEditorState(defaultVisibility: EntityVisibility): EditorState {
  return {
    name: "",
    entityType: "lore_article",
    visibility: defaultVisibility,
    aliasesText: "",
    tagsText: "",
    body: "",
    fields: [],
    media: [],
    relationships: [],
  };
}

function buildSaveRequest(editor: EditorState): WorldBrowserEntitySaveRequest {
  return {
    id: editor.id,
    name: editor.name.trim(),
    entityType: editor.entityType,
    visibility: editor.visibility,
    aliases: editor.aliasesText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    tags: editor.tagsText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    body: editor.body,
    fields: Object.fromEntries(
      editor.fields
        .map((field) => [field.key.trim(), field.value.trim()] as const)
        .filter(([key, value]) => key && value),
    ),
    media: editor.media,
    relationships: editor.relationships
      .map((relationship) => ({
        type: relationship.type.trim(),
        target: relationship.target.trim(),
      }))
      .filter((relationship) => relationship.type && relationship.target),
  };
}

function defaultVisibleOption(session: AuthSessionPayload | null): EntityVisibility {
  return session?.visibilityOptions[0] ?? "all_users";
}

function buildAISettingsFormState(settings: AISettingsPayload | null): AISettingsFormState {
  return {
    kind: settings?.provider.kind ?? "disabled",
    label: settings?.provider.kind === "disabled" ? "" : settings?.provider.label ?? "",
    endpoint: settings?.provider.endpoint ?? "",
    model: settings?.provider.model ?? "",
    mcpServerName: settings?.provider.mcpServerName ?? "",
    apiKey: "",
  };
}

function readStoredSessionToken(): string | null {
  return window.localStorage.getItem(SESSION_STORAGE_KEY);
}

function writeStoredSessionToken(token: string | null) {
  if (!token) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, token);
}

export function App() {
  const typeFilterId = useId();
  const tagFilterId = useId();
  const searchId = useId();
  const [isPending, startTransition] = useTransition();
  const [payload, setPayload] = useState<WorldBrowserPayload | null>(null);
  const [session, setSession] = useState<AuthSessionPayload | null>(null);
  const [accounts, setAccounts] = useState<AuthAccountSummary[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [detail, setDetail] = useState<WorldBrowserEntityDetail | null>(null);
  const [typeFilter, setTypeFilter] = useState<WorldEntityType | "all">("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isLoadingWorld, setIsLoadingWorld] = useState(false);
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [loginEmail, setLoginEmail] = useState("owner@worldforge.local");
  const [loginPassword, setLoginPassword] = useState("worldforge-owner");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [provisionEmail, setProvisionEmail] = useState("");
  const [provisionName, setProvisionName] = useState("");
  const [provisionPassword, setProvisionPassword] = useState("");
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [aiSettings, setAISettings] = useState<AISettingsPayload | null>(null);
  const [aiContext, setAIContext] = useState<AIWorldContextPayload | null>(null);
  const [aiFormState, setAIFormState] = useState<AISettingsFormState>(buildAISettingsFormState(null));
  const [isLoadingAISettings, setIsLoadingAISettings] = useState(false);
  const [isSavingAISettings, setIsSavingAISettings] = useState(false);
  const [isLoadingAIContext, setIsLoadingAIContext] = useState(false);

  async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    const token = readStoredSessionToken();
    if (token) {
      headers.set("x-worldforge-session", token);
    }

    const response = await fetch(input, {
      ...init,
      headers,
    });
    writeStoredSessionToken(
      nextStoredSessionToken(readStoredSessionToken(), response.status, response.headers.get("x-worldforge-session")),
    );

    return response;
  }

  useEffect(() => {
    let cancelled = false;

    async function loadWorld() {
      if (!shouldAttemptWorldLoad(readStoredSessionToken(), Boolean(session))) {
        setIsLoadingWorld(false);
        return;
      }

      setIsLoadingWorld(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (searchQuery.trim()) {
          params.set("q", searchQuery.trim());
        }

        const response = await apiFetch(`/api/world/entities${params.size ? `?${params.toString()}` : ""}`);
        if (response.status === 401) {
          if (!cancelled) {
            writeStoredSessionToken(null);
            startTransition(() => {
              setSession(null);
              setPayload(null);
              setAccounts([]);
              setSelectedEntityId(null);
              setDetail(null);
              setEditorState(null);
              setIsEditing(false);
            });
          }
          return;
        }

        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Unable to load the world browser.");
        }

        const nextPayload = (await response.json()) as WorldBrowserPayload;
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setPayload(nextPayload);
          setSession(nextPayload.session);
          setSelectedEntityId((current) => {
            if (isEditing && current === null) {
              return null;
            }

            return current ?? nextPayload.entities[0]?.id ?? null;
          });
        });
      } catch (caughtError) {
        if (!cancelled) {
          writeStoredSessionToken(null);
          setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingWorld(false);
        }
      }
    }

    void loadWorld();

    return () => {
      cancelled = true;
    };
  }, [isEditing, refreshVersion, searchQuery]);

  useEffect(() => {
    if (!session?.canManageAccounts) {
      setAccounts([]);
      return;
    }

    let cancelled = false;

    async function loadAccounts() {
      try {
        const response = await apiFetch("/api/auth/accounts");
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Unable to load accounts.");
        }

        const body = (await response.json()) as { accounts: AuthAccountSummary[] };
        if (!cancelled) {
          setAccounts(body.accounts);
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
        }
      }
    }

    void loadAccounts();

    return () => {
      cancelled = true;
    };
  }, [session, refreshVersion]);

  useEffect(() => {
    if (!session) {
      setAISettings(null);
      setAIContext(null);
      setAIFormState(buildAISettingsFormState(null));
      return;
    }

    let cancelled = false;
    setIsLoadingAISettings(true);

    async function loadAISettings() {
      try {
        const response = await apiFetch("/api/ai/settings");
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Unable to load AI settings.");
        }

        const nextSettings = (await response.json()) as AISettingsPayload;
        if (!cancelled) {
          setAISettings(nextSettings);
          setAIFormState(buildAISettingsFormState(nextSettings));
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAISettings(false);
        }
      }
    }

    void loadAISettings();

    return () => {
      cancelled = true;
    };
  }, [session, refreshVersion]);

  useEffect(() => {
    if (!session) {
      setAIContext(null);
      return;
    }

    let cancelled = false;
    setIsLoadingAIContext(true);

    async function loadAIContext() {
      try {
        const params = new URLSearchParams();
        if (selectedEntityId) {
          params.set("entityId", selectedEntityId);
        }

        const response = await apiFetch(`/api/ai/context${params.size ? `?${params.toString()}` : ""}`);
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Unable to load AI context.");
        }

        const nextContext = (await response.json()) as AIWorldContextPayload;
        if (!cancelled) {
          setAIContext(nextContext);
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAIContext(false);
        }
      }
    }

    void loadAIContext();

    return () => {
      cancelled = true;
    };
  }, [selectedEntityId, session, refreshVersion]);

  useEffect(() => {
    if (!selectedEntityId || !session) {
      setDetail(null);
      return;
    }

    const entityId = selectedEntityId;
    let cancelled = false;
    setIsLoadingDetail(true);

    async function loadDetail() {
      try {
        const response = await apiFetch(`/api/world/entities/${encodeURIComponent(entityId)}`);
        if (response.status === 401) {
          if (!cancelled) {
            writeStoredSessionToken(null);
            setSession(null);
            setPayload(null);
            setSelectedEntityId(null);
            setDetail(null);
          }
          return;
        }

        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Unable to load entity detail.");
        }

        const nextDetail = (await response.json()) as WorldBrowserEntityDetail;
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setDetail(nextDetail);
          if (!isEditing) {
            setEditorState(buildEditorState(nextDetail));
          }
        });
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDetail(false);
        }
      }
    }

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [isEditing, selectedEntityId, session]);

  const filteredEntities = useMemo(() => {
    const entities = payload?.entities ?? [];

    return entities.filter((entity) => {
      if (typeFilter !== "all" && entity.entityType !== typeFilter) {
        return false;
      }

      if (tagFilter !== "all" && !entity.tags.includes(tagFilter)) {
        return false;
      }

      return true;
    });
  }, [payload, tagFilter, typeFilter]);

  useEffect(() => {
    if (isEditing) {
      return;
    }

    if (!filteredEntities.length) {
      setSelectedEntityId(null);
      return;
    }

    if (!selectedEntityId || !filteredEntities.some((entity) => entity.id === selectedEntityId)) {
      setSelectedEntityId(filteredEntities[0]?.id ?? null);
    }
  }, [filteredEntities, isEditing, selectedEntityId]);

  async function handleSaveEditor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editorState || !editorState.name.trim()) {
      setError("Name is required before saving.");
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const request = buildSaveRequest(editorState);
      const isUpdate = Boolean(request.id);
      const response = await apiFetch(
        isUpdate ? `/api/world/entities/${encodeURIComponent(request.id!)}` : "/api/world/entities",
        {
          method: isUpdate ? "PUT" : "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(request),
        },
      );

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Unable to save entity.");
      }

      const saved = (await response.json()) as WorldBrowserEntityDetail;
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.set("q", searchQuery.trim());
      }

      const refreshed = await apiFetch(`/api/world/entities${params.size ? `?${params.toString()}` : ""}`);
      if (!refreshed.ok) {
        const body = (await refreshed.json()) as { error?: string };
        throw new Error(body.error ?? "Unable to refresh the world browser.");
      }

      const refreshedPayload = (await refreshed.json()) as WorldBrowserPayload;

      startTransition(() => {
        setPayload(refreshedPayload);
        setSession(refreshedPayload.session);
        setDetail(saved);
        setEditorState(buildEditorState(saved));
        setSelectedEntityId(saved.id);
        setIsEditing(false);
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSigningIn(true);

    try {
      const response = await apiFetch("/api/auth/session", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Unable to sign in.");
      }

      const nextSession = (await response.json()) as AuthSessionPayload;
      startTransition(() => {
        setSession(nextSession);
        setRefreshVersion((current) => current + 1);
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
    } finally {
      setIsSigningIn(false);
    }
  }

  async function handleSignOut() {
    setError(null);

    try {
      await apiFetch("/api/auth/session", {
        method: "DELETE",
      });
    } finally {
      writeStoredSessionToken(null);
      startTransition(() => {
        setSession(null);
        setPayload(null);
        setAccounts([]);
        setDetail(null);
        setEditorState(null);
        setSelectedEntityId(null);
        setIsEditing(false);
      });
    }
  }

  async function handleProvisionAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsProvisioning(true);

    try {
      const response = await apiFetch("/api/auth/accounts", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: provisionEmail,
          displayName: provisionName,
          password: provisionPassword,
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Unable to provision collaborator.");
      }

      const account = (await response.json()) as AuthAccountSummary;
      setAccounts((current) => [...current, account].sort((left, right) => left.email.localeCompare(right.email)));
      setProvisionEmail("");
      setProvisionName("");
      setProvisionPassword("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
    } finally {
      setIsProvisioning(false);
    }
  }

  function mediaUrl(url: string): string {
    const token = readStoredSessionToken();
    if (!token) {
      return url;
    }

    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}sessionToken=${encodeURIComponent(token)}`;
  }

  async function handleUploadMedia(file: File) {
    if (!editorState?.id) {
      setError("Save the entity first before attaching media.");
      return;
    }

    setError(null);
    setIsUploadingMedia(true);

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error ?? new Error("Unable to read file."));
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.readAsDataURL(file);
      });

      const payload: WorldBrowserMediaUploadRequest = {
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        base64Data,
      };

      const response = await apiFetch(`/api/world/entities/${encodeURIComponent(editorState.id)}/media`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Unable to attach media.");
      }

      const nextDetail = (await response.json()) as WorldBrowserEntityDetail;
      startTransition(() => {
        setDetail(nextDetail);
        setEditorState(buildEditorState(nextDetail));
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
    } finally {
      setIsUploadingMedia(false);
    }
  }

  async function handleSaveAISettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSavingAISettings(true);

    try {
      const response = await apiFetch("/api/ai/settings", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          kind: aiFormState.kind,
          label: aiFormState.label,
          endpoint: aiFormState.kind === "hosted" || aiFormState.kind === "local" ? aiFormState.endpoint : undefined,
          model: aiFormState.kind === "disabled" ? undefined : aiFormState.model,
          mcpServerName: aiFormState.kind === "mcp" ? aiFormState.mcpServerName : undefined,
          apiKey:
            aiFormState.kind === "hosted"
              ? aiFormState.apiKey || undefined
              : null,
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Unable to save AI settings.");
      }

      const nextSettings = (await response.json()) as AISettingsPayload;
      setAISettings(nextSettings);
      setAIFormState(buildAISettingsFormState(nextSettings));
      setRefreshVersion((current) => current + 1);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
    } finally {
      setIsSavingAISettings(false);
    }
  }

  if (!session) {
    return (
      <main className="shell">
        <section className="hero">
          <p className="eyebrow">WorldForge Access</p>
          <h1>Sign in before browsing or editing this world.</h1>
          <p className="lede">
            WorldForge keeps the useful core simple: one owner account can provision collaborators, and sessions stay
            signed in across normal mobile use.
          </p>
        </section>

        <section className="auth-layout">
          <article className="panel auth-panel">
            <header className="panel-header">
              <h2>Persistent Session Login</h2>
              <p>Use the owner or collaborator account that was provisioned for this world.</p>
            </header>

            <form className="stack" onSubmit={handleSignIn}>
              <label className="field">
                <span>Email</span>
                <input value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} />
              </label>

              <label className="field">
                <span>Password</span>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                />
              </label>

              <button type="submit" disabled={isSigningIn}>
                {isSigningIn ? "Signing In..." : "Sign In"}
              </button>
            </form>

            {error ? <p className="error-inline auth-error">{error}</p> : null}
          </article>

          <article className="panel auth-panel">
            <header className="panel-header">
              <h2>Bootstrap Note</h2>
              <p>The first owner account is bootstrapped from environment variables or local defaults.</p>
            </header>
            <div className="stack">
              <p className="placeholder">
                Default local credentials are <strong>owner@worldforge.local</strong> and <strong>worldforge-owner</strong>
                until self-hosted values override them.
              </p>
              <p className="placeholder">
                After signing in as the owner, provision collaborator accounts directly from the browser. No self-service
                signup is exposed in this baseline.
              </p>
            </div>
          </article>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-bar">
          <div>
            <p className="eyebrow">WorldForge Browser</p>
            <h1>Browse and shape your world without touching raw markdown.</h1>
            <p className="lede">
              Browse calm entity views, then shift directly into a safe editing surface when you need to update canon.
            </p>
          </div>

          <div className="session-card">
            <p className="session-label">Signed in as</p>
            <strong>{session.viewer.displayName}</strong>
            <span>
              {session.viewer.email} • {session.viewer.role}
            </span>
            <button type="button" className="secondary-action compact" onClick={handleSignOut}>
              Sign Out
            </button>
          </div>
        </div>
      </section>

      <section className="workspace">
        <section className="panel browser-panel">
          <header className="panel-header">
            <h2>World Browser</h2>
            <p>Filter by type or tag, then open one entity at a time.</p>
          </header>

          <label className="field" htmlFor={searchId}>
            <span>Search</span>
            <input
              id={searchId}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search names, tags, and body text"
            />
          </label>

          <label className="field" htmlFor={typeFilterId}>
            <span>Entity Type</span>
            <select
              id={typeFilterId}
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as WorldEntityType | "all")}
            >
              <option value="all">All Types</option>
              {(payload?.availableTypes ?? []).map((type) => (
                <option key={type} value={type}>
                  {typeLabels[type]}
                </option>
              ))}
            </select>
          </label>

          <label className="field" htmlFor={tagFilterId}>
            <span>Tag</span>
            <select id={tagFilterId} value={tagFilter} onChange={(event) => setTagFilter(event.target.value)}>
              <option value="all">All Tags</option>
              {(payload?.availableTags ?? []).map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </label>

          <div className="browser-meta">
            <span>{filteredEntities.length} visible entries</span>
            <span>{isLoadingWorld ? "Refreshing..." : "Session persisted"}</span>
            {error ? <span className="error-inline">{error}</span> : null}
          </div>

          <button
            type="button"
            className="secondary-action"
            onClick={() => {
              setIsEditing(true);
              setSelectedEntityId(null);
              setDetail(null);
              setEditorState(buildNewEditorState(defaultVisibleOption(session)));
            }}
          >
            New Entity
          </button>

          <ul className="entity-list">
            {filteredEntities.map((entity) => (
              <li key={entity.id}>
                <button
                  type="button"
                  className={`entity-card${selectedEntityId === entity.id ? " active" : ""}`}
                  onClick={() => {
                    setIsEditing(false);
                    setSelectedEntityId(entity.id);
                  }}
                >
                  <span className="entity-card-type">{typeLabels[entity.entityType]}</span>
                  <strong>{entity.name}</strong>
                  <p>{entity.excerpt}</p>
                  <div className="tag-row">
                    {entity.tags.map((tag) => (
                      <span key={tag} className="tag-chip">
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {!filteredEntities.length ? <p className="placeholder">No entities match the current filters.</p> : null}

          <section className="detail-section">
            <div className="section-row">
              <h3>Stub Queue</h3>
              <span className="queue-count">{payload?.unresolvedReferences.length ?? 0}</span>
            </div>
            {(payload?.unresolvedReferences.length ?? 0) > 0 ? (
              <ul className="sources">
                {payload?.unresolvedReferences.map((reference) => (
                  <li key={`${reference.sourceEntityId}-${reference.targetText}`}>
                    <strong>{reference.targetText}</strong>
                    <span>Referenced by {reference.sourceName}</span>
                    <p>{reference.referenceKind === "wikilink" ? "Unresolved wikilink" : "Unresolved relationship target"}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="placeholder">No unresolved references are waiting right now.</p>
            )}
          </section>

          {session.canManageAccounts ? (
            <section className="detail-section">
              <div className="section-row">
                <h3>Collaborator Access</h3>
                <span className="queue-count">{accounts.length}</span>
              </div>

              <form className="stack" onSubmit={handleProvisionAccount}>
                <label className="field">
                  <span>Email</span>
                  <input value={provisionEmail} onChange={(event) => setProvisionEmail(event.target.value)} />
                </label>

                <label className="field">
                  <span>Display Name</span>
                  <input value={provisionName} onChange={(event) => setProvisionName(event.target.value)} />
                </label>

                <label className="field">
                  <span>Temporary Password</span>
                  <input
                    type="password"
                    value={provisionPassword}
                    onChange={(event) => setProvisionPassword(event.target.value)}
                  />
                </label>

                <button type="submit" disabled={isProvisioning}>
                  {isProvisioning ? "Provisioning..." : "Create Collaborator"}
                </button>
              </form>

              <ul className="sources">
                {accounts.map((account) => (
                  <li key={account.id}>
                    <strong>{account.displayName}</strong>
                    <span>{account.email}</span>
                    <p>{account.role}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </section>

        <section className="results">
          <article className="panel">
            <header className="panel-header">
              <h2>{isEditing ? "Entity Editor" : "Entity Detail"}</h2>
              <p>
                {isEditing
                  ? "Structured fields and markdown body stay in one safe save flow."
                  : "Readable by default, with canon structure visible when it helps."}
              </p>
            </header>
            {isEditing && editorState ? (
              <form className="editor-form stack" onSubmit={handleSaveEditor}>
                <div className="detail-hero">
                  <div>
                    <p className="detail-type">Editing</p>
                    <h3 className="detail-title">{editorState.name || "New Entity"}</h3>
                  </div>
                </div>

                <label className="field">
                  <span>Name</span>
                  <input
                    value={editorState.name}
                    onChange={(event) =>
                      setEditorState((current) => (current ? { ...current, name: event.target.value } : current))
                    }
                  />
                </label>

                <div className="editor-columns">
                  <label className="field">
                    <span>Type</span>
                    <select
                      value={editorState.entityType}
                      onChange={(event) =>
                        setEditorState((current) =>
                          current ? { ...current, entityType: event.target.value as WorldEntityType } : current,
                        )
                      }
                    >
                      {Object.entries(typeLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Visibility</span>
                    <select
                      value={editorState.visibility}
                      onChange={(event) =>
                        setEditorState((current) =>
                          current ? { ...current, visibility: event.target.value as EntityVisibility } : current,
                        )
                      }
                    >
                      {session.visibilityOptions.map((visibility) => (
                        <option key={visibility} value={visibility}>
                          {visibility.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="field">
                  <span>Aliases</span>
                  <input
                    value={editorState.aliasesText}
                    onChange={(event) =>
                      setEditorState((current) =>
                        current ? { ...current, aliasesText: event.target.value } : current,
                      )
                    }
                    placeholder="Comma-separated aliases"
                  />
                </label>

                <label className="field">
                  <span>Tags</span>
                  <input
                    value={editorState.tagsText}
                    onChange={(event) =>
                      setEditorState((current) => (current ? { ...current, tagsText: event.target.value } : current))
                    }
                    placeholder="Comma-separated tags"
                  />
                </label>

                <section className="detail-section">
                  <div className="section-row">
                    <h3>Structured Fields</h3>
                    <button
                      type="button"
                      className="secondary-action compact"
                      onClick={() =>
                        setEditorState((current) =>
                          current ? { ...current, fields: [...current.fields, { key: "", value: "" }] } : current,
                        )
                      }
                    >
                      Add Field
                    </button>
                  </div>
                  <div className="editor-list">
                    {editorState.fields.map((field, index) => (
                      <div key={`${field.key}-${index}`} className="editor-row">
                        <input
                          value={field.key}
                          placeholder="field_key"
                          onChange={(event) =>
                            setEditorState((current) =>
                              current
                                ? {
                                    ...current,
                                    fields: current.fields.map((item, itemIndex) =>
                                      itemIndex === index ? { ...item, key: event.target.value } : item,
                                    ),
                                  }
                                : current,
                            )
                          }
                        />
                        <input
                          value={field.value}
                          placeholder="Field value"
                          onChange={(event) =>
                            setEditorState((current) =>
                              current
                                ? {
                                    ...current,
                                    fields: current.fields.map((item, itemIndex) =>
                                      itemIndex === index ? { ...item, value: event.target.value } : item,
                                    ),
                                  }
                                : current,
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>
                </section>

                <section className="detail-section">
                  <div className="section-row">
                    <h3>Relationships</h3>
                    <button
                      type="button"
                      className="secondary-action compact"
                      onClick={() =>
                        setEditorState((current) =>
                          current
                            ? {
                                ...current,
                                relationships: [...current.relationships, { type: "", target: "" }],
                              }
                            : current,
                        )
                      }
                    >
                      Add Relationship
                    </button>
                  </div>
                  <div className="editor-list">
                    {editorState.relationships.map((relationship, index) => (
                      <div key={`${relationship.type}-${relationship.target}-${index}`} className="editor-row">
                        <input
                          value={relationship.type}
                          placeholder="relationship_type"
                          onChange={(event) =>
                            setEditorState((current) =>
                              current
                                ? {
                                    ...current,
                                    relationships: current.relationships.map((item, itemIndex) =>
                                      itemIndex === index ? { ...item, type: event.target.value } : item,
                                    ),
                                  }
                                : current,
                            )
                          }
                        />
                        <input
                          value={relationship.target}
                          placeholder="Target entity"
                          onChange={(event) =>
                            setEditorState((current) =>
                              current
                                ? {
                                    ...current,
                                    relationships: current.relationships.map((item, itemIndex) =>
                                      itemIndex === index ? { ...item, target: event.target.value } : item,
                                    ),
                                  }
                                : current,
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>
                </section>

                <label className="field">
                  <span>Body</span>
                  <textarea
                    rows={10}
                    value={editorState.body}
                    onChange={(event) =>
                      setEditorState((current) => (current ? { ...current, body: event.target.value } : current))
                    }
                  />
                </label>

                <section className="detail-section">
                  <div className="section-row">
                    <h3>Media Attachments</h3>
                    <span className="queue-count">{editorState.media.length}</span>
                  </div>
                  {editorState.id ? (
                    <label className="field">
                      <span>Attach file or image</span>
                      <input
                        type="file"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            void handleUploadMedia(file);
                            event.target.value = "";
                          }
                        }}
                      />
                    </label>
                  ) : (
                    <p className="placeholder">Save this entity once before attaching media.</p>
                  )}
                  {isUploadingMedia ? <p className="placeholder">Uploading media...</p> : null}
                  <ul className="sources">
                    {editorState.media.map((asset) => (
                      <li key={asset.id}>
                        <strong>{asset.originalFileName}</strong>
                        <span>{asset.kind}</span>
                        <p>{asset.caption ?? asset.alt ?? asset.path}</p>
                      </li>
                    ))}
                  </ul>
                </section>

                <div className="editor-actions">
                  <button type="submit" disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Entity"}
                  </button>
                  <button
                    type="button"
                    className="secondary-action"
                    onClick={() => {
                      setIsEditing(false);
                      if (detail) {
                        setEditorState(buildEditorState(detail));
                      }
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : detail ? (
              <>
                <div className="detail-hero">
                  <div>
                    <p className="detail-type">{typeLabels[detail.entityType]}</p>
                    <h3 className="detail-title">{detail.name}</h3>
                    <p className="summary">{detail.excerpt}</p>
                  </div>
                  <span className="visibility-chip">{detail.visibility.replace(/_/g, " ")}</span>
                </div>

                <div className="editor-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setEditorState(buildEditorState(detail));
                      setIsEditing(true);
                    }}
                  >
                    Edit Entity
                  </button>
                </div>

                <div className="detail-grid">
                  <section className="detail-section">
                    <h3>Media</h3>
                    {detail.media.length ? (
                      <div className="media-grid">
                        {detail.media.map((asset) => (
                          <article key={asset.id} className="media-card">
                            {asset.kind === "image" ? (
                              <img src={mediaUrl(asset.url)} alt={asset.alt ?? asset.originalFileName} className="media-preview" />
                            ) : null}
                            <strong>{asset.originalFileName}</strong>
                            <p>{asset.caption ?? asset.alt ?? asset.contentType}</p>
                            <a href={mediaUrl(asset.url)} target="_blank" rel="noreferrer">
                              Open media
                            </a>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p>No media attached yet.</p>
                    )}
                  </section>

                  <section className="detail-section">
                    <h3>Body</h3>
                    <p className="body-copy">{detail.body}</p>
                  </section>

                  <section className="detail-section">
                    <h3>Aliases</h3>
                    <p>{detail.aliases.length ? detail.aliases.join(", ") : "No aliases yet."}</p>
                  </section>

                  <section className="detail-section">
                    <h3>Tags</h3>
                    <div className="tag-row">
                      {detail.tags.length ? (
                        detail.tags.map((tag) => (
                          <span key={tag} className="tag-chip">
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span>No tags yet.</span>
                      )}
                    </div>
                  </section>
                </div>
              </>
            ) : (
              <p className="placeholder">
                {isPending || isLoadingDetail ? "Loading entity detail..." : "Select an entity to open its detail view."}
              </p>
            )}
          </article>

          <article className="panel">
            <header className="panel-header">
              <h2>Structured Context</h2>
              <p>Metadata stays available without pushing the reader into raw schema syntax.</p>
            </header>
            {detail ? (
              <div className="stack">
                <section>
                  <h3>Structured Fields</h3>
                  <ul>
                    {Object.entries(detail.fields).map(([key, value]) => (
                      <li key={key}>
                        <strong>{formatFieldLabel(key)}:</strong> {formatFieldValue(value)}
                      </li>
                    ))}
                  </ul>
                </section>
                <details open>
                  <summary>Relationships</summary>
                  <ul className="sources">
                    {detail.relationships.map((relationship) => (
                      <li key={`${relationship.type}-${relationship.target}`}>
                        <strong>{formatFieldLabel(relationship.type)}</strong>
                        <span>{relationship.target}</span>
                        <p>{relationship.summary ?? "Structured relationship recorded for this entity."}</p>
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            ) : (
              <p className="placeholder">Structured fields and relationships appear here for the selected entity.</p>
            )}
          </article>

          <article className="panel">
            <header className="panel-header">
              <h2>Connections</h2>
              <p>Backlinks help the world feel connected without jumping to a full graph view yet.</p>
            </header>
            {detail ? (
              <div className="stack">
                <section>
                  <h3>Backlinks</h3>
                  <ul>
                    {detail.backlinks.map((item) => (
                      <li key={`${item.sourceEntityId}-${item.referenceKind}-${item.targetText}`}>
                        <strong>{item.sourceName}</strong> references this entry via {item.referenceKind}.
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="detail-section">
                  <h3>Source Path</h3>
                  <p className="path-copy">{detail.path}</p>
                </section>
              </div>
            ) : (
              <p className="placeholder">Select an entity to inspect backlinks and source location.</p>
            )}
          </article>

          <article className="panel">
            <header className="panel-header">
              <h2>AI Baseline</h2>
              <p>Optional provider setup and a shared world-context contract for later AI workflows.</p>
            </header>

            <section className="detail-section">
              <div className="section-row">
                <h3>Provider Status</h3>
                <span className="queue-count">
                  {isLoadingAISettings ? "..." : aiSettings?.provider.kind ?? "disabled"}
                </span>
              </div>
              <p className="placeholder">
                {aiSettings?.provider.status.reason ?? "AI stays disabled until a provider is configured."}
              </p>
              <p>
                <strong>Approval required:</strong> {aiSettings?.canonPolicy.approvalRequired ? "Yes" : "No"} •{" "}
                <strong>Citations required:</strong> {aiSettings?.canonPolicy.citationsRequired ? "Yes" : "No"}
              </p>
            </section>

            <form className="stack" onSubmit={handleSaveAISettings}>
              <label className="field">
                <span>Provider Kind</span>
                <select
                  value={aiFormState.kind}
                  onChange={(event) =>
                    setAIFormState((current) => ({
                      ...current,
                      kind: event.target.value as AIProviderKind,
                    }))
                  }
                >
                  {(aiSettings?.availableProviderKinds ?? ["disabled", "hosted", "local", "mcp"]).map((kind) => (
                    <option key={kind} value={kind}>
                      {formatFieldLabel(kind)}
                    </option>
                  ))}
                </select>
              </label>

              {aiFormState.kind !== "disabled" ? (
                <>
                  <label className="field">
                    <span>Provider Label</span>
                    <input
                      value={aiFormState.label}
                      onChange={(event) =>
                        setAIFormState((current) => ({
                          ...current,
                          label: event.target.value,
                        }))
                      }
                      placeholder="Optional display name"
                    />
                  </label>

                  {aiFormState.kind === "hosted" || aiFormState.kind === "local" ? (
                    <label className="field">
                      <span>Endpoint</span>
                      <input
                        value={aiFormState.endpoint}
                        onChange={(event) =>
                          setAIFormState((current) => ({
                            ...current,
                            endpoint: event.target.value,
                          }))
                        }
                        placeholder="http://localhost:11434/v1 or provider URL"
                      />
                    </label>
                  ) : null}

                  {aiFormState.kind === "mcp" ? (
                    <label className="field">
                      <span>MCP Server Name</span>
                      <input
                        value={aiFormState.mcpServerName}
                        onChange={(event) =>
                          setAIFormState((current) => ({
                            ...current,
                            mcpServerName: event.target.value,
                          }))
                        }
                        placeholder="worldforge-assistant"
                      />
                    </label>
                  ) : null}

                  <label className="field">
                    <span>Model</span>
                    <input
                      value={aiFormState.model}
                      onChange={(event) =>
                        setAIFormState((current) => ({
                          ...current,
                          model: event.target.value,
                        }))
                      }
                      placeholder="gpt-5-mini, llama3, or similar"
                    />
                  </label>

                  {aiFormState.kind === "hosted" ? (
                    <label className="field">
                      <span>API Key</span>
                      <input
                        type="password"
                        value={aiFormState.apiKey}
                        onChange={(event) =>
                          setAIFormState((current) => ({
                            ...current,
                            apiKey: event.target.value,
                          }))
                        }
                        placeholder={aiSettings?.provider.apiKeyConfigured ? "Stored key will be kept if left blank" : "Paste API key"}
                      />
                    </label>
                  ) : null}
                </>
              ) : null}

              <button type="submit" disabled={isSavingAISettings}>
                {isSavingAISettings ? "Saving AI Baseline..." : "Save AI Baseline"}
              </button>
            </form>

            <section className="detail-section">
              <div className="section-row">
                <h3>World Context Contract</h3>
                <span className="queue-count">{isLoadingAIContext ? "..." : aiContext?.world.entityCount ?? 0}</span>
              </div>
              {aiContext ? (
                <div className="stack">
                  <p className="placeholder">
                    Visible types: {aiContext.world.availableTypes.join(", ") || "none"} • Tags: {aiContext.world.visibleTagCount}
                  </p>
                  <ul className="sources">
                    <li>
                      <strong>Canon boundary</strong>
                      <p>{aiContext.guardrails.canonBoundary}</p>
                    </li>
                    <li>
                      <strong>Approval boundary</strong>
                      <p>{aiContext.guardrails.approvalBoundary}</p>
                    </li>
                    <li>
                      <strong>Citation boundary</strong>
                      <p>{aiContext.guardrails.citationBoundary}</p>
                    </li>
                  </ul>
                  {aiContext.subject ? (
                    <div className="detail-section">
                      <h3>Selected Subject</h3>
                      <p>
                        <strong>{aiContext.subject.name}</strong> • {typeLabels[aiContext.subject.entityType]}
                      </p>
                      <p className="path-copy">{aiContext.subject.path}</p>
                    </div>
                  ) : (
                    <p className="placeholder">Select an entity to preview the subject-specific AI context payload.</p>
                  )}
                </div>
              ) : (
                <p className="placeholder">Loading the shared world-context contract...</p>
              )}
            </section>
          </article>
        </section>
      </section>
    </main>
  );
}
