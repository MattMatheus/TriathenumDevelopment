# Story: WorldForge Phase 2 Link, Relationship, And Summary Suggestions

## Metadata
- `id`: STORY-20260414-worldforge-phase2-link-relationship-and-summary-suggestions
- `owner_role`: Product Manager
- `status`: ready
- `source`: pm
- `decision_refs`: [PLAN-2026-04-14-worldforge-roadmap-and-product-phase, ARCH-20260414-worldforge-v1-platform-and-domain-architecture]
- `success_metric`: Users receive reviewable suggestions for links, relationships, and concise summaries that strengthen world structure without silently mutating canon.
- `release_scope`: deferred

## Problem Statement

Suggestion features make WorldForge feel actively collaborative, but they only help if they are calm, reviewable, and integrated with existing entity workflows. Bundling links, relationships, and summaries together keeps this slice focused on “AI suggestions over existing canon” rather than general generation.

## Scope
- In:
  - suggest missing `[[links]]` or equivalent entity references from edited content
  - suggest relationship additions when prose and structured fields diverge
  - generate concise entity summaries for quick reference
  - present all suggestions as explicit review items, not automatic changes
- Out:
  - whole-world digest workflows
  - contradiction resolution
  - graph editing

## Assumptions

- link and relationship suggestions should build on the stable entity and backlink model from Phase 1
- summaries should be short, reference-oriented, and replaceable rather than canonical by default
- noisy suggestion UX would quickly erode trust

## Acceptance Criteria
1. Users can review and selectively accept or dismiss link and relationship suggestions.
2. Summary generation produces concise, useful reference summaries without overwriting core canonical text.
3. Suggestion surfaces remain non-blocking and understandable in normal editing flows.

## Validation
- Required checks: tests for suggestion review behavior and structured-field updates after approval
- Additional checks: manual UX review for notification noise and summary usefulness

## Dependencies

- `STORY-20260414-worldforge-phase2-ai-provider-and-context-baseline`
- `STORY-20260414-worldforge-phase1-search-backlinks-and-stub-management`
- `STORY-20260414-worldforge-phase1-markdown-safe-entity-editor`

## Risks

- suggestion volume could overwhelm users
- relationship suggestions may be brittle if prose mentions are ambiguous
- summaries could be mistaken for canonical truth if not clearly labeled

## Open Questions

- whether summaries should live as ephemeral UI aids first or optional stored fields later

## Next Step

Promote after the earlier Phase 2 AI patterns prove trustworthy.
