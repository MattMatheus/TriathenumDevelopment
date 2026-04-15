# Story: WorldForge Phase 2 AI Provider And Context Baseline

## Metadata
- `id`: STORY-20260414-worldforge-phase2-ai-provider-and-context-baseline
- `owner_role`: Product Manager
- `status`: done
- `source`: pm
- `decision_refs`: [PLAN-2026-04-14-worldforge-roadmap-and-product-phase, ARCH-20260414-worldforge-v1-platform-and-domain-architecture]
- `success_metric`: WorldForge can configure optional AI backends and inject stable world context into AI workflows without making AI infrastructure mandatory for baseline app operation.
- `release_scope`: deferred

## Problem Statement

Phase 2 needs a clean AI entry point before individual AI features can ship. Without a bounded provider and context baseline, each future AI workflow would risk inventing its own configuration model, prompt scaffolding, and approval semantics.

## Scope
- In:
  - define the application-level provider abstraction for hosted, local, and MCP-mediated AI backends
  - add settings and storage for provider selection, credentials or endpoints, and model choice
  - define the shared world-context payload used by AI workflows
  - ensure AI remains optional at runtime and disabled when unconfigured
- Out:
  - semantic retrieval implementation
  - generation UX
  - vector-store optimization

## Assumptions

- the provider boundary from the accepted architecture is sufficient to avoid a separate architecture round
- users may want hosted or local AI, but neither should be required for normal app operation
- shared world-context injection should be defined once and reused across later AI workflows

## Acceptance Criteria
1. The app supports a stable provider abstraction that can represent hosted, local, and MCP-style AI backends.
2. AI settings are configurable without making unconfigured installs fail or degrade the useful core.
3. A shared world-context payload exists for later AI workflows and includes explicit guardrails around canon and approval.

## Validation
- Required checks: provider configuration tests, unconfigured-runtime smoke test, and shared prompt-context contract tests
- Additional checks: manual verification that the app behaves cleanly when AI is disabled

## Dependencies

- `ARCH-20260414-worldforge-v1-platform-and-domain-architecture`
- completion of the Phase 1 useful-core backbone

## Risks

- provider configuration could sprawl into an over-engineered abstraction
- secret handling could become messy if mixed directly into feature-specific flows
- MCP support could distort the baseline abstraction before core paths are validated

## Open Questions

- whether MCP should be treated as a peer provider surface or an advanced adapter layered later

## Next Step

Promote after Phase 1 is stable enough to host optional AI configuration without distracting from core adoption.

## Implementation Summary

- added shared AI contracts in [ai.ts](/Users/foundry/TriathenumDevelopment/Source/contracts/ai.ts) and exported them through [index.ts](/Users/foundry/TriathenumDevelopment/Source/contracts/index.ts) so provider configuration and world-context payloads have one stable application surface
- added [ai-service.ts](/Users/foundry/TriathenumDevelopment/Source/server/ai-service.ts) with:
  - a file-backed AI settings store under the existing local `.worldforge` area
  - a provider abstraction that can represent disabled, hosted, local, and MCP-mediated backends
  - validation rules that keep AI optional while rejecting incomplete enabled-provider setups
  - a shared world-context payload that combines provider status, visible world metadata, optional selected-entity context, and explicit canon/approval guardrails
- updated [server/index.ts](/Users/foundry/TriathenumDevelopment/Source/server/index.ts) with:
  - `GET /api/ai/settings`
  - `PUT /api/ai/settings`
  - `GET /api/ai/context`
- updated [App.tsx](/Users/foundry/TriathenumDevelopment/Source/app/App.tsx) with an `AI Baseline` panel that:
  - exposes optional provider configuration without blocking the rest of the app
  - keeps hosted/local/MCP fields bounded to the selected provider kind
  - shows whether a hosted API key is already configured without echoing the secret back into the UI
  - previews the shared world-context contract and selected-entity subject payload
