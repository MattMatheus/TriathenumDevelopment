# Story: WorldForge Phase 3 Import Package Review

## Metadata
- `id`: STORY-20260415-worldforge-phase3-import-package-review
- `owner_role`: Software Engineer
- `status`: ready
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

Promote after the export package baseline is accepted and the team is ready to define import trust boundaries.
