# Story: WorldForge Phase 1 Useful Core Foundation

## Metadata
- `id`: STORY-20260414-worldforge-phase-1-useful-core-foundation
- `owner_role`: Product Manager
- `status`: intake
- `source`: planning
- `decision_refs`: [PLAN-2026-04-14-worldforge-roadmap-and-product-phase]
- `success_metric`: PM refines the useful-core roadmap into a bounded sequence of implementation-ready stories that can deliver a genuinely usable markdown-first worldbuilding app without depending on AI features.
- `release_scope`: required

## Problem Statement

The WorldForge specification defines a strong Phase 1 vision, but it is still too broad to drive execution. The useful-core layer needs to be split into the smallest coherent delivery sequence so the team can start with a realistic baseline rather than an all-at-once platform build.

## Scope
- In:
  - refine the Phase 1 scope into a bounded backlog spine
  - preserve dependencies across storage, auth, entity CRUD, search, navigation, and mobile editing
  - define acceptance criteria for the first implementation slices
- Out:
  - implementation work
  - deep technical architecture decisions best handled in the architecture lane
  - Phase 2+ feature decomposition except where needed to protect boundaries

## Assumptions

- Phase 1 should be useful without AI features enabled
- mobile usability is a hard requirement, not a polish task
- markdown storage, YAML frontmatter, and simple self-hosting remain fixed constraints

## Acceptance Criteria
1. Phase 1 is decomposed into a sequenced set of bounded, testable stories with explicit dependencies.
2. Each refined story preserves the non-technical usability and mobile-first constraints where relevant.
3. The resulting sequence clearly identifies which items require architecture decisions before promotion.

## Validation
- Required checks: PM review against planning note scope, dependency chain sanity check, and bounded-story quality review
- Additional checks: compare refined slices against the WorldForge spec to ensure no critical useful-core capability is silently dropped

## Dependencies

- `ARCH-20260414-worldforge-v1-platform-and-domain-architecture`

## Risks

- useful-core work could stay too large and vague for execution
- AI features could leak into Phase 1 and destabilize roadmap focus
- mobile and non-technical UX requirements could be under-specified during decomposition

## Open Questions

- what is the first smallest vertical slice that still feels meaningfully useful
- whether invites and per-entity visibility both belong in the first release or should be sequenced

## Next Step

PM refinement and queue ordering.
