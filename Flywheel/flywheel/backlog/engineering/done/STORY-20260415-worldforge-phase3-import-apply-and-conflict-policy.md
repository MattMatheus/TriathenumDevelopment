# Story: WorldForge Phase 3 Import Apply And Conflict Policy

## Metadata
- `id`: STORY-20260415-worldforge-phase3-import-apply-and-conflict-policy
- `owner_role`: Software Engineer
- `status`: done
- `source`: pm
- `decision_refs`: [PLAN-2026-04-14-worldforge-roadmap-and-product-phase]
- `success_metric`: Owners can apply a reviewed import package through an explicit conflict policy that avoids silent overwrites and preserves markdown-native durability.
- `release_scope`: deferred

## Problem Statement

After export and dry-run review exist, WorldForge still needs a bounded way to actually import content. That write path should stay narrow: owners only, explicit confirmation, and clear conflict policy instead of optimistic merge behavior.

## Scope
- In:
  - apply a previously reviewable package into the world with explicit confirmation
  - restrict import apply to a safe actor boundary
  - support one bounded conflict policy for the first slice
  - report what was created, skipped, or rejected
- Out:
  - automatic merging of divergent edits
  - per-file conflict resolution UI
  - background sync or watch mode
  - package editing inside the app

## Assumptions

- the first import write path should be owner-only to keep authority and rollback expectations simple
- explicit skip-or-reject behavior is safer than silent overwrite or automatic merge logic
- users need an action summary after apply so filesystem changes remain inspectable

## Acceptance Criteria
1. Owners can apply a reviewed package through an explicit confirmation flow with no silent overwrite behavior.
2. The first conflict policy is bounded and understandable, such as skip-on-conflict or reject-on-conflict, rather than open-ended merge logic.
3. The system returns a durable action summary that distinguishes created, skipped, and failed items.

## Validation
- Required checks: import-apply tests, owner-only authorization coverage, and conflict-policy regression coverage
- Additional checks: manual review that the post-apply summary is understandable for self-hosted operators

## Dependencies

- `STORY-20260415-worldforge-phase3-import-package-review`
- `STORY-20260415-worldforge-auth-and-rbac-hardening-followups`
- `STORY-20260414-worldforge-phase1-storage-index-and-entity-foundation`
- `STORY-20260414-worldforge-phase1-media-and-compose-baseline`

## Risks

- even a bounded import apply path can create trust damage if action summaries are vague
- restrictive first conflict policy may frustrate users with legitimate update scenarios
- filesystem writes during import may surface rollback expectations that are larger than this slice can satisfy

## Open Questions

- whether the first policy should be skip-on-conflict or fail-the-import-on-conflict
- whether import apply should support creating missing directories automatically or require exact package hygiene

## Next Step

Cycle closed after QA acceptance and observer reporting.

## Implementation Summary

- added [import-apply-service.ts](/Users/foundry/TriathenumDevelopment/Source/server/import-apply-service.ts) with:
  - owner-only import apply for reviewed export-shaped tar packages
  - one bounded `skip_on_conflict` policy that never overwrites existing ids or paths
  - action-summary output that distinguishes created, skipped, and failed document and media operations
  - reuse of the dry-run package analysis so apply stays aligned with the established review contract
- added [import-apply-service.test.ts](/Users/foundry/TriathenumDevelopment/Source/server/import-apply-service.test.ts) covering:
  - successful import of clean entries
  - skip-on-conflict behavior
  - owner-only authorization
- updated [import-review-service.ts](/Users/foundry/TriathenumDevelopment/Source/server/import-review-service.ts) to expose the shared package analysis used by both review and apply flows
- updated [browser.ts](/Users/foundry/TriathenumDevelopment/Source/contracts/browser.ts) and [index.ts](/Users/foundry/TriathenumDevelopment/Source/contracts/index.ts) with import-apply request, action, and summary types
- updated [index.ts](/Users/foundry/TriathenumDevelopment/Source/server/index.ts) with `POST /api/world/import-apply`
- updated [App.tsx](/Users/foundry/TriathenumDevelopment/Source/app/App.tsx) so the owner can apply the last reviewed package explicitly and inspect the created/skipped/failed action summary

## Validation Results

- `pnpm exec vitest run server/import-apply-service.test.ts server/import-review-service.test.ts server/export-package-service.test.ts server/world-browser-service.test.ts` passed
- `pnpm run test` passed
- `pnpm run typecheck` passed
- `pnpm run build` passed

## Current Engineering Note

- the first write path is intentionally owner-only and accepts only the export-shaped package contract already used by review
- conflict policy is intentionally narrow: existing ids and paths are skipped rather than overwritten or merged
- apply reuses the review analysis so malformed content still fails while clean non-conflicting entries can import successfully

## Open Risks

- skip-on-conflict is safe but may feel conservative for users who expect controlled replacement of existing content
- the apply summary is durable and inspectable, but there is still no rollback or transaction-style undo in this slice
- media writes currently assume the reviewed package already conforms to the bounded tar and frontmatter rules from the earlier slices

## Assumptions Carried Forward

- explicit confirmation plus a narrow conflict policy is safer than early merge behavior
- the reviewed export contract should remain the sole supported import source in this phase
- action summaries must be concrete enough that self-hosted operators can understand what changed on disk

## QA Focus

- verify owner import apply writes clean non-conflicting entries and reports created actions clearly
- verify conflicting ids and paths are skipped rather than overwritten
- verify collaborator accounts cannot invoke import apply
- verify the action summary remains understandable in the app and distinguishes created, skipped, and failed items

## Action And Approval Notes

- action class used: `local write`
- no risky-write or sensitive-production approval path was required for this engineering pass

## QA Verdict

- accepted

## QA Evidence Summary

- `pnpm exec vitest run server/import-apply-service.test.ts server/import-review-service.test.ts server/export-package-service.test.ts server/world-browser-service.test.ts` passed
- `pnpm run test` passed
- `pnpm run typecheck` passed
- `pnpm run build` passed
- direct QA review of the apply service, shared review analysis, route, and app action summary found the slice aligned with the bounded owner-only skip-on-conflict policy

## QA Defects

- none blocking

## Required Fixes

- none

## Evidence Quality Call

- sufficient for acceptance

## QA State Recommendation

- move to `engineering/done`
