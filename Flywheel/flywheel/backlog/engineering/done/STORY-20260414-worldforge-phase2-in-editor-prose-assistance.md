# Story: WorldForge Phase 2 In-Editor Prose Assistance

## Metadata
- `id`: STORY-20260414-worldforge-phase2-in-editor-prose-assistance
- `owner_role`: Product Manager
- `status`: done
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

## Implementation Summary

- added in-editor prose-assistance contracts in [browser.ts](/Users/foundry/TriathenumDevelopment/Source/contracts/browser.ts) and exported them through [index.ts](/Users/foundry/TriathenumDevelopment/Source/contracts/index.ts) so the editor can request bounded prose actions and receive reviewable previews
- added [prose-assistance-service.ts](/Users/foundry/TriathenumDevelopment/Source/server/prose-assistance-service.ts) with:
  - provider-baseline gating so prose assistance stays optional when AI is unconfigured
  - bounded `summarize`, `rephrase`, and `continue` actions
  - scoped context notes built from the visible subject, world surface, and approval guardrails
  - explicit replace versus append apply modes so preview behavior stays predictable
- updated [index.ts](/Users/foundry/TriathenumDevelopment/Source/server/index.ts) with `POST /api/world/prose-assistance`
- added [editor-prose-assistance.ts](/Users/foundry/TriathenumDevelopment/Source/app/editor-prose-assistance.ts) so invoke, preview, apply, and reject behavior is handled through small testable editor helpers
- updated [App.tsx](/Users/foundry/TriathenumDevelopment/Source/app/App.tsx) so users can:
  - choose a bounded prose action from the editor
  - preview current versus proposed body text before changing canon
  - review the scoped context notes used for the suggestion
  - apply or reject the suggestion explicitly without any silent rewrite
- updated [styles.css](/Users/foundry/TriathenumDevelopment/Source/app/styles.css) to keep the prose preview and context cards readable on both desktop and mobile layouts
- added focused coverage in:
  - [prose-assistance-service.test.ts](/Users/foundry/TriathenumDevelopment/Source/server/prose-assistance-service.test.ts) for unavailable behavior, scoped summarize previews, and relationship-grounded continuation
  - [editor-prose-assistance.test.ts](/Users/foundry/TriathenumDevelopment/Source/app/editor-prose-assistance.test.ts) for invoke, preview, apply, and reject behavior

## Validation Results

- ran `pnpm test` successfully in `Source/`
- ran `pnpm typecheck` successfully in `Source/`
- ran `pnpm build` successfully in `Source/`
- confirmed editor-flow coverage for:
  - invoke request construction from the current editor state
  - preview generation for replace and append behaviors
  - explicit apply and reject transitions
- confirmed service coverage for:
  - unavailable behavior when the provider baseline is missing
  - scoped summarize previews with context notes
  - continuation output grounded in visible subject relationships

## Current Engineering Note

- the editor preview is intentionally separate from canonical body state until the user clicks apply
- the first shipped action set is bounded to `summarize`, `rephrase`, and `continue` rather than opening freeform co-writing
- context remains intentionally scoped to the current subject and visible world surface instead of dumping broad world state into the feature

## Open Risks

- the current prose transforms are deterministic and deliberately conservative, so richer prose quality will still need future model-backed refinement
- manual mobile UX verification was not possible inside this sandbox, so the responsive layout work is backed by code review plus CSS changes rather than a live device pass
- new-entity prose assistance without an existing saved subject relies on lighter world-level context than editing an existing entity

## Assumptions Carried Forward

- explicit preview plus apply or reject is the right trust boundary for editor assistance
- three bounded actions are sufficient for the first in-editor prose slice
- scoped context notes improve trust by showing what the assistance flow actually used

## QA Focus

- confirm prose assistance stays unavailable when the AI baseline is not configured
- confirm summarize, rephrase, and continue all produce explicit previews and never mutate the editor body before apply
- confirm apply and reject behavior remain clear in the editor on both larger and smaller layouts
- confirm the surfaced context notes feel specific enough to demonstrate scoped grounding

## Action And Approval Notes

- action class used: `local write`
- no risky-write or sensitive/production approval was required in this engineering pass

## QA Verdict

- passed: move to `done`

## QA Evidence Summary

- reviewed the implementation against all three acceptance criteria in [prose-assistance-service.ts](/Users/foundry/TriathenumDevelopment/Source/server/prose-assistance-service.ts), [editor-prose-assistance.ts](/Users/foundry/TriathenumDevelopment/Source/app/editor-prose-assistance.ts), [App.tsx](/Users/foundry/TriathenumDevelopment/Source/app/App.tsx), [styles.css](/Users/foundry/TriathenumDevelopment/Source/app/styles.css), and [index.ts](/Users/foundry/TriathenumDevelopment/Source/server/index.ts)
- confirmed automated validation is green:
  - `pnpm test`
  - `pnpm typecheck`
  - `pnpm build`
- confirmed focused editor-assistance coverage exists in:
  - [editor-prose-assistance.test.ts](/Users/foundry/TriathenumDevelopment/Source/app/editor-prose-assistance.test.ts) for invoke, preview, apply, and reject behavior
  - [prose-assistance-service.test.ts](/Users/foundry/TriathenumDevelopment/Source/server/prose-assistance-service.test.ts) for unavailable behavior, scoped context notes, and relationship-grounded continuation
- reviewed the editor flow and confirmed suggestions remain preview-only until the user clicks apply, with explicit reject behavior and no silent canon rewrite

## QA Findings

- no blocking functional defects found in the reviewed implementation

## Evidence Quality Call

- strong enough for the deferred prose-assistance baseline

## QA Risks And Gaps

- no live browser or device smoke pass was executed inside this sandbox, so the mobile-layout claim is supported by responsive CSS review and automated evidence rather than hands-on Safari verification
- the current prose transforms are intentionally deterministic and conservative, so later work may still be needed for richer writing quality or broader action coverage
- new-entity assistance still uses lighter world-level context than editing an existing saved entity, which is acceptable for this bounded slice but worth watching in future UX testing

## QA State Recommendation

- move to `done`
