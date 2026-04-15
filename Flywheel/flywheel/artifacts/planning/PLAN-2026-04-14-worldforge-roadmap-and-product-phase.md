---
cycle_id: proto-003
kind: planning_note
ready: true
stage: planning
status: ready-for-pm
tags: [worldforge, roadmap, product-phase, markdown-first, ai-collaboration]
title: WorldForge Roadmap And Product Phase
---

# WorldForge Roadmap And Product Phase

## Objective

Translate the expanded WorldForge specification into a Flywheel-managed product planning baseline that can support a long-term roadmap, architecture sequencing, and bounded delivery slices.

## Planning Context

The earlier planning pass established the product foundation for a markdown-first, AI-assisted worldbuilding tool grounded in canon retrieval and low-overwhelm interaction. The new WorldForge specification extends that foundation into a broader product strategy with:

- a self-hosted multi-user application shape
- a richer entity and relationship model
- mobile-friendly authoring and navigation
- explicit AI-assisted editing, search, and consistency workflows
- import and export paths for markdown-native ownership
- phased delivery from useful core to higher-polish collaboration features

The current Flywheel engineering active lane is empty, so the correct immediate move is not implementation. The spec needs planning output and intake artifacts that PM and architecture can refine into an ordered roadmap.

## Desired Outcome

Create a durable planning baseline that:

- preserves the design principles in the new spec
- clarifies what belongs in v1 versus later phases
- identifies the architecture decisions required before implementation resumes
- seeds the backlog with concrete intake items for roadmap refinement

## Product Thesis

WorldForge should become a self-hosted, creator-owned worldbuilding workspace that combines markdown-native durability, approachable editing, structured entities, and human-approved AI assistance for small creative teams.

The differentiator is not AI alone. It is the combination of:

- plain-text ownership
- approachable non-technical UX
- grounded semantic retrieval over canon
- structured world entities and relationships
- explicit human approval before canon changes

## Planning Boundaries

### In Scope For This Planning Pass

- roadmap framing
- release-phase grouping
- v1 boundaries
- intake creation for PM and architecture
- identification of major dependency chains and product risks

### Out Of Scope For This Planning Pass

- final architecture decisions
- implementation detail selection
- queue promotion into active lanes
- final milestone dates or staffing assumptions

## Product Principles Carried Forward

- Wife test: primary workflows must be usable by a non-technical collaborator on mobile without markdown knowledge.
- Creator-owned data: markdown files remain durable and portable.
- AI as collaborator: AI may suggest, draft, summarize, and audit, but humans approve canon changes.
- Simple operations first: local-first and self-hosted deployment should stay as simple as possible in early releases.
- Grounding visible: AI-assisted results should expose citations, evidence, and uncertainty.

## Recommended Product Structure

The WorldForge specification is best treated as four roadmap layers rather than one large v1.

### Layer 1: World Core

Foundational content management and navigation:

- markdown and YAML-backed entity storage
- entity CRUD and typed metadata
- authentication and basic permissions
- backlinks, tags, and full-text search
- mobile-friendly browsing and editing
- simple self-hosted deployment

### Layer 2: AI Collaboration

Differentiating but still core features:

- provider abstraction across hosted and local models
- draft generation for entities and prose assistance
- semantic search and citation-backed question answering
- link and relationship suggestions
- configurable world context injection

### Layer 3: Canon Intelligence

Higher-value review and world-state tooling:

- consistency and contradiction review
- timeline views and event reasoning
- relationship graph exploration
- digest and summary workflows
- unresolved stub management

### Layer 4: Publishing And Collaboration Polish

Important, but not foundational for first useful release:

- comments and activity feeds
- edit history and diff/revert flows
- PDF and EPUB export
- richer schema extension management

## Working Release Phases

### Phase 1: Useful Core

Goal: make the product genuinely usable for the initial creative pair without AI dependency.

Candidate scope:

- entity CRUD for core types
- markdown filesystem storage with YAML frontmatter
- SQLite-backed metadata and full-text indexing
- login and simple invite-based accounts
- responsive app shell with browser, detail, and editor views
- backlinks, tags, unresolved link detection, and media attachments
- Docker Compose deployment path

Exit signal:

- a non-technical collaborator can create, edit, link, browse, and search world entities from desktop or iPhone without touching raw markdown

### Phase 2: AI Collaboration

Goal: introduce reviewable AI help that accelerates worldbuilding without replacing authorship.

Candidate scope:

- provider configuration for OpenAI, Anthropic, Ollama, and MCP-style backends
- generation of draft entities and selected-text writing assistance
- semantic search with citations
- auto-link and typed relationship suggestions
- summary workflows and draft stub filling

Exit signal:

- AI features are useful, reviewable, and optional, with visible citations and no silent edits

### Phase 3: Canon Intelligence

Goal: make the system actively helpful at continuity, chronology, and world-state reasoning.

Candidate scope:

- consistency checker
- timeline UI with calendar support
- relationship graph
- world-state digest
- map pins linked to locations
- import and export hardening

Exit signal:

- creators can detect contradictions, inspect chronology, and navigate systemic connections without manual cross-referencing

### Phase 4: Collaboration And Publishing Polish

Goal: support richer team workflows and external sharing once the core authoring model is stable.

