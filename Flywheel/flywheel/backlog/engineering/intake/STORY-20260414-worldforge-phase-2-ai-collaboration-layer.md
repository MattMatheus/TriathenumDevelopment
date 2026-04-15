# Story: WorldForge Phase 2 AI Collaboration Layer

## Metadata
- `id`: STORY-20260414-worldforge-phase-2-ai-collaboration-layer
- `owner_role`: Product Manager
- `status`: intake
- `source`: planning
- `decision_refs`: [PLAN-2026-04-14-worldforge-roadmap-and-product-phase]
- `success_metric`: PM refines the AI collaboration roadmap into bounded follow-on stories that layer safely on top of the useful core with explicit provider, grounding, and approval constraints.
- `release_scope`: deferred

## Problem Statement

The WorldForge specification includes a rich AI feature set, but these capabilities should not be treated as one undifferentiated backlog item. They depend on retrieval quality, editor boundaries, and explicit approval rules. PM needs to shape this layer into sequenced follow-on work rather than allowing it to blur into Phase 1.

## Scope
- In:
  - decompose AI generation, semantic search, suggestion workflows, and summaries into bounded stories
  - preserve explicit grounding, citation, and approval expectations
  - identify architectural prerequisites that must land before promotion
- Out:
  - implementation
  - model-provider-specific optimization work
  - late-phase canon intelligence features unless needed for dependency notes

## Assumptions

- AI remains optional and reviewable across all features
- provider abstraction is preferable to hard-coding a single model path
- semantic search quality depends on reliable indexing and source citations

## Acceptance Criteria
1. Phase 2 is decomposed into explicit stories with dependency notes against Phase 1 platform work.
2. Every refined story preserves human approval boundaries and visible grounding expectations.
3. The decomposition separates foundational AI workflows from later consistency-audit and graph-heavy intelligence work.

## Validation
- Required checks: PM review for bounded scope, dependency clarity, and policy consistency with planning principles
- Additional checks: confirm no refined story implies silent canon mutation or mandatory external hosted AI

## Dependencies

- `ARCH-20260414-worldforge-v1-platform-and-domain-architecture`
- `STORY-20260414-worldforge-phase-1-useful-core-foundation`

## Risks

- AI scope could expand faster than the platform foundation can support
- provider abstraction could become over-engineered before real usage patterns are known
- suggestion and generation features could erode trust if review boundaries are underspecified

## Open Questions

- which AI workflow should be the first differentiating feature after the useful core
- whether MCP support belongs in the first AI slice or a later provider expansion slice

## Next Step

PM refinement after the useful-core backlog spine is established.
