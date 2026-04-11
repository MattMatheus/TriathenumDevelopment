# Story: Typed API Contracts For First Workflow

## Metadata
- `id`: STORY-20260411-typed-api-contracts
- `owner_role`: Software Architect
- `status`: done
- `source`: planning
- `decision_refs`: [ARCH-20260411-first-system-slice]
- `success_metric`: The first actor-reaction workflow has typed request and response contracts that can be shared by UI, service, and tests.
- `release_scope`: n/a

## Problem Statement

The architecture defines the first workflow boundaries, but engineering should not begin implementation without stable contracts for the request, grounding bundle, and reaction response shapes.

## Scope
- In:
  - define initial TypeScript types or schemas for `EntityRef`, `NoteRef`, `GroundingBundle`, and `ReactionResponse`
  - use plain TypeScript types only for the first slice
  - define the request shape for the actor-reaction workflow
  - place the shared contracts in an importable location under `Source/`
- Out:
  - full retrieval implementation
  - UI polish
  - provider-specific model integration details

## Assumptions

- the first implementation slice will use a TypeScript-first stack
- contracts should be reusable by both application code and tests

## Acceptance Criteria
1. Shared contracts exist for the first workflow request and response boundaries.
2. The contract set covers actor selection, decision prompt input, grounding output, and normalized reaction output.
3. The contract location supports import by both backend and frontend code.

## Validation
- Required checks: typecheck for the chosen TypeScript project structure
- Additional checks: contract-focused unit tests if a validation framework is present

## Dependencies

- `ARCH-20260411-first-system-slice`

## Risks

- over-modeling before implementation starts
- creating contracts that are too UI-specific or too storage-specific

## Open Questions

- resolved: use plain TypeScript types only for the first slice and defer runtime schema validation until a real boundary need appears

## Implementation Summary

- added a minimal TypeScript project scaffold in `Source/`
- added shared workflow-oriented contracts under `Source/contracts/actor-reaction.ts`
- added a barrel export in `Source/contracts/index.ts` for later UI and service imports

## Validation Results

- implemented contract module and local `typecheck` script in `Source/package.json`
- ran `pnpm run typecheck` successfully in `Source/`

## Open Risks

- the eventual compiler configuration may need small adjustments once the first app and service modules exist
- some contract names or field shapes may still shift slightly when retrieval code touches real vault data

## QA Focus

- confirm the contracts are shallow and workflow-oriented rather than prematurely domain-heavy
- confirm plain TypeScript types are sufficient for the current local-first boundary
- confirm `Source/contracts` is the right shared import surface for the next stories

## QA Verdict

- accepted: the contract set is shallow, shared, and appropriate for the first slice
- accepted: plain TypeScript types are sufficient for the current local-first boundary
- accepted: `Source/contracts` is the correct shared import surface for the next stories

## Next Step

Review complete. Retrieval and UI work can now depend on this shared contract surface.