Candidate scope:

- comments and change feed
- version history, diffs, and restore flows
- PDF and EPUB export
- advanced schema and admin polish

Exit signal:

- collaborators can review changes asynchronously and package the world for outside readers without leaving the platform

## Major Dependency Chains

- storage and entity model decisions precede reliable CRUD, backlinks, and import/export
- editor approach decisions precede mobile authoring quality and AI in-editor assistance
- AI service abstraction decisions precede semantic search, generation, and consistency checking
- permissions and account model decisions precede comments, change feeds, and visibility controls
- timeline and graph depend on stable entity and relationship indexing

## Key Risks

- v1 scope inflation could collapse the distinction between useful core and differentiator
- the entity model may become too rigid for varied worlds or too loose for reliable tooling
- a rich editor could increase implementation complexity before core workflows are validated
- AI feature ambition could outpace retrieval quality and citation trust
- self-hosting simplicity could degrade if too many infrastructure components become mandatory in early phases
- mobile usability could regress if desktop-first patterns dominate the interaction model

## Assumptions

- the existing Triathenum vault remains the best grounding corpus for product shaping
- markdown and YAML frontmatter remain non-negotiable source-of-truth choices
- the first strong release should be useful without AI, with AI as a deliberate second-layer differentiator
- roadmap quality depends on decomposing this spec into bounded decision and delivery slices rather than treating the document as directly executable backlog

## Intake Created From This Planning Pass

### Architecture Intake

- [ARCH-20260414-worldforge-v1-platform-and-domain-architecture](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/architecture/done/ARCH-20260414-worldforge-v1-platform-and-domain-architecture.md)

### Engineering Intake

- [STORY-20260414-worldforge-phase-1-useful-core-foundation](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/engineering/intake/STORY-20260414-worldforge-phase-1-useful-core-foundation.md)
- [STORY-20260414-worldforge-phase-2-ai-collaboration-layer](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/engineering/intake/STORY-20260414-worldforge-phase-2-ai-collaboration-layer.md)
- [STORY-20260414-worldforge-phase-3-canon-intelligence-and-navigation](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/engineering/intake/STORY-20260414-worldforge-phase-3-canon-intelligence-and-navigation.md)

### PM Refinement Output

- [STORY-20260414-worldforge-phase1-storage-index-and-entity-foundation](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/engineering/ready/STORY-20260414-worldforge-phase1-storage-index-and-entity-foundation.md)
- [STORY-20260414-worldforge-phase1-responsive-world-browser](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/engineering/ready/STORY-20260414-worldforge-phase1-responsive-world-browser.md)
- [STORY-20260414-worldforge-phase1-markdown-safe-entity-editor](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/engineering/ready/STORY-20260414-worldforge-phase1-markdown-safe-entity-editor.md)
- [STORY-20260414-worldforge-phase1-search-backlinks-and-stub-management](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/engineering/ready/STORY-20260414-worldforge-phase1-search-backlinks-and-stub-management.md)
- [STORY-20260414-worldforge-phase1-auth-visibility-and-session-baseline](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/engineering/ready/STORY-20260414-worldforge-phase1-auth-visibility-and-session-baseline.md)
- [STORY-20260414-worldforge-phase1-media-and-compose-baseline](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/engineering/ready/STORY-20260414-worldforge-phase1-media-and-compose-baseline.md)
- [STORY-20260414-worldforge-phase2-ai-provider-and-context-baseline](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/engineering/ready/STORY-20260414-worldforge-phase2-ai-provider-and-context-baseline.md)
- [STORY-20260414-worldforge-phase2-semantic-search-and-cited-world-answers](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/engineering/ready/STORY-20260414-worldforge-phase2-semantic-search-and-cited-world-answers.md)
- [STORY-20260414-worldforge-phase2-draft-entity-generation-and-stub-filling](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/engineering/ready/STORY-20260414-worldforge-phase2-draft-entity-generation-and-stub-filling.md)
- [STORY-20260414-worldforge-phase2-in-editor-prose-assistance](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/engineering/ready/STORY-20260414-worldforge-phase2-in-editor-prose-assistance.md)
- [STORY-20260414-worldforge-phase2-link-relationship-and-summary-suggestions](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/engineering/ready/STORY-20260414-worldforge-phase2-link-relationship-and-summary-suggestions.md)

## Next Stage Recommendation

Proceed to `pm` next.

Reason:

- the new intake items need decomposition, ordering, and dependency shaping before they are fit for execution
- the roadmap needs explicit prioritization around useful-core versus differentiator work
- architecture should be pulled in from PM with a focused first decision story rather than trying to solve every design choice at once

## PM Focus For The Next Stage

- convert the roadmap layers into a sequenced backlog spine
- split the Phase 1 foundation story into smaller implementation-ready stories
- keep AI-heavy work behind the useful-core platform baseline
- identify which roadmap items require architecture decisions before engineering promotion
- preserve the non-technical mobile usability constraint in every refined story

## Architecture Focus After PM

- define the v1 platform architecture across storage, index, entity model, editor boundary, AI abstraction, and deployment shape
- make explicit which components are required in Phase 1 versus Phase 2
- identify decision points that would otherwise create rework across CRUD, search, editor, and AI services
