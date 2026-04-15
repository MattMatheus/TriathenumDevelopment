# Story: WorldForge Phase 2 In-Editor Prose Assistance

## Metadata
- `id`: STORY-20260414-worldforge-phase2-in-editor-prose-assistance
- `owner_role`: Product Manager
- `status`: ready
- `source`: pm
- `decision_refs`: [PLAN-2026-04-14-worldforge-roadmap-and-product-phase, ARCH-20260414-worldforge-v1-platform-and-domain-architecture]
- `success_metric`: Users can invoke bounded prose actions inside the editor with world context and apply or reject the results explicitly.
- `release_scope`: deferred

## Problem Statement

Prose assistance is central to the WorldForge vision, but it must integrate with the editor and canon guardrails in a controlled way. This work should focus on bounded assistance actions rather than general open-ended chat inside the editor.

## Scope
- In:
  - support bounded prose actions such as expand, summarize, rephrase, and continue
  - pass relevant world context into the assistance request
  - return proposed text that users can insert, compare, or reject explicitly
  - keep the interaction understandable on mobile and desktop
- Out:
  - freeform autonomous co-writing
  - invisible background rewriting
  - full-world contradiction analysis

## Assumptions

- the editor already supports a stable review-and-apply flow
- bounded actions are easier to trust than open-ended generation
- context windows should remain intentionally scoped rather than dumping large world state

## Acceptance Criteria
1. Users can trigger a bounded prose action from the editor and receive a proposed result with clear apply or reject controls.
2. The assistance flow uses scoped world context and does not silently rewrite canonical content.
3. The interaction remains legible and usable on both desktop and mobile layouts.

## Validation
- Required checks: editor-integration tests for invoke, preview, apply, and reject behavior
- Additional checks: manual verification of context scoping and mobile UX

## Dependencies

- `STORY-20260414-worldforge-phase2-ai-provider-and-context-baseline`
- `STORY-20260414-worldforge-phase1-markdown-safe-entity-editor`

## Risks

- prose assistance could overwhelm the editor with too many actions or unclear results
- result-application UX could become awkward on small screens
- scoped context may be too thin for good output or too broad for predictable behavior

## Open Questions

- which two or three prose actions should ship first instead of launching the whole action set at once

## Next Step

Promote after draft-generation review patterns and editor stability are validated.
