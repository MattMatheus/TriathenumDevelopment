# Story: WorldForge Frontmatter YAML Library Migration

## Metadata
- `id`: STORY-20260415-worldforge-frontmatter-yaml-library-migration
- `owner_role`: Software Engineer
- `status`: intake
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

Hold for later refinement after the security baseline sprint lands.
