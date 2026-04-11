# Architecture Story: Retrieval And Grounding Refinement

## Metadata
- `id`: ARCH-20260411-retrieval-grounding-refinement
- `owner_role`: Software Architect
- `status`: done
- `source`: planning
- `decision_refs`: [PLAN-2026-04-11-retrieval-grounding-refinement]
- `decision_owner`: Software Architect
- `success_metric`: A reviewed architecture defines how the system should improve retrieval quality and grounding fidelity without sacrificing inspectability or markdown-first authority.

## Decision Scope

Define the next architecture slice for retrieval and grounding refinement after the first working actor-reaction implementation.

This decision should cover:

- retrieval adapter layering
- ranking and source-priority strategy
- ambiguity handling for entity resolution
- grounding bundle enrichment
- boundaries between shared application logic and operator-facing tooling

Non-goals:

- final simulation architecture
- replacement of markdown as the source of truth
- full semantic graph or embedding platform design
- broad UI redesign

## Problem Statement

The current system works, but retrieval quality is now the main limiter on response quality.

The first implementation uses:

- filesystem scanning
- title-forward entity resolution
- simple heuristic selection
- conservative, link-driven relationship extraction

These choices were appropriate for a first slice, but the next gains require a better retrieval design. The architecture needs to decide how to introduce ObsidianMCP, SQLite FTS5, stronger ranking, and richer grounding roles without making the system opaque or overcomplicated.

## Inputs
- Existing decisions:
  - [PLAN-2026-04-11-retrieval-grounding-refinement](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/artifacts/planning/PLAN-2026-04-11-retrieval-grounding-refinement.md)
  - [ARCH-20260411-first-system-slice](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/architecture/done/ARCH-20260411-first-system-slice.md)
- Existing architecture artifacts:
  - first system slice architecture story
- Constraints:
  - markdown-first storage remains authoritative
  - retrieval behavior should remain inspectable
  - the system should stay local-first
  - grounding fidelity should improve before response-generation sophistication grows

## Outputs Required
- Decision updates:
  - define the next retrieval adapter model
  - define ranking and source precedence rules
  - define enriched grounding bundle roles
  - define ambiguity handling for unresolved or multi-match entities
- Architecture artifacts:
  - this architecture story as the reviewable decision surface
  - follow-on engineering stories for adapter integration and ranking improvements
- Risks and tradeoffs:
  - visible in dedicated sections below

## Alternatives Considered

- continue extending filesystem-only retrieval
- switch immediately to ObsidianMCP-driven retrieval as the sole path
- adopt SQLite FTS5 as the dominant retrieval layer
- combine adapters under explicit precedence and ranking rules

## Architecture Decision

Adopt a layered retrieval model with explicit adapter precedence, inspectable ranking, and enriched grounding roles.

The next retrieval slice should use three retrieval inputs:

1. direct structural retrieval
2. indexed search retrieval
3. filesystem fallback retrieval

### Retrieval Adapter Strategy

#### Adapter 1: Structural Retrieval

Primary purpose:

- resolve actors and nearby canon through explicit note identity, links, and graph-aware lookups

Primary sources:

- exact actor note match
- alias match
- ObsidianMCP graph or note-link retrieval

This adapter should have the highest trust because it reflects direct note identity and explicit creator structure.

#### Adapter 2: Indexed Search Retrieval

Primary purpose:

- surface relevant institutional, historical, and thematic context not directly linked from the actor note

Primary sources:

- SQLite FTS5 search results
- scoped keyword expansion over actor name, role, and decision language

This adapter should widen context, but not override direct structural matches.

#### Adapter 3: Filesystem Fallback Retrieval

Primary purpose:

- preserve local-first robustness when richer adapters are unavailable

Primary sources:

- current filesystem scan and lightweight heuristics

This remains important for resilience and testing, but it should become the fallback path rather than the primary one.

## Adapter Precedence

The system should not merge all retrieval inputs as peers. It should apply explicit precedence:

1. resolved actor note and direct aliases
2. direct links and explicit linked canon
3. scoped indexed search hits
4. filesystem heuristic expansion

Precedence means:

- higher-priority evidence should be preferred when selecting sources for the grounding bundle
- lower-priority evidence may expand context, but should not displace stronger direct evidence without an explicit scoring reason
- the system should expose why a note was included, not just that it was included

## Ranking Strategy

Use a small, explainable scoring model rather than a single opaque relevance score.

Each candidate note should receive a score composed from:

- identity score
- link score
- query score
- domain relevance score
- freshness or operational relevance score when applicable

The score should remain decomposable for debugging.

### Initial Ranking Rules

- exact actor match dominates all other candidates
- direct linked canon outranks broad search hits
- indexed search may outrank unlinked filesystem hits when keyword overlap is strong
- operational notes may enrich uncertainty or active tension, but should not override canon notes for factual grounding

## Enriched Grounding Bundle

The grounding bundle should distinguish source roles explicitly instead of returning one undifferentiated list of notes and extracted text.

