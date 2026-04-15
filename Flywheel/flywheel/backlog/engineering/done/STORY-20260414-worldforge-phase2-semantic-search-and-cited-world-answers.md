# Story: WorldForge Phase 2 Semantic Search And Cited World Answers

## Metadata
- `id`: STORY-20260414-worldforge-phase2-semantic-search-and-cited-world-answers
- `owner_role`: Product Manager
- `status`: done
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

## Implementation Summary

- added semantic-search contracts in [browser.ts](/Users/foundry/TriathenumDevelopment/Source/contracts/browser.ts) and exported them through [index.ts](/Users/foundry/TriathenumDevelopment/Source/contracts/index.ts) so the browser can distinguish deterministic keyword search from semantic-answer results
- added [semantic-search-service.ts](/Users/foundry/TriathenumDevelopment/Source/server/semantic-search-service.ts) with:
  - deterministic semantic-style ranking over visible world documents using question terms, entity metadata, relationships, and body text
  - citation-backed answer synthesis with explicit uncertainty states
  - optional gating through the AI provider baseline so semantic search returns a clean unavailable response when semantic infrastructure is not configured
- updated [server/index.ts](/Users/foundry/TriathenumDevelopment/Source/server/index.ts) with `GET /api/world/semantic-search`
- updated [App.tsx](/Users/foundry/TriathenumDevelopment/Source/app/App.tsx) so users can:
  - switch between keyword and semantic search modes without losing the existing keyword path
  - ask lore-style questions in semantic mode
  - review cited semantic answers and uncertainty separately from the normal entity browser
- added [semantic-search-service.test.ts](/Users/foundry/TriathenumDevelopment/Source/server/semantic-search-service.test.ts) covering:
  - unavailable fallback when semantic infrastructure is unconfigured
  - representative question-answer retrieval for governance and crisis lore queries
  - citation and uncertainty output expectations

## Validation Results

- ran `pnpm test` successfully in `Source/`
- ran `pnpm typecheck` successfully in `Source/`
- ran `pnpm build` successfully in `Source/`
- confirmed retrieval quality tests for representative lore questions covering:
  - "Who governs the river trade city?"
  - "What crisis tested the council's authority?"
- confirmed fallback behavior when semantic infrastructure is unavailable by validating the unconfigured response path directly in test coverage

## Current Engineering Note

- keyword search remains the deterministic default path and semantic search is now a separate mode rather than a replacement
- the first semantic slice is intentionally deterministic and citation-first; it uses the Phase 2 AI baseline as the availability gate without depending on a live model call to generate answers
- uncertainty is explicit in every semantic response so weak evidence does not present as certainty

## Open Risks

- the current ranking is lightweight and term-based, so broader language variation may still need future tuning or embeddings-backed retrieval
- local and MCP semantic availability still hinge on the shared AI provider baseline rather than dedicated provider-specific runtime checks
- the answer synthesis is deliberately narrow and may need refinement before more open-ended world questions feel natural

## Assumptions Carried Forward

- a deterministic first semantic slice is acceptable as long as citations and uncertainty stay visible
- semantic search should remain optional and clearly distinct from keyword search
- the top-ranked cited entities are sufficient grounding for the first answer workflow

## QA Focus

- confirm keyword and semantic modes remain understandable and distinct in the browser UI
- confirm semantic mode returns a clean unavailable state when no provider baseline is configured
- confirm configured semantic search surfaces citation-backed answers with explicit uncertainty for the representative lore questions covered by tests
- confirm citation paths and excerpts feel clear enough for trust, not just technically present

## Action And Approval Notes

- action class used: `local write`
- no risky-write or sensitive/production approval was required in this engineering pass

## QA Verdict

- passed: move to `done`

## QA Evidence Summary

- reviewed the implementation against all three acceptance criteria in [semantic-search-service.ts](/Users/foundry/TriathenumDevelopment/Source/server/semantic-search-service.ts), [browser.ts](/Users/foundry/TriathenumDevelopment/Source/contracts/browser.ts), [index.ts](/Users/foundry/TriathenumDevelopment/Source/server/index.ts), and [App.tsx](/Users/foundry/TriathenumDevelopment/Source/app/App.tsx)
- confirmed automated validation is green:
  - `pnpm test`
  - `pnpm typecheck`
  - `pnpm build`
- confirmed focused semantic-search coverage exists in [semantic-search-service.test.ts](/Users/foundry/TriathenumDevelopment/Source/server/semantic-search-service.test.ts) for:
  - unavailable fallback when semantic infrastructure is unconfigured
  - citation-backed response behavior for representative governance and crisis questions
  - explicit uncertainty output
- reviewed the UI flow and confirmed keyword and semantic search are separated into distinct modes rather than blending semantic answers into the deterministic browser path

## QA Findings

- no blocking functional defects found in the reviewed implementation

## Evidence Quality Call

- strong enough for the deferred semantic-search baseline

## QA Risks And Gaps

- ranking remains lightweight and term-based, so broader natural-language coverage may need later tuning even though the current bounded questions behave correctly
- this QA pass is backed by automated evidence and code review; no live browser smoke pass was executed inside the sandbox

## QA State Recommendation

- move to `done`
