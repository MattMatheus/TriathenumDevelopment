# Story: WorldForge Phase 1 Markdown-Safe Entity Editor

## Metadata
- `id`: STORY-20260414-worldforge-phase1-markdown-safe-entity-editor
- `owner_role`: Software Architect
- `status`: qa
- `source`: pm
- `decision_refs`: [PLAN-2026-04-14-worldforge-roadmap-and-product-phase, ARCH-20260414-worldforge-v1-platform-and-domain-architecture]
- `success_metric`: A user can create and edit core entities through an approachable UI while preserving markdown and frontmatter integrity.
- `release_scope`: required

## Problem Statement

Browsing alone is not enough for a useful core. The product must let non-technical users create and edit entities safely, while still preserving creator-owned markdown as the durable source of truth.

## Scope
- In:
  - support create, edit, and save flows for core entity types
  - provide form-oriented editing for structured fields
  - preserve markdown body editing through an approachable authoring surface
  - support autosave or safe-save behavior consistent with the final architecture direction
- Out:
  - AI writing assistance
  - comments and version history
  - advanced schema configuration UI

## Assumptions

- the editor boundary will be defined by architecture before promotion
- a markdown toggle may exist for power users, but the default flow should not require syntax knowledge
- preserving round-trip safety matters more than shipping a maximally rich editor immediately

## Acceptance Criteria
1. Users can create and update core entities without writing raw markdown by default.
2. Saves preserve YAML frontmatter and markdown body integrity.
3. The edit flow works acceptably on mobile for short and medium edits.

## Validation
- Required checks: automated round-trip tests plus manual UI save verification
- Additional checks: regression coverage for unresolved links and structured field persistence

## Dependencies

- `ARCH-20260414-worldforge-v1-platform-and-domain-architecture`
- `STORY-20260414-worldforge-phase1-storage-index-and-entity-foundation`
- `STORY-20260414-worldforge-phase1-responsive-world-browser`

## Risks

- editor complexity could overwhelm the useful-core timeline
- round-trip bugs could damage creator trust quickly
- mobile editing could be acceptable for viewing but frustrating for actual authorship

## Open Questions

- whether the first editor should be plain textarea-plus-forms or a richer structured editor
- how autosave should balance safety, clarity, and multi-user expectations

## Next Step

Review in engineering QA, then promote the search, backlinks, and stub-management story if the editor flow is accepted.

## Implementation Summary

- extended the world-browser API with create and update save routes in [server/index.ts](/Users/foundry/TriathenumDevelopment/Source/server/index.ts)
- added editor save contracts in [contracts/browser.ts](/Users/foundry/TriathenumDevelopment/Source/contracts/browser.ts) and save-path services in [server/world-browser-service.ts](/Users/foundry/TriathenumDevelopment/Source/server/world-browser-service.ts)
- added entity-path generation support to [file-system-world.ts](/Users/foundry/TriathenumDevelopment/Source/world/file-system-world.ts) so new entities can be created with stable markdown file locations
- replaced the read-only detail pane with a form-oriented editor in [App.tsx](/Users/foundry/TriathenumDevelopment/Source/app/App.tsx) for create, edit, and save flows across name, type, visibility, aliases, tags, structured fields, relationships, and markdown body
- updated [styles.css](/Users/foundry/TriathenumDevelopment/Source/app/styles.css) for responsive editor layout, button states, and mobile-safe field grouping
- added persistence tests for editing and creating entities in [world-browser-service.test.ts](/Users/foundry/TriathenumDevelopment/Source/server/world-browser-service.test.ts)

## Validation Results

- ran `pnpm run typecheck` successfully in `Source/`
- ran `pnpm run test` successfully in `Source/`
- ran `pnpm run build` successfully in `Source/`
- verified service-level persistence for both entity updates and new entity creation
- reran `pnpm run typecheck`, `pnpm run test`, and `pnpm run build` successfully after fixing the new-entity selection regression shared across the UI stories
- verified live desktop editor behavior in Safari WebDriver:
  - `New Entity` opened an editor with title `New Entity`
  - `Save Entity` action was visible
  - no browser card remained selected while create mode was active (`selectedCard: null`)
- verified live narrow-width editor behavior in Safari WebDriver at `430px` width:
  - editor remained visible in a single-column workspace (`390px`)
  - `New Entity` state remained active
  - `Save Entity` action remained visible
  - no browser card remained selected while create mode was active (`selectedCard: null`)

## Current Engineering Note

- the `New Entity` selection regression called out in QA has been fixed in [App.tsx](/Users/foundry/TriathenumDevelopment/Source/app/App.tsx)
- live Safari verification now confirms the create flow stays detached from browser auto-selection on desktop and narrow-width layouts

## Open Risks

- the editor currently represents structured fields as simple string key/value rows rather than richer type-aware controls
- save behavior is explicit submit-based rather than autosave, which is safer for now but not yet the final product interaction model
- markdown body editing is currently textarea-based and does not yet provide preview or richer formatting affordances

## Assumptions Carried Forward

- a form-first editor is the right Phase 1 tradeoff for round-trip safety
- explicit save is preferable to early autosave while the write model is still settling
- generic field rows are acceptable for the current useful-core slice before entity-type-specific editors arrive

## QA Focus

- confirm users can create and update entities without exposure to raw frontmatter syntax
- confirm the editor remains usable on narrow mobile layouts for short and medium edits
- confirm save paths preserve markdown and structured metadata correctly for both existing and new entities
- confirm the generic field and relationship editors are understandable enough for the current phase

## Action And Approval Notes

- action class used: `local write`
- no risky or sensitive actions were required

## QA Verdict

- accepted: users can create and update entities without touching raw frontmatter
- accepted: save flows preserve markdown/body and structured metadata paths
- accepted: the create flow no longer rebinds to an unrelated selected entity while editing

## QA Evidence Summary

- reviewed acceptance criteria against implementation and automated validation evidence
- confirmed service-level persistence coverage for edit and create flows
- confirmed live Safari verification at desktop and narrow-width layouts, including detached `New Entity` mode with no selected browser card

## Evidence Quality Call

- strong after the regression fix and live Safari verification

## Next State Recommendation

- move to `done`
