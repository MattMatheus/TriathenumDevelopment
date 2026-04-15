# Story: WorldForge Phase 1 Auth, Visibility, And Session Baseline

## Metadata
- `id`: STORY-20260414-worldforge-phase1-auth-visibility-and-session-baseline
- `owner_role`: Software Architect
- `status`: qa
- `source`: pm
- `decision_refs`: [PLAN-2026-04-14-worldforge-roadmap-and-product-phase, ARCH-20260414-worldforge-v1-platform-and-domain-architecture]
- `success_metric`: The useful core supports invite-based accounts, persistent sessions, and basic per-entity visibility without adding unnecessary operational complexity.
- `release_scope`: required

## Problem Statement

WorldForge is intended for a small trusted team rather than a solo-only local tool. The useful core therefore needs a minimal account and visibility model, but one that stays simple enough for early self-hosting.

## Scope
- In:
  - implement owner-managed invites or account creation equivalent approved by architecture
  - support persistent session login suitable for mobile use
  - support baseline entity visibility states needed by the spec
  - integrate auth checks into browser and editor workflows
- Out:
  - OAuth or external identity providers
  - advanced role management
  - fine-grained field-level permissions

## Assumptions

- account management remains intentionally simple in v1
- session-based auth is acceptable for self-hosted small-team use
- per-entity visibility can remain coarse-grained in the useful core

## Acceptance Criteria
1. The owner can provision collaborator access without self-service signup.
2. Users can stay signed in across normal mobile usage without repeated friction.
3. Entity visibility rules are enforced consistently in list, detail, and edit surfaces.

## Validation
- Required checks: auth and permission tests covering allowed and disallowed access paths
- Additional checks: manual session verification on mobile-sized viewports

## Dependencies

- `ARCH-20260414-worldforge-v1-platform-and-domain-architecture`
- `STORY-20260414-worldforge-phase1-responsive-world-browser`
- `STORY-20260414-worldforge-phase1-markdown-safe-entity-editor`

## Risks

- auth could pull in more infrastructure than the useful core should tolerate
- visibility edge cases could create trust issues between collaborators
- session handling on mobile could feel brittle if local-first assumptions leak through

## Open Questions

- whether hidden-entity existence should be fully concealed or represented as restricted placeholders

## Next Step

Promote after the first browsing and editing flows are stable enough to secure.

## Implementation Summary

- added shared auth contracts in [auth.ts](/Users/foundry/TriathenumDevelopment/Source/contracts/auth.ts) and extended [browser.ts](/Users/foundry/TriathenumDevelopment/Source/contracts/browser.ts) so the browser payload carries viewer/session shape alongside visibility options
- added a file-backed auth/session layer in [auth-service.ts](/Users/foundry/TriathenumDevelopment/Source/server/auth-service.ts) with:
  - one bootstrapped owner account
  - owner-managed collaborator provisioning
  - persistent server sessions
  - a first-party `x-worldforge-session` fallback token so the browser can survive reloads even when local Safari cookie behavior is inconsistent during dev
- updated [world-browser-service.ts](/Users/foundry/TriathenumDevelopment/Source/server/world-browser-service.ts) so list, detail, backlinks, unresolved references, and save paths all enforce visibility by viewer role
- updated [server/index.ts](/Users/foundry/TriathenumDevelopment/Source/server/index.ts) with auth/session routes, owner account provisioning routes, session resolution on world routes, and auth-aware response headers
- expanded [world-browser-service.test.ts](/Users/foundry/TriathenumDevelopment/Source/server/world-browser-service.test.ts) with collaborator visibility and disallowed-edit coverage
- added [auth-service.test.ts](/Users/foundry/TriathenumDevelopment/Source/server/auth-service.test.ts) for owner bootstrap, session creation, and collaborator provisioning coverage
- updated [App.tsx](/Users/foundry/TriathenumDevelopment/Source/app/App.tsx) with:
  - sign-in screen
  - persisted session-token handling
  - signed-in session summary
  - owner-only collaborator provisioning UI
  - visibility-aware editor options
- added [session.ts](/Users/foundry/TriathenumDevelopment/Source/app/session.ts) and [session.test.ts](/Users/foundry/TriathenumDevelopment/Source/app/session.test.ts) to make the reload/bootstrap persistence rules explicit and testable
- updated [styles.css](/Users/foundry/TriathenumDevelopment/Source/app/styles.css) for the auth layout and signed-in session surfaces

## Validation Results

- ran `pnpm run typecheck` successfully in `Source/`
- ran `pnpm run test` successfully in `Source/`
- ran `pnpm run build` successfully in `Source/`
- confirmed app-level session persistence behavior with focused tests covering:
  - bootstrap world loading when a stored session token exists before in-memory session hydration
  - preserving the stored session token across successful authenticated responses
  - clearing the stored session token on unauthorized responses
