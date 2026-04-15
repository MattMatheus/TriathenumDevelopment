# Story: WorldForge Phase 3 World-State Digest And Review Briefs

## Metadata
- `id`: STORY-20260415-worldforge-phase3-world-state-digest-and-review-briefs
- `owner_role`: Software Engineer
- `status`: done
- `source`: pm
- `decision_refs`: [PLAN-2026-04-14-worldforge-roadmap-and-product-phase, ARCH-20260414-worldforge-v1-platform-and-domain-architecture]
- `success_metric`: Users can generate concise, reviewable world-state digests that summarize important changes, tensions, or open questions across the visible corpus without silently authoring canon.
- `release_scope`: deferred

## Problem Statement

Once a world has many entities and ongoing edits, creators need help reorienting quickly. A bounded digest workflow can provide high-value summaries for review sessions, but it must stay grounded and clearly separate summary assistance from canonical truth.

## Scope
- In:
  - generate concise digest or briefing views over a chosen scope such as whole world, tag, faction, or recent changes
  - include citations and visible provenance for summarized claims
  - surface unresolved tensions, open threads, or likely follow-up review areas
  - preserve approval boundaries by treating digests as review aids, not canon writes
- Out:
  - automatic canon updates
  - long-form publishing output
  - comments or activity-feed collaboration features

## Assumptions

- digests are most valuable after semantic retrieval and suggestion patterns have already established trust
- brief, scoped summaries are safer and more useful than one giant omniscient report
- provenance must stay visible so summaries are easy to challenge

## Acceptance Criteria
1. Users can request a digest for a defined scope and receive a concise, reviewable summary.
2. Digest claims include citations or clear provenance back to source entities.
3. Digest output is explicitly non-canonical and does not overwrite stored world content.

## Validation
- Required checks: digest-scope tests, citation-presence coverage, and non-canon-write verification
- Additional checks: manual review that digest length and tone feel useful rather than bloated

## Dependencies

- `STORY-20260414-worldforge-phase2-semantic-search-and-cited-world-answers`
- `STORY-20260414-worldforge-phase2-link-relationship-and-summary-suggestions`
- `STORY-20260415-worldforge-phase3-canon-consistency-review`

## Risks

- digests could overstate weak evidence if confidence signaling is weak
- summary sprawl could make the feature verbose instead of helpful
- users may confuse review briefs with canonical source material unless labeling is explicit

## Open Questions

- whether the first digest slice should center on recent changes, topic scope, or whole-world orientation

## Next Step

Cycle closed after QA acceptance and observer reporting.

## Implementation Summary

- added digest contracts in [browser.ts](/Users/foundry/TriathenumDevelopment/Source/contracts/browser.ts) and exported them through [index.ts](/Users/foundry/TriathenumDevelopment/Source/contracts/index.ts) so review briefs have a stable scope and cited-section payload
- added [digest-service.ts](/Users/foundry/TriathenumDevelopment/Source/server/digest-service.ts) with:
  - provider-baseline gating aligned with the other review-oriented AI surfaces
  - deterministic world and tag-scoped digest generation over visible entities
  - cited sections for scope overview, theme density, relationship focus, and unresolved open threads
  - explicit non-canonical summary framing so the digest stays a review aid rather than source truth
- updated [index.ts](/Users/foundry/TriathenumDevelopment/Source/server/index.ts) with `POST /api/world/digest`
- updated [App.tsx](/Users/foundry/TriathenumDevelopment/Source/app/App.tsx) with a digest panel that:
  - lets users request a world or tag-scoped brief
  - shows provider status and cited sections clearly
  - keeps the output read-only and review-oriented
- added [digest-service.test.ts](/Users/foundry/TriathenumDevelopment/Source/server/digest-service.test.ts) covering unavailable behavior, cited world digests, and tag-scoped digest generation

## Validation Results

- `pnpm run typecheck` passed
- `pnpm exec vitest run server/digest-service.test.ts server/world-browser-service.test.ts` passed
- `pnpm run build` passed

## Current Engineering Note

- the first digest slice is intentionally deterministic and citation-heavy instead of trying to simulate an omniscient narrator
- scope is bounded to `world` or `tag` in this pass so the brief stays readable and testable
- digest sections synthesize visible structure and unresolved threads without writing back to canon

## Open Risks

- digest usefulness still depends on the density and quality of tags, summaries, and unresolved references in the corpus
- the current digest is broad orientation rather than a recent-change brief or workflow-aware recap
- tag-scoped digests rely on exact visible tag membership and do not yet support richer saved scopes

## Assumptions Carried Forward

- cited, scoped review briefs are safer and more useful than long omniscient summaries
- digest output must remain explicitly non-canonical
- bounded scope selection is sufficient for the first world-state briefing slice

## QA Focus

- verify digests remain unavailable until the AI provider baseline is configured
- verify generated briefs always include citations or provenance for each section
- verify tag-scoped briefs stay bounded to the selected visible tag scope
- verify digest output remains read-only and clearly non-canonical in the UI

## Action And Approval Notes

- action class used: `local write`
- no risky-write or sensitive-production approval path was required for this engineering pass

## QA Verdict

- passed: move to `done`

## QA Evidence Summary

- reviewed the implementation against all three acceptance criteria in [digest-service.ts](/Users/foundry/TriathenumDevelopment/Source/server/digest-service.ts), [index.ts](/Users/foundry/TriathenumDevelopment/Source/server/index.ts), [browser.ts](/Users/foundry/TriathenumDevelopment/Source/contracts/browser.ts), and [App.tsx](/Users/foundry/TriathenumDevelopment/Source/app/App.tsx)
- confirmed automated validation is green:
  - `pnpm run typecheck`
  - `pnpm run test`
  - `pnpm exec vitest run server/digest-service.test.ts server/world-browser-service.test.ts`
  - `pnpm run build`
- confirmed focused digest coverage exists in [digest-service.test.ts](/Users/foundry/TriathenumDevelopment/Source/server/digest-service.test.ts) for:
  - unavailable behavior without the AI provider baseline
  - cited world digests
  - tag-scoped brief generation
- reviewed the digest panel flow in [App.tsx](/Users/foundry/TriathenumDevelopment/Source/app/App.tsx) and confirmed the output stays read-only, scopeable, cited, and clearly non-canonical

## QA Defects

- none

## Required Fixes

- none

## Evidence Quality Call

- strong enough for this first bounded world-state digest slice

## QA State Recommendation

- move to `done`
