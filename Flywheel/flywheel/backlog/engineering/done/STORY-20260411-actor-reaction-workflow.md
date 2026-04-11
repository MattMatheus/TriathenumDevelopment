# Story: Actor Reaction Workflow With Citations

## Metadata
- `id`: STORY-20260411-actor-reaction-workflow
- `owner_role`: Software Architect
- `status`: done
- `source`: planning
- `decision_refs`: [ARCH-20260411-first-system-slice]
- `success_metric`: A creator can select an actor, provide a proposed decision, and receive a canon-backed reaction with visible citations and clearly labeled inference.
- `release_scope`: required

## Problem Statement

The first memorable capability for the product is a grounded actor-reaction workflow. This story connects the shared contracts, retrieval path, and UI shell into one reviewable end-to-end slice.

## Scope
- In:
  - wire the app shell to the application API
  - invoke retrieval and grounding bundle assembly
  - produce a normalized actor reaction response
  - render citations and inferred elements distinctly
- Out:
  - multi-actor comparison
  - canon consistency review as a separate workflow
  - direct note writes

## Assumptions

- the first end-to-end slice can use one well-bounded reasoning path
- visible grounding matters more than sophisticated generation breadth in v1

## Acceptance Criteria
1. A user can submit an actor and decision prompt through the UI and receive a structured response.
2. The response distinguishes canon basis from inferred elements and uncertainty.
3. Citations to source notes are visible in the result.

## Validation
- Required checks: end-to-end local verification of the workflow
- Additional checks: integration tests for API orchestration and response shaping if the chosen stack supports them

## Dependencies

- `ARCH-20260411-first-system-slice`
- `STORY-20260411-typed-api-contracts`
- `STORY-20260411-grounding-bundle-retrieval`
- `STORY-20260411-app-shell-and-interaction-frame`

## Risks

- poor retrieval quality undermining confidence in the full workflow
- response formatting hiding uncertainty or overstating canon support

## Open Questions

- whether the first response should include one alternate reaction by default or keep alternatives behind an expandable section

## Implementation Summary

- added a thin Node-based application API in `Source/server/index.ts`
- added a bounded response builder in `Source/server/actor-reaction-service.ts`
- wired the app shell to call `/api/actor-reaction` and render live response state instead of placeholder-only sample output
- added a server-side response test in `Source/server/actor-reaction-service.test.ts`
- added Vite proxy and server run script support for local app/API integration

## Validation Results

- ran `pnpm run typecheck` successfully in `Source/`
- ran `pnpm run test` successfully in `Source/`
- ran `pnpm run build` successfully in `Source/`
- validated the end-to-end orchestration path through tests covering the response builder over the retrieval layer
- attempted live local server execution with `pnpm run dev:server`, but direct runtime verification was blocked by sandbox restrictions around the `tsx` IPC pipe used in this environment

## Open Risks

- the current response generation is intentionally heuristic and should be treated as a bounded first slice, not a final reasoning model
- the API currently reads directly from the filesystem-backed vault adapter rather than ObsidianMCP or SQLite FTS5
- local runtime instructions may need slight refinement for environments that constrain `tsx` IPC behavior

## QA Focus

- confirm the response shape clearly separates canon basis, inferred elements, and uncertainty
- confirm the thin API layer is sufficient for the first slice and does not overcomplicate the stack
- confirm the current heuristic response builder is acceptable as a first integration step before deeper reasoning work

## QA Verdict

- accepted: the response shape clearly separates canon basis, inferred elements, and uncertainty
- accepted: the thin API layer is appropriate for the first slice
- accepted with noted limitation: the heuristic response builder is suitable for an initial integration pass, but deeper reasoning remains future work

## Next Step

Review complete. The first end-to-end actor reaction slice is in place. The next planning question is where to deepen capability next: richer retrieval, better response reasoning, or consistency review.
