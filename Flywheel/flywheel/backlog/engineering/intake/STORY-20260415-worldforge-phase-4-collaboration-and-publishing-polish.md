# Story: WorldForge Phase 4 Collaboration And Publishing Polish

## Metadata
- `id`: STORY-20260415-worldforge-phase-4-collaboration-and-publishing-polish
- `owner_role`: Product Manager
- `status`: intake
- `source`: planning
- `decision_refs`: [PLAN-2026-04-14-worldforge-roadmap-and-product-phase, PLAN-2026-04-15-worldforge-post-phase3-roadmap-continuation]
- `success_metric`: PM refines the next roadmap layer into bounded collaboration and publishing stories that build on the completed core, AI, and canon-intelligence phases without collapsing back into a broad umbrella.
- `release_scope`: deferred

## Problem Statement

WorldForge now has the useful core, AI collaboration baseline, canon-intelligence workflows, and markdown-native portability foundations in place. The next roadmap layer is collaboration and publishing polish, but it is still too broad to execute safely as a single item. PM needs to shape it into explicit, bounded stories before engineering resumes.

## Scope
- In:
  - decompose comments, activity/change review, version history, restore flows, and publishing outputs into bounded stories
  - preserve the distinction between collaboration workflows and reader-facing publishing workflows
  - identify which items require stronger policy or architecture clarification before promotion
- Out:
  - implementation
  - broad redesign of already accepted earlier phases
  - unbounded admin/platform work unless needed to support collaboration or publishing scope

## Assumptions

- collaboration and publishing polish should build on the completed authoring and canon-intelligence foundation rather than reopen it
- comments, history, and publishing are valuable, but they are not all one story and should not enter execution as an undifferentiated umbrella
- publishing export must remain distinct from the markdown-native portability work completed in Phase 3

## Acceptance Criteria
1. Phase 4 is decomposed into a sequenced set of bounded, testable stories with explicit dependencies.
2. The refined stories keep collaboration workflows separate from publishing workflows where that distinction affects trust, policy, or complexity.
3. PM identifies any items that need architecture or product-policy clarification before engineering promotion.

## Validation
- Required checks: PM review for bounded scope, dependency clarity, and roadmap-boundary discipline
- Additional checks: confirm the decomposition does not quietly re-open completed Phase 1 through Phase 3 work unless a true dependency gap is found

## Dependencies

- `ARCH-20260414-worldforge-v1-platform-and-domain-architecture`
- completion of the Phase 1, Phase 2, and Phase 3 execution baselines

## Risks

- comments and review surfaces may require more policy definition than earlier single-owner workflows
- version history and restore flows may imply stronger durability or rollback guarantees than the current app exposes
- publishing output could expand too quickly into multi-format presentation polish

## Open Questions

- whether comments/change review should precede version-history work or the other way around
- whether PDF and EPUB belong in one publishing story or separate slices
- whether advanced schema/admin polish belongs inside Phase 4 or should be split into a later operational phase

## Next Step

PM refinement and queue ordering.
