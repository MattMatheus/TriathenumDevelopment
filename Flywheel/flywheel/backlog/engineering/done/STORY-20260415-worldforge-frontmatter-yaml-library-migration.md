# Story: WorldForge Frontmatter YAML Library Migration

## Metadata
- `id`: STORY-20260415-worldforge-frontmatter-yaml-library-migration
- `owner_role`: Software Engineer
- `status`: done
- `source`: planning
- `decision_refs`: [PLAN-2026-04-15-worldforge-security-hardening-sprint, ARCH-20260414-worldforge-v1-platform-and-domain-architecture]
- `success_metric`: Frontmatter parsing and serialization rely on a supported YAML library instead of the current hand-rolled subset parser, reducing round-trip corruption risk.
- `release_scope`: required

## Problem Statement

The current frontmatter implementation is a custom YAML subset parser and serializer. It is brittle around indentation, quoting, and broader YAML compatibility, which creates avoidable data-loss and interoperability risk for markdown-first world files.

## Scope
- In:
  - replace the custom parser and serializer with a supported YAML library
  - preserve the current entity-document contract and visible editor behavior
  - add regression tests for quoting, indentation, booleans, arrays, and nested objects
- Out:
  - redesigning the entity document format
  - markdown body parsing changes outside the frontmatter boundary

## Assumptions

- a small runtime dependency is acceptable to reduce data-integrity risk
- preserving stable output shape matters more than preserving exact previous formatting quirks

## Acceptance Criteria
1. Frontmatter parse and serialize operations use a maintained YAML library rather than the current custom parser.
2. Existing entity fixtures and document parsing tests continue to pass.
3. New regression tests cover representative YAML edge cases that were previously risky.

## Validation
- Required checks:
  - `pnpm run typecheck`
  - `pnpm run test`
  - `pnpm run build`
- Additional checks:
  - focused round-trip fixture verification

## Dependencies

- `STORY-20260414-worldforge-phase1-markdown-safe-entity-editor`
- `STORY-20260414-worldforge-phase1-storage-index-and-entity-foundation`

## Risks

- serializer differences can alter formatting in fixture files even when semantics remain correct
- nested frontmatter structures may reveal undocumented assumptions in downstream code

## Open Questions

- whether comment preservation matters for this product surface or can remain out of scope

## Next Step

Cycle closed after QA acceptance and observer reporting.

## Implementation Summary

- replaced the custom YAML-subset parser and serializer in [frontmatter.ts](/Users/foundry/TriathenumDevelopment/Source/world/frontmatter.ts) with the supported `yaml` library
- normalized parsed YAML output back into the existing `FrontmatterObject` and `FrontmatterValue` contract so downstream document shaping remains unchanged
- added focused regression coverage in [frontmatter.test.ts](/Users/foundry/TriathenumDevelopment/Source/world/frontmatter.test.ts) for quoting, booleans, arrays, nested objects, and empty collection serialization
- preserved the higher-level entity-document round-trip coverage in [document.test.ts](/Users/foundry/TriathenumDevelopment/Source/world/document.test.ts)

## Validation Results

- `pnpm run typecheck` passed
- `pnpm run test` passed
- `pnpm run build` passed
- focused validation also passed:
  - `pnpm exec vitest run world/frontmatter.test.ts world/document.test.ts`

## Open Risks

- the YAML library may choose different but semantically equivalent formatting than the previous serializer, so QA should watch for fixture or UX expectations that depended on exact formatting quirks
- malformed frontmatter now falls back to an empty frontmatter object when the YAML parser reports errors, which matches the app's tolerant behavior but is worth keeping in mind during QA

## Assumptions Carried Forward

- stable data semantics and round-trip safety matter more than preserving the exact previous inline-versus-block YAML formatting style
- unsupported rich YAML types are out of scope for the current entity-document contract and should continue to normalize into plain scalars, arrays, and objects

## QA Focus

- verify existing world fixtures still parse into the same application model after the library swap
- verify serialized documents with quoted strings, nested objects, booleans, arrays, and empty collections round-trip without corruption
- verify no document write path regressed in the file-system store or editor save flows

## Action And Approval Notes

- action class used: `local write`
- no risky-write or sensitive-production approval path was required for this cycle

## QA Verdict

- passed: move to `done`

## QA Evidence Summary

- reviewed all three acceptance criteria against the implementation and regression coverage
- confirmed frontmatter parsing and serialization now use the supported `yaml` library in [frontmatter.ts](/Users/foundry/TriathenumDevelopment/Source/world/frontmatter.ts)
- confirmed edge-case regression coverage exists in [frontmatter.test.ts](/Users/foundry/TriathenumDevelopment/Source/world/frontmatter.test.ts) for quoted strings, booleans, arrays, nested objects, and empty collections
- confirmed the higher-level document round-trip coverage in [document.test.ts](/Users/foundry/TriathenumDevelopment/Source/world/document.test.ts) still passes
- confirmed the full validation set completed successfully:
  - `pnpm run typecheck`
  - `pnpm run test`
  - `pnpm run build`

## QA Defects

- none

## Required Fixes

- none

## Evidence Quality Call

- strong enough for this migration cycle

## QA State Recommendation

- move to `done`
