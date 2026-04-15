# Story: WorldForge Phase 2 Link, Relationship, And Summary Suggestions

## Metadata
- `id`: STORY-20260414-worldforge-phase2-link-relationship-and-summary-suggestions
- `owner_role`: Product Manager
- `status`: done
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

## Implementation Summary

- added editor-suggestion contracts in [browser.ts](/Users/foundry/TriathenumDevelopment/Source/contracts/browser.ts) and exported them through [index.ts](/Users/foundry/TriathenumDevelopment/Source/contracts/index.ts) so the editor can request reviewable link, relationship, and reference-summary suggestions
- added [editor-suggestion-service.ts](/Users/foundry/TriathenumDevelopment/Source/server/editor-suggestion-service.ts) with:
  - provider-baseline gating so the suggestion workflow stays consistent with the other Phase 2 AI surfaces
  - deterministic mention detection across visible entity names and aliases
  - link suggestions for unlinked entity mentions in the editor body
  - relationship suggestions when prose mentions diverge from structured relationship rows
  - a replaceable `reference_summary` suggestion that improves quick reference without overwriting the body text
- updated [index.ts](/Users/foundry/TriathenumDevelopment/Source/server/index.ts) with `POST /api/world/editor-suggestions`
- added [editor-suggestions.ts](/Users/foundry/TriathenumDevelopment/Source/app/editor-suggestions.ts) so request construction plus apply behavior for links, relationships, and summaries stay small and testable
- updated [App.tsx](/Users/foundry/TriathenumDevelopment/Source/app/App.tsx) so users can:
  - request a suggestion review pass from inside the editor
  - apply or dismiss link suggestions one at a time
  - apply or dismiss relationship suggestions one at a time
  - apply or dismiss a labeled reference-summary suggestion without mutating the body text
  - see accepted `reference_summary` content surfaced back in the detail view for quick scanning
- updated [styles.css](/Users/foundry/TriathenumDevelopment/Source/app/styles.css) with calm suggestion-card styling that matches the existing editor UI
- added focused coverage in:
  - [editor-suggestion-service.test.ts](/Users/foundry/TriathenumDevelopment/Source/server/editor-suggestion-service.test.ts) for unavailable behavior, combined link/relationship/summary suggestions, and duplicate suppression
  - [editor-suggestions.test.ts](/Users/foundry/TriathenumDevelopment/Source/app/editor-suggestions.test.ts) for request construction and apply behavior
  - [app-shell.smoke.spec.js](/Users/foundry/TriathenumDevelopment/Source/e2e/app-shell.smoke.spec.js) with broader browser coverage for owner sign-in, editor open/cancel, and current AI-gating flows

## Validation Results

- ran `pnpm test` successfully in `Source/`
- ran `pnpm typecheck` successfully in `Source/`
- ran `pnpm build` successfully in `Source/`
- reran `pnpm test:e2e` after the browser-automation scaffolding and expanded smoke coverage
- confirmed focused suggestion-flow coverage for:
  - unavailable behavior when the provider baseline is missing
  - link, relationship, and reference-summary suggestion generation from unstructured prose mentions
  - duplicate suppression when body links and structured relationships already exist
  - client-side apply behavior for accepted review items

## Current Engineering Note

- suggestion review stays fully non-blocking: nothing touches canon until the user accepts individual items and later saves the entity
- the summary suggestion is intentionally stored as a replaceable `reference_summary` field instead of overwriting the main body text
- link and relationship suggestions are deterministic and calm rather than trying to infer an aggressive graph-edit workflow

## Open Risks

- the relationship heuristics are intentionally conservative, so richer semantic inference may still be needed for more ambiguous prose
- because the shared fixture world remains AI-unconfigured for browser stability, the new suggestion acceptance flow is primarily covered by unit tests plus broader browser smoke coverage instead of a fully configured end-to-end suggestion run
- `reference_summary` is now the first optional quick-reference field, so later design work may still refine where and how quick summaries are surfaced across the product

## Assumptions Carried Forward

- a replaceable summary field is a better first ship vehicle than rewriting canonical body text
- suggestion review should remain item-by-item and calm instead of batch-applying edits
- deterministic mention-based suggestions are acceptable for the first collaborative-structure slice as long as approval stays explicit

## QA Focus

- confirm link and relationship suggestions can be reviewed and selectively accepted or dismissed without mutating the editor until approval
- confirm accepted summary suggestions update the `reference_summary` field and do not overwrite the body text
- confirm the suggestion panel remains non-blocking and understandable alongside the existing editor and prose-assistance flows
- confirm unavailable behavior stays clear when the AI baseline is not configured

## Action And Approval Notes

- action class used: `local write`
- no risky-write or sensitive/production approval was required in this engineering pass

## QA Verdict

- passed: move to `done`

## QA Evidence Summary

- reviewed the implementation against all three acceptance criteria in [editor-suggestion-service.ts](/Users/foundry/TriathenumDevelopment/Source/server/editor-suggestion-service.ts), [editor-suggestions.ts](/Users/foundry/TriathenumDevelopment/Source/app/editor-suggestions.ts), [App.tsx](/Users/foundry/TriathenumDevelopment/Source/app/App.tsx), [styles.css](/Users/foundry/TriathenumDevelopment/Source/app/styles.css), and [index.ts](/Users/foundry/TriathenumDevelopment/Source/server/index.ts)
- confirmed automated validation is green:
  - `pnpm test`
  - `pnpm typecheck`
  - `pnpm build`
- confirmed focused suggestion coverage exists in:
  - [editor-suggestion-service.test.ts](/Users/foundry/TriathenumDevelopment/Source/server/editor-suggestion-service.test.ts) for unavailable behavior, combined suggestion generation, and duplicate suppression
  - [editor-suggestions.test.ts](/Users/foundry/TriathenumDevelopment/Source/app/editor-suggestions.test.ts) for request construction and apply behavior
- reran the Playwright smoke suite and confirmed all ten cross-browser executions reported without test failures for the current browser smoke flows in [app-shell.smoke.spec.js](/Users/foundry/TriathenumDevelopment/Source/e2e/app-shell.smoke.spec.js)
- reviewed the editor flow and confirmed suggestion items remain preview-only until individually applied, with no silent body rewrite and no automatic canon mutation

## QA Findings

- no blocking functional defects found in the reviewed implementation

## Evidence Quality Call

- strong enough for the deferred collaborative-structure baseline

## QA Risks And Gaps

- the fully configured suggestion acceptance path is still covered primarily by focused unit tests because the stable browser fixture world remains AI-unconfigured for smoke runs
- Playwright continues to show some teardown linger after the final green test report, which did not invalidate the test results here but is worth keeping in mind for future CI hardening
- relationship suggestion heuristics remain intentionally conservative and may still need refinement for more ambiguous prose

## QA State Recommendation

- move to `done`
