# Story: WorldForge Phase 2 Semantic Search And Cited World Answers

## Metadata
- `id`: STORY-20260414-worldforge-phase2-semantic-search-and-cited-world-answers
- `owner_role`: Product Manager
- `status`: ready
- `source`: pm
- `decision_refs`: [PLAN-2026-04-14-worldforge-roadmap-and-product-phase, ARCH-20260414-worldforge-v1-platform-and-domain-architecture]
- `success_metric`: Users can ask fuzzy lore questions and receive citation-backed world answers powered by semantic retrieval without replacing keyword search.
- `release_scope`: deferred

## Problem Statement

Semantic retrieval is one of the clearest Phase 2 differentiators, but it only adds trust if it is grounded, reviewable, and clearly separate from plain keyword search. This work needs to be bounded as a cited-answer workflow rather than a vague “AI search” bucket.

## Scope
- In:
  - add semantic retrieval alongside existing keyword search
  - expose citation-backed world answers for lore questions
  - preserve visible source references and uncertainty
  - keep keyword search available as a separate, deterministic mode
- Out:
  - contradiction auditing
  - autonomous canon synthesis
  - broad world-state digest workflows

## Assumptions

- semantic retrieval may use embeddings or another similarity mechanism, but the exact store should remain implementation-flexible
- citation visibility is mandatory for trust
- semantic search should complement, not replace, deterministic search and entity navigation

## Acceptance Criteria
1. Users can choose keyword or semantic search modes without confusion.
2. Semantic search returns citation-backed results and answers with explicit uncertainty when evidence is weak.
3. The feature remains optional when AI or semantic infrastructure is not configured.

## Validation
- Required checks: retrieval quality tests against representative world questions plus fallback behavior when semantic services are unavailable
- Additional checks: manual review of citation clarity and failure messaging

## Dependencies

- `STORY-20260414-worldforge-phase2-ai-provider-and-context-baseline`
- completion of Phase 1 search and entity foundation work

## Risks

- semantic retrieval could feel magical but untrustworthy without tight citations
- infrastructure choices for embeddings could add more operational weight than planned
- weak or ambiguous content could make answers seem authoritative when they should remain uncertain

## Open Questions

- whether the first semantic slice should answer questions directly or start with ranked semantic matches plus citations

## Next Step

Promote after the provider baseline is accepted and the useful-core search surface is stable.
