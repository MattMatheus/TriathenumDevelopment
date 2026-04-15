# Story: WorldForge Phase 2 Draft Entity Generation And Stub Filling

## Metadata
- `id`: STORY-20260414-worldforge-phase2-draft-entity-generation-and-stub-filling
- `owner_role`: Product Manager
- `status`: done
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

## Implementation Summary

- added draft-generation contracts in [browser.ts](/Users/foundry/TriathenumDevelopment/Source/contracts/browser.ts) and exported them through [index.ts](/Users/foundry/TriathenumDevelopment/Source/contracts/index.ts) so generated drafts have an editor-compatible payload plus explicit provenance
- added [draft-generation-service.ts](/Users/foundry/TriathenumDevelopment/Source/server/draft-generation-service.ts) with:
  - provider-baseline gating so draft generation stays unavailable when AI infrastructure is unconfigured
  - deterministic draft prefills for new entities and unresolved stubs
  - provenance metadata that makes the review boundary explicit
  - draft-only behavior that does not write canon during generation
- updated [server/index.ts](/Users/foundry/TriathenumDevelopment/Source/server/index.ts) with `POST /api/world/entity-drafts`
- updated [App.tsx](/Users/foundry/TriathenumDevelopment/Source/app/App.tsx) so users can:
  - generate a draft from the new-entity path
  - generate a draft directly from an unresolved stub in the stub queue
  - review draft provenance inside the existing editor flow before saving
- added [draft-generation-service.test.ts](/Users/foundry/TriathenumDevelopment/Source/server/draft-generation-service.test.ts) covering:
  - unavailable behavior when the provider baseline is missing
  - draft-only behavior without canon writes
  - stub-driven draft generation tied to the unresolved reference source

## Validation Results

- ran `pnpm test` successfully in `Source/`
- ran `pnpm typecheck` successfully in `Source/`
- ran `pnpm build` successfully in `Source/`
- confirmed review-flow tests for:
  - unavailable generation when no provider baseline is configured
  - new draft generation without writing existing canon files
  - unresolved-stub draft generation with provenance and source linkage

## Current Engineering Note

- generated drafts now land inside the existing editor review flow rather than bypassing it
- provenance is visible in the editor so users can see that draft content is still pending approval
- stub generation is wired into the existing unresolved-link workflow as the first calm entry point for this feature

## Open Risks

- the current field/body prefills are intentionally lightweight and deterministic, so richer type-specific drafting quality remains future work
- unresolved-stub generation currently defaults to a conservative inferred type path rather than a fully interactive type-selection wizard
- the feature relies on the provider baseline as the availability gate even though the first draft content is deterministic

## Assumptions Carried Forward

- explicit review in the existing editor is the correct approval boundary for generated drafts
- unresolved stubs are the most natural first generation entry point
- deterministic prefills are acceptable for the first draft workflow as long as provenance and approval remain obvious

## QA Focus

- confirm draft generation never writes canon until the user explicitly saves from the editor
- confirm new-entity draft generation and stub-driven draft generation both land in the existing editor review flow
- confirm provenance is obvious enough that generated content does not read as already accepted canon
- confirm unavailable behavior is clear when the provider baseline is not configured

## Action And Approval Notes

- action class used: `local write`
- no risky-write or sensitive/production approval was required in this engineering pass

## QA Verdict

- passed: move to `done`

## QA Evidence Summary

- reviewed the implementation against all three acceptance criteria in [draft-generation-service.ts](/Users/foundry/TriathenumDevelopment/Source/server/draft-generation-service.ts), [browser.ts](/Users/foundry/TriathenumDevelopment/Source/contracts/browser.ts), [index.ts](/Users/foundry/TriathenumDevelopment/Source/server/index.ts), and [App.tsx](/Users/foundry/TriathenumDevelopment/Source/app/App.tsx)
- confirmed automated validation is green:
  - `pnpm test`
  - `pnpm typecheck`
  - `pnpm build`
- confirmed focused draft-generation coverage exists in [draft-generation-service.test.ts](/Users/foundry/TriathenumDevelopment/Source/server/draft-generation-service.test.ts) for:
  - unavailable behavior when the provider baseline is missing
  - draft-only behavior without canon writes
  - stub-driven draft generation with source linkage
- reviewed the editor flow and confirmed generated drafts remain inside the existing editor review boundary rather than bypassing it

## QA Findings

- no blocking functional defects found in the reviewed implementation

## Evidence Quality Call

- strong enough for the deferred draft-generation baseline

## QA Risks And Gaps

- prefills remain intentionally lightweight and deterministic, so later work may still be needed to improve type-specific draft quality
- this QA pass is backed by automated evidence and code review; no live browser smoke pass was executed inside the sandbox

## QA State Recommendation

- move to `done`
