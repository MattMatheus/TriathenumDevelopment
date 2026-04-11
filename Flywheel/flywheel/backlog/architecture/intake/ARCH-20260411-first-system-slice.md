# Architecture Story: First System Slice

## Metadata
- `id`: ARCH-20260411-first-system-slice
- `owner_role`: Software Architect
- `status`: intake
- `source`: planning
- `decision_refs`: [PLAN-2026-04-11-worldbuilding-tool-foundation]
- `decision_owner`: Software Architect
- `success_metric`: A reviewed architecture defines a first implementation slice that can retrieve grounded canon for one selected actor and return a canon-backed reaction to a proposed decision.

## Decision Scope

Define the initial system architecture for a local-first, markdown-native web application that:

- reads creator-owned world state from the Triathenum vault
- uses ObsidianMCP plus indexed retrieval as the access layer
- assembles grounded context for one selected actor or institution
- returns likely reactions to a proposed decision with visible grounding

This decision should cover system boundaries, core components, data flow, write constraints, and phased evolution through v1.

Non-goals for this decision:

- final multi-user architecture
- cloud hosting strategy
- large-scale vector or embedding infrastructure
- autonomous simulation design
- deep UI visual design

## Problem Statement

The project now has a clear product direction but no shared technical architecture. Without a concrete first-slice design, early engineering work risks drifting into disconnected experiments around UI, retrieval, or AI prompting.

The immediate need is an architecture that preserves the key product constraints:

- markdown files remain the source of truth
- AI remains grounded in creator-curated canon
- early workflows stay low-overwhelm and inspectable
- the first delivered capability is actor reaction to a proposed decision

The architecture must be concrete enough to guide scaffolding while leaving room for later simulation and richer memory systems.

## Inputs
- Existing decisions:
  - [PLAN-2026-04-11-worldbuilding-tool-foundation](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/artifacts/planning/PLAN-2026-04-11-worldbuilding-tool-foundation.md)
- Existing architecture artifacts:
  - none yet
- Constraints:
  - markdown-first storage
  - Obsidian vault remains the durable source of truth
  - ObsidianMCP and SQLite FTS5 are available as retrieval infrastructure
  - initial usage is local-first for two primary collaborators
  - open source, non-commercial, and inspectable by design
  - interface should support neurodivergent-friendly low-overwhelm operation

## Outputs Required
- Decision updates:
  - define the first application architecture and boundaries
  - define the initial read path and explicit write model
  - define the first domain contracts required for implementation
- Architecture artifacts:
  - this architecture story as the reviewable decision surface
  - follow-on engineering stories for app shell, retrieval service, and actor reaction flow
- Risks and tradeoffs:
  - visible in dedicated sections below

## Architecture Decision

Build the system as a local-first web application with a thin backend-for-frontend service layer between the UI and world-state access services.

The first implementation slice should use four layers:

1. UI application
2. application API/service layer
3. retrieval and grounding services
4. vault access adapters

### Layer 1: UI Application

Responsibility:

- present focused creator workflows
- collect user intent
- render compact results with expandable grounding
- maintain only session-local UI state

Initial workflow surfaces:

- world query
- select actor and propose decision
- view grounded response

The UI should not talk directly to the vault, SQLite index, or model providers.

### Layer 2: Application API / Orchestration Layer

Responsibility:

- accept structured workflow requests from the UI
- call retrieval and grounding services
- assemble a bounded reasoning payload
- invoke AI reasoning for summaries or reactions
- normalize outputs into stable response shapes
- enforce distinction between fact, inference, and suggestion

This layer is the product behavior boundary. It should own workflow orchestration and response contracts, not low-level retrieval details.

### Layer 3: Retrieval And Grounding Services

Responsibility:

- perform scoped search over notes and indexes
- resolve entities and actor references
- expand context through links, tags, and configured note relationships
- extract candidate facts, tensions, and unresolved questions
- produce a compact grounding bundle for reasoning

This layer should be deterministic where possible. Its job is to produce a reviewable evidence set before any generative step occurs.

### Layer 4: Vault Access Adapters

Responsibility:

- access markdown notes through filesystem and ObsidianMCP
- query the SQLite FTS5 index
- expose read operations for note content, metadata, backlinks, and file paths
- expose explicit write operations later, but keep writes disabled by default in the first slice

This keeps vault-specific behavior isolated so later storage or access changes do not leak upward through the stack.

## Core Read Path

For the initial actor-reaction workflow, the request path should be:

1. User selects an actor and enters a proposed decision.
2. UI sends a structured request to the application API.
3. API asks the retrieval layer to resolve the actor and gather relevant canon.
4. Retrieval layer queries:
   - actor note or notes
   - linked canon notes
   - relevant institutions, factions, or threads
   - recent or active operational notes when useful
   - FTS-backed related material for tension or context expansion
5. Retrieval layer returns a grounding bundle:
   - actor summary
   - relevant facts
   - likely priorities or tensions grounded in notes
   - citations and note paths
   - unresolved ambiguities
6. API sends a bounded reasoning prompt using that bundle.
7. Response is normalized into:
   - likely reaction
   - alternate reaction or uncertainty if warranted
   - reasons
   - canon basis
   - inferred elements clearly labeled
8. UI renders the result with calm defaults and expandable evidence.

## Write Model

The first implementation slice should be read-first.

Allowed in the first slice:

- read notes
- index or query notes
- propose updates
- surface suggested note targets for later edits

Not allowed by default in the first slice:

- silently modify canon notes
- automatically promote inference into canon
- perform broad multi-note rewrites

