# Story: WorldForge Phase 1 Storage, Index, And Entity Foundation

## Metadata
- `id`: STORY-20260414-worldforge-phase1-storage-index-and-entity-foundation
- `owner_role`: Software Architect
- `status`: qa
- `source`: pm
- `decision_refs`: [PLAN-2026-04-14-worldforge-roadmap-and-product-phase, ARCH-20260414-worldforge-v1-platform-and-domain-architecture]
- `success_metric`: The app can load a world from markdown files, parse core entity metadata, and maintain a reviewable local index that powers later CRUD and search work.
- `release_scope`: required

## Problem Statement

Useful-core delivery depends on a stable foundation for markdown-backed entities, YAML frontmatter parsing, and local metadata indexing. Without this baseline, later browser, editor, search, and AI work would each invent their own world model.

## Scope
- In:
  - define the Phase 1 entity storage contract for core entity types
  - implement markdown read and write support with YAML frontmatter round-tripping
  - establish a local index path for metadata, backlinks, and search-oriented fields
  - support deterministic rebuild of the index from markdown source
- Out:
  - rich editor UX
  - semantic search
  - collaboration feed or comments

## Assumptions

- markdown files remain the system of record
- SQLite is the likely index baseline, pending architecture confirmation
- the entity model should support fixed core fields plus future extension data

## Acceptance Criteria
1. Core entity documents can be parsed from markdown with YAML frontmatter into a stable application model.
2. A local index can be rebuilt from markdown content without becoming a second source of truth.
3. The foundation exposes stable data interfaces that later stories can consume for browsing, editing, and search.

## Validation
- Required checks: automated tests for parse, serialize, and index rebuild paths
- Additional checks: fixture coverage for at least character, location, faction, and lore article entities

## Dependencies

- `ARCH-20260414-worldforge-v1-platform-and-domain-architecture`

## Risks

- entity schemas could become either too rigid or too under-specified
- markdown round-tripping could unintentionally damage creator-authored formatting
- index fields could drift from actual product workflow needs

## Open Questions

- how much schema normalization should happen at parse time versus UI save time
- whether backlinks are derived only from wikilinks in Phase 1 or also from typed relationship fields

## Next Step

Review in engineering QA, then promote the responsive world browser story if the storage and index foundation is accepted.

## Implementation Summary

- added shared WorldForge document contracts in [contracts/world.ts](/Users/foundry/TriathenumDevelopment/Source/contracts/world.ts) and exported them through [contracts/index.ts](/Users/foundry/TriathenumDevelopment/Source/contracts/index.ts)
- added a new `Source/world` module for YAML-frontmatter parsing and serialization, markdown entity document parsing, filesystem-backed world document I/O, and rebuildable SQLite indexing
- added fixture world documents for character, faction, location, and lore article coverage under [world/__fixtures__/world](/Users/foundry/TriathenumDevelopment/Source/world/__fixtures__/world/characters/eliana-tanaka.md)
- implemented backlink and unresolved-reference derivation from both wikilinks and structured relationships in the SQLite projection layer
- added fixture-backed tests for parse, serialize, filesystem write, and index rebuild behavior

## Validation Results

- ran `pnpm run typecheck` successfully in `Source/`
- ran `pnpm run test` successfully in `Source/`
- verified fixture coverage for character, faction, location, and lore article documents
- verified deterministic rebuild behavior for entity catalog, backlinks, resolved references, and unresolved references

## Open Risks

- the frontmatter parser intentionally supports a constrained YAML subset and may need expansion as more complex document shapes appear
- the SQLite search projection currently uses normalized text matching rather than FTS; that is sufficient for the foundation story but likely to evolve in the dedicated search story
- later integration work still needs to connect the existing retrieval layer to the new world document and index services instead of continuing to read raw notes directly

## Assumptions Carried Forward

- markdown files remain the canonical store and SQLite remains a rebuildable projection only
- round-trip safety and deterministic indexing are more important than rich editor features at this stage
- relationship-derived backlinks are useful in Phase 1 alongside body wikilinks

## QA Focus

- confirm the shared world contracts are stable enough for the upcoming browser and editor stories
- confirm the constrained YAML/frontmatter handling is acceptable for the current Phase 1 envelope and fixtures
- confirm the SQLite projection captures the right baseline data without drifting into a second source of truth
- confirm the filesystem document store and index API boundaries are practical for later UI and service integration

## Action And Approval Notes

- action class used: `local write`
- no risky or sensitive actions were required

## QA Verdict

- accepted: core entity documents parse into a stable application model
- accepted: SQLite projections rebuild from markdown without becoming the source of truth
- accepted: the storage and index interfaces are suitable for later browser, editor, and search work

## QA Evidence Summary

- reviewed acceptance criteria against implementation and validation evidence
- confirmed automated coverage for parse, serialize, filesystem write, backlinks, resolved references, and unresolved references
- confirmed no missing required validation evidence remained for this infrastructure story

## Evidence Quality Call

- strong for the scope of this story

## Next State Recommendation

- move to `done`
