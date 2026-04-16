# Plan: WorldForge Phase 3 Remainder Disposition

## Context

The original Phase 3 planning note in [PLAN-2026-04-14-worldforge-roadmap-and-product-phase.md](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/artifacts/planning/PLAN-2026-04-14-worldforge-roadmap-and-product-phase.md) proposed six candidate areas:

- consistency checker
- timeline UI with calendar support
- relationship graph
- world-state digest
- map pins linked to locations
- import and export hardening

Five of those candidates have now been decomposed, executed, and accepted through Flywheel engineering QA:

- [STORY-20260415-worldforge-phase3-canon-consistency-review.md](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/engineering/done/STORY-20260415-worldforge-phase3-canon-consistency-review.md)
- [STORY-20260415-worldforge-phase3-timeline-and-chronology-workspace.md](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/engineering/done/STORY-20260415-worldforge-phase3-timeline-and-chronology-workspace.md)
- [STORY-20260415-worldforge-phase3-relationship-graph-explorer.md](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/engineering/done/STORY-20260415-worldforge-phase3-relationship-graph-explorer.md)
- [STORY-20260415-worldforge-phase3-world-state-digest-and-review-briefs.md](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/engineering/done/STORY-20260415-worldforge-phase3-world-state-digest-and-review-briefs.md)
- [STORY-20260415-worldforge-phase3-map-linked-location-navigation.md](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/engineering/done/STORY-20260415-worldforge-phase3-map-linked-location-navigation.md)

That leaves two meaningful remainder questions:

- whether `import and export hardening` should become a new bounded backlog item
- whether `calendar support` still belongs in Phase 3 after the accepted first chronology slice intentionally stopped short of custom calendar systems

## Goal

Turn the leftover Phase 3 candidate scope into explicit PM decisions so the roadmap no longer carries hidden ambiguity.

## Decision Summary

### Promote

1. Promote markdown-native import and export hardening into a fresh engineering intake story.

Reason:

- it is still aligned with the product’s creator-owned data promise
- it was explicitly named in the original Phase 3 candidate scope but never decomposed
- it is product work, not merely operational cleanup, because users need a trustworthy path into and out of the filesystem-backed world model

Created intake artifact:

- [STORY-20260415-worldforge-import-and-export-hardening.md](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/engineering/intake/STORY-20260415-worldforge-import-and-export-hardening.md)

### Defer

1. Defer calendar-system expansion beyond the accepted chronology workspace.

Reason:

- the shipped timeline story explicitly met the first useful Phase 3 need without introducing a calendar engine
- custom calendar arithmetic, alternate era logic, and deeper relative-date reasoning still carry disproportionate complexity
- there is no evidence yet that those richer calendar semantics are the next smallest valuable slice compared with other backlog needs

Defer guidance:

- keep richer calendar support out of the immediate ready queue
- revisit only after real usage shows the current chronology workspace is insufficient

### Reject

1. Reject treating publishing-oriented export polish as part of the remaining Phase 3 scope.

Reason:

- the roadmap already places PDF and EPUB export under Phase 4 collaboration and publishing polish
- Phase 3 import/export hardening should stay about markdown-native ownership, portability, and safe round-tripping
- blending publishing export into this remainder would blur the roadmap boundary and reintroduce scope inflation

## Scope Boundary For The Promoted Intake

The promoted import/export story should stay bounded around:

- markdown and media portability
- safe import validation and conflict handling
- deterministic export packaging for the current world model

It should not expand into:

- PDF or EPUB publishing
- comments, review workflows, or activity feeds
- live sync or bidirectional merge tooling
- generalized schema migration infrastructure

## Recommended Backlog State

- archive the broad Phase 3 umbrella intake story because its decomposition purpose is complete
- keep the new import/export item in engineering intake for later PM refinement
- treat calendar-system expansion as deferred roadmap context rather than active backlog work

## Recommended Next Stage

Proceed with PM refinement only when the team wants to shape [STORY-20260415-worldforge-import-and-export-hardening.md](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/engineering/intake/STORY-20260415-worldforge-import-and-export-hardening.md) into smaller execution-ready slices.
