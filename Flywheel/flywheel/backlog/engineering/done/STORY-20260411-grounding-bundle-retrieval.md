# Story: Grounding Bundle Retrieval

## Metadata
- `id`: STORY-20260411-grounding-bundle-retrieval
- `owner_role`: Software Architect
- `status`: done
- `source`: planning
- `decision_refs`: [ARCH-20260411-first-system-slice]
- `success_metric`: The system can resolve one selected actor and assemble a reviewable grounding bundle from vault content and indexed search results.
- `release_scope`: n/a

## Problem Statement

The first product value depends on deterministic evidence assembly before any model reasoning occurs. Without a real grounding bundle path, the actor-reaction workflow cannot be trusted.

## Scope
- In:
  - actor resolution against vault notes
  - note retrieval through ObsidianMCP and indexed search
  - assembly of a compact grounding bundle with citations
  - deterministic ranking or selection rules for initial context gathering
- Out:
  - final UI rendering
  - autonomous note writes
  - multi-actor reasoning

## Assumptions

- the vault already contains enough actor and canon material to exercise a first retrieval pass
- deterministic retrieval is more important than maximal recall in the first slice

## Acceptance Criteria
1. A selected actor can be resolved to a primary note or explicit ambiguity result.
2. Retrieval produces a compact grounding bundle containing notes, facts, tensions, and unresolved questions.
3. Grounding output includes source note references suitable for later UI display.

## Validation
- Required checks: retrieval-focused automated tests against fixture notes or stable sample inputs
- Additional checks: manual inspection of grounding output against a known actor from the Triathenum vault

## Dependencies

- `ARCH-20260411-first-system-slice`
- `STORY-20260411-typed-api-contracts`

## Risks

- noisy retrieval from heterogeneous notes
- weak entity resolution when aliases are incomplete

## Open Questions

- what the first ranking heuristic should be when direct links and FTS results disagree

## Implementation Summary

- added a filesystem-backed vault reader under `Source/retrieval/file-system-vault.ts`
- added deterministic entity resolution and grounding bundle assembly under `Source/retrieval/grounding.ts`
- added retrieval helper types and text utilities under `Source/retrieval/types.ts` and `Source/retrieval/text.ts`
- added fixture-backed retrieval tests and sample vault notes under `Source/retrieval/__fixtures__/`
- added a retrieval export surface in `Source/retrieval/index.ts`

## Validation Results

- ran `pnpm run typecheck` successfully in `Source/`
- ran `pnpm run test` successfully in `Source/`
- validated retrieval behavior with fixture coverage for:
  - exact actor resolution
  - not-found handling
  - deterministic grounding bundle assembly with citations
- manually confirmed that `Eliana Tanaka` and related council canon exist in the live Triathenum vault, though direct execution of the retrieval module against the live vault was blocked by local TypeScript runner sandbox behavior

## Open Risks

- the current retrieval path is filesystem-backed and deterministic, but it does not yet use ObsidianMCP or SQLite FTS5
- ranking is intentionally simple and may need refinement once we compare direct links against broader search results on real vault data
- relationship extraction is conservative and link-driven rather than semantically rich

## QA Focus

- confirm the retrieval module is appropriately deterministic for the first slice
- confirm the filesystem-backed approach is an acceptable first adapter before ObsidianMCP and index integration
- confirm the grounding bundle shape is practical for the upcoming actor-reaction workflow

## QA Verdict

- accepted: the retrieval layer is deterministic and grounded enough for the first slice
- accepted: the filesystem-backed adapter is a reasonable initial step before ObsidianMCP and SQLite integration
- accepted: the grounding bundle shape is suitable for the current actor-reaction workflow

## Next Step

Review complete. The app shell and actor-reaction workflow can build against this retrieval surface.
