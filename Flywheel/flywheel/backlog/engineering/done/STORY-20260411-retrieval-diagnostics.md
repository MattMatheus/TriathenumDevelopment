# Story: Retrieval Diagnostics

## Metadata
- `id`: STORY-20260411-retrieval-diagnostics
- `owner_role`: Software Architect
- `status`: qa
- `source`: planning
- `decision_refs`: [ARCH-20260411-retrieval-grounding-refinement]
- `success_metric`: Developers and operators can inspect source selection, ranking contributions, and ambiguity decisions through dedicated tooling.
- `release_scope`: n/a

## Problem Statement

As retrieval gets more capable, it also becomes easier to misunderstand. The system needs operator-facing diagnostics so ranking and source selection remain inspectable rather than mysterious.

## Scope
- In:
  - add developer or operator utilities under `Tools/`
  - surface selected sources, score components, and ambiguity details
  - support targeted debugging against one actor and decision prompt
- Out:
  - full production observability platform
  - polished end-user diagnostics UI

## Assumptions

- diagnostics belong in `Tools/`, not the main app flow

## Acceptance Criteria
1. A developer can inspect why notes were selected for a grounding bundle.
2. Ranking components and adapter contributions are visible in the diagnostics output.
3. Ambiguity decisions can be reviewed without instrumenting application code manually.

## Validation
- Required checks: manual use of the diagnostics path against at least one real actor
- Additional checks: automated tests for any shared formatting or summary helpers

## Dependencies

- `ARCH-20260411-retrieval-grounding-refinement`
- `STORY-20260411-retrieval-ranking-and-ambiguity`
- `STORY-20260411-grounding-bundle-enrichment`

## Risks

- diagnostics diverging from the real shared retrieval path
- debug output becoming too noisy to help

## Open Questions

- whether diagnostics should be pure CLI text first or emit structured JSON from the start

## Implementation Summary

- added shared diagnostics helpers in `Source/retrieval/diagnostics.ts` so retrieval inspection runs through the same adapter and grounding path as the app
- added formatting and fixture-backed tests in `Source/retrieval/diagnostics.test.ts` for readable operator output
- added a dedicated CLI under `Tools/retrieval-diagnostics.ts` with human-readable output by default and `--json` for structured inspection
- enriched source metadata with `retrievalAdapter` so diagnostics can show which adapter contributed each selected note
- wired the CLI into `Source/package.json` as `pnpm run diagnose:retrieval`

## Validation Results

- ran `pnpm run typecheck` successfully in `Source/`
- ran `pnpm run test` successfully in `Source/`
- ran `pnpm run diagnose:retrieval -- --actor "Eliana Tanaka" --prompt "Support a controversial infrastructure vote that may require public ratification."` successfully in `Source/`

## Open Risks

- the current terminal formatter is intentionally compact and may need a second pass once we start comparing multiple retrieval runs side by side
- diagnostics currently reflect the filesystem/indexed heuristic stack; adapter attribution will become even more valuable once ObsidianMCP and FTS-backed adapters are added
- the tool is intended for operators and developers, so we should avoid letting its current phrasing leak directly into end-user UI without curation

## QA Focus

- confirm the diagnostics tool reflects the real shared retrieval path rather than a parallel debug-only implementation
- confirm the text output is readable enough to support quick vault-tuning sessions
- confirm ambiguity, score components, and adapter contributions are all visible without needing code instrumentation

## Next Step

Review in engineering QA, then accept the retrieval refinement implementation wave or open follow-on tuning stories.