- added [ai-service.test.ts](/Users/foundry/TriathenumDevelopment/Source/server/ai-service.test.ts) covering disabled-runtime behavior, provider configuration persistence/validation, and shared context payload guardrails

## Validation Results

- ran `pnpm test` successfully in `Source/`
- ran `pnpm typecheck` successfully in `Source/`
- ran `pnpm build` successfully in `Source/`
- confirmed required provider configuration coverage with tests for:
  - default disabled runtime behavior
  - valid hosted provider persistence
  - invalid incomplete provider rejection
- confirmed the shared prompt-context contract coverage with tests for:
  - explicit approval and citation guardrails
  - selected-entity context payload composition
  - provider-disabled scaffold behavior
- confirmed unconfigured-runtime smoke coverage by keeping the default provider state as `disabled` and verifying the app/server continue to load AI settings and context successfully without any configured backend

## Current Engineering Note

- AI infrastructure is now present as an optional product seam rather than a hard dependency
- provider setup is intentionally narrow for this phase: one selected baseline provider plus bounded fields, not a full multi-provider orchestration layer
- the world-context payload is defined once and already includes explicit approval/citation rules so later AI workflows can reuse it instead of inventing their own prompt scaffolding

## Open Risks

- secrets are still stored in the local file-backed settings area for this self-hosted baseline, so stronger secret management can remain a later hardening pass
- MCP is represented as a first-class provider kind in the baseline contract, but actual MCP tool execution remains future work
- the current UI surfaces a context contract preview rather than a full AI workflow, so QA should validate both the disabled path and one configured-path save to ensure the baseline feels clear

## Assumptions Carried Forward

- a single selected provider baseline is sufficient before feature-specific AI workflows ship
- explicit human approval remains required before any canon-changing write, regardless of provider kind
- visible world/entity context is the correct shared substrate for later AI features

## QA Focus

- confirm the app remains fully usable when the provider kind stays `disabled`
- confirm hosted provider setup requires endpoint, model, and API key while local and MCP setups enforce their own narrower required fields
- confirm the AI Baseline panel updates cleanly when switching provider kinds and does not expose a previously saved hosted API key value
- confirm the shared world-context preview reflects the selected entity and keeps approval/citation guardrails explicit

## Action And Approval Notes

- action class used: `local write`
- no risky-write or sensitive/production approval was required in this engineering pass

## QA Verdict

- passed: move to `done`

## QA Evidence Summary

- reviewed the implementation against all three acceptance criteria in [ai.ts](/Users/foundry/TriathenumDevelopment/Source/contracts/ai.ts), [ai-service.ts](/Users/foundry/TriathenumDevelopment/Source/server/ai-service.ts), [index.ts](/Users/foundry/TriathenumDevelopment/Source/server/index.ts), and [App.tsx](/Users/foundry/TriathenumDevelopment/Source/app/App.tsx)
- confirmed automated validation is green:
  - `pnpm test`
  - `pnpm typecheck`
  - `pnpm build`
- confirmed focused AI baseline coverage exists in [ai-service.test.ts](/Users/foundry/TriathenumDevelopment/Source/server/ai-service.test.ts) for:
  - default disabled-provider behavior
  - hosted provider persistence and configured-status reporting
  - incomplete provider rejection
  - shared world-context payload guardrails and selected-entity context composition
- reviewed the provider abstraction directly and confirmed the contract and server logic represent disabled, hosted, local, and MCP-style providers without making the baseline app path depend on any configured AI backend

## QA Findings

- no blocking functional defects found in the reviewed implementation

## Evidence Quality Call

- strong enough for the deferred Phase 2 baseline scope

## QA Risks And Gaps

- a live manual disabled-runtime smoke pass could not be executed inside this sandbox because local listeners are blocked with `EPERM`, so runtime-disabled-path evidence remains automated plus code-review based in this QA pass
- automated provider validation is strongest on the hosted success path; local and MCP positive-path behavior are still covered primarily by shared validation logic rather than dedicated success-path tests

## QA State Recommendation

- move to `done`
