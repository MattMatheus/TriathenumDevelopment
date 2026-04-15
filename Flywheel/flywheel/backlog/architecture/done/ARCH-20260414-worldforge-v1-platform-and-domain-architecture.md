# Architecture Story: WorldForge V1 Platform And Domain Architecture

## Metadata
- `id`: ARCH-20260414-worldforge-v1-platform-and-domain-architecture
- `owner_role`: Software Architect
- `status`: qa
- `source`: planning
- `decision_refs`: [PLAN-2026-04-14-worldforge-roadmap-and-product-phase]
- `decision_owner`: Software Architect
- `success_metric`: A reviewed architecture defines the v1 platform boundaries, domain model, and phased technical seams needed to deliver WorldForge without collapsing roadmap layers together.

## Decision Scope

Define the architecture and decision boundaries for WorldForge v1 with emphasis on:

- markdown and YAML source-of-truth storage
- indexed metadata and search support
- entity and relationship modeling
- editor boundary and authoring model
- AI provider abstraction and grounding path
- deployment and operational simplicity for self-hosted use

Non-goals:

- final multi-world tenancy or hosted SaaS architecture
- a full plugin platform
- autonomous canon mutation
- a mandatory vector or local-model stack in Phase 1
- committing to a rich ProseMirror-style editor before round-trip safety is proven

## Problem Statement

The new WorldForge specification expands the product from a narrow canon-retrieval assistant into a broader self-hosted worldbuilding platform. Without a refreshed architecture decision, PM and engineering risk shaping the roadmap around assumptions that may conflict across storage, editing, indexing, AI integration, and deployment.

The immediate need is a bounded v1 architecture that preserves the product principles while clearly separating:

- what must exist in the useful core
- what should wait for the AI collaboration layer
- what should remain later-phase polish

## Inputs
- Existing decisions:
  - [PLAN-2026-04-11-worldbuilding-tool-foundation](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/artifacts/planning/PLAN-2026-04-11-worldbuilding-tool-foundation.md)
  - [PLAN-2026-04-14-worldforge-roadmap-and-product-phase](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/artifacts/planning/PLAN-2026-04-14-worldforge-roadmap-and-product-phase.md)
- Existing architecture artifacts:
  - [ARCH-20260411-first-system-slice](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/architecture/done/ARCH-20260411-first-system-slice.md)
- Constraints:
  - markdown files remain the durable source of truth
  - the product should remain approachable for non-technical collaborators on mobile
  - self-hosted deployment should stay simple in early releases
  - AI suggestions must remain reviewable and never silently establish canon
  - the roadmap must support phased delivery rather than all-at-once platform construction

## Outputs Required
- Decision updates:
  - define the v1 system boundary and component map
  - define the initial entity and relationship model
  - define read and write paths, including approval boundaries for AI-assisted changes
  - define which infrastructure components are mandatory in Phase 1 versus optional later
- Architecture artifacts:
  - this architecture story as the primary review surface
  - follow-on implementation paths for PM decomposition
- Risks and tradeoffs:
  - editor complexity versus delivery speed
  - SQLite-only versus adjunct stores for metadata and vectors
  - flexibility versus schema reliability in the entity system
  - single-service simplicity versus modularity for AI and indexing concerns

## Alternatives Considered

- extending the earlier narrow retrieval-oriented architecture without revisiting platform shape
- prioritizing a rich AI layer before validating the useful-core authoring model
- treating the editor, entity schema, and import/export surfaces as implementation details rather than explicit decisions

## Architecture Decision

Adopt a local-first, single-deployable web application for Phase 1 with markdown files as the source of truth, an embedded SQLite index as a rebuildable acceleration layer, and explicit seams for later AI and advanced navigation capabilities.

The architecture should evolve the current `Source/` baseline rather than replace it. The existing app shell, shared contracts, server, and retrieval modules remain the starting point for WorldForge, but they should now be organized around a broader world-authoring platform instead of only the earlier actor-reaction workflow.

### Primary Architecture Shape

Phase 1 should ship as one logical application with:

1. a browser UI under `Source/app`
2. an application API under `Source/server`
3. shared domain and storage contracts under `Source/`
4. markdown, media, and SQLite data mounted from the local filesystem

The preferred early deployment shape is one application container plus mounted world data, not a multi-service mesh. SQLite remains embedded in the app runtime and should not be externalized in Phase 1.

### Why This Shape

- it preserves self-hosting simplicity
- it keeps local markdown ownership central
- it avoids introducing service coordination before the useful-core authoring loop is validated
- it still leaves clear boundaries for later AI, vector, and collaboration features

## Component Boundaries

### UI Application

Responsibilities:

- entity browsing, detail viewing, and editing
- mobile-friendly interaction patterns
- session-local UI state
- explicit rendering of visibility, backlinks, stubs, and later AI suggestions

The UI should never write markdown or query SQLite directly.

### Application API

Responsibilities:

- authenticate users and enforce entity visibility
- expose browse, detail, save, search, and media endpoints
- orchestrate indexing and document writes through explicit application services
- later host AI workflow endpoints behind stable contracts

