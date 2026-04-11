# Story: Retrieval Adapter Layering

## Metadata
- `id`: STORY-20260411-retrieval-adapter-layering
- `owner_role`: Software Architect
- `status`: qa
- `source`: planning
- `decision_refs`: [ARCH-20260411-retrieval-grounding-refinement]
- `success_metric`: The retrieval system orchestrates structural, indexed, and filesystem adapters under one shared application path.
- `release_scope`: n/a

## Problem Statement

The current retrieval path depends primarily on filesystem scanning. The next slice needs a shared adapter orchestration layer so richer retrieval sources can be introduced without fragmenting application logic.

## Scope
- In:
  - define adapter interfaces for structural, indexed, and fallback retrieval
  - implement orchestration that combines adapter outputs under one shared path
  - keep filesystem retrieval as a fallback rather than the dominant path
- Out:
  - final ranking heuristics
  - UI changes
  - broad reasoning-model changes

## Assumptions

- richer adapters may arrive incrementally
- shared orchestration should remain under `Source/`

## Acceptance Criteria
1. Retrieval adapters can be composed behind one shared orchestration layer.
2. Structural, indexed, and filesystem paths have distinct responsibilities.
3. The current workflow can still run when richer adapters are unavailable.

## Validation
- Required checks: automated tests for adapter orchestration and fallback behavior
- Additional checks: manual verification that the first actor workflow still works when only the filesystem adapter is present

## Dependencies

- `ARCH-20260411-retrieval-grounding-refinement`

## Risks

- adding adapters without clear responsibilities
- creating multiple retrieval code paths that drift apart

## Open Questions

- which ObsidianMCP operations should be considered structural retrieval inputs in the first implementation pass

## Implementation Summary

- added explicit retrieval adapter interfaces under `Source/retrieval/types.ts`
- added default structural, indexed, and filesystem fallback adapters under `Source/retrieval/adapters.ts`
- added shared orchestration for adapter composition under `Source/retrieval/orchestration.ts`
- refactored the existing grounding entrypoints to run through adapter orchestration instead of one monolithic retrieval path
- added orchestration tests covering structural preference, fallback behavior, and combined adapter usage

## Validation Results

- ran `pnpm run typecheck` successfully in `Source/`
- ran `pnpm run test` successfully in `Source/`

## Open Risks

- the indexed adapter still uses filesystem-backed heuristics internally until SQLite FTS5 integration is added
- the structural adapter currently approximates graph-aware retrieval with title and wikilink logic until ObsidianMCP integration is added
- adapter boundaries are now explicit, but richer adapters still need to be implemented behind them

## QA Focus

- confirm the adapter interfaces are clear and stable enough for the next stories
- confirm the orchestration preserves the existing workflow while making richer adapters pluggable
- confirm filesystem retrieval now behaves as fallback rather than the only design path

## Next Step

Review in engineering QA, then implement ranking and ambiguity refinement on top of the layered adapter path.
