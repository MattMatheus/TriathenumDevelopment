# Story: WorldForge Phase 3 Canon Consistency Review

## Metadata
- `id`: STORY-20260415-worldforge-phase3-canon-consistency-review
- `owner_role`: Software Engineer
- `status`: done
- `source`: pm
- `decision_refs`: [PLAN-2026-04-14-worldforge-roadmap-and-product-phase, ARCH-20260414-worldforge-v1-platform-and-domain-architecture, ARCH-20260415-worldforge-owner-collaborator-rbac-decision]
- `success_metric`: Users can run a reviewable consistency pass that flags likely canon contradictions and missing corroboration with citations, confidence, and explicit human judgment still required.
- `release_scope`: deferred

## Problem Statement

Consistency checking is one of the clearest long-term differentiators for WorldForge, but it only adds trust if it behaves like a review assistant rather than an oracle. This work needs to be bounded around contradiction detection and evidence surfacing, not auto-resolution or broad world-state automation.

## Scope
- In:
  - scan visible canon for likely contradictions, mismatched claims, or unsupported assertions
  - surface findings with citations, confidence, and short rationale
  - group findings into a review queue users can inspect and dismiss or defer
  - preserve visibility rules so collaborators only see issues tied to content they may read
- Out:
  - automatic canon edits
  - bulk rewrite suggestions
  - full-world digest generation

## Assumptions

- contradiction review should build on the existing citation-first AI and retrieval patterns rather than invent a separate trust model
- false positives are acceptable at a low rate if evidence and uncertainty stay visible
- the first slice should focus on prose or metadata inconsistency detection, not full simulation of world logic

## Acceptance Criteria
1. Users can trigger or request a bounded consistency review and inspect the resulting findings in a readable queue.
2. Every finding includes supporting citations plus explicit confidence or uncertainty.
3. No finding mutates canon directly; users may only review, dismiss, or defer.

## Validation
- Required checks: representative contradiction-detection tests, citation-presence tests, and visibility-scope coverage
- Additional checks: manual review that findings feel assistive rather than authoritative

## Dependencies

- `ARCH-20260414-worldforge-v1-platform-and-domain-architecture`
- `ARCH-20260415-worldforge-owner-collaborator-rbac-decision`
- `STORY-20260414-worldforge-phase2-semantic-search-and-cited-world-answers`
- `STORY-20260414-worldforge-phase2-link-relationship-and-summary-suggestions`

## Risks

- contradiction review could feel untrustworthy if evidence is thin or vague
- noisy findings could create review fatigue
- the feature could drift into auto-correction unless approval boundaries stay explicit

## Open Questions

- whether the first review pass should be whole-world only or support per-entity scoped audits

## Next Step

Cycle closed after QA acceptance and observer reporting.

## Implementation Summary

- added consistency-review contracts in [browser.ts](/Users/foundry/TriathenumDevelopment/Source/contracts/browser.ts) and exported them through [index.ts](/Users/foundry/TriathenumDevelopment/Source/contracts/index.ts) so the app and server share a stable review-queue payload
- added [consistency-review-service.ts](/Users/foundry/TriathenumDevelopment/Source/server/consistency-review-service.ts) with:
  - provider-baseline gating aligned with the existing semantic and suggestion workflows
  - deterministic reciprocal-relationship review for contradiction and missing-corroboration findings
  - visibility-aware finding suppression so collaborator reviews do not leak owner-only canon
  - citation-backed findings with explicit confidence levels and review-oriented summaries
- updated [index.ts](/Users/foundry/TriathenumDevelopment/Source/server/index.ts) with `POST /api/world/consistency-review`
- updated [App.tsx](/Users/foundry/TriathenumDevelopment/Source/app/App.tsx) with a consistency-review panel that:
  - runs a world or selected-entity review on demand
  - renders findings as a readable queue with supporting citations
  - supports local `defer` and `dismiss` review actions without mutating canon
- added [consistency-review-service.test.ts](/Users/foundry/TriathenumDevelopment/Source/server/consistency-review-service.test.ts) covering unavailable behavior, aligned-world no-op behavior, contradiction detection, and collaborator visibility protection

## Validation Results

- `pnpm run typecheck` passed
- `pnpm exec vitest run server/consistency-review-service.test.ts server/semantic-search-service.test.ts server/world-browser-service.test.ts` passed
- `pnpm run build` passed

## Current Engineering Note

- the first consistency slice is intentionally deterministic and relationship-focused rather than trying to infer broad narrative contradictions from arbitrary prose
- review actions are local UI queue controls only in this pass, which keeps the feature safely non-canonical while still letting users triage findings
- governance reciprocity is the first supported contradiction family because the current fixture world and structured-relationship model already represent it cleanly

## Open Risks

- the current contradiction heuristics only cover reciprocal relationship families that the service understands today, so broader canon checks will need later expansion
- defer and dismiss are currently session-local review actions rather than persisted workflow state
- contradiction coverage is strongest where structured relationships are maintained carefully; prose-only disagreements still remain largely out of scope in this first slice

## Assumptions Carried Forward

- a deterministic, citation-backed first pass is preferable to an opaque or over-ambitious contradiction engine
- human review remains the only path for acting on findings
- visibility boundaries must continue to win over completeness when the two are in tension

## QA Focus

- verify consistency review stays unavailable until the AI provider baseline is configured
- verify aligned reciprocal relationships produce a clean empty review queue
- verify contradictory governance claims surface as cited, high-confidence findings
- verify collaborator review does not expose hidden or owner-only canon through findings or citations

## Action And Approval Notes

- action class used: `local write`
- no risky-write or sensitive-production approval path was required for this engineering pass

## QA Verdict

- passed: move to `done`

## QA Evidence Summary

- reviewed the implementation against all three acceptance criteria in [consistency-review-service.ts](/Users/foundry/TriathenumDevelopment/Source/server/consistency-review-service.ts), [index.ts](/Users/foundry/TriathenumDevelopment/Source/server/index.ts), [browser.ts](/Users/foundry/TriathenumDevelopment/Source/contracts/browser.ts), and [App.tsx](/Users/foundry/TriathenumDevelopment/Source/app/App.tsx)
- confirmed automated validation is green:
  - `pnpm run typecheck`
  - `pnpm run test`
  - `pnpm exec vitest run server/consistency-review-service.test.ts server/semantic-search-service.test.ts server/world-browser-service.test.ts`
  - `pnpm run build`
- confirmed focused coverage exists in [consistency-review-service.test.ts](/Users/foundry/TriathenumDevelopment/Source/server/consistency-review-service.test.ts) for:
  - unavailable behavior when the provider baseline is missing
  - empty findings when reciprocal governance records remain aligned
  - contradiction detection with citation output
  - collaborator visibility protection
- reviewed the review-queue flow in [App.tsx](/Users/foundry/TriathenumDevelopment/Source/app/App.tsx) and confirmed findings remain review-only with local `defer` and `dismiss` actions rather than canon mutation

## QA Defects

- none

## Required Fixes

- none

## Evidence Quality Call

- strong enough for this first bounded canon-consistency slice

## QA State Recommendation

- move to `done`
