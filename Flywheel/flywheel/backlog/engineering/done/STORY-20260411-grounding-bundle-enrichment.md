# Story: Grounding Bundle Enrichment

## Metadata
- `id`: STORY-20260411-grounding-bundle-enrichment
- `owner_role`: Software Architect
- `status`: qa
- `source`: planning
- `decision_refs`: [ARCH-20260411-retrieval-grounding-refinement]
- `success_metric`: Grounding bundles expose source roles and inclusion reasons without becoming overly complex.
- `release_scope`: n/a

## Problem Statement

The current grounding bundle is useful but too flat. The next slice should distinguish stronger and weaker sources more clearly so both the UI and future debugging surfaces can explain why evidence was included.

## Scope
- In:
  - add source-role groupings
  - add inclusion reasons or score explanations
  - adapt response-generation consumers to the enriched bundle
- Out:
  - full semantic role ontology
  - major UI redesign

## Assumptions

- the grounding bundle should evolve carefully and remain practical for current workflows

## Acceptance Criteria
1. Grounding bundles distinguish source roles such as subject note, linked canon, search hit, and operational context.
2. Included evidence carries enough reasoning context to explain why it was selected.
3. Existing workflow consumers continue to function with the enriched bundle.

## Validation
- Required checks: automated tests for bundle structure and downstream compatibility
- Additional checks: manual inspection of one or two generated bundles for readability

## Dependencies

- `ARCH-20260411-retrieval-grounding-refinement`
- `STORY-20260411-retrieval-ranking-and-ambiguity`

## Risks

- adding too many bundle fields too early
- breaking current consumers during enrichment

## Open Questions

- how much inclusion reasoning should be retained in the user-facing payload versus developer-only diagnostics

## Implementation Summary

- enriched `Source/contracts/actor-reaction.ts` so grounding sources can carry `sourceRole` and `inclusionReasons`, and bundles now expose grouped source views
- updated `Source/retrieval/orchestration.ts` to classify sources as subject note, linked canon, search hit, or operational context during bundle assembly
- added inclusion reasons derived from resolver choice, direct-link precedence, and search score explanations so evidence selection remains inspectable
- adapted `Source/server/actor-reaction-service.ts` to consume the enriched bundle without changing the overall response shape
- extended retrieval and server tests to cover grouped sources, inclusion reasons, and downstream compatibility

## Validation Results

- ran `pnpm run typecheck` successfully in `Source/`
- ran `pnpm run test` successfully in `Source/`

## Open Risks

- inclusion reasons are still written for engineering readability and may need a softer phrasing layer before they are shown more prominently in the UI
- operational-context classification is intentionally heuristic and should be revisited once richer indexed retrieval is in place
- the enriched bundle is still compact, but we should keep watching for duplicated evidence between canon basis and source explanations

## QA Focus

- confirm source grouping is clear enough to support later UI and diagnostics work without introducing unnecessary ontology
- confirm inclusion reasons explain selection in a way that feels trustworthy and not overly noisy
- confirm the actor reaction workflow still feels stable with the enriched bundle beneath it

## Next Step

Review in engineering QA, then implement retrieval diagnostics on top of the enriched grounding path.
