# Story: WorldForge Phase 3 Map-Linked Location Navigation

## Metadata
- `id`: STORY-20260415-worldforge-phase3-map-linked-location-navigation
- `owner_role`: Product Manager
- `status`: ready
- `source`: pm
- `decision_refs`: [PLAN-2026-04-14-worldforge-roadmap-and-product-phase, ARCH-20260414-worldforge-v1-platform-and-domain-architecture]
- `success_metric`: Users can navigate location entities through a lightweight map-linked experience that connects geography back to the core browse and detail flows.
- `release_scope`: deferred

## Problem Statement

Location-heavy worlds benefit from spatial navigation, but map features can easily sprawl into a full GIS or art-pipeline project. This slice should stay bounded around map-linked wayfinding and context, not heavy editing or simulation.

## Scope
- In:
  - associate location entities with map pins or bounded coordinates
  - let users select map-linked locations and jump into the existing detail workflow
  - support lightweight filtering or focus by region where practical
  - preserve graceful behavior when no map asset is configured
- Out:
  - map drawing tools
  - route simulation
  - timeline overlays

## Assumptions

- location navigation is valuable, but not before the core entity and relationship model is stable
- the first slice can assume a static uploaded map asset rather than a dynamic mapping stack
- map interaction should remain an alternate navigation surface, not a required source of truth

## Acceptance Criteria
1. Users can view a map-linked navigation surface and select pinned locations.
2. Selected pins connect cleanly back to the existing location detail experience.
3. The feature degrades cleanly when a world has no configured map or no pinned locations.

## Validation
- Required checks: location-pin persistence tests, map-selection navigation coverage, and empty-state verification
- Additional checks: manual review that pin interaction remains understandable on mobile and desktop

## Dependencies

- completion of the Phase 1 media and responsive browse foundation
- stable location entities and metadata conventions from the earlier platform work
- `STORY-20260415-worldforge-phase3-relationship-graph-explorer`

## Risks

- map interaction could overwhelm mobile usability if the first surface is too dense
- location metadata standards may be too loose for trustworthy placement
- users may expect richer editing or cartography workflows before the core navigation slice is proven

## Open Questions

- whether the first version should support one shared world map only or a small set of region maps

## Next Step

Promote after the non-spatial canon-intelligence surfaces are established unless geography becomes the clearest navigation pain point.