This layer is the product behavior boundary. It owns workflows and permissions, not markdown parsing internals.

### World Document And Index Services

Responsibilities:

- parse and serialize markdown entity documents
- maintain the rebuildable local SQLite index
- derive backlinks, unresolved links, tags, and search rows
- expose deterministic read and write operations to the application API

These services should remain inspectable and deterministic. They are the backbone of the useful core.

### AI And Intelligence Adapters

Responsibilities in Phase 2 and later:

- model-provider abstraction
- semantic retrieval and grounded prompting
- draft generation and suggestion workflows
- consistency audit orchestration

These must remain optional modules. Phase 1 should not require any hosted provider, local model runtime, or vector store to boot.

## Storage Model

### Canonical Source

Markdown files with YAML frontmatter remain the durable source of truth.

Each entity document should use a shared envelope:

- `id`
- `entity_type`
- `name`
- `aliases`
- `tags`
- `visibility`
- `relationships`
- `extensions`

Typed entity fields should live in structured frontmatter sections that vary by entity type, while freeform narrative content remains in the markdown body.

### Index Model

SQLite should be the Phase 1 metadata and search index.

The SQLite store is not canonical. It should hold rebuildable projections such as:

- entity catalog rows
- normalized aliases
- link graph edges
- unresolved link records
- tag mappings
- searchable text materialized for keyword search

If the index is lost or stale, the application must be able to rebuild it from markdown files.

### Media Model

Media files should live on the local filesystem in a dedicated world-owned media path. Entity documents should reference media by stable relative paths or IDs that remain portable inside the world data directory.

Phase 1 should support local images and file attachments only. Map pins and richer geospatial behavior remain later work.

## Entity And Relationship Model

The v1 domain model should balance reliability with flexibility.

### Required Core Types

Phase 1 should treat these as first-class types:

- character
- location
- faction
- magic_system_or_technology
- artifact
- lore_article

### Schema Strategy

Each type gets:

- a shared document envelope
- a type-specific structured field set
- an open `extensions` map for world-specific additions

This avoids hard-coding every future worldbuilding need while still giving the product enough structure for browse, edit, search, and later AI workflows.

### Relationship Strategy

Relationships should be explicit structured references in frontmatter, not inferred canon hidden only in prose.

Backlinks and unresolved links should be derived projections:

- backlinks come from document links and relationship references
- unresolved links are index artifacts, not canonical source fields

This keeps authoring simple while giving the app a reliable graph substrate later.

## Read And Write Model

### Read Path

Phase 1 read operations should follow this flow:

1. API receives a browse, detail, or search request.
2. API queries the world services.
3. World services read canonical markdown and rebuild or query projections as needed.
4. API returns normalized entity, search, or backlink views to the UI.

### Write Path

All writes should go through one document service.

The service should:

- validate the entity payload against the shared envelope and type-specific schema
- serialize structured fields into frontmatter
- preserve markdown body content
- write atomically to disk
- trigger projection refresh for the affected entity and link graph

The UI should not compose raw frontmatter text itself except in an advanced raw-markdown escape hatch.

### AI Write Boundary

AI-assisted changes remain out of Phase 1 execution.

When introduced later, AI may only:

- generate drafts
- suggest links or relationships
- propose edits for human approval

AI may not silently modify canonical markdown.

## Editor Boundary Decision

Do not make a rich WYSIWYG editor a Phase 1 architectural dependency.

Phase 1 should use a markdown-safe editor model with:

- structured forms for known fields
- a safe markdown body editing surface
- optional preview or raw toggle for power users

Rationale:

- round-trip safety is more important than visual richness in the first useful release
- a form-first editor better supports the shared entity model and mobile usability
- it keeps the useful core from stalling on complex rich-text fidelity problems

Consequence:

- a richer ProseMirror-based editor remains a valid later enhancement once the document model and save path are stable

## Search And Navigation Boundary

Phase 1 search should be keyword search over the rebuildable SQLite index.

Phase 1 navigation should include:

- browser filtering by type
- entity detail views
- backlinks
- unresolved-link stub surfacing

The following remain later concerns:

- semantic search
- relationship graph visualization
- timeline reasoning
- map pin navigation

## AI Provider Boundary

The application should define an internal AI provider interface in architecture, but should not activate it in Phase 1 delivery.

The provider boundary should support later adapters for:

- OpenAI-style hosted APIs
- Anthropic-style hosted APIs
- local model endpoints such as Ollama
- MCP-mediated tools or model access

However, no provider configuration, vector store, or embeddings refresh path should be required for Phase 1 deployment.

## Deployment Shape

### Phase 1 Required Runtime

- one application service
- one mounted world-data directory containing markdown, media, and SQLite state

### Phase 1 Optional Runtime

- reverse proxy in front of the app

### Phase 2 Optional Runtime

- local model sidecar
- vector or embedding store if SQLite proves insufficient for semantic retrieval

This preserves the SRE-sanity constraint from the product spec.

## Operational Impact

This decision will determine:

- what the first deployable stack looks like
- whether Phase 1 can stay operationally simple
- how much rework is likely between CRUD, search, AI assistance, and later collaboration features

Operational consequences:

