# Story: WorldForge Phase 3 Import Apply And Conflict Policy

## Metadata
- `id`: STORY-20260415-worldforge-phase3-import-apply-and-conflict-policy
- `owner_role`: Software Engineer
- `status`: ready
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

Promote only after the dry-run import review slice is accepted and the team is ready for controlled write-path portability.
