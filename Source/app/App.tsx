import { useEffect, useId, useMemo, useState, useTransition } from "react";

import type {
  AIProviderKind,
  AISettingsPayload,
  AIWorldContextPayload,
  AuthAccountSummary,
  AuthSessionPayload,
  EntityMediaAsset,
  EntityVisibility,
  WorldConsistencyFinding,
  WorldConsistencyReviewPayload,
  WorldDigestPayload,
  WorldEditorLinkSuggestion,
  WorldEditorProseAction,
  WorldEditorProseAssistPayload,
  WorldEditorRelationshipSuggestion,
  WorldEditorSuggestionPayload,
  WorldEditorSummarySuggestion,
  WorldEntityDraftPayload,
  WorldGraphPayload,
  WorldMapNavigationPayload,
  WorldSearchMode,
  WorldSemanticSearchPayload,
  WorldTimelinePayload,
  WorldBrowserEntityDetail,
  WorldBrowserMediaUploadRequest,
  WorldBrowserEntitySaveRequest,
  WorldBrowserPayload,
  WorldEntityType,
} from "../contracts/index.js";
import {
  applyEditorProseResult,
  buildEditorProseAssistRequest,
  previewEditorProseResult,
  rejectEditorProseResult,
} from "./editor-prose-assistance.js";
import {
  applyLinkSuggestion,
  applyRelationshipSuggestion,
  applySummarySuggestion,
  buildEditorSuggestionRequest,
} from "./editor-suggestions.js";

const typeLabels: Record<WorldEntityType, string> = {
  character: "Characters",
  location: "Locations",
  faction: "Factions",
  magic_system_or_technology: "Systems",
  artifact: "Artifacts",
  lore_article: "Lore",
};

