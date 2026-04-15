# Story: WorldForge Phase 3 Timeline And Chronology Workspace

## Metadata
- `id`: STORY-20260415-worldforge-phase3-timeline-and-chronology-workspace
- `owner_role`: Product Manager
- `status`: ready
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

Promote after consistency review or earlier if chronology pain becomes the highest user-value gap.
