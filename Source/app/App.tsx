import { useEffect, useId, useMemo, useState, useTransition } from "react";

import type {
  EntityVisibility,
  WorldBrowserEntityDetail,
  WorldBrowserEntitySaveRequest,
  WorldBrowserPayload,
  WorldEntityType,
} from "../contracts/index.js";

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
  relationships: EditorRelationshipRow[];
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
    relationships: detail.relationships.map((relationship) => ({
      type: relationship.type,
      target: relationship.target,
    })),
  };
}

function buildNewEditorState(): EditorState {
  return {
    name: "",
    entityType: "lore_article",
    visibility: "all_users",
    aliasesText: "",
    tagsText: "",
    body: "",
    fields: [],
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
    relationships: editor.relationships
      .map((relationship) => ({
        type: relationship.type.trim(),
        target: relationship.target.trim(),
      }))
      .filter((relationship) => relationship.type && relationship.target),
  };
}

export function App() {
  const typeFilterId = useId();
  const tagFilterId = useId();
  const searchId = useId();
  const [isPending, startTransition] = useTransition();
  const [payload, setPayload] = useState<WorldBrowserPayload | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [detail, setDetail] = useState<WorldBrowserEntityDetail | null>(null);
  const [typeFilter, setTypeFilter] = useState<WorldEntityType | "all">("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadWorld() {
      setError(null);

      try {
        const params = new URLSearchParams();
        if (searchQuery.trim()) {
          params.set("q", searchQuery.trim());
        }

        const response = await fetch(`/api/world/entities${params.size ? `?${params.toString()}` : ""}`);
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
      }
    }

    void loadWorld();

    return () => {
      cancelled = true;
    };
  }, [isEditing, searchQuery]);

  useEffect(() => {
    if (!selectedEntityId) {
      setDetail(null);
      return;
    }

    const entityId = selectedEntityId;
    let cancelled = false;
    setIsLoadingDetail(true);

    async function loadDetail() {
      try {
        const response = await fetch(`/api/world/entities/${encodeURIComponent(entityId)}`);
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
  }, [isEditing, selectedEntityId]);

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
      const response = await fetch(
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

      const refreshed = await fetch(`/api/world/entities${params.size ? `?${params.toString()}` : ""}`);
      const refreshedPayload = (await refreshed.json()) as WorldBrowserPayload;

      startTransition(() => {
        setPayload(refreshedPayload);
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

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">WorldForge Browser</p>
        <h1>Browse and shape your world without touching raw markdown.</h1>
        <p className="lede">
          Browse calm entity views, then shift directly into a safe editing surface when you need
          to update canon.
        </p>
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
            {error ? <span className="error-inline">{error}</span> : null}
          </div>

          <button
            type="button"
            className="secondary-action"
            onClick={() => {
              setIsEditing(true);
              setSelectedEntityId(null);
              setDetail(null);
              setEditorState(buildNewEditorState());
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
                      <option value="all_users">All users</option>
                      <option value="owner_only">Owner only</option>
                      <option value="hidden">Hidden</option>
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
        </section>
      </section>
    </main>
  );
}
