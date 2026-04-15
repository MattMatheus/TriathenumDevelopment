# Story: WorldForge Phase 2 AI Provider And Context Baseline

## Metadata
- `id`: STORY-20260414-worldforge-phase2-ai-provider-and-context-baseline
- `owner_role`: Product Manager
- `status`: ready
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
