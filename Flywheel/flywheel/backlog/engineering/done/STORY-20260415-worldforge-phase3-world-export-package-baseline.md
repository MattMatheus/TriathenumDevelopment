# Story: WorldForge Phase 3 World Export Package Baseline

## Metadata
- `id`: STORY-20260415-worldforge-phase3-world-export-package-baseline
- `owner_role`: Software Engineer
- `status`: done
- `source`: pm
- `decision_refs`: [PLAN-2026-04-14-worldforge-roadmap-and-product-phase]
- `success_metric`: Users can export the current world into a deterministic portable package that preserves markdown documents and referenced media without drifting into publishing workflows.
- `release_scope`: deferred

## Problem Statement

WorldForge promises creator-owned data, but users still lack a first-class way to extract a whole world into a predictable portable package. The first portability slice should prove deterministic export before tackling import writes or collision handling.

## Scope
- In:
  - export the current world into one deterministic package shape
  - include markdown entity documents and referenced media assets
  - preserve frontmatter, body content, and stable asset naming where practical
  - provide enough package metadata for a later import workflow to validate the bundle
- Out:
  - import or overwrite behavior
  - PDF or EPUB publishing
  - scoped partial exports
  - live sync with external vaults

## Assumptions

- export is the safest first portability slice because it validates package shape without mutating world state
- one package format is better than multiple export variants in the first slice
- deterministic output matters more than archive customization or reader-facing polish

## Acceptance Criteria
1. Users can trigger a world export flow that produces one portable package containing current markdown entities and referenced media.
2. Export output is deterministic enough that repeated exports of unchanged content preserve stable structure and naming.
3. The package shape is clearly bounded for later import validation and does not include publishing-only output.

## Validation
- Required checks: export-package tests, deterministic-structure verification, and media-inclusion coverage
- Additional checks: manual review that exported content round-trips as normal markdown files instead of app-specific opaque blobs

## Dependencies

- `ARCH-20260414-worldforge-v1-platform-and-domain-architecture`
- `STORY-20260414-worldforge-phase1-storage-index-and-entity-foundation`
- `STORY-20260414-worldforge-phase1-media-and-compose-baseline`
- `STORY-20260415-worldforge-frontmatter-yaml-library-migration`

## Risks

- export package structure could become an accidental long-term contract before import semantics are tested
- media packaging may expose asset naming or path assumptions that need normalization
- archive generation details could distract from the real goal of portable markdown durability

## Open Questions

- whether the first package should be a zip archive only or a plain directory plus optional archive wrapper
- whether hidden or owner-only entities should always export for the owner or respect current viewer scope

## Next Step

Cycle closed after QA acceptance and observer reporting.

## Implementation Summary

- added [export-package-service.ts](/Users/foundry/TriathenumDevelopment/Source/server/export-package-service.ts) with:
  - visibility-aware export packaging based on the current authenticated viewer
  - deterministic tar generation with sorted entries and stable tar metadata
  - a portable package shape containing `manifest.json`, markdown entity files, and referenced media assets
- added [export-package-service.test.ts](/Users/foundry/TriathenumDevelopment/Source/server/export-package-service.test.ts) covering:
  - deterministic package generation for unchanged content
  - referenced media inclusion
  - viewer visibility boundary enforcement
- updated [index.ts](/Users/foundry/TriathenumDevelopment/Source/server/index.ts) with `GET /api/world/export-package` returning an attachment download
- updated [App.tsx](/Users/foundry/TriathenumDevelopment/Source/app/App.tsx) with a `World Export` panel and download action so the package is reachable from the current application shell

## Validation Results

- `pnpm exec vitest run server/export-package-service.test.ts server/world-browser-service.test.ts` passed
- `pnpm run typecheck` passed
- `pnpm run test` passed
- `pnpm run build` passed

## Current Engineering Note

- the first portability slice exports viewer-visible content only, which lets owner exports include restricted entries while collaborator exports stay within current visibility boundaries
- the package format is intentionally `tar` instead of zip so the app can emit a deterministic bundle without pulling in a larger archive or publishing stack
- `manifest.json` is included to give later import validation a small stable contract without embedding timestamps or other non-deterministic fields

## Open Risks

- tar entry paths are currently limited to the simple path lengths supported by this bounded implementation
- the first package shape is now a real contract, so later import work should preserve compatibility or version it deliberately
- the UI currently uses a one-click download action rather than a richer export history or scope configuration surface

## Assumptions Carried Forward

- deterministic export is the right first proof of creator-owned portability before any import write path exists
- a plain-file package is more valuable than publishing polish in this slice
- current visibility rules should continue to shape what each viewer can export

## QA Focus

- verify the exported tar contains normal markdown documents and referenced media rather than opaque app-only payloads
- verify repeated exports of unchanged content remain byte-stable
- verify collaborator exports do not include owner-only entities or media
- verify the in-app export action downloads successfully without disrupting the current browse flow

## Action And Approval Notes

- action class used: `local write`
- no risky-write or sensitive-production approval path was required for this engineering pass

## QA Verdict

- accepted

## QA Evidence Summary

- `pnpm exec vitest run server/export-package-service.test.ts server/world-browser-service.test.ts` passed
- `pnpm run typecheck` passed
- `pnpm run test` passed
- `pnpm run build` passed
- direct QA review of the export service, route, and app action found the slice aligned with the bounded export-only scope

## QA Defects

- none blocking

## Required Fixes

- none

## Evidence Quality Call

- sufficient for acceptance

## QA State Recommendation

- move to `engineering/done`
