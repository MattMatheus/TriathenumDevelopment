# Story: WorldForge Phase 2 Draft Entity Generation And Stub Filling

## Metadata
- `id`: STORY-20260414-worldforge-phase2-draft-entity-generation-and-stub-filling
- `owner_role`: Product Manager
- `status`: ready
- `source`: pm
- `decision_refs`: [PLAN-2026-04-14-worldforge-roadmap-and-product-phase, ARCH-20260414-worldforge-v1-platform-and-domain-architecture]
- `success_metric`: Users can generate reviewable draft entities from a chosen type or unresolved stub without any AI-generated content becoming canon until explicitly accepted.
- `release_scope`: deferred

## Problem Statement

Entity generation is a high-value Phase 2 capability, especially for unresolved stubs, but it carries trust risk. It must be framed as draft creation with visible provenance and user approval, not auto-authoring.

## Scope
- In:
  - generate draft entities from selected type, name, or unresolved stub
  - prefill structured fields and markdown body drafts using available world context
  - present drafts in a review flow before saving
  - connect stub generation to the existing unresolved-link workflow
- Out:
  - auto-saving generated canon
  - large batch generation workflows
  - contradiction checking across the whole world

## Assumptions

- draft generation should use the same world-context and provider baseline as other AI features
- unresolved links are the most natural first entry point for generation
- generated content should land in the existing editor review flow, not a separate opaque system

## Acceptance Criteria
1. Users can request a generated draft for a new entity or unresolved stub and review it before saving.
2. Generated drafts prefill structured fields and body content in a way compatible with the existing entity editor.
3. No generated content becomes canonical without explicit user acceptance.

## Validation
- Required checks: review-flow tests ensuring draft-only behavior plus generation contract tests
- Additional checks: manual review that draft provenance and approval boundaries are obvious

## Dependencies

- `STORY-20260414-worldforge-phase2-ai-provider-and-context-baseline`
- `STORY-20260414-worldforge-phase1-markdown-safe-entity-editor`
- `STORY-20260414-worldforge-phase1-search-backlinks-and-stub-management`

## Risks

- generated drafts could appear more authoritative than intended
- schema-prefill quality may vary heavily by entity type
- users may expect one-click creation unless the review flow is explicit and calm

## Open Questions

- whether the first draft workflow should prioritize single-entity creation or stub-driven creation

## Next Step

Promote after the provider baseline and editor review flows are stable.
