# Story: WorldForge Phase 3 Relationship Graph Explorer

## Metadata
- `id`: STORY-20260415-worldforge-phase3-relationship-graph-explorer
- `owner_role`: Product Manager
- `status`: ready
- `source`: pm
- `decision_refs`: [PLAN-2026-04-14-worldforge-roadmap-and-product-phase, ARCH-20260414-worldforge-v1-platform-and-domain-architecture]
- `success_metric`: Users can explore entity relationships through a dedicated graph view that exposes meaningful world structure without replacing the existing browse and detail workflows.
- `release_scope`: deferred

## Problem Statement

As worlds grow, creators need a way to see the structure around factions, people, places, and events without manually traversing backlinks. A bounded graph explorer can provide that value, but it should focus on navigation and comprehension rather than graph editing or visual spectacle.

## Scope
- In:
  - render a navigable graph view for entity relationships
  - let users pivot from a selected entity into nearby nodes and supporting detail
  - expose relationship type labels or grouping so the graph remains interpretable
  - preserve an escape hatch back to the existing browser and detail views
- Out:
  - graph editing
  - full-world rendering with no filtering
  - map-based geography overlays

## Assumptions

- the first useful graph should be filtered and intentionally scoped, not a giant unbounded visualization
- stable structured relationships are a prerequisite for trustworthy graph navigation
- graph exploration should complement backlinks and search rather than supersede them

## Acceptance Criteria
1. Users can open a graph view centered on an entity and inspect nearby related nodes.
2. Relationship types remain understandable enough that the graph is navigable rather than decorative.
3. Users can move between graph, browser, and entity detail flows without losing context.

## Validation
- Required checks: relationship-graph payload tests, filtered-neighborhood navigation coverage, and manual interpretability review
- Additional checks: narrow-width behavior review for graph entry and detail drill-in

## Dependencies

- `ARCH-20260414-worldforge-v1-platform-and-domain-architecture`
- `STORY-20260414-worldforge-phase1-search-backlinks-and-stub-management`
- `STORY-20260414-worldforge-phase2-link-relationship-and-summary-suggestions`

## Risks

- graph density could make the feature unreadable without strong filtering defaults
- weak relationship typing could reduce the graph to decorative noise
- interaction complexity could overwhelm users on mobile if not carefully bounded

## Open Questions

- whether the first graph slice should start from entity detail context only or also support standalone graph browsing

## Next Step

Promote after timeline if relationship exploration remains a stronger value gap than digest or map work.
