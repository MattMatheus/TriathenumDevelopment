# Story: App Shell And Interaction Frame

## Metadata
- `id`: STORY-20260411-app-shell-and-interaction-frame
- `owner_role`: Software Architect
- `status`: done
- `source`: planning
- `decision_refs`: [ARCH-20260411-first-system-slice]
- `success_metric`: A local web app shell exists with a calm interaction frame for entering an actor and proposed decision and viewing structured results.
- `release_scope`: n/a

## Problem Statement

The first workflow needs a stable web-native surface, but the UI should reflect the product principle of low-overwhelm interaction rather than defaulting to a generic dashboard.

## Scope
- In:
  - scaffold the app shell under `Source/`
  - create the initial page or flow for actor selection and decision input
  - define a result layout with clearly separated answer, grounding, and uncertainty sections
- Out:
  - final visual design system
  - full end-to-end retrieval logic
  - multi-user concerns

## Assumptions

- the first UI can remain local-first and single-world
- a narrow, task-focused interface is preferable to a broad dashboard in v1

## Acceptance Criteria
1. The app boots locally and renders an initial actor/decision workflow shell.
2. The UI supports a compact default view with expandable detail areas.
3. The layout has explicit placeholders for answer, citations, and uncertainty.

## Validation
- Required checks: local app startup and basic render verification
- Additional checks: lightweight component or UI tests if the chosen stack includes them

## Dependencies

- `ARCH-20260411-first-system-slice`

## Risks

- accidental dashboard sprawl too early
- UI structure becoming coupled to unfinished backend details

## Open Questions

- whether the initial shell should ship as a single page or a small multi-pane flow

## Implementation Summary

- added a minimal Vite + React app shell under `Source/app`
- added a single-page interaction frame with actor input, decision prompt input, and a shared-contract draft preview
- added structured placeholder result panels for answer, grounding, and uncertainty
- added initial CSS for a calm, narrow, low-overwhelm layout
- added Vite config and root HTML entrypoints for the app shell

## Validation Results

- ran `pnpm run typecheck` successfully in `Source/`
- ran `pnpm run build` successfully in `Source/`

## Open Risks

- the shell currently uses a sample response rather than live retrieval or service data
- layout and visual language are intentionally provisional and may evolve once the integration workflow is live
- a future split between `Source/app` and `Source/server` may require tsconfig and script refinement

## QA Focus

- confirm the shell is appropriately narrow and calm rather than dashboard-heavy
- confirm the layout separates answer, grounding, and uncertainty clearly
- confirm the app scaffold is a stable base for the upcoming integration story

## QA Verdict

- accepted: the shell is narrow, calm, and avoids early dashboard sprawl
- accepted: answer, grounding, and uncertainty are clearly separated
- accepted: the scaffold is a stable base for the end-to-end integration slice

## Next Step

Review complete. This shell is now the accepted UI base for the end-to-end actor-reaction workflow.
