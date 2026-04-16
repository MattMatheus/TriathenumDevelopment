# Story: WorldForge Auth And RBAC Hardening Follow-Ups

## Metadata
- `id`: STORY-20260415-worldforge-auth-and-rbac-hardening-followups
- `owner_role`: Software Engineer
- `status`: intake
- `source`: planning
- `decision_refs`: [PLAN-2026-04-15-worldforge-security-hardening-sprint, ARCH-20260414-worldforge-v1-platform-and-domain-architecture]
- `success_metric`: Auth and collaboration behavior are explicitly documented and enforced, and the auth/session path avoids avoidable per-request overhead.
- `release_scope`: deferred

## Problem Statement

The current auth model still carries product ambiguity around collaborator edit rights, and session resolution does more work than necessary on every authenticated request. These are not immediate release blockers, but they are visible debt with product and scaling consequences.

## Scope
- In:
  - document the intended RBAC matrix for owner and collaborator actions
  - align server enforcement with the approved RBAC decision
  - reduce auth/session lookup overhead with a bounded cache or equivalent approach
- Out:
  - third-party identity providers
  - multi-tenant auth
  - large-scale auth-store redesign

## Assumptions

- the owner/collaborator model remains the intended v1 role set
- an ADR or equivalent decision update may be needed before code changes

## Acceptance Criteria
1. The intended RBAC matrix is explicit in the relevant decision or story artifact.
2. Server-side auth enforcement matches the approved RBAC behavior.
3. Session resolution avoids repeated full account-session scans on every request.

## Validation
- Required checks:
  - `pnpm run typecheck`
  - `pnpm run test`
  - targeted auth and permission tests
- Additional checks:
  - lightweight performance comparison or profiling note

## Dependencies

- `STORY-20260414-worldforge-phase1-auth-visibility-and-session-baseline`

## Risks

- behavior changes here can surprise existing collaborator workflows
- caching correctness matters more than speed if both cannot be improved at once

## Open Questions

- whether this story needs a prior architecture decision update before implementation

## Next Step

Hold for PM refinement after the immediate security baseline work is complete.
