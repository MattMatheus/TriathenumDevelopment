# User Guide

## What WorldForge Is

WorldForge is a markdown-first worldbuilding workspace. It lets you browse and edit entities through a web UI while keeping markdown files as the durable source of truth.

The app is organized around a useful core first, then optional AI-assisted workflows, then review and navigation tools.

## Sign In And Roles

WorldForge currently supports two roles:

- `owner`
  - can view and edit everything
  - can create collaborator accounts
  - can manage AI settings
  - can work with restricted visibility, export, and import apply flows
- `collaborator`
  - can view and edit `all_users` entities only
  - cannot assign restricted visibility
  - cannot manage accounts or AI settings

Visibility options:

- `all_users`: shared content visible to owner and collaborators
- `owner_only`: visible only to the owner
- `hidden`: hidden from collaborators and intended for owner-governed material

## Browsing The World

The main browser lets you:

- filter by entity type
- filter by tag
- search by keyword
- open an entity detail view
- inspect backlinks
- inspect unresolved references that should become future entities

Current first-class entity types:

- characters
- locations
- factions
- systems
- artifacts
- lore articles

## Editing Entities

The editor is designed to stay markdown-safe while giving you structured fields in the UI.

You can:

- create a new entity
- edit the name, type, visibility, aliases, tags, and body
- add structured fields
- add explicit relationships
- save changes back to the markdown world

Media attachments are stored on disk under the world directory. Save a new entity first before attaching media to it.

## Search And Discovery

### Keyword Search

Keyword search is part of the useful core and works without AI configuration.

Use it when you want:

- direct title or text matching
- tag and type filtering
- backlink and stub follow-up work

### Semantic Search

Semantic search is optional and depends on the AI baseline being configured.

Use it when you want:

- fuzzy lore questions
- citation-backed answers
- an explicit uncertainty readout instead of a silent guess

## Optional AI Workflows

AI features are review-oriented. They do not silently change canon.

Current optional AI surfaces include:

- draft entity generation
  - generate a reviewable first draft
  - fill unresolved stubs with structured proposals
- editor prose assistance
  - summarize
  - rephrase
  - continue
- editor suggestions
  - link suggestions
  - relationship suggestions
  - summary suggestions

You review results in the browser and choose whether to apply them. If AI is not configured, the useful core still works.

## Review And Navigation Tools

WorldForge also includes several review/navigation workspaces:

- Consistency Review
  - flags likely contradictions or weak corroboration
  - keeps findings reviewable and non-destructive
- World-State Digest
  - generates a concise summary of the visible world or a selected tag slice
- Timeline Workspace
  - surfaces chronology and dated events in one place
- Graph Explorer
  - shows relationship neighborhoods around an entity
- Map Navigation
  - links map pins and regions back to location entities

These tools are meant to help you inspect and organize canon, not replace explicit editorial judgment.

## Export And Import

### Export

World export creates a portable package of the current world.

- owners export everything they can see, including restricted content
- collaborators export only the content visible to their role

### Import Review And Apply

Import is designed as a review-first workflow.

- upload an export-shaped package
- inspect valid items, conflicts, unsupported content, and issues
- apply only after reviewing the dry-run result

The current import apply flow uses an explicit skip-on-conflict policy rather than silently overwriting existing world files.

## Account Provisioning

Only the owner can provision collaborator accounts. There is no self-service sign-up flow in the current product.

## What Stays Canonical

WorldForge helps you work with canon, but canonical source still lives in your markdown world:

- markdown files are canonical
- frontmatter carries structured metadata
- media files live under the world directory
- the SQLite index is rebuildable
- AI output remains reviewable until you explicitly accept it

## Practical Mental Model

If you want the simplest way to think about WorldForge:

- browse and edit in the app
- treat markdown as the lasting source of truth
- use AI as a suggestion layer, not an authority
- use review/navigation tools to inspect and tighten your world over time