- the product should be deployable early as one application plus mounted world data
- backups remain simple because canonical content and media stay on disk
- tests should focus on document round-tripping, projection rebuilds, and permission-aware workflows
- future AI features must integrate through explicit adapters rather than leaking provider specifics into app routes
- a later rich editor can be added without replacing the storage model

## Tradeoffs

### Accepted Tradeoff: Single Deployable App Over Early Service Separation

Benefit:

- simpler self-hosting and lower operational overhead

Cost:

- background indexing and later AI work may eventually need clearer process separation

### Accepted Tradeoff: SQLite Index Over Heavier Early Datastores

Benefit:

- operational simplicity and rebuildability

Cost:

- advanced semantic retrieval or high-scale collaboration may later require adjunct stores

### Accepted Tradeoff: Form-First, Markdown-Safe Editing Over Immediate Rich WYSIWYG

Benefit:

- protects round-trip fidelity and reduces Phase 1 delivery risk

Cost:

- the first editing experience may feel less polished than the eventual product vision

### Accepted Tradeoff: Explicit Structured Relationships Over Purely Prose-Derived Graphs

Benefit:

- enables reliable browse, backlink, and future graph or timeline features

Cost:

- creators may need lightweight discipline around relationship fields

## Risks And Mitigations

### Risk: The Shared Entity Envelope Is Too Rigid

Mitigation:

- keep the shared envelope small
- use type-specific fields plus `extensions`
- avoid encoding every worldbuilding nuance into the base schema

### Risk: Markdown Round-Trip Safety Is Harder Than Expected

Mitigation:

- centralize all writes in one document service
- test parse and serialize behavior with representative fixtures
- defer rich-text editing complexity until the write model is trusted

### Risk: Phase 1 Still Tries To Do Too Much

Mitigation:

- keep AI, semantic search, graph, timeline, and map features outside the required runtime
- use the ready queue ordering created in PM as the release spine

### Risk: Auth And Visibility Complicate The Early App

Mitigation:

- keep access control coarse-grained
- prefer owner-managed invites and session auth only
- avoid external identity systems in v1

## Acceptance Criteria
1. The v1 component boundaries, storage model, indexing approach, and deployment shape are explicit and reviewable.
2. The architecture separates Phase 1 required components from Phase 2 and later optional systems.
3. The decision identifies follow-on implementation work in a form PM can sequence without rediscovering product intent.
4. The architecture makes the editor boundary, AI boundary, and write safety rules explicit.

## Review Focus

- Does the architecture keep markdown ownership and rebuildable projections clearly separated?
- Is the single-app deployment shape simple enough for early self-hosting?
- Is the form-first editor decision the right tradeoff for Phase 1 safety?
- Are Phase 2 and later AI capabilities cleanly separated from required runtime concerns?

## Follow-On Implementation Paths

The existing PM-ready queue remains the correct follow-on implementation path:

1. [STORY-20260414-worldforge-phase1-storage-index-and-entity-foundation](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/engineering/ready/STORY-20260414-worldforge-phase1-storage-index-and-entity-foundation.md)
2. [STORY-20260414-worldforge-phase1-responsive-world-browser](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/engineering/ready/STORY-20260414-worldforge-phase1-responsive-world-browser.md)
3. [STORY-20260414-worldforge-phase1-markdown-safe-entity-editor](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/engineering/ready/STORY-20260414-worldforge-phase1-markdown-safe-entity-editor.md)
4. [STORY-20260414-worldforge-phase1-search-backlinks-and-stub-management](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/engineering/ready/STORY-20260414-worldforge-phase1-search-backlinks-and-stub-management.md)
5. [STORY-20260414-worldforge-phase1-auth-visibility-and-session-baseline](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/engineering/ready/STORY-20260414-worldforge-phase1-auth-visibility-and-session-baseline.md)
6. [STORY-20260414-worldforge-phase1-media-and-compose-baseline](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/engineering/ready/STORY-20260414-worldforge-phase1-media-and-compose-baseline.md)

The decision does not require additional engineering intake right now because PM has already produced the bounded Phase 1 sequence.

## Architecture Handoff

- `Architecture decision`: keep Phase 1 as a single deployable web app with markdown-as-truth, an embedded SQLite projection layer, a shared entity document envelope, form-first markdown-safe editing, and optional later AI adapters
- `Alternatives considered`: early multi-service separation, AI-first platform shaping, and immediate rich WYSIWYG dependence were rejected
- `Key risks`: schema rigidity, round-trip safety, early scope inflation, and auth complexity
- `Follow-on implementation paths`: use the six ready engineering stories already sequenced by PM
- `Next state recommendation`: review in architecture QA, then begin engineering promotion from the ready queue starting with storage and index foundations

## Next Step

Move to architecture QA for review, then promote the first ready engineering story once the decision is accepted.

## Intake Promotion Checklist
- [x] Decision scope is explicit and bounded.
- [x] Problem statement explains why the decision is needed now.
- [x] Inputs are listed and available.
- [x] Outputs are concrete and reviewable.
- [x] Alternatives and operational impact are explicit.
- [x] Follow-on implementation work is split out when needed.