const proseActionLabels: Record<WorldEditorProseAction, string> = {
  summarize: "Summarize",
  rephrase: "Rephrase",
  continue: "Continue",
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

type DraftProvenanceState = NonNullable<WorldEntityDraftPayload["provenance"]>;
type ProseSuggestionState = WorldEditorProseAssistPayload & {
  status: "ready";
  suggestedText: string;
};
type EditorSuggestionState = WorldEditorSuggestionPayload & {
  status: "ready";
};
type ConsistencyReviewState = WorldConsistencyReviewPayload & {
  status: "ready";
};
type ConsistencyFindingState = Record<string, "open" | "deferred" | "dismissed">;

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

function buildEditorStateFromDraft(
  draft: NonNullable<WorldEntityDraftPayload["draft"]>,
  defaultVisibility: EntityVisibility,
): EditorState {
  return {
    id: draft.id,
    name: draft.name,
    entityType: draft.entityType,
    visibility: draft.visibility ?? defaultVisibility,
    aliasesText: draft.aliases.join(", "),
    tagsText: draft.tags.join(", "),
    body: draft.body,
    fields: Object.entries(draft.fields).map(([key, value]) => ({
      key,
      value,
    })),
    media: draft.media,
    relationships: draft.relationships.map((relationship) => ({
      type: relationship.type,
      target: relationship.target,
    })),
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

export function App() {
  const typeFilterId = useId();
  const tagFilterId = useId();
  const searchId = useId();
  const searchModeId = useId();
  const proseActionId = useId();
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
  const [searchMode, setSearchMode] = useState<WorldSearchMode>("keyword");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
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
  const [semanticResult, setSemanticResult] = useState<WorldSemanticSearchPayload | null>(null);
  const [isLoadingSemanticSearch, setIsLoadingSemanticSearch] = useState(false);
  const [draftProvenance, setDraftProvenance] = useState<DraftProvenanceState | null>(null);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [selectedProseAction, setSelectedProseAction] = useState<WorldEditorProseAction>("summarize");
  const [proseSuggestion, setProseSuggestion] = useState<ProseSuggestionState | null>(null);
  const [isRequestingProse, setIsRequestingProse] = useState(false);
  const [editorSuggestions, setEditorSuggestions] = useState<EditorSuggestionState | null>(null);
  const [isLoadingEditorSuggestions, setIsLoadingEditorSuggestions] = useState(false);
  const [consistencyReview, setConsistencyReview] = useState<ConsistencyReviewState | null>(null);
  const [consistencyFindingState, setConsistencyFindingState] = useState<ConsistencyFindingState>({});
  const [isReviewingConsistency, setIsReviewingConsistency] = useState(false);
  const [timelinePayload, setTimelinePayload] = useState<WorldTimelinePayload | null>(null);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);
  const [graphPayload, setGraphPayload] = useState<WorldGraphPayload | null>(null);
  const [isLoadingGraph, setIsLoadingGraph] = useState(false);
  const [digestPayload, setDigestPayload] = useState<WorldDigestPayload | null>(null);
  const [digestScopeMode, setDigestScopeMode] = useState<"world" | "tag">("world");
  const [digestTag, setDigestTag] = useState("");
  const [isLoadingDigest, setIsLoadingDigest] = useState(false);
  const [mapNavigation, setMapNavigation] = useState<WorldMapNavigationPayload | null>(null);
  const [isLoadingMapNavigation, setIsLoadingMapNavigation] = useState(false);
  const [selectedMapRegion, setSelectedMapRegion] = useState("all");
  const canManageAISettings = session?.viewer.role === "owner";

  async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
    return fetch(input, init);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadWorld() {
      setIsLoadingWorld(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (searchMode === "keyword" && searchQuery.trim()) {
          params.set("q", searchQuery.trim());
        }

        const response = await apiFetch(`/api/world/entities${params.size ? `?${params.toString()}` : ""}`);
        if (response.status === 401) {
          if (!cancelled) {
            startTransition(() => {
              setSession(null);
              setPayload(null);
              setAccounts([]);
              setSelectedEntityId(null);
              setDetail(null);
              setEditorState(null);
              setDraftProvenance(null);
              setProseSuggestion(null);
              setEditorSuggestions(null);
              setConsistencyReview(null);
              setConsistencyFindingState({});
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
  }, [isEditing, refreshVersion, searchMode, searchQuery]);

  useEffect(() => {
    if (!session) {
      setSemanticResult(null);
      return;
    }

    if (searchMode !== "semantic") {
      setSemanticResult(null);
      return;
    }

    let cancelled = false;
    setIsLoadingSemanticSearch(true);

    async function loadSemanticSearch() {
      try {
        const params = new URLSearchParams();
        if (searchQuery.trim()) {
          params.set("q", searchQuery.trim());
        }

        const response = await apiFetch(`/api/world/semantic-search${params.size ? `?${params.toString()}` : ""}`);
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Unable to run semantic search.");
        }

        const nextResult = (await response.json()) as WorldSemanticSearchPayload;
        if (!cancelled) {
          setSemanticResult(nextResult);
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSemanticSearch(false);
        }
      }
    }

    void loadSemanticSearch();

    return () => {
      cancelled = true;
    };
  }, [searchMode, searchQuery, session, refreshVersion]);

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
    if (!session || !selectedEntityId) {
      setGraphPayload(null);
      return;
    }

    const entityId = selectedEntityId;
    let cancelled = false;
    setIsLoadingGraph(true);

    async function loadGraph() {
      try {
        const params = new URLSearchParams({ entityId });
        const response = await apiFetch(`/api/world/graph?${params.toString()}`);
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Unable to load the graph explorer.");
        }

        const payload = (await response.json()) as WorldGraphPayload;
        if (!cancelled) {
          setGraphPayload(payload);
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingGraph(false);
        }
      }
    }

    void loadGraph();

    return () => {
      cancelled = true;
    };
  }, [selectedEntityId, session, refreshVersion]);

  useEffect(() => {
    if (!session) {
      setMapNavigation(null);
      return;
    }

    let cancelled = false;
    setIsLoadingMapNavigation(true);

    async function loadMapNavigation() {
      try {
        const response = await apiFetch("/api/world/map-navigation");
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Unable to load the map-linked navigator.");
        }

        const payload = (await response.json()) as WorldMapNavigationPayload;
        if (!cancelled) {
          setMapNavigation(payload);
          setSelectedMapRegion((current) =>
            current === "all" || payload.regions.includes(current) ? current : payload.regions[0] ?? "all",
          );
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingMapNavigation(false);
        }
      }
    }

    void loadMapNavigation();

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
    if (!session) {
      setTimelinePayload(null);
      return;
    }

    let cancelled = false;
    setIsLoadingTimeline(true);

    async function loadTimeline() {
      try {
        const response = await apiFetch("/api/world/timeline");
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Unable to load the timeline workspace.");
        }

        const payload = (await response.json()) as WorldTimelinePayload;
        if (!cancelled) {
          setTimelinePayload(payload);
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingTimeline(false);
        }
      }
    }

    void loadTimeline();

    return () => {
      cancelled = true;
    };
  }, [session, refreshVersion]);

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

  const displayedEntities = useMemo(() => {
    const entities = searchMode === "semantic" ? semanticResult?.matches ?? [] : payload?.entities ?? [];

    return entities.filter((entity) => {
      if (typeFilter !== "all" && entity.entityType !== typeFilter) {
        return false;
      }

      if (tagFilter !== "all" && !entity.tags.includes(tagFilter)) {
        return false;
      }

      return true;
    });
  }, [payload, searchMode, semanticResult, tagFilter, typeFilter]);

  useEffect(() => {
    if (isEditing) {
      return;
    }

    if (!displayedEntities.length) {
      setSelectedEntityId(null);
      return;
    }

    if (!selectedEntityId || !displayedEntities.some((entity) => entity.id === selectedEntityId)) {
      setSelectedEntityId(displayedEntities[0]?.id ?? null);
    }
  }, [displayedEntities, isEditing, selectedEntityId]);

  useEffect(() => {
    if (!isEditing) {
      setProseSuggestion(null);
      setEditorSuggestions(null);
      setConsistencyReview(null);
      setConsistencyFindingState({});
    }
  }, [isEditing, selectedEntityId]);

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
      if (searchMode === "keyword" && searchQuery.trim()) {
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
        setDraftProvenance(null);
        setProseSuggestion(null);
        setEditorSuggestions(null);
        setConsistencyReview(null);
        setConsistencyFindingState({});
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
      startTransition(() => {
        setSession(null);
        setPayload(null);
        setAccounts([]);
        setDetail(null);
        setEditorState(null);
        setDraftProvenance(null);
        setProseSuggestion(null);
        setEditorSuggestions(null);
        setConsistencyReview(null);
        setConsistencyFindingState({});
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

  async function generateDraft(request: {
    entityType: WorldEntityType;
    proposedName?: string;
    unresolvedTargetText?: string;
    sourceEntityId?: string;
  }) {
    setError(null);
    setIsGeneratingDraft(true);

    try {
      const response = await apiFetch("/api/world/entity-drafts", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Unable to generate draft entity.");
      }

      const payload = (await response.json()) as WorldEntityDraftPayload;
      if (payload.status !== "ready" || !payload.draft || !payload.provenance) {
        throw new Error(payload.unavailableReason ?? "Draft generation is unavailable.");
      }

      const draft = payload.draft;
      const provenance = payload.provenance;

      startTransition(() => {
        setIsEditing(true);
        setSelectedEntityId(null);
        setDetail(null);
        setDraftProvenance(provenance);
        setProseSuggestion(null);
        setEditorSuggestions(null);
        setConsistencyReview(null);
        setConsistencyFindingState({});
        setEditorState(buildEditorStateFromDraft(draft, defaultVisibleOption(session)));
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
    } finally {
      setIsGeneratingDraft(false);
    }
  }

  async function handleRequestProseAssistance() {
    if (!editorState) {
      return;
    }

    setError(null);
    setIsRequestingProse(true);

    try {
      const response = await apiFetch("/api/world/prose-assistance", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(
          buildEditorProseAssistRequest(
            {
              entityId: editorState.id,
              name: editorState.name,
              entityType: editorState.entityType,
              body: editorState.body,
            },
            selectedProseAction,
          ),
        ),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Unable to generate prose assistance.");
      }

      const payload = (await response.json()) as WorldEditorProseAssistPayload;
      if (payload.status !== "ready" || !payload.suggestedText) {
        throw new Error(payload.unavailableReason ?? "Prose assistance is unavailable.");
      }

      setProseSuggestion({
        status: "ready",
        action: payload.action,
        applyMode: payload.applyMode,
        summary: payload.summary,
        providerLabel: payload.providerLabel,
        sourceText: payload.sourceText,
        suggestedText: payload.suggestedText,
        contextNotes: payload.contextNotes,
      });
    } catch (caughtError) {
      setProseSuggestion(null);
      setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
    } finally {
      setIsRequestingProse(false);
    }
  }

  function handleApplyProseSuggestion() {
    if (!editorState || !proseSuggestion) {
      return;
    }

    setEditorState({
      ...editorState,
      body: applyEditorProseResult(editorState.body, proseSuggestion),
    });
    setProseSuggestion(rejectEditorProseResult());
  }

  function handleRejectProseSuggestion() {
    setProseSuggestion(rejectEditorProseResult());
  }

  async function handleReviewEditorSuggestions() {
    if (!editorState) {
      return;
    }

    setError(null);
    setIsLoadingEditorSuggestions(true);

    try {
      const response = await apiFetch("/api/world/editor-suggestions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(
          buildEditorSuggestionRequest({
            entityId: editorState.id,
            name: editorState.name,
            entityType: editorState.entityType,
            body: editorState.body,
            relationships: editorState.relationships,
            fields: editorState.fields,
          }),
        ),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Unable to review suggestions.");
      }

      const payload = (await response.json()) as WorldEditorSuggestionPayload;
      if (payload.status !== "ready") {
        throw new Error(payload.unavailableReason ?? "Suggestions are unavailable.");
      }

      setEditorSuggestions({
        status: "ready",
        providerLabel: payload.providerLabel,
        summary: payload.summary,
        linkSuggestions: payload.linkSuggestions,
        relationshipSuggestions: payload.relationshipSuggestions,
        ...(payload.summarySuggestion ? { summarySuggestion: payload.summarySuggestion } : {}),
      });
    } catch (caughtError) {
      setEditorSuggestions(null);
      setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
    } finally {
      setIsLoadingEditorSuggestions(false);
    }
  }

  function dismissLinkSuggestion(suggestionId: string) {
    setEditorSuggestions((current) =>
      current
        ? { ...current, linkSuggestions: current.linkSuggestions.filter((suggestion) => suggestion.id !== suggestionId) }
        : current,
    );
  }

  function dismissRelationshipSuggestion(suggestionId: string) {
    setEditorSuggestions((current) =>
      current
        ? {
            ...current,
            relationshipSuggestions: current.relationshipSuggestions.filter((suggestion) => suggestion.id !== suggestionId),
          }
        : current,
    );
  }

  function dismissSummarySuggestion() {
    setEditorSuggestions((current) => (current ? { ...current, summarySuggestion: undefined } : current));
  }

  function handleApplyLinkSuggestion(suggestion: WorldEditorLinkSuggestion) {
    setEditorState((current) =>
      current
        ? {
            ...current,
            body: applyLinkSuggestion(current.body, suggestion),
          }
        : current,
    );
    dismissLinkSuggestion(suggestion.id);
  }

  function handleApplyRelationshipSuggestion(suggestion: WorldEditorRelationshipSuggestion) {
    setEditorState((current) =>
      current
        ? {
            ...current,
            relationships: applyRelationshipSuggestion(current.relationships, suggestion),
          }
        : current,
    );
    dismissRelationshipSuggestion(suggestion.id);
  }

  function handleApplySummarySuggestion(suggestion: WorldEditorSummarySuggestion) {
    setEditorState((current) =>
      current
        ? {
            ...current,
            fields: applySummarySuggestion(current.fields, suggestion),
          }
        : current,
    );
    dismissSummarySuggestion();
  }

  async function handleReviewConsistency() {
    setError(null);
    setIsReviewingConsistency(true);

    try {
      const response = await apiFetch("/api/world/consistency-review", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(selectedEntityId ? { entityId: selectedEntityId } : {}),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Unable to review world consistency.");
      }

      const payload = (await response.json()) as WorldConsistencyReviewPayload;
      if (payload.status !== "ready") {
        throw new Error(payload.unavailableReason ?? "Consistency review is unavailable.");
      }

      setConsistencyReview({
        ...payload,
        status: "ready",
      });
      setConsistencyFindingState(
        Object.fromEntries(payload.findings.map((finding) => [finding.id, "open"] as const)),
      );
    } catch (caughtError) {
      setConsistencyReview(null);
      setConsistencyFindingState({});
      setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
    } finally {
      setIsReviewingConsistency(false);
    }
  }

  function updateConsistencyFindingState(finding: WorldConsistencyFinding, state: "open" | "deferred" | "dismissed") {
    setConsistencyFindingState((current) => ({
      ...current,
      [finding.id]: state,
    }));
  }

  async function handleGenerateDigest() {
    setError(null);
    setIsLoadingDigest(true);

    try {
      const request =
        digestScopeMode === "tag" && digestTag.trim()
          ? { mode: "tag" as const, tag: digestTag.trim() }
          : { mode: "world" as const };
      const response = await apiFetch("/api/world/digest", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Unable to generate the world-state digest.");
      }

      const payload = (await response.json()) as WorldDigestPayload;
      setDigestPayload(payload);
    } catch (caughtError) {
      setDigestPayload(null);
      setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
    } finally {
      setIsLoadingDigest(false);
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

  const prosePreviewText =
    proseSuggestion && editorState ? previewEditorProseResult(editorState.body, proseSuggestion) : null;
  const detailReferenceSummary =
    detail && typeof detail.fields.reference_summary === "string" ? detail.fields.reference_summary : null;
  const visibleMapPins =
    mapNavigation?.pins.filter((pin) => selectedMapRegion === "all" || pin.region === selectedMapRegion) ?? [];
  const visibleConsistencyFindings = consistencyReview?.findings.filter(
    (finding) => consistencyFindingState[finding.id] !== "dismissed",
  ) ?? [];
  const deferredConsistencyCount = visibleConsistencyFindings.filter(
    (finding) => consistencyFindingState[finding.id] === "deferred",
  ).length;

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
                Configure the owner bootstrap values through environment variables before exposing WorldForge beyond
                local-only development.
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
              placeholder={
                searchMode === "semantic"
                  ? "Ask a lore question like 'Who governs the river trade city?'"
                  : "Search names, tags, and body text"
              }
            />
          </label>

          <label className="field" htmlFor={searchModeId}>
            <span>Search Mode</span>
            <select
              id={searchModeId}
              value={searchMode}
              onChange={(event) => setSearchMode(event.target.value as WorldSearchMode)}
            >
              <option value="keyword">Keyword Search</option>
              <option value="semantic">Semantic Search</option>
            </select>
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
            <span>{displayedEntities.length} visible entries</span>
            <span>
              {searchMode === "semantic"
                ? isLoadingSemanticSearch
                  ? "Searching semantically..."
                  : semanticResult?.status === "unavailable"
                    ? "Semantic mode unavailable"
                    : "Semantic mode"
                : isLoadingWorld
                  ? "Refreshing..."
                  : "Session persisted"}
            </span>
            {error ? <span className="error-inline">{error}</span> : null}
          </div>

          <button
            type="button"
            className="secondary-action"
            onClick={() => {
              setIsEditing(true);
              setSelectedEntityId(null);
              setDetail(null);
              setDraftProvenance(null);
              setProseSuggestion(null);
              setEditorSuggestions(null);
              setEditorState(buildNewEditorState(defaultVisibleOption(session)));
            }}
          >
            New Entity
          </button>

          <button
            type="button"
            className="secondary-action"
            disabled={isGeneratingDraft || !aiSettings?.provider.status.configured}
            onClick={() =>
              void generateDraft({
                entityType: typeFilter === "all" ? "lore_article" : typeFilter,
                proposedName: searchQuery.trim() || undefined,
              })
            }
          >
            {isGeneratingDraft ? "Generating Draft..." : "Generate Draft"}
          </button>

          <ul className="entity-list">
            {displayedEntities.map((entity) => (
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

          {!displayedEntities.length ? (
            <p className="placeholder">
              {searchMode === "semantic"
                ? semanticResult?.status === "unavailable"
                  ? semanticResult.unavailableReason
                  : "No semantic matches surfaced for the current question."
                : "No entities match the current filters."}
            </p>
          ) : null}

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
                    <button
                      type="button"
                      className="secondary-action compact"
                      disabled={isGeneratingDraft || !aiSettings?.provider.status.configured}
                      onClick={() =>
                        void generateDraft({
                          entityType: "location",
                          unresolvedTargetText: reference.targetText,
                          sourceEntityId: reference.sourceEntityId,
                        })
                      }
                    >
                      Draft From Stub
                    </button>
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

                {draftProvenance ? (
                  <section className="detail-section">
                    <div className="section-row">
                      <h3>Draft Provenance</h3>
                      <span className="queue-count">{draftProvenance.mode.replace(/_/g, " ")}</span>
                    </div>
                    <p className="placeholder">{draftProvenance.summary}</p>
                    <p>
                      <strong>Provider:</strong> {draftProvenance.providerLabel} • <strong>Approval required:</strong>{" "}
                      {draftProvenance.approvalRequired ? "Yes" : "No"}
                    </p>
                    {draftProvenance.unresolvedTargetText ? (
                      <p>
                        <strong>Stub target:</strong> {draftProvenance.unresolvedTargetText}
                      </p>
                    ) : null}
                  </section>
                ) : null}

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
                      onClick={() => {
                        setEditorSuggestions(null);
                        setEditorState((current) =>
                          current ? { ...current, fields: [...current.fields, { key: "", value: "" }] } : current,
                        );
                      }}
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
                          onChange={(event) => {
                            setEditorSuggestions(null);
                            setEditorState((current) =>
                              current
                                ? {
                                    ...current,
                                    fields: current.fields.map((item, itemIndex) =>
                                      itemIndex === index ? { ...item, key: event.target.value } : item,
                                    ),
                                  }
                                : current,
                            );
                          }}
                        />
                        <input
                          value={field.value}
                          placeholder="Field value"
                          onChange={(event) => {
                            setEditorSuggestions(null);
                            setEditorState((current) =>
                              current
                                ? {
                                    ...current,
                                    fields: current.fields.map((item, itemIndex) =>
                                      itemIndex === index ? { ...item, value: event.target.value } : item,
                                    ),
                                  }
                                : current,
                            );
                          }}
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
                      onClick={() => {
                        setEditorSuggestions(null);
                        setEditorState((current) =>
                          current
                            ? {
                                ...current,
                                relationships: [...current.relationships, { type: "", target: "" }],
                              }
                            : current,
                        );
                      }}
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
                          onChange={(event) => {
                            setEditorSuggestions(null);
                            setEditorState((current) =>
                              current
                                ? {
                                    ...current,
                                    relationships: current.relationships.map((item, itemIndex) =>
                                      itemIndex === index ? { ...item, type: event.target.value } : item,
                                    ),
                                  }
                                : current,
                            );
                          }}
                        />
                        <input
                          value={relationship.target}
                          placeholder="Target entity"
                          onChange={(event) => {
                            setEditorSuggestions(null);
                            setEditorState((current) =>
                              current
                                ? {
                                    ...current,
                                    relationships: current.relationships.map((item, itemIndex) =>
                                      itemIndex === index ? { ...item, target: event.target.value } : item,
                                    ),
                                  }
                                : current,
                            );
                          }}
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
                    onChange={(event) => {
                      setProseSuggestion(null);
                      setEditorSuggestions(null);
                      setEditorState((current) => (current ? { ...current, body: event.target.value } : current));
                    }}
                  />
                </label>

                <section className="detail-section">
                  <div className="section-row">
                    <div>
                      <h3>Suggestions</h3>
                      <p className="placeholder">
                        Review calm link, relationship, and summary suggestions without changing canon until you accept them.
                      </p>
                    </div>
                    <span className="queue-count">
                      {editorSuggestions
                        ? editorSuggestions.linkSuggestions.length +
                          editorSuggestions.relationshipSuggestions.length +
                          (editorSuggestions.summarySuggestion ? 1 : 0)
                        : "idle"}
                    </span>
                  </div>

                  <div className="editor-actions">
                    <button
                      type="button"
                      onClick={() => void handleReviewEditorSuggestions()}
                      disabled={isLoadingEditorSuggestions || !editorState.body.trim()}
                    >
                      {isLoadingEditorSuggestions ? "Reviewing..." : "Review Suggestions"}
                    </button>
                  </div>

                  {!aiSettings?.provider.status.configured ? (
                    <p className="placeholder">Configure the AI baseline first to enable editor suggestions.</p>
                  ) : null}

                  {editorSuggestions ? (
                    <div className="stack">
                      <p className="placeholder">{editorSuggestions.summary}</p>

                      {editorSuggestions.summarySuggestion ? (
                        <article className="suggestion-card">
                          <h4>{editorSuggestions.summarySuggestion.label}</h4>
                          <p className="body-copy">{editorSuggestions.summarySuggestion.value}</p>
                          <p className="placeholder">{editorSuggestions.summarySuggestion.reason}</p>
                          <div className="editor-actions">
                            <button
                              type="button"
                              onClick={() => handleApplySummarySuggestion(editorSuggestions.summarySuggestion!)}
                            >
                              Apply Summary
                            </button>
                            <button type="button" className="secondary-action" onClick={dismissSummarySuggestion}>
                              Dismiss
                            </button>
                          </div>
                        </article>
                      ) : null}

                      {editorSuggestions.linkSuggestions.map((suggestion) => (
                        <article key={suggestion.id} className="suggestion-card">
                          <h4>Link Suggestion</h4>
                          <p>
                            Replace <strong>{suggestion.matchedText}</strong> with <strong>{suggestion.replacementText}</strong>.
                          </p>
                          <p className="placeholder">{suggestion.reason}</p>
                          <div className="editor-actions">
                            <button type="button" onClick={() => handleApplyLinkSuggestion(suggestion)}>
                              Apply Link
                            </button>
                            <button
                              type="button"
                              className="secondary-action"
                              onClick={() => dismissLinkSuggestion(suggestion.id)}
                            >
                              Dismiss
                            </button>
                          </div>
                        </article>
                      ))}

                      {editorSuggestions.relationshipSuggestions.map((suggestion) => (
                        <article key={suggestion.id} className="suggestion-card">
                          <h4>Relationship Suggestion</h4>
                          <p>
                            Add <strong>{formatFieldLabel(suggestion.relationship.type)}</strong> {"->"}{" "}
                            <strong>{suggestion.relationship.target}</strong>.
                          </p>
                          <p className="placeholder">{suggestion.reason}</p>
                          <div className="editor-actions">
                            <button type="button" onClick={() => handleApplyRelationshipSuggestion(suggestion)}>
                              Apply Relationship
                            </button>
                            <button
                              type="button"
                              className="secondary-action"
                              onClick={() => dismissRelationshipSuggestion(suggestion.id)}
                            >
                              Dismiss
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : null}
                </section>

                <section className="detail-section prose-assistance">
                  <div className="section-row">
                    <div>
                      <h3>Prose Assistance</h3>
                      <p className="placeholder">Preview a bounded suggestion, then apply or reject it explicitly.</p>
                    </div>
                    <span className="queue-count">{proseSuggestion ? "preview" : "idle"}</span>
                  </div>

                  <div className="prose-assist-controls">
                    <label className="field">
                      <span>Action</span>
                      <select
                        id={proseActionId}
                        value={selectedProseAction}
                        onChange={(event) => setSelectedProseAction(event.target.value as WorldEditorProseAction)}
                      >
                        {Object.entries(proseActionLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <button
                      type="button"
                      className="secondary-action"
                      onClick={() => void handleRequestProseAssistance()}
                      disabled={isRequestingProse || !editorState.body.trim()}
                    >
                      {isRequestingProse ? "Generating Preview..." : "Preview Suggestion"}
                    </button>
                  </div>

                  {!aiSettings?.provider.status.configured ? (
                    <p className="placeholder">
                      Configure the AI baseline first to enable prose assistance inside the editor.
                    </p>
                  ) : null}

                  {proseSuggestion && prosePreviewText ? (
                    <div className="prose-preview-stack">
                      <p className="placeholder">
                        {proseSuggestion.summary} Current body stays unchanged until you apply this proposal.
                      </p>
                      <p>
                        <strong>Provider:</strong> {proseSuggestion.providerLabel} • <strong>Apply mode:</strong>{" "}
                        {proseSuggestion.applyMode}
                      </p>

                      <div className="prose-preview-grid">
                        <article className="prose-preview-card">
                          <h4>Current Body</h4>
                          <p className="body-copy">{editorState.body}</p>
                        </article>
                        <article className="prose-preview-card">
                          <h4>Proposed Result</h4>
                          <p className="body-copy">{prosePreviewText}</p>
                        </article>
                      </div>

                      <div className="prose-context-grid">
                        {proseSuggestion.contextNotes.map((note) => (
                          <article key={`${note.label}-${note.value}`} className="prose-context-card">
                            <h4>{note.label}</h4>
                            <p className="body-copy">{note.value}</p>
                          </article>
                        ))}
                      </div>

                      <div className="editor-actions">
                        <button type="button" onClick={handleApplyProseSuggestion}>
                          Apply Suggestion
                        </button>
                        <button type="button" className="secondary-action" onClick={handleRejectProseSuggestion}>
                          Reject
                        </button>
                      </div>
                    </div>
                  ) : null}
                </section>

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
                      setDraftProvenance(null);
                      setProseSuggestion(null);
                      setEditorSuggestions(null);
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
                    {detailReferenceSummary ? <p className="placeholder">{detailReferenceSummary}</p> : null}
                  </div>
                  <span className="visibility-chip">{detail.visibility.replace(/_/g, " ")}</span>
                </div>

                <div className="editor-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setEditorState(buildEditorState(detail));
                      setProseSuggestion(null);
                      setEditorSuggestions(null);
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
                              <img src={asset.url} alt={asset.alt ?? asset.originalFileName} className="media-preview" />
                            ) : null}
                            <strong>{asset.originalFileName}</strong>
                            <p>{asset.caption ?? asset.alt ?? asset.contentType}</p>
                            <a href={asset.url} target="_blank" rel="noreferrer">
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
              <h2>Graph Explorer</h2>
              <p>A scoped neighborhood view keeps relationship structure readable instead of exploding into a whole-world graph.</p>
            </header>
            {graphPayload ? (
              <div className="stack">
                <p className="placeholder">{graphPayload.summary}</p>
                {graphPayload.nodes.length ? (
                  <>
                    <section className="detail-section">
                      <h3>Nodes</h3>
                      <ul className="sources">
                        {graphPayload.nodes.map((node) => (
                          <li key={node.entityId}>
                            <div className="section-row">
                              <strong>{node.entityName}</strong>
                              <span className="queue-count">{node.role}</span>
                            </div>
                            <span>{typeLabels[node.entityType]}</span>
                            {node.role === "neighbor" ? (
                              <div className="editor-actions">
                                <button type="button" onClick={() => setSelectedEntityId(node.entityId)}>
                                  Pivot Here
                                </button>
                              </div>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </section>
                    <section className="detail-section">
                      <h3>Edges</h3>
                      <ul className="sources">
                        {graphPayload.edges.map((edge) => {
                          const sourceName =
                            graphPayload.nodes.find((node) => node.entityId === edge.sourceEntityId)?.entityName ?? edge.sourceEntityId;
                          const targetName =
                            graphPayload.nodes.find((node) => node.entityId === edge.targetEntityId)?.entityName ?? edge.targetEntityId;
                          return (
                            <li key={edge.id}>
                              <strong>{sourceName}</strong>
                              <span>
                                {edge.label} {"->"} {targetName}
                              </span>
                              <p>{edge.summary}</p>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  </>
                ) : (
                  <p className="placeholder">No visible neighbors surfaced for this entity yet.</p>
                )}
              </div>
            ) : (
              <p className="placeholder">
                {isLoadingGraph ? "Loading graph explorer..." : "Select an entity to inspect its relationship neighborhood."}
              </p>
            )}
          </article>

          <article className="panel">
            <header className="panel-header">
              <h2>Map Navigation</h2>
              <p>Location pins provide a lightweight spatial wayfinding layer without turning the app into a cartography tool.</p>
            </header>
            {mapNavigation ? (
              <div className="stack">
                <p className="placeholder">{mapNavigation.summary}</p>
                <div className="editor-row">
                  <label>
                    Region
                    <select value={selectedMapRegion} onChange={(event) => setSelectedMapRegion(event.target.value)}>
                      <option value="all">All Regions</option>
                      {mapNavigation.regions.map((region) => (
                        <option key={region} value={region}>
                          {region}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <section
                  className="map-surface"
                  style={
                    mapNavigation.hasBackdrop && mapNavigation.backdropUrl
                      ? { backgroundImage: `linear-gradient(rgba(247,243,232,0.18), rgba(247,243,232,0.18)), url(${mapNavigation.backdropUrl})` }
                      : undefined
                  }
                >
                  {visibleMapPins.map((pin) => (
                    <button
                      key={pin.entityId}
                      type="button"
                      className="map-pin"
                      style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                      onClick={() => setSelectedEntityId(pin.entityId)}
                    >
                      <span>{pin.entityName}</span>
                    </button>
                  ))}
                  {!visibleMapPins.length ? (
                    <p className="placeholder map-empty">
                      {mapNavigation.hasBackdrop
                        ? "No visible pins are configured for this map scope yet."
                        : "No map asset or pinned locations are configured yet."}
                    </p>
                  ) : null}
                </section>
                {visibleMapPins.length ? (
                  <ul className="sources">
                    {visibleMapPins.map((pin) => (
                      <li key={`list-${pin.entityId}`}>
                        <div className="section-row">
                          <strong>{pin.entityName}</strong>
                          <span className="queue-count">{pin.region}</span>
                        </div>
                        <p>{pin.summary}</p>
                        <div className="editor-actions">
                          <button type="button" onClick={() => setSelectedEntityId(pin.entityId)}>
                            Open Detail
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : (
              <p className="placeholder">{isLoadingMapNavigation ? "Loading map navigation..." : "Map navigation is unavailable right now."}</p>
            )}
          </article>

          <article className="panel">
            <header className="panel-header">
              <h2>World-State Digest</h2>
              <p>Review briefs stay cited and non-canonical so they help orientation without pretending to be source truth.</p>
            </header>
            <section className="detail-section">
              <div className="editor-row">
                <label>
                  Scope
                  <select value={digestScopeMode} onChange={(event) => setDigestScopeMode(event.target.value as "world" | "tag")}>
                    <option value="world">Visible World</option>
                    <option value="tag">Tag Scope</option>
                  </select>
                </label>
                <label>
                  Tag
                  <input
                    value={digestTag}
                    onChange={(event) => setDigestTag(event.target.value)}
                    placeholder="history"
                    disabled={digestScopeMode !== "tag"}
                  />
                </label>
              </div>
              <div className="editor-actions">
                <button type="button" onClick={handleGenerateDigest} disabled={isLoadingDigest}>
                  {isLoadingDigest ? "Generating..." : "Generate Digest"}
                </button>
              </div>
            </section>
            <section className="detail-section">
              {digestPayload ? (
                <div className="stack">
                  <p className="placeholder">{digestPayload.summary}</p>
                  {digestPayload.providerLabel ? (
                    <p className="placeholder">Provider baseline: {digestPayload.providerLabel}</p>
                  ) : null}
                  {digestPayload.sections.length ? (
                    <ul className="sources">
                      {digestPayload.sections.map((section) => (
                        <li key={section.id}>
                          <strong>{section.title}</strong>
                          <p>{section.summary}</p>
                          <ul className="sources">
                            {section.citations.map((citation) => (
                              <li key={`${section.id}-${citation.entityId}`}>
                                <strong>{citation.entityName}</strong>
                                <span>{typeLabels[citation.entityType]}</span>
                                <p>{citation.excerpt}</p>
                                <p className="path-copy">{citation.path}</p>
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="placeholder">No digest sections surfaced for this scope yet.</p>
                  )}
                </div>
              ) : (
                <p className="placeholder">Generate a cited review brief for the visible world or a selected tag scope.</p>
              )}
            </section>
          </article>

          <article className="panel">
            <header className="panel-header">
              <h2>Timeline Workspace</h2>
              <p>Chronology stays readable even when the world mixes exact dates, ranges, and softer era labels.</p>
            </header>
            {timelinePayload ? (
              <div className="stack">
                <p className="placeholder">{timelinePayload.summary}</p>
                {timelinePayload.items.length ? (
                  <ul className="sources">
                    {timelinePayload.items.map((item) => (
                      <li key={item.entityId}>
                        <div className="section-row">
                          <strong>{item.title}</strong>
                          <span className="queue-count">{item.chronologyLabel}</span>
                        </div>
                        <span>{typeLabels[item.entityType]} • {item.precision}</span>
                        <p>{item.summary}</p>
                        <p className="path-copy">{item.path}</p>
                        <div className="editor-actions">
                          <button type="button" onClick={() => setSelectedEntityId(item.entityId)}>
                            Open Detail
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="placeholder">Add chronology fields like `date`, `start_date`, `end_date`, `era`, or `chronology_label` to surface timeline items here.</p>
                )}
              </div>
            ) : (
              <p className="placeholder">{isLoadingTimeline ? "Loading timeline workspace..." : "Timeline workspace is unavailable right now."}</p>
            )}
          </article>

          {searchMode === "semantic" ? (
            <article className="panel">
              <header className="panel-header">
                <h2>Semantic Answer</h2>
                <p>Citation-backed answers stay separate from deterministic keyword search.</p>
              </header>
              {semanticResult ? (
                <div className="stack">
                  {semanticResult.status === "unavailable" ? (
                    <p className="placeholder">{semanticResult.unavailableReason}</p>
                  ) : semanticResult.answer ? (
                    <>
                      <p className="body-copy">{semanticResult.answer}</p>
                      <p>
                        <strong>Uncertainty:</strong> {semanticResult.uncertainty} - {semanticResult.uncertaintyReason}
                      </p>
                      <ul className="sources">
                        {semanticResult.citations.map((citation) => (
                          <li key={citation.entityId}>
                            <strong>{citation.entityName}</strong>
                            <span>{typeLabels[citation.entityType]}</span>
                            <p>{citation.excerpt}</p>
                            <p className="path-copy">{citation.path}</p>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="placeholder">Ask a lore question to see a semantic answer with citations.</p>
                  )}
                </div>
              ) : (
                <p className="placeholder">Loading semantic search state...</p>
              )}
            </article>
          ) : null}

          <article className="panel">
            <header className="panel-header">
              <h2>Consistency Review</h2>
              <p>Run a cited canon check and keep every finding in a human review queue.</p>
            </header>

            <section className="detail-section">
              <div className="section-row">
                <h3>{selectedEntityId ? "Selected Scope" : "Visible Scope"}</h3>
                <span className="queue-count">
                  {consistencyReview
                    ? `${visibleConsistencyFindings.length}${deferredConsistencyCount ? `/${deferredConsistencyCount} deferred` : ""}`
                    : "idle"}
                </span>
              </div>
              <p className="placeholder">
                {selectedEntityId
                  ? "Review the selected entity against visible reciprocal canon and corroboration patterns."
                  : "Review the visible world for contradictions and missing corroboration with citations."}
              </p>
              <div className="editor-actions">
                <button type="button" onClick={handleReviewConsistency} disabled={isReviewingConsistency}>
                  {isReviewingConsistency ? "Reviewing..." : selectedEntityId ? "Review Selected Entity" : "Review Visible World"}
                </button>
              </div>
            </section>

            <section className="detail-section">
              {consistencyReview ? (
                <div className="stack">
                  <p className="placeholder">{consistencyReview.summary}</p>
                  {consistencyReview.providerLabel ? (
                    <p className="placeholder">Provider baseline: {consistencyReview.providerLabel}</p>
                  ) : null}
                  {visibleConsistencyFindings.length ? (
                    <ul className="sources">
                      {visibleConsistencyFindings.map((finding) => (
                        <li key={finding.id}>
                          <div className="section-row">
                            <strong>{finding.title}</strong>
                            <span className="queue-count">
                              {consistencyFindingState[finding.id] === "deferred"
                                ? "deferred"
                                : `${finding.findingType} • ${finding.confidence}`}
                            </span>
                          </div>
                          <p>{finding.summary}</p>
                          <ul className="sources">
                            {finding.citations.map((citation) => (
                              <li key={`${finding.id}-${citation.entityId}`}>
                                <strong>{citation.entityName}</strong>
                                <span>{typeLabels[citation.entityType]}</span>
                                <p>{citation.excerpt}</p>
                                <p className="path-copy">{citation.path}</p>
                              </li>
                            ))}
                          </ul>
                          <div className="editor-actions">
                            <button type="button" onClick={() => updateConsistencyFindingState(finding, "deferred")}>
                              Defer
                            </button>
                            <button
                              type="button"
                              className="secondary-action"
                              onClick={() => updateConsistencyFindingState(finding, "dismissed")}
                            >
                              Dismiss
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="placeholder">No open findings are waiting in the current review queue.</p>
                  )}
                </div>
              ) : (
                <p className="placeholder">Run a review to inspect contradiction and corroboration findings with citations.</p>
              )}
            </section>
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
              <fieldset className="stack" disabled={!canManageAISettings || isSavingAISettings}>
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

                <button type="submit" disabled={!canManageAISettings || isSavingAISettings}>
                  {isSavingAISettings ? "Saving AI Baseline..." : "Save AI Baseline"}
                </button>
              </fieldset>
            </form>
            {!canManageAISettings ? <p className="placeholder">Only the owner can change AI baseline settings.</p> : null}

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