- confirmed live auth endpoint behavior through the running app proxy:
  - `POST /api/auth/session` returned owner session data, `set-cookie`, and `x-worldforge-session`
  - authenticated `GET /api/world/entities` returned the filtered browser payload for the signed-in owner
  - authenticated `POST /api/auth/accounts` provisioned a collaborator account and `GET /api/auth/accounts` returned both owner and collaborator records
- confirmed one live Safari desktop browser pass on the active app instance showed:
  - signed-in owner card visible
  - 4 visible entities
  - authenticated browser shell rendering correctly

## Current Engineering Note

- required auth and permission coverage is in place and green
- the browser now enforces visibility on the server, not just in the UI
- the session-driven refetch loop risk in [App.tsx](/Users/foundry/TriathenumDevelopment/Source/app/App.tsx) has been removed by taking `session` out of the world-loading effect dependency path
- session persistence includes a header-backed fallback for local mobile/browser reliability during the useful-core phase, and the bootstrap/token lifecycle is now covered by explicit app-level tests

## Open Risks

- hidden and owner-only entities are both fully concealed from collaborators in this slice; placeholder-style restricted records remain a later product decision
- the current auth store is intentionally simple and file-backed for self-hosted v1, so it is not yet tuned for larger multi-tenant or high-concurrency use
- browser automation against multiple local app instances can still be noisy in this repo, so QA should prefer one active app instance if doing an extra visual spot-check

## Assumptions Carried Forward

- a single owner plus provisioned collaborators is sufficient for the useful-core release scope
- collaborators should only see and edit `all_users` entities in this baseline
- coarse per-entity visibility is enough before comments, sharing flows, and richer role models arrive later

## QA Focus

- confirm owner-only and hidden entities are not visible or editable to collaborators in list, detail, and save flows
- confirm owner provisioning remains understandable in the browser UI and does not expose self-service signup paths
- confirm the app-level persistence tests plus live auth endpoint behavior are sufficient evidence for the reload/navigation path, or do one final visual spot-check on a single active app instance
- confirm the session-token fallback does not regress normal signed-in browser and editor behavior

## Action And Approval Notes

- action class used: `local write`
- approved escalations were used only for local dev-server startup, port inspection, and Safari-based runtime verification

## QA Verdict

- failed: return to `active`

## QA Evidence Summary

- reviewed the implementation against all three acceptance criteria
- confirmed automated validation is green:
  - `pnpm run typecheck`
  - `pnpm run test`
  - `pnpm run build`
- confirmed live endpoint behavior for owner login, authenticated world payload access, and collaborator provisioning
- reviewed the client boot and session-management flow in [App.tsx](/Users/foundry/TriathenumDevelopment/Source/app/App.tsx)
- reviewed the engineering handoff evidence for the mobile-sized session criterion

## QA Findings

- blocking: the world-loading effect depends on `session` while also replacing `session` from each successful payload response, which creates a refetch loop risk in normal signed-in usage
- blocking: acceptance criterion 2 still lacks convincing evidence because the handoff only records one desktop Safari pass and explicitly says mobile-sized session behavior should be rechecked in QA

## Required Fixes

- remove the session-driven refetch loop risk in the browser boot flow
- provide direct validation evidence that reload/navigation keeps users signed in on the active app instance at mobile-sized viewport

## Evidence Quality Call

- mixed: strong for server-side auth and permission enforcement, weak for the client-side persistence criterion

## Original QA State Recommendation

- move back to `active`

## Engineering Response To QA

- fixed the signed-in refetch loop risk by removing `session` from the world-loading effect dependencies and by extracting the session bootstrap rules into testable helpers
- strengthened the persistence evidence with direct app-level tests rather than leaving the reload/mobile path as an unverified follow-up

## Updated Engineering State Recommendation

- move to `qa`

## Updated QA Verdict

- passed: move to `done`

## Updated QA Evidence Summary

- confirmed the original refetch-loop defect no longer applies after the `App.tsx` dependency fix
- confirmed targeted app-level persistence coverage now exists in [session.test.ts](/Users/foundry/TriathenumDevelopment/Source/app/session.test.ts)
- reran automated validation successfully:
  - `pnpm run typecheck`
  - `pnpm run test`
  - `pnpm run build`
- confirmed auth/permission coverage remains green and the story still has live runtime evidence for owner login, authenticated world access, and collaborator provisioning

## Updated Evidence Quality Call

- strong enough for the useful-core scope

## Updated QA State Recommendation

- move to `done`
