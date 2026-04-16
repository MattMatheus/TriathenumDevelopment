# Story: WorldForge Phase 3 Import Package Review

## Metadata
- `id`: STORY-20260415-worldforge-phase3-import-package-review
- `owner_role`: Software Engineer
- `status`: done
- `source`: pm
- `decision_refs`: [PLAN-2026-04-14-worldforge-roadmap-and-product-phase]
- `success_metric`: Users can inspect an import package through a dry-run review flow that surfaces validation issues, collisions, and unsupported content before any world files are written.
- `release_scope`: deferred

## Problem Statement

Import is riskier than export because malformed packages, stale links, and duplicate entity identities can damage trust quickly. Before any write path exists, WorldForge needs a review-first import surface that shows what would happen and what is invalid.

## Scope
- In:
  - accept one export-shaped package for dry-run inspection
  - validate markdown/frontmatter readability, media presence, and package structure
  - detect likely collisions such as duplicate entity ids, target-path conflicts, or unsupported files
  - present a review summary without writing imported content into the world
- Out:
  - applying the import to world files
  - merge tooling for edited conflicts
  - incremental sync
  - publishing export compatibility

## Assumptions

- a dry-run review gate is the safest trust-building step before any destructive or mutating import behavior
- import validation should align with the export package shape rather than supporting many arbitrary archive layouts initially
- explicit collision reporting is more important than auto-repair heuristics in the first slice

## Acceptance Criteria
1. Users can submit a package for import review and receive a clear summary of valid items, invalid items, and detected conflicts.
2. The review flow performs no world writes and makes that non-mutating behavior explicit.
3. Validation coverage includes malformed frontmatter, missing media references, and duplicate identity or path conflicts.

## Validation
- Required checks: package-review tests, malformed-input coverage, and collision-detection coverage
- Additional checks: manual review that the dry-run summary is understandable enough to support later apply confirmation

## Dependencies

- `STORY-20260415-worldforge-phase3-world-export-package-baseline`
- `STORY-20260415-worldforge-frontmatter-yaml-library-migration`
- `STORY-20260414-worldforge-phase1-storage-index-and-entity-foundation`
- `STORY-20260414-worldforge-phase1-media-and-compose-baseline`

## Risks

- collision detection may miss edge cases if current entity identity rules are too implicit
- validation-only flows can feel incomplete unless the review surface is concrete and trustworthy
- package parsing might overfit to exported happy paths and fail on mildly messy real-world input

## Open Questions

- whether the first dry-run should accept only owner uploads
- whether conflicts should be grouped by severity or by file/entity category

## Next Step

Cycle closed after QA acceptance and observer reporting.

## Implementation Summary

- added [import-review-service.ts](/Users/foundry/TriathenumDevelopment/Source/server/import-review-service.ts) with:
  - owner-only dry-run review of export-shaped tar packages
  - tar entry parsing and manifest validation for the bounded `worldforge-export` package contract
  - strict export-shaped document validation, duplicate entry detection, missing-media checks, and current-world id/path conflict detection
  - a non-mutating review summary that separates package errors from apply-time conflict warnings
- added [import-review-service.test.ts](/Users/foundry/TriathenumDevelopment/Source/server/import-review-service.test.ts) covering:
  - successful review of a real exported package
  - malformed document, missing media, duplicate id, and unsupported-entry detection
  - owner-only authorization
- updated [browser.ts](/Users/foundry/TriathenumDevelopment/Source/contracts/browser.ts) and [index.ts](/Users/foundry/TriathenumDevelopment/Source/contracts/index.ts) with import-review request and payload types
- updated [index.ts](/Users/foundry/TriathenumDevelopment/Source/server/index.ts) with `POST /api/world/import-review`
- updated [App.tsx](/Users/foundry/TriathenumDevelopment/Source/app/App.tsx) with an `Import Review` panel that lets the owner upload a tar package and inspect the dry-run findings without writing world files

## Validation Results

- `pnpm exec vitest run server/import-review-service.test.ts server/export-package-service.test.ts server/world-browser-service.test.ts` passed
- `pnpm run test` passed
- `pnpm run typecheck` passed
- `pnpm run build` passed

## Current Engineering Note

- the first review slice is intentionally owner-only to keep the authority boundary aligned with the later import-apply path
- review accepts only the export-shaped tar contract introduced in the previous cycle rather than trying to support arbitrary archives
- duplicate ids and existing-world path collisions are surfaced as review findings, while malformed package content and missing media remain errors

## Open Risks

- the tar parser is intentionally bounded and does not yet support richer tar variants or longer-path edge cases
- strict export-shaped frontmatter validation may reject loosely valid markdown that is not produced by the supported export flow
- the UI currently reports findings in one flat list rather than grouped sections or severity buckets

## Assumptions Carried Forward

- dry-run review should build trust before any import write path exists
- import support should stay aligned with the app’s own export contract first, then broaden later only if needed
- conflict visibility is more important than auto-repair in the first review slice

## QA Focus

- verify reviewed packages produce clear summaries of valid items, errors, and conflicts without performing any world writes
- verify malformed documents, missing media references, and duplicate ids are surfaced in the review findings
- verify collaborator accounts cannot invoke import review
- verify owner upload and review remain understandable in the current app shell

## Action And Approval Notes

- action class used: `local write`
- no risky-write or sensitive-production approval path was required for this engineering pass

## QA Verdict

- accepted

## QA Evidence Summary

- `pnpm exec vitest run server/import-review-service.test.ts server/export-package-service.test.ts server/world-browser-service.test.ts` passed
- `pnpm run test` passed
- `pnpm run typecheck` passed
- `pnpm run build` passed
- direct QA review of the import-review service, route, and app panel found the slice aligned with the bounded dry-run-only import trust boundary

## QA Defects

- none blocking

## Required Fixes

- none

## Evidence Quality Call

- sufficient for acceptance

## QA State Recommendation

- move to `engineering/done`
