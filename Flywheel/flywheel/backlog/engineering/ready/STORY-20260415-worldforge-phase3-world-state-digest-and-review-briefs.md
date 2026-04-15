# Story: WorldForge Phase 3 World-State Digest And Review Briefs

## Metadata
- `id`: STORY-20260415-worldforge-phase3-world-state-digest-and-review-briefs
- `owner_role`: Product Manager
- `status`: ready
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

Promote after the earlier canon-review patterns prove trustworthy enough to support broader summarization.
