# Story: WorldForge Phase 3 Map-Linked Location Navigation

## Metadata
- `id`: STORY-20260415-worldforge-phase3-map-linked-location-navigation
- `owner_role`: Software Engineer
- `status`: done
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

Cycle closed after QA acceptance and observer reporting.

## Implementation Summary

- added map-navigation contracts in [browser.ts](/Users/foundry/TriathenumDevelopment/Source/contracts/browser.ts) and exported them through [index.ts](/Users/foundry/TriathenumDevelopment/Source/contracts/index.ts) so pinned locations and optional backdrops have a stable shared payload
- added [map-navigation-service.ts](/Users/foundry/TriathenumDevelopment/Source/server/map-navigation-service.ts) with:
  - visibility-aware loading of location entities only
  - pin derivation from persisted `map_x` and `map_y` fields plus optional `map_region`
  - optional backdrop support using an image-bearing location marked as `map_backdrop`
  - clean empty-state behavior when no backdrop or no pins are configured
- updated [index.ts](/Users/foundry/TriathenumDevelopment/Source/server/index.ts) with `GET /api/world/map-navigation`
- updated [App.tsx](/Users/foundry/TriathenumDevelopment/Source/app/App.tsx) with a map-navigation panel that:
  - renders an abstract grid surface when no backdrop is configured
  - overlays clickable pins when locations are mapped
  - supports lightweight region filtering
  - lets users jump from a pin or list item directly into the existing location detail flow
- updated [styles.css](/Users/foundry/TriathenumDevelopment/Source/app/styles.css) with responsive map-surface and pin styling
- added [map-navigation-service.test.ts](/Users/foundry/TriathenumDevelopment/Source/server/map-navigation-service.test.ts) covering empty-state behavior, persisted pin and backdrop loading, and collaborator visibility protection

## Validation Results

- `pnpm run typecheck` passed
- `pnpm exec vitest run server/map-navigation-service.test.ts server/world-browser-service.test.ts` passed
- `pnpm run build` passed

## Current Engineering Note

- the first map slice is intentionally coordinate-based and lightweight rather than introducing a dedicated mapping stack
- location pins persist through the existing entity save flow because the feature reads from normal location fields rather than a separate map store
- the UI degrades to an abstract grid when no backdrop is configured so map-linked navigation remains usable without mandatory art assets

## Open Risks

- location placement quality still depends on authors providing meaningful coordinates and optional region labels
- the first slice does not support drag-and-drop editing, multiple maps, or route/path overlays
- backdrop selection is intentionally simple and currently expects a visible location entity to mark itself as the map backdrop

## Assumptions Carried Forward

- a static, optional backdrop plus coordinate pins is sufficient for the first location-navigation slice
- map navigation should remain an alternate wayfinding surface, not a source-of-truth editor
- graceful empty states matter as much as positive-path pin rendering because some worlds will not have map assets immediately

## QA Focus

- verify map navigation degrades cleanly when no backdrop or pins are configured
- verify persisted location pins appear in the navigation surface and open the corresponding detail flow
- verify collaborator results do not expose owner-only pinned locations
- verify region filtering and pin interaction remain understandable on narrow-width layouts

## Action And Approval Notes

- action class used: `local write`
- no risky-write or sensitive-production approval path was required for this engineering pass

## QA Verdict

- accepted

## QA Evidence Summary

- `pnpm run typecheck` passed
- `pnpm run test` passed
- `pnpm exec vitest run server/map-navigation-service.test.ts server/world-browser-service.test.ts` passed
- `pnpm run build` passed
- direct QA review of the map-navigation service, route, and panel found the bounded behavior aligned with the story scope

## QA Defects

- none blocking

## Required Fixes

- none

## Evidence Quality Call

- sufficient for acceptance

## QA State Recommendation

- move to `engineering/done`
