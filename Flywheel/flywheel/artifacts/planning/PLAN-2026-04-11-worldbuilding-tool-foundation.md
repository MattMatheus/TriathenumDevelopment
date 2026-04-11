---
cycle_id: proto-002
kind: planning_note
ready: true
stage: planning
status: ready-for-architect
tags: [product-foundation, worldbuilding, markdown-first, ai-collaboration]
title: Worldbuilding Tool Foundation
---

# Worldbuilding Tool Foundation

## Objective

Define the initial product shape for a markdown-first, AI-assisted worldbuilding tool built from the existing Triathenum workflow and intended first for the two primary creators before eventual broader open-source use.

## Product Thesis

Build an open-source, creator-owned worldbuilding system that uses AI to deepen consistency, consequence, and character or institutional response without replacing the creative process.

## Product Principles

- Canon first. The system must reason from creator-curated notes before it generates anything new.
- Human authority. AI may suggest, compare, summarize, and simulate, but it should not silently establish canon.
- Markdown first. Files on disk remain the durable source of truth in v1.
- Obsidian native. The initial system should work comfortably with the existing vault and ObsidianMCP workflow.
- Grounding is visible. Meaningful outputs should show the notes, entities, or canon areas that informed them.
- Low overwhelm by default. Responses should be narrow, calm, and expandable rather than dense or managerial.
- Neurodivergent compatible. The system should support low-friction operation, clear structure, and adjustable interaction depth.
- Open source by design. Architecture and storage choices should remain inspectable, portable, and extensible.

## Primary Users

### Initial Users

- primary creator: repo owner
- collaborator: spouse and co-worldbuilder

### Future Users

- individual worldbuilders with their own markdown-based worlds
- small collaborative worldbuilding groups

## Problem Statement

The immediate problem is not idea generation. It is durable world-state management with enough intelligence to make the stored canon operational.

Creators need a system that can:

- retrieve the right canon quickly
- preserve continuity across long gaps
- distinguish established truth from inference
- help evaluate decisions through the lens of existing characters and institutions
- support story development only after world state is grounded

## Primary User Flows

### Flow 1: Grounded Canon Query

A creator asks a question about the world and receives a concise answer grounded in existing notes.

Example outcomes:

- summarize what is currently true about a faction, institution, or historical period
- identify unresolved questions in an area
- explain what canon supports a claim

### Flow 2: Character Response To Decision

A creator selects a character, council member, or institution and proposes a decision, event, or policy.

The system should:

- retrieve relevant canon, role, history, values, and relationships
- identify likely tensions or priorities
- produce likely reactions or response options
- clearly separate established canon from inferred response

### Flow 3: Multi-Actor Decision Review

A creator proposes a decision and asks how several world actors might respond.

The system should:

- assemble a grounded view of the decision context
- generate likely responses from selected actors
- surface alignment, conflict, and likely follow-on consequences
- support comparison rather than a single authoritative answer

### Flow 4: Consistency Review

A creator drafts or proposes new material and asks whether it conflicts with existing canon.

The system should:

- retrieve likely relevant notes
- identify potential conflicts, gaps, or ambiguous areas
- explain uncertainty rather than overstate confidence
- recommend what note or thread should be updated if the draft is accepted

## V1 Scope

V1 should focus on world state management and grounded reasoning, not full simulation.

### In Scope

- vault-aware canon retrieval
- entity and system lookup
- thread-aware operational context where useful
- character and institution profile views derived from notes
- decision-response workflows for one or more actors
- consistency and contradiction review
- explicit grounding and note references
- markdown-native authoring and update paths
- support for calm, reduced-overwhelm interaction patterns

### Out Of Scope For V1

- autonomous world evolution
- game-style turn simulation
- heavy economics or political simulation engines
- social feed or media simulation
- monetization, subscriptions, or growth mechanics
- migration away from markdown as the primary store

## V1 Feature Shortlist

### Core Foundation

- vault browser and scoped search over markdown content
- note retrieval using filesystem plus SQLite FTS5 indexes through ObsidianMCP
- entity resolution for characters, factions, locations, systems, and institutions
- source citation panel showing the notes used for an answer

### Creator Workflows

- ask-the-world query interface
- select-actor and propose-decision workflow
- multi-actor council response workflow
- canon consistency review for a draft or proposal
- optional note update recommendations after accepted changes

### Usability

- compact mode with narrow answers and reduced visual noise
- expandable detail sections for evidence, assumptions, and alternatives
- persistent session context limited to the current task
- explicit distinction between fact, inference, and suggestion

## Initial Architecture Direction

### Storage Model

- markdown files remain the source of truth
- Obsidian vault structure remains intact
- SQLite FTS5 index acts as a retrieval accelerator, not authority
- richer memory systems may be layered later without displacing files as truth

### Application Shape

- a web-native application in `Source/`
- a service layer that talks to the vault through ObsidianMCP and local index/query utilities
- local utilities in `Tools/` for indexing, retrieval, and structured note extraction
- project-specific agent skills in `Skills/` as workflows become stable

### Logical Components

- retrieval layer: note search, graph-aware lookup, scoped context assembly
- canon reasoning layer: summarize, compare, detect tension, identify ambiguity
- response layer: generate actor or institution reactions constrained by canon
- authoring support layer: recommend note updates, thread updates, or work-item updates
- UI layer: simple, calm workflows optimized for progressive disclosure

### Early Technical Bias

- prefer local-first development
- preserve inspectable intermediate data
- keep components loosely coupled so retrieval, reasoning, and UI can evolve independently
- make it easy to run the system against one local vault without multi-tenant complexity

## Accessibility And Interaction Principles

The user experience should assume that some users are easily overloaded by dense interfaces, excessive notifications, or too many choices at once.

Design biases:

- default to one focused action at a time
- keep language plain and specific
- avoid large undifferentiated panels of text
- support structured and conversational interaction equally well
- let users expand detail only when they want it
- preserve drafts and state so interrupted sessions are safe

## Risks

- canon extraction may be noisier than expected if notes are highly heterogeneous
- character-response quality may depend on profile completeness more than expected
- markdown-first authoring may require careful conventions to support reliable structured retrieval
- early UX could become cluttered if retrieval, evidence, and generation are all shown at once
- strong response generation without visible grounding could reduce user trust

## Assumptions

- the Triathenum vault is a sufficiently rich testbed for v1
- ObsidianMCP plus SQLite FTS5 can support the initial retrieval and grounding needs
- first value comes from grounded recall and consistency, not from large-scale simulation
- open-source development in public is a feature, not a constraint

## Candidate Next Planning Outputs

- product architecture note for the first application slice
- UX note for low-overwhelm interaction patterns
- initial domain model for entity types and grounded response inputs
- first engineering stories for scaffolding the app shell, retrieval service, and query UI

## Next State Recommendation

Proceed to architect work to define the first technical slice for a local-first web app that can query the vault, assemble grounded context for one selected actor, and return a canon-backed reaction to a proposed decision.
