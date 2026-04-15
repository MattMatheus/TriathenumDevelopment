# Story: WorldForge Phase 1 Search, Backlinks, And Stub Management

## Metadata
- `id`: STORY-20260414-worldforge-phase1-search-backlinks-and-stub-management
- `owner_role`: Software Architect
- `status`: qa
- `source`: pm
- `decision_refs`: [PLAN-2026-04-14-worldforge-roadmap-and-product-phase, ARCH-20260414-worldforge-v1-platform-and-domain-architecture]
- `success_metric`: Users can quickly find entities, inspect backlinks, and identify unresolved references that should become future world entries.
- `release_scope`: required

## Problem Statement

The useful core becomes much more valuable once creators can search the world, see what references an entity, and notice unresolved links that represent missing canon. These capabilities are central to replacing manual markdown spelunking.

## Scope
- In:
  - provide keyword search across entity metadata and body content
  - expose backlinks on entity detail views
  - surface unresolved links as stubs or a review queue
  - use the local index rather than ad hoc file scanning in the UI layer
- Out:
  - semantic search
  - AI-generated summaries or stub filling
  - graph visualization

## Assumptions

- backlinks and unresolved links can be derived from stable link parsing
- keyword search should be fast enough to feel instantaneous in normal local usage
- stub management can begin as a simple queue rather than a full workflow system

## Acceptance Criteria
1. Users can run keyword search and find matching entities or body-text references.
2. Entity detail views show backlinks in a clear, readable form.
3. Unresolved references are surfaced as stubs that users can inspect and act on later.

## Validation
- Required checks: tests for indexing and retrieval of search terms, backlinks, and unresolved links
- Additional checks: manual verification against representative markdown notes with wikilinks

## Dependencies

- `ARCH-20260414-worldforge-v1-platform-and-domain-architecture`
- `STORY-20260414-worldforge-phase1-storage-index-and-entity-foundation`
- `STORY-20260414-worldforge-phase1-markdown-safe-entity-editor`

## Risks

- search relevance could be weak if indexing is underspecified
- stub surfacing could become noisy without good deduplication
- backlink views could expose implementation detail instead of creator-meaningful context

## Open Questions

- whether tags should be part of the first search filters or a later enhancement

## Next Step

Review in engineering QA, then promote the auth, visibility, and session baseline story if the search and stub workflow is accepted.

## Implementation Summary

- extended the browser payload contract in [contracts/browser.ts](/Users/foundry/TriathenumDevelopment/Source/contracts/browser.ts) to include unresolved references
- updated [world-browser-service.ts](/Users/foundry/TriathenumDevelopment/Source/server/world-browser-service.ts) to support indexed keyword search and to surface unresolved references from the SQLite projection layer
- updated [server/index.ts](/Users/foundry/TriathenumDevelopment/Source/server/index.ts) so `/api/world/entities` accepts a `q` parameter and returns the filtered payload from the shared world service
- expanded [world-browser-service.test.ts](/Users/foundry/TriathenumDevelopment/Source/server/world-browser-service.test.ts) with coverage for keyword search and unresolved-reference payloads
- updated [App.tsx](/Users/foundry/TriathenumDevelopment/Source/app/App.tsx) with a keyword search input and a visible stub queue panel while keeping backlinks in the entity detail flow
- added small supporting UI polish in [styles.css](/Users/foundry/TriathenumDevelopment/Source/app/styles.css) for the stub queue count and search field integration

## Validation Results

- ran `pnpm run typecheck` successfully in `Source/`
- ran `pnpm run test` successfully in `Source/`
- ran `pnpm run build` successfully in `Source/`
- verified service-level search behavior against indexed `river` matches and unresolved-reference queue results
- reran `pnpm run typecheck`, `pnpm run test`, and `pnpm run build` successfully after fixing the new-entity selection regression shared across the UI stories
- verified live narrow-width search behavior in Safari WebDriver at `430px` width:
  - workspace remained single-column (`390px`)
  - search state remained readable
  - unresolved stub queue remained visible with count `1`
- verified live desktop browser/detail state still showed backlink-backed detail content with visible stub queue alongside the search surface

## Current Engineering Note

- the `New Entity` selection regression called out in QA has been fixed in [App.tsx](/Users/foundry/TriathenumDevelopment/Source/app/App.tsx)
- live Safari verification is now complete for search and stub-queue states on narrow-width layout

## Open Risks

- keyword search currently uses normalized substring matching rather than FTS ranking, so relevance is intentionally simple for this slice
- the stub queue is a review surface only; creating entities directly from stubs is still deferred to the AI/draft-generation phase
- the browser currently refetches the full payload on search changes instead of using debounced or cached query behavior

## Assumptions Carried Forward

- simple keyword search is sufficient for the useful-core phase before semantic search arrives later
- unresolved references can begin as a lightweight review queue instead of a dedicated workflow subsystem
- exposing backlinks inside detail plus stubs in the browser gives enough connective tissue for the current phase

## QA Focus

- confirm search results feel predictable enough for the current normalized matching behavior
- confirm the stub queue is readable and not overly noisy on mobile
- confirm backlinks, search, and stub surfaces feel like one coherent browse workflow rather than separate utilities
- confirm the current server-side query path is acceptable before heavier indexing work arrives

## Action And Approval Notes

- action class used: `local write`
- no risky or sensitive actions were required

## QA Verdict

- accepted: keyword search returns predictable matches from the indexed entity corpus
- accepted: entity detail views expose backlinks clearly
- accepted: unresolved references are surfaced as a readable stub queue on desktop and narrow-width layouts

## QA Evidence Summary

- reviewed acceptance criteria against implementation and automated validation evidence
- confirmed service-level coverage for keyword search and unresolved-reference payloads
- confirmed live Safari verification for narrow-width search and stub-queue behavior and desktop detail/backlink visibility

## Evidence Quality Call

- strong for the intended useful-core scope

## Next State Recommendation

- move to `done`
