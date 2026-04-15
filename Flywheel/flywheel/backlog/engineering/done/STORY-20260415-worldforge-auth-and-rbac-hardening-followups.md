# Story: WorldForge Auth And RBAC Hardening Follow-Ups

## Metadata
- `id`: STORY-20260415-worldforge-auth-and-rbac-hardening-followups
- `owner_role`: Software Engineer
- `status`: done
- `source`: planning
- `decision_refs`: [PLAN-2026-04-15-worldforge-security-hardening-sprint, ARCH-20260414-worldforge-v1-platform-and-domain-architecture]
- `success_metric`: Auth and collaboration behavior are explicitly documented and enforced, and the auth/session path avoids avoidable per-request overhead.
- `release_scope`: deferred

## Problem Statement

The current auth model still carries product ambiguity around collaborator edit rights, and session resolution does more work than necessary on every authenticated request. These are not immediate release blockers, but they are visible debt with product and scaling consequences. The policy ambiguity should be resolved explicitly before engineering hardens that behavior further.

## Scope
- In:
  - align server enforcement with the approved RBAC decision
  - reduce auth/session lookup overhead with a bounded cache or equivalent approach
- Out:
  - defining the RBAC policy itself
  - third-party identity providers
  - multi-tenant auth
  - large-scale auth-store redesign

## Assumptions

- the owner/collaborator model remains the intended v1 role set
- the follow-on implementation should wait for an explicit RBAC decision artifact

## Acceptance Criteria
1. Server-side auth enforcement matches the approved RBAC behavior.
2. Session resolution avoids repeated full account-session scans on every request.
3. Targeted auth and permission coverage protects the approved behavior from regression.

## Validation
- Required checks:
  - `pnpm run typecheck`
  - `pnpm run test`
  - targeted auth and permission tests
- Additional checks:
  - lightweight performance comparison or profiling note

## Dependencies

- `ARCH-20260415-worldforge-owner-collaborator-rbac-decision`
- `STORY-20260414-worldforge-phase1-auth-visibility-and-session-baseline`

## Risks

- behavior changes here can surprise existing collaborator workflows
- caching correctness matters more than speed if both cannot be improved at once

## Next Step

Cycle closed after QA acceptance and observer reporting.

## Implementation Summary

- kept the approved owner/collaborator RBAC model intact in [auth-service.ts](/Users/foundry/TriathenumDevelopment/Source/server/auth-service.ts) and [world-browser-service.ts](/Users/foundry/TriathenumDevelopment/Source/server/world-browser-service.ts)
- replaced the previous per-account session scan with a direct `lookupHash` session lookup path in [auth-service.ts](/Users/foundry/TriathenumDevelopment/Source/server/auth-service.ts), while preserving a compatibility fallback for sessions created before this change
- preserved owner-only account provisioning and collaborator visibility restrictions while making the session payload expectations explicit in tests
- added targeted auth regression coverage in [auth-service.test.ts](/Users/foundry/TriathenumDevelopment/Source/server/auth-service.test.ts) for collaborator session permissions and session resolution behavior

## Validation Results

- `pnpm run typecheck` passed
- `pnpm run test` passed
- focused validation also passed:
  - `pnpm exec vitest run server/auth-service.test.ts server/world-browser-service.test.ts`

## Open Risks

- older persisted sessions still depend on the compatibility fallback until they are refreshed through new logins
- the auth state remains file-backed, so very large account/session volumes would still justify a broader auth-store redesign later

## Assumptions Carried Forward

- the approved v1 RBAC decision remains: collaborators are limited to shared `all_users` content and owners retain restricted visibility plus administrative controls
- bounded session lookup improvement is sufficient here without redesigning the auth store format more broadly

## QA Focus

- verify collaborator sessions expose only `all_users` visibility options and no account-management capability
- verify owner account provisioning behavior remains owner-only
- verify session resolution and logout still work for newly created sessions and do not regress cookie-backed auth flows
- verify collaborator edit restrictions for `owner_only` content still hold

## Action And Approval Notes

- action class used: `local write`
- no risky-write or sensitive-production approval path was required for this cycle

## QA Verdict

- passed: move to `done`

## QA Evidence Summary

- reviewed all three acceptance criteria against the implementation and targeted regression coverage
- confirmed server-side RBAC enforcement remains aligned with the approved owner/collaborator decision
- confirmed session resolution no longer relies on the previous per-account scan path for newly created sessions
- confirmed targeted auth and permission coverage exists in [auth-service.test.ts](/Users/foundry/TriathenumDevelopment/Source/server/auth-service.test.ts) and [world-browser-service.test.ts](/Users/foundry/TriathenumDevelopment/Source/server/world-browser-service.test.ts)
- confirmed the required validation set completed successfully:
  - `pnpm run typecheck`
  - `pnpm run test`

## QA Defects

- none

## Required Fixes

- none

## Evidence Quality Call

- strong enough for this auth hardening cycle

## QA State Recommendation

- move to `done`
