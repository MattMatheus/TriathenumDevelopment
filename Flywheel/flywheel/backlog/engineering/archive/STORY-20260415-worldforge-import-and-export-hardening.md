# Story: WorldForge Import And Export Hardening

## Metadata
- `id`: STORY-20260415-worldforge-import-and-export-hardening
- `owner_role`: Product Manager
- `status`: archive
- `source`: pm
- `decision_refs`: [PLAN-2026-04-14-worldforge-roadmap-and-product-phase]
- `success_metric`: PM refines markdown-native import and export hardening into bounded work that preserves creator-owned data without collapsing into publishing scope.
- `release_scope`: deferred

## Problem Statement

WorldForge already uses markdown files and attached media as its durable source of truth, but the roadmap still lacks a bounded user-facing story for getting content into and out of that model safely. Without explicit import and export hardening, the creator-owned data promise remains partially implicit rather than operationally trustworthy.

## Scope
- In:
  - define a bounded import path for markdown-first world content and attached media
  - define a bounded export path that preserves current world content in a portable package
  - preserve frontmatter, links, media references, and visibility-safe metadata where appropriate
  - surface validation failures, collisions, or unsupported input clearly
- Out:
  - PDF or EPUB publishing
  - live sync with external vaults or cloud drives
  - generalized merge tooling
  - schema redesign beyond what import or export needs to validate safely

## Assumptions

- creator-owned markdown portability remains a core differentiator rather than a nice-to-have
- the first useful slice can focus on deterministic package import and export rather than continuous synchronization
- publishing-oriented export belongs to a later collaboration and publishing phase, not this hardening slice

## Acceptance Criteria
1. PM decomposes import and export hardening into bounded stories or one clearly scoped story with explicit conflict and validation behavior.
2. Dependencies on the current world document model, media handling, and frontmatter serialization are visible.
3. The refined work keeps markdown-native portability separate from publishing export polish.

## Validation
- Required checks: PM review for scope discipline, dependency clarity, and portability outcome
- Additional checks: confirm the refinement does not quietly absorb Phase 4 publishing work or live-sync ambition

## Dependencies

- `ARCH-20260414-worldforge-v1-platform-and-domain-architecture`
- `STORY-20260414-worldforge-phase1-storage-index-and-entity-foundation`
- `STORY-20260414-worldforge-phase1-media-and-compose-baseline`
- `STORY-20260415-worldforge-frontmatter-yaml-library-migration`

## Risks

- import semantics can become dangerously broad if overwrite and collision handling are not explicit
- export packaging can drift into publishing scope if portability and reader-facing polish are mixed together
- malformed frontmatter, missing media, or stale links may reveal document quality issues that need clear product decisions

## Open Questions

- whether the first slice should support whole-world package import and export only or also smaller scoped bundles
- whether import should start as a review-first dry run before any writes occur
- what package shape is simplest for self-hosted users: plain directory export, archive export, or both

## Next Step

Archived after PM refinement decomposed the portability work into sequenced ready stories.

## PM Refinement Outcome

- ready stories created:
  - [STORY-20260415-worldforge-phase3-world-export-package-baseline.md](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/engineering/ready/STORY-20260415-worldforge-phase3-world-export-package-baseline.md)
  - [STORY-20260415-worldforge-phase3-import-package-review.md](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/engineering/ready/STORY-20260415-worldforge-phase3-import-package-review.md)
  - [STORY-20260415-worldforge-phase3-import-apply-and-conflict-policy.md](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/engineering/ready/STORY-20260415-worldforge-phase3-import-apply-and-conflict-policy.md)
- sequencing decision:
  - prove deterministic export first
  - add review-only import validation second
  - introduce owner-only import apply with an explicit conflict policy third

## Archive Rationale

- this intake item achieved its purpose as a roadmap umbrella and should not stay in intake once the bounded stories exist
- the remaining work is now explicit, ordered, and ready for later engineering promotion
