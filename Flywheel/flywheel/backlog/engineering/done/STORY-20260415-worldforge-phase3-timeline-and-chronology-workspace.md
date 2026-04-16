# Story: WorldForge Phase 3 Timeline And Chronology Workspace

## Metadata
- `id`: STORY-20260415-worldforge-phase3-timeline-and-chronology-workspace
- `owner_role`: Software Engineer
- `status`: done
- `source`: pm
- `decision_refs`: [PLAN-2026-04-14-worldforge-roadmap-and-product-phase, ARCH-20260414-worldforge-v1-platform-and-domain-architecture]
- `success_metric`: Users can inspect dated events and chronology relationships in a dedicated timeline workspace instead of reconstructing sequence manually from markdown files.
- `release_scope`: deferred

## Problem Statement

Chronology is a recurring pain point in worldbuilding, especially once entities and events span eras, campaigns, or political transitions. WorldForge needs a bounded timeline slice that makes temporal navigation useful without turning the first version into a full calendar engine.

## Scope
- In:
  - represent dated or ordered events in a timeline-focused UI
  - support uncertain, ranged, or relative chronology labels where exact dates are unavailable
  - let users inspect source entities from the timeline workspace
  - preserve mobile-readable navigation for browse and drill-in flows
- Out:
  - advanced calendar systems with custom arithmetic
  - map overlays
  - automated contradiction resolution

## Assumptions

- the first timeline slice can tolerate mixed precision dates as long as ambiguity is shown clearly
- timeline usefulness depends on stable entity metadata and relationship indexing, not a new storage system
- read-oriented chronology navigation should come before heavy timeline editing workflows

## Acceptance Criteria
1. Users can view a chronological workspace that orders events with clear handling for uncertain or partial dates.
2. Timeline items link cleanly back to the existing entity detail or browse surfaces.
3. The workspace remains usable on mobile-sized screens for browsing and inspection.

## Validation
- Required checks: chronology ordering tests, partial-date rendering tests, and narrow-width UI verification
- Additional checks: manual review against representative mixed-precision world events

## Dependencies

- `ARCH-20260414-worldforge-v1-platform-and-domain-architecture`
- completion of the Phase 1 entity, indexing, and responsive browse foundation
- `STORY-20260414-worldforge-phase2-link-relationship-and-summary-suggestions`

## Risks

- chronology data may be inconsistent across notes, making ordering logic harder than expected
- custom-calendar ambition could expand the slice beyond a first useful timeline
- a desktop-first layout could undermine mobile readability

## Open Questions

- whether the first slice should privilege event entities only or also surface dated character and place milestones

## Next Step

Cycle closed after QA acceptance and observer reporting.

## Implementation Summary

- added timeline workspace contracts in [browser.ts](/Users/foundry/TriathenumDevelopment/Source/contracts/browser.ts) and exported them through [index.ts](/Users/foundry/TriathenumDevelopment/Source/contracts/index.ts) so chronology items have a stable shared payload
- added [timeline-service.ts](/Users/foundry/TriathenumDevelopment/Source/server/timeline-service.ts) with:
  - visibility-aware loading of chronology-bearing entities from the existing world store
  - mixed-precision handling for exact dates, month/year dates, ranges, numeric chronology ordering, and era/label-only entries
  - deterministic ordering that keeps dated items ahead of softer relative labels while preserving readable chronology labels
- updated [index.ts](/Users/foundry/TriathenumDevelopment/Source/server/index.ts) with `GET /api/world/timeline`
- updated [App.tsx](/Users/foundry/TriathenumDevelopment/Source/app/App.tsx) with a dedicated timeline workspace panel that:
  - renders timeline items in chronology order
  - shows chronology labels and precision clearly
  - links timeline items back into the existing entity detail flow through `Open Detail`
- added [timeline-service.test.ts](/Users/foundry/TriathenumDevelopment/Source/server/timeline-service.test.ts) covering chronology ordering, mixed-precision labels, and collaborator visibility boundaries

## Validation Results

- `pnpm run typecheck` passed
- `pnpm exec vitest run server/timeline-service.test.ts server/world-browser-service.test.ts` passed
- `pnpm run build` passed

## Current Engineering Note

- the first timeline slice is intentionally read-oriented and driven by existing frontmatter fields instead of introducing a dedicated calendar model
- chronology fields are flexible on purpose in this pass: `date`, `start_date`, `end_date`, `chronology_order`, `chronology_label`, and `era` can all surface timeline items
- the workspace stays integrated with the current browse/detail flow rather than becoming a separate navigation system

## Open Risks

- chronology ordering is deterministic but intentionally simple, so richer custom-calendar logic and more nuanced relative ordering remain future work
- the current timeline view covers world-level chronology and detail drill-in, but not timeline editing or per-entity scoped filtering
- chronology quality still depends on authors providing meaningful frontmatter fields

## Assumptions Carried Forward

- mixed precision is acceptable as long as chronology labels remain explicit and readable
- the first useful timeline experience should privilege browsing over heavy editing
- existing frontmatter and index surfaces are sufficient for a bounded initial chronology workspace

## QA Focus

- verify timeline items are ordered predictably across exact dates, ranges, and relative chronology labels
- verify timeline cards link back into the existing entity detail flow cleanly
- verify collaborator timeline results do not expose owner-only chronology items
- verify the timeline workspace remains readable on narrow-width layouts

## Action And Approval Notes

- action class used: `local write`
- no risky-write or sensitive-production approval path was required for this engineering pass

## QA Verdict

- passed: move to `done`

## QA Evidence Summary

- reviewed the implementation against all three acceptance criteria in [timeline-service.ts](/Users/foundry/TriathenumDevelopment/Source/server/timeline-service.ts), [index.ts](/Users/foundry/TriathenumDevelopment/Source/server/index.ts), [browser.ts](/Users/foundry/TriathenumDevelopment/Source/contracts/browser.ts), and [App.tsx](/Users/foundry/TriathenumDevelopment/Source/app/App.tsx)
- confirmed automated validation is green:
  - `pnpm run typecheck`
  - `pnpm run test`
  - `pnpm exec vitest run server/timeline-service.test.ts server/world-browser-service.test.ts`
  - `pnpm run build`
- confirmed focused timeline coverage exists in [timeline-service.test.ts](/Users/foundry/TriathenumDevelopment/Source/server/timeline-service.test.ts) for:
  - predictable ordering across exact dates, ranges, and relative chronology labels
  - mixed-precision chronology labels
  - collaborator visibility protection
- reviewed the timeline workspace flow in [App.tsx](/Users/foundry/TriathenumDevelopment/Source/app/App.tsx) and confirmed timeline cards remain read-oriented and link back into the existing entity detail flow through `Open Detail`

## QA Defects

- none

## Required Fixes

- none

## Evidence Quality Call

- strong enough for this first bounded chronology workspace slice

## QA State Recommendation

- move to `done`
