# Story: Retrieval Ranking And Ambiguity Handling

## Metadata
- `id`: STORY-20260411-retrieval-ranking-and-ambiguity
- `owner_role`: Software Architect
- `status`: qa
- `source`: planning
- `decision_refs`: [ARCH-20260411-retrieval-grounding-refinement]
- `success_metric`: Candidate notes and actor matches are ranked through explicit score components, and ambiguity is surfaced as a first-class result.
- `release_scope`: n/a

## Problem Statement

The current ranking is intentionally simple and opaque enough that it will soon limit response quality and debugging. The system also needs a better way to surface ambiguous actor matches without pretending certainty.

## Scope
- In:
  - implement decomposed scoring for candidate notes
  - encode explicit source precedence rules
  - return ranked ambiguity results for unresolved actor selection
- Out:
  - rich UI for ambiguity resolution
  - final diagnostics surface

## Assumptions

- explainability matters as much as raw ranking quality in this slice

## Acceptance Criteria
1. Candidate note ranking is composed from explicit, inspectable score components.
2. Source precedence rules favor direct evidence over weaker context expansion.
3. Actor ambiguity results include ranked candidates and match reasons.

## Validation
- Required checks: automated tests for score precedence and ambiguity behavior
- Additional checks: manual review against a few real-world actor names in the Triathenum vault

## Dependencies

- `ARCH-20260411-retrieval-grounding-refinement`
- `STORY-20260411-retrieval-adapter-layering`

## Risks

- score rules becoming complicated too quickly
- ambiguity output being too verbose for later UI use

## Open Questions

- what minimum score gap should be required before the system chooses one actor over another automatically

## Implementation Summary

- decomposed retrieval scoring into inspectable `identity`, `link`, `query`, `domain`, and `operational` components under `Source/retrieval/scoring.ts`
- added an explicit ambiguity threshold so close structural matches stay ambiguous instead of being auto-resolved on narrow score differences
- enriched ranked ambiguity results with `resolver`, `notePath`, and score reasons so later UI and diagnostics work can explain why matching stopped short of certainty
- updated filesystem structural and fallback adapters to emit the richer ranked ambiguity metadata and resolved-source attribution
- extended orchestration tests to cover structural ambiguity precedence and direct-evidence ordering over indexed context expansion

## Validation Results

- ran `pnpm run typecheck` successfully in `Source/`
- ran `pnpm run test` successfully in `Source/`

## Open Risks

- the current score gap threshold is intentionally conservative and may need adjustment once we test against more real actor-name collisions in the Triathenum vault
- score reasons are readable but still tuned for engineering inspection rather than final user-facing phrasing
- indexed search scoring is more explainable now, but it still sits on filesystem-backed heuristics until FTS-backed retrieval is integrated

## QA Focus

- confirm ambiguity remains first-class whenever structural candidates are close enough that fallback resolution would overstate certainty
- confirm score breakdowns are informative enough to support later diagnostics without becoming noisy
- confirm direct evidence remains visibly stronger than indexed context expansion in grounding bundle source ordering

## Next Step

Review in engineering QA, then implement grounding bundle enrichment on top of the refined ranking path.
