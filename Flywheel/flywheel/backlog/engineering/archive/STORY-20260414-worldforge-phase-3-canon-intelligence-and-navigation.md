# Story: WorldForge Phase 3 Canon Intelligence And Navigation

## Metadata
- `id`: STORY-20260414-worldforge-phase-3-canon-intelligence-and-navigation
- `owner_role`: Product Manager
- `status`: archive
- `source`: planning
- `decision_refs`: [PLAN-2026-04-14-worldforge-roadmap-and-product-phase]
- `success_metric`: PM refines the later-phase canon intelligence and navigation roadmap into bounded stories with explicit prerequisites from the useful core and AI collaboration layers.
- `release_scope`: deferred

## Problem Statement

Timeline views, consistency checking, relationship graphs, map pins, and digest workflows are high-value features, but they depend on stable entities, relationships, indexes, and AI grounding. This layer needs deliberate roadmap shaping so it does not distort earlier priorities while still staying visible as a major part of the long-term strategy.

## Scope
- In:
  - decompose consistency review, timeline, graph, digest, and map-linked navigation into bounded roadmap stories
  - capture prerequisites from entity modeling, indexing, and AI layers
  - identify which items are product differentiators versus later polish
- Out:
  - implementation
  - comments, diff history, and publishing features unless needed for roadmap boundaries
  - final data visualization design

## Assumptions

- these features are important to the long-term value of WorldForge but should not block the first useful release
- consistency checking depends on reliable grounding and explicit world rules
- timeline and graph experiences depend on stable structured relationship data

## Acceptance Criteria
1. Phase 3 capabilities are decomposed into clear, bounded stories rather than a single umbrella item.
2. Dependencies on earlier platform and AI slices are explicit.
3. The refined stories distinguish differentiating canon-intelligence work from collaboration and publishing polish.

## Validation
- Required checks: PM review for dependency clarity, scope boundaries, and roadmap coherence
- Additional checks: confirm the decomposition does not quietly move these capabilities into Phase 1 or 2 without justification

## Dependencies

- `ARCH-20260414-worldforge-v1-platform-and-domain-architecture`
- `STORY-20260414-worldforge-phase-1-useful-core-foundation`
- `STORY-20260414-worldforge-phase-2-ai-collaboration-layer`

## Risks

- later-phase value could be underspecified and lose visibility during early delivery
- graph and timeline work could become expensive if relationship data standards are unclear
- consistency checking could disappoint if the roadmap underestimates canon normalization needs

## Open Questions

- which Phase 3 feature is the first one worth pulling forward if user value demands it
- whether map pins should be tied to timeline and graph work or remain a standalone navigation slice

## Next Step

Archived after PM refinement completed the intended decomposition and disposition pass.

## PM Refinement Outcome

- decomposition complete:
  - [STORY-20260415-worldforge-phase3-canon-consistency-review.md](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/engineering/done/STORY-20260415-worldforge-phase3-canon-consistency-review.md)
  - [STORY-20260415-worldforge-phase3-timeline-and-chronology-workspace.md](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/engineering/done/STORY-20260415-worldforge-phase3-timeline-and-chronology-workspace.md)
  - [STORY-20260415-worldforge-phase3-relationship-graph-explorer.md](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/engineering/done/STORY-20260415-worldforge-phase3-relationship-graph-explorer.md)
  - [STORY-20260415-worldforge-phase3-world-state-digest-and-review-briefs.md](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/engineering/done/STORY-20260415-worldforge-phase3-world-state-digest-and-review-briefs.md)
  - [STORY-20260415-worldforge-phase3-map-linked-location-navigation.md](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/engineering/done/STORY-20260415-worldforge-phase3-map-linked-location-navigation.md)
- remaining candidate disposition:
  - promoted to intake: [STORY-20260415-worldforge-import-and-export-hardening.md](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/engineering/intake/STORY-20260415-worldforge-import-and-export-hardening.md)
  - deferred: richer calendar-system support beyond the accepted chronology workspace
  - rejected from Phase 3 remainder: publishing-oriented export polish, which stays in Phase 4

## Archive Rationale

- this umbrella item achieved its backlog-shaping purpose and should no longer stay in engineering intake as if broad Phase 3 decomposition were still pending
- the remaining live work is narrower and now has its own intake artifact
