# Story: WorldForge Phase 3 Relationship Graph Explorer

## Metadata
- `id`: STORY-20260415-worldforge-phase3-relationship-graph-explorer
- `owner_role`: Software Engineer
- `status`: done
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

Cycle closed after QA acceptance and observer reporting.

## Implementation Summary

- added graph explorer contracts in [browser.ts](/Users/foundry/TriathenumDevelopment/Source/contracts/browser.ts) and exported them through [index.ts](/Users/foundry/TriathenumDevelopment/Source/contracts/index.ts) so the app and server share a stable neighborhood-graph payload
- added [graph-service.ts](/Users/foundry/TriathenumDevelopment/Source/server/graph-service.ts) with:
  - a visibility-aware one-hop graph centered on the selected entity
  - outbound edges from structured relationships and inbound edges from existing backlinks
  - filtered node and edge construction that keeps the graph intentionally scoped and readable
- updated [index.ts](/Users/foundry/TriathenumDevelopment/Source/server/index.ts) with `GET /api/world/graph?entityId=...`
- updated [App.tsx](/Users/foundry/TriathenumDevelopment/Source/app/App.tsx) with a dedicated graph explorer panel that:
  - loads the selected entity neighborhood automatically
  - shows node roles and readable edge labels
  - supports `Pivot Here` navigation so users can move through nearby nodes without leaving the current browse/detail workflow
- added [graph-service.test.ts](/Users/foundry/TriathenumDevelopment/Source/server/graph-service.test.ts) covering selected-entity neighborhood loading and collaborator visibility filtering

## Validation Results

- `pnpm run typecheck` passed
- `pnpm exec vitest run server/graph-service.test.ts server/world-browser-service.test.ts` passed
- `pnpm run build` passed

## Current Engineering Note

- the first graph slice is intentionally a selected-entity neighborhood rather than a whole-world visualization
- the explorer reuses existing structured relationships and backlinks so the first graph is interpretable without needing a separate graph storage layer
- pivoting between neighbors keeps the feature integrated with the current browser and detail experience instead of creating a disconnected graph-only mode

## Open Risks

- graph readability still depends on relationship quality and labeling discipline in the underlying entity data
- the current explorer is list-based and structural rather than spatially visual, so later UX work may still introduce richer visualization if it proves necessary
- only one-hop neighborhood exploration is supported in this first pass

## Assumptions Carried Forward

- a scoped, filtered neighborhood is more useful and safer than a dense whole-world graph for the first slice
- relationship and backlink data are sufficient to support the first navigable graph experience
- graph exploration should remain complementary to search and entity detail, not replace them

## QA Focus

- verify the graph explorer loads the selected entity neighborhood predictably
- verify node and edge labels remain understandable enough to support navigation
- verify `Pivot Here` preserves clean movement between graph, browser, and entity detail context
- verify collaborator graph results do not expose owner-only neighbors or edges

## Action And Approval Notes

- action class used: `local write`
- no risky-write or sensitive-production approval path was required for this engineering pass

## QA Verdict

- passed: move to `done`

## QA Evidence Summary

- reviewed the implementation against all three acceptance criteria in [graph-service.ts](/Users/foundry/TriathenumDevelopment/Source/server/graph-service.ts), [index.ts](/Users/foundry/TriathenumDevelopment/Source/server/index.ts), [browser.ts](/Users/foundry/TriathenumDevelopment/Source/contracts/browser.ts), and [App.tsx](/Users/foundry/TriathenumDevelopment/Source/app/App.tsx)
- confirmed automated validation is green:
  - `pnpm run typecheck`
  - `pnpm run test`
  - `pnpm exec vitest run server/graph-service.test.ts server/world-browser-service.test.ts`
  - `pnpm run build`
- confirmed focused graph coverage exists in [graph-service.test.ts](/Users/foundry/TriathenumDevelopment/Source/server/graph-service.test.ts) for:
  - selected-entity neighborhood loading
  - readable outbound and inbound edge construction
  - collaborator visibility protection
- reviewed the graph explorer flow in [App.tsx](/Users/foundry/TriathenumDevelopment/Source/app/App.tsx) and confirmed `Pivot Here` keeps navigation inside the existing browser/detail workflow rather than creating a disconnected mode

## QA Defects

- none

## Required Fixes

- none

## Evidence Quality Call

- strong enough for this first bounded relationship-graph slice

## QA State Recommendation

- move to `done`
