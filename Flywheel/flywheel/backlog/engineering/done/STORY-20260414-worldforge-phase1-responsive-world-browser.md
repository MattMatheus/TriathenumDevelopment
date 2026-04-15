# Story: WorldForge Phase 1 Responsive World Browser

## Metadata
- `id`: STORY-20260414-worldforge-phase1-responsive-world-browser
- `owner_role`: Software Architect
- `status`: qa
- `source`: pm
- `decision_refs`: [PLAN-2026-04-14-worldforge-roadmap-and-product-phase, ARCH-20260414-worldforge-v1-platform-and-domain-architecture]
- `success_metric`: A non-technical user can browse entities by type and open a clear entity detail view on desktop and iPhone without encountering raw markdown.
- `release_scope`: required

## Problem Statement

The useful core needs a readable, approachable browsing experience before deeper editing workflows can succeed. If browsing and entity detail views are not clear on mobile, the Wife test fails even if storage and indexing are technically sound.

## Scope
- In:
  - create a responsive world browser for entity lists and filters
  - provide entity detail views for core entity types
  - preserve calm, low-overwhelm interaction patterns on mobile and desktop
  - use the indexed entity foundation as the data source
- Out:
  - final visual design system
  - in-editor AI actions
  - advanced graph or timeline navigation

## Assumptions

- existing app shell work can be extended rather than discarded
- entity type, tag, and status filtering provide the first meaningful browser surface
- detail views should prioritize readability over dense metadata exposure

## Acceptance Criteria
1. Users can browse and filter entities by core type on desktop and mobile.
2. Opening an entity shows a structured detail view that is readable without markdown knowledge.
3. The browser and detail layout preserve low-overwhelm defaults and large-touch mobile usability.

## Validation
- Required checks: local UI verification for desktop and mobile viewport behavior
- Additional checks: component or route tests for empty, filtered, and populated states

## Dependencies

- `ARCH-20260414-worldforge-v1-platform-and-domain-architecture`
- `STORY-20260414-worldforge-phase1-storage-index-and-entity-foundation`

## Risks

- the browser could collapse into a desktop-first table that fails on phones
- detail views could overexpose schema internals instead of user-facing meaning
- early layout choices could fight the planned editor workflow

## Open Questions

- whether recent edits or unresolved stubs belong in the first browser surface or a later dashboard pass

## Next Step

Review in engineering QA, then promote the markdown-safe entity editor story if the browse and detail foundation is accepted.

## Implementation Summary

- replaced the actor-reaction demo UI in [App.tsx](/Users/foundry/TriathenumDevelopment/Source/app/App.tsx) with a responsive world browser and entity detail flow
- added shared browser contracts in [contracts/browser.ts](/Users/foundry/TriathenumDevelopment/Source/contracts/browser.ts) and exported them through [contracts/index.ts](/Users/foundry/TriathenumDevelopment/Source/contracts/index.ts)
- added world-browser services and tests in [server/world-browser-service.ts](/Users/foundry/TriathenumDevelopment/Source/server/world-browser-service.ts) and [server/world-browser-service.test.ts](/Users/foundry/TriathenumDevelopment/Source/server/world-browser-service.test.ts)
- extended [server/index.ts](/Users/foundry/TriathenumDevelopment/Source/server/index.ts) with `/api/world/entities` and `/api/world/entities/:id` routes backed by the new world document and index layer
- updated [styles.css](/Users/foundry/TriathenumDevelopment/Source/app/styles.css) for a calm two-pane layout that collapses cleanly to one column on mobile

## Validation Results

- ran `pnpm run typecheck` successfully in `Source/`
- ran `pnpm run test` successfully in `Source/`
- ran `pnpm run build` successfully in `Source/`
- added service-level tests for populated browser payloads and backlink-backed entity detail loading
- reran `pnpm run typecheck`, `pnpm run test`, and `pnpm run build` successfully after fixing the new-entity selection regression shared across the UI stories
- verified live desktop browser behavior in Safari WebDriver at `1440px` width:
  - workspace rendered as a two-column grid (`370px 790px`)
  - browser list showed four entities
  - detail view opened a readable entity title (`Council of Twelve Regions`)
  - stub queue remained visible with count `1`
- verified live narrow-width browser/search behavior in Safari WebDriver at `430px` width:
  - workspace collapsed to a single-column layout (`390px`)
  - filtered search state remained readable
  - stub queue stayed visible with count `1`

## Current Engineering Note

- the `New Entity` selection regression called out in QA has been fixed in [App.tsx](/Users/foundry/TriathenumDevelopment/Source/app/App.tsx)
- live Safari verification is now complete for desktop and narrow-width browser/search states

## Open Risks

- the browser currently reloads payloads through simple request-time reads and index rebuilds; caching or longer-lived world services may become desirable as the data set grows
- entity detail currently renders markdown body text as plain readable content rather than richer formatted markdown
- the current filter surface focuses on type and tag only; search and unresolved-stub surfaces still belong to the following story

## Assumptions Carried Forward

- a calm browser and detail view is more important than a broad dashboard in the first useful release
- type and tag filters are enough for the first browser slice
- service-level verification is sufficient for this story until a dedicated browser interaction test harness is introduced

## QA Focus

- confirm the browser layout stays legible and touch-friendly on narrow mobile widths
- confirm entity details are readable without exposing raw markdown or schema noise
- confirm the browser API boundaries are a good fit for the upcoming editor and search stories
- confirm the initial empty and filtered states feel calm rather than abrupt

## Action And Approval Notes

- action class used: `local write`
- no risky or sensitive actions were required

## QA Verdict

- accepted: users can browse and filter entities by core type
- accepted: entity detail views are readable without exposing raw markdown syntax
- accepted: desktop and narrow-width layouts preserve a calm, legible browser flow

## QA Evidence Summary

- reviewed acceptance criteria against implementation and automated validation evidence
- confirmed service-level coverage for browser payloads and detail loading
- confirmed live Safari verification at desktop (`1440px`) and narrow-width (`430px`) layouts

## Evidence Quality Call

- strong after the added live Safari verification

## Next State Recommendation

- move to `done`