Add source-role groupings such as:

- `subject_note`
- `linked_canon`
- `supporting_search_hit`
- `operational_context`
- `open_question_source`

The bundle should also distinguish content roles more clearly:

- facts
- tensions
- relationships
- unresolved questions
- source-role inventory
- inclusion reasons

This should improve both debugging and UI presentation without forcing a heavy ontology.

## Ambiguity Handling

Entity resolution ambiguity should be explicit and first-class.

When the system cannot confidently choose one actor:

- return an ambiguity result with ranked candidates
- include why each candidate matched
- avoid assembling a grounding bundle until the ambiguity is resolved

When the system resolves an actor but supporting context is weak:

- continue with a bundle
- expose confidence limitations through uncertainty and inclusion reasoning

## Shared Logic Vs Tooling Boundary

Shared retrieval and ranking logic should remain under `Source/`.

Place in shared modules:

- adapter orchestration
- ranking and precedence rules
- ambiguity handling
- grounding bundle assembly

Place in `Tools/`:

- diagnostic commands
- indexing refresh helpers
- vault inspection utilities
- developer-facing ranking or source-debug entrypoints

This preserves one application code path while still giving operators practical utilities.

## Operational Impact

- affects response quality across all future workflows
- changes how retrieval debugging should be performed
- may create a new distinction between retrieval adapters and ranking/orchestration logic
- likely informs how character-note enrichment and canon authoring pay off in practice

Operational consequences:

- debugging should show adapter contributions and inclusion reasons
- tests should cover precedence and ambiguity rules, not only happy-path retrieval
- the UI may later expose source-role groupings without needing a major contract rewrite
- character enrichment work becomes easier to target because weak or missing grounding can be diagnosed more clearly

## Risks And Mitigations

### Risk: Multi-Adapter Retrieval Becomes Hard To Reason About

Mitigation:

- keep adapter precedence explicit
- expose score components and inclusion reasons
- provide diagnostic tooling under `Tools/`

### Risk: Indexed Search Introduces More Noise Than Value

Mitigation:

- cap search-hit participation in the grounding bundle
- require indexed hits to lose to stronger direct evidence
- tune search expansion around actor role and decision vocabulary

### Risk: Grounding Bundle Enrichment Becomes Over-Modeled

Mitigation:

- add only source-role and inclusion-reason fields needed for debugging and UI
- avoid a full ontology or semantic graph in this slice

### Risk: Character Notes Remain Too Thin For High-Quality Responses

Mitigation:

- make weakness visible through ambiguity and uncertainty
- use enriched grounding diagnostics to show where canon enrichment would help most

## Acceptance Criteria
1. The architecture defines a clear retrieval adapter strategy.
2. Ranking and source precedence are explicit and reviewable.
3. The grounding bundle is enriched without becoming opaque or over-modeled.
4. Ambiguity handling is explicit.
5. Follow-on engineering work is split into bounded stories.

## Review Focus

- Does the proposed direction improve quality without overcomplicating the stack?
- Are adapter precedence and ranking rules inspectable enough for debugging?
- Does the grounding bundle stay practical for UI and response generation?
- Is the split between shared logic and tooling clean?

## Follow-On Implementation Paths

Create the next engineering wave as bounded stories:

- `STORY-20260411-retrieval-adapter-layering`: introduce adapter orchestration for structural, indexed, and filesystem retrieval paths
- `STORY-20260411-retrieval-ranking-and-ambiguity`: implement decomposed ranking, precedence rules, and explicit ambiguity results
- `STORY-20260411-grounding-bundle-enrichment`: enrich grounding bundles with source roles and inclusion reasons and adapt downstream consumers
- `STORY-20260411-retrieval-diagnostics`: add operator-facing debugging utilities under `Tools/` for source selection and ranking inspection

Recommended implementation order:

1. retrieval adapter layering
2. retrieval ranking and ambiguity
3. grounding bundle enrichment
4. retrieval diagnostics

## Architecture Handoff

- `Architecture decision`: adopt layered retrieval with explicit adapter precedence, explainable scoring, enriched grounding roles, and first-class ambiguity handling
- `Alternatives considered`: filesystem-only, ObsidianMCP-only, and FTS5-dominant approaches were all rejected in favor of combined adapters under explicit precedence
- `Key risks`: multi-adapter opacity, search noise, grounding over-modeling, and thin character notes
- `Follow-on implementation paths`: four engineering intake stories for layering, ranking, enrichment, and diagnostics
- `Next state recommendation`: review in architecture QA, then route the new engineering stories through PM for sequencing

## Next Step

Review in architecture QA, then open the next engineering wave for retrieval and grounding refinement before more response-generation work.

## Intake Promotion Checklist
- [x] Decision scope is explicit and bounded.
- [x] Problem statement explains why the decision is needed now.
- [x] Inputs are listed and available.
- [x] Outputs are concrete and reviewable.
- [x] Alternatives and operational impact are explicit.
- [x] Follow-on implementation work is split out when needed.