If write support is added in an early follow-on slice, it should use an explicit proposal-and-confirm model:

- system recommends note updates
- user reviews proposed diffs or note targets
- user confirms before any vault write occurs

## Initial Domain Contracts

The first slice should establish a small shared contract set.

### NoteRef

Represents a source note used in retrieval.

Fields:

- path
- title
- type
- excerpt
- score

### EntityRef

Represents a resolved world entity.

Fields:

- id
- name
- entity_type
- primary_note
- aliases

### GroundingBundle

Represents the compact, reviewable context assembled before reasoning.

Fields:

- subject
- decision_prompt
- facts
- tensions
- relationships
- unresolved_questions
- notes

### ReactionResponse

Represents the normalized workflow output.

Fields:

- summary
- likely_reaction
- alternatives
- rationale
- canon_basis
- inferred_elements
- uncertainties

These contracts should be defined before engineering starts so UI, service, and retrieval work can proceed against stable boundaries.

## First-Slice Component Map

### `Source/app`

Web UI for creator workflows.

### `Source/server`

Application API and orchestration layer.

### `Tools/retrieval`

Utilities for index-backed note lookup, entity resolution, and context assembly.

### `Tools/obsidian`

Adapters or wrappers for ObsidianMCP and vault-facing operations.

### `Skills/`

Reserved for stable agent workflows after the first interaction model is proven.

## Recommended Technical Direction

Use a single language across the first slice where practical to reduce coordination cost between UI, service, and tooling. A TypeScript-first stack is the default recommendation unless a strong repository-specific reason emerges to split languages.

Biases:

- web UI should be component-based and optimized for progressive disclosure
- service contracts should be explicit and typed
- retrieval utilities should be testable outside the UI
- note parsing and grounding assembly should be inspectable in logs or debug output

Open question to settle during promotion from intake to ready:

- whether retrieval utilities live as importable packages under `Source/` or standalone scripts/libraries under `Tools/`

## Alternatives Considered

### Alternative 1: UI Talks Directly To Vault And Models

Pros:

- fewer moving parts
- fast to prototype

Cons:

- weak separation of concerns
- harder to test and evolve
- couples UI to retrieval and model behavior
- makes future storage or provider changes more expensive

Rejected because the first product value depends on trustworthy grounding and explicit orchestration.

### Alternative 2: Full Structured Database As Primary Store

Pros:

- easier normalized queries
- simpler relational joins for entities and links

Cons:

- violates markdown-first constraint
- increases migration and sync complexity
- reduces inspectability for early users

Rejected for v1 because files on disk are a core product value, not just a temporary implementation detail.

### Alternative 3: Autonomous Simulation Engine First

Pros:

- flashy early demos
- strong exploratory potential

Cons:

- weak trust foundation
- likely to outrun canon quality
- risks replacing rather than complementing the creative process

Rejected because grounded world state management is the explicit first priority.

## Operational Impact

This architecture creates clear ownership boundaries:

- UI owns interaction flow and presentation
- application API owns workflow orchestration and response contracts
- retrieval services own evidence assembly
- vault adapters own storage access

This should reduce rework when later phases add:

- multi-actor workflows
- consistency review
- proposal-based note writes
- richer memory augmentation
- optional packaging for containerized local deployment

Operational consequences:

- debugging should focus first on grounding bundle quality before model quality
- tests can be split into retrieval, contract, and workflow layers
- the system can remain local-first without introducing premature multi-user complexity

## Risks And Mitigations

### Risk: Note Heterogeneity Makes Retrieval Noisy

Mitigation:

- keep grounding bundles small and reviewable
- bias retrieval toward explicit actor notes and linked canon before wider search
- add debug views for what sources were selected and why

### Risk: Response Quality Is Blamed On The Model When Grounding Is Weak

Mitigation:

- make grounding visible in the UI
- log grounding bundle composition
- evaluate retrieval and reasoning as separate stages

### Risk: Architecture Becomes Too Heavy For A Local-First Tool

Mitigation:

- keep the service layer thin
- defer distributed concerns
- optimize for single-world local execution first

### Risk: Early UX Becomes Overwhelming

Mitigation:

- default to one primary action per screen
- keep details collapsed until requested
- clearly separate answer, evidence, and uncertainty

## Acceptance Criteria

1. The architecture defines clear boundaries between UI, orchestration, retrieval, and vault access.
2. The first actor-reaction workflow has an explicit end-to-end read path.
3. The write model preserves markdown-first authority and requires explicit confirmation for future note changes.
4. Shared domain contracts are concrete enough for engineering scaffolding.
5. Alternatives, risks, and operational impact are explicit and reviewable.

## Review Focus

- Are the boundaries too heavy or not heavy enough for v1?
- Is the read path narrow enough to produce grounded outputs reliably?
- Does the write model protect canon authority sufficiently?
- Are the proposed contracts enough to start implementation without over-modeling?
- Should the first slice include consistency review now, or only actor reaction?

## Next Step

Promote this story to `ready` after review and split follow-on engineering stories for:

- app shell and interaction frame
- application API and typed contracts
- retrieval service and grounding bundle assembly
- first actor-reaction workflow with visible citations

## Intake Promotion Checklist
- [x] Decision scope is explicit and bounded.
- [x] Problem statement explains why the decision is needed now.
- [x] Inputs are listed and available.
- [x] Outputs are concrete and reviewable.
- [x] Alternatives and operational impact are explicit.
- [x] Follow-on implementation work is split out when needed.
