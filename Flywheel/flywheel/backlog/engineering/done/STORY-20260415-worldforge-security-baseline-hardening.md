# Story: WorldForge Security Baseline Hardening

## Metadata
- `id`: STORY-20260415-worldforge-security-baseline-hardening
- `owner_role`: Software Engineer
- `status`: done
- `source`: planning
- `decision_refs`: [PLAN-2026-04-15-worldforge-security-hardening-sprint, PLAN-2026-04-14-worldforge-roadmap-and-product-phase, ARCH-20260414-worldforge-v1-platform-and-domain-architecture]
- `success_metric`: Validated security hardening removes token leakage paths, constrains file access and request sizes, and hardens bootstrap and secret handling without regressing the useful core workflows.
- `release_scope`: required

## Problem Statement

The current useful-core implementation exposes authenticated session tokens through browser storage and URL query parameters, trusts unbounded user-controlled paths and request bodies in several server flows, persists AI provider secrets in plaintext, and still encourages unsafe default-owner bootstrap behavior for non-local runs.

## Scope
- In:
  - remove session-token query-string auth and client-side token persistence
  - keep authenticated browser and media flows working with cookie-based auth
  - constrain static asset and world media paths to their intended roots
  - add request-size limits for JSON bodies and media uploads
  - restrict AI settings read/write behavior to the owner where appropriate
  - encrypt stored AI provider API keys at rest and preserve existing settings behavior through migration
  - fail fast or block unsafe default owner credentials for non-local deployments
  - update affected UI copy and tests
- Out:
  - RBAC redesign beyond the current owner/collaborator model
  - session caching or auth-store performance optimization
  - real AI provider invocation
  - frontend architecture decomposition

## Assumptions

- same-origin cookie auth is acceptable for the current product deployment model
- bootstrap ergonomics for purely local development should remain intact on `127.0.0.1`
- settings-file migration can happen in place without a separate data-migration cycle

## Acceptance Criteria
1. Session handling no longer stores the raw auth token in browser storage or transmits it through media/download query parameters, and authenticated media loading still works in the app.
2. Static asset serving and world-media resolution reject any path that escapes the configured root, with regression tests covering traversal attempts.
3. JSON API routes and media upload flows reject oversized bodies with explicit limits and tests covering the failure path.
4. AI settings management and owner bootstrap behavior are hardened so that provider secrets are not stored in plaintext, non-owner viewers cannot mutate AI settings, and non-local default owner credentials are rejected.

## Validation
- Required checks:
  - `pnpm run typecheck`
  - `pnpm run test`
  - `pnpm run build`
  - targeted server and app tests for session, path, request-limit, and AI-settings behavior
- Additional checks:
  - focused manual login and media spot-check through the running app

## Dependencies

- `STORY-20260414-worldforge-phase1-auth-visibility-and-session-baseline`
- `STORY-20260414-worldforge-phase1-media-and-compose-baseline`
- `STORY-20260414-worldforge-phase2-ai-provider-and-context-baseline`

## Risks

- changing auth transport can regress media rendering or reload persistence if cookie handling is incomplete
- encryption-at-rest changes can strand existing AI settings if migration coverage is weak
- request-size limits can create false negatives if thresholds are chosen too aggressively

## Open Questions

- whether `GET /api/ai/settings` should remain owner-only or expose a masked read-only view to collaborators

## Next Step

QA should validate the hardened auth, path, request-limit, and AI-settings flows against the acceptance criteria.

## Implementation Summary

- removed client-side session-token persistence and query-string auth from the browser flow in [App.tsx](/Users/foundry/TriathenumDevelopment/Source/app/App.tsx) and [server/index.ts](/Users/foundry/TriathenumDevelopment/Source/server/index.ts), leaving cookie-based session handling as the authenticated path
- added bounded request-body handling and safe path-resolution helpers in [http-utils.ts](/Users/foundry/TriathenumDevelopment/Source/server/http-utils.ts), then wired those guards through the server routes
- hardened world-media path resolution in [file-system-world.ts](/Users/foundry/TriathenumDevelopment/Source/world/file-system-world.ts) so media assets cannot escape the world root
- restricted AI settings mutation to the owner in [server/index.ts](/Users/foundry/TriathenumDevelopment/Source/server/index.ts) and disabled the AI-settings form for collaborators in [App.tsx](/Users/foundry/TriathenumDevelopment/Source/app/App.tsx)
- encrypted stored AI provider API keys at rest in [ai-service.ts](/Users/foundry/TriathenumDevelopment/Source/server/ai-service.ts) while preserving `apiKeyConfigured` behavior for the UI
- added non-local bootstrap protection in [auth-service.ts](/Users/foundry/TriathenumDevelopment/Source/server/auth-service.ts) so default owner credentials are rejected when the server host is not local-only
- removed the obsolete session-storage helper files because the browser no longer stores the raw session token

## Validation Results

- `pnpm run typecheck` passed
- `pnpm run test` passed
- `pnpm run build` passed
- added targeted regression coverage in:
  - [http-utils.test.ts](/Users/foundry/TriathenumDevelopment/Source/server/http-utils.test.ts)
  - [ai-service.test.ts](/Users/foundry/TriathenumDevelopment/Source/server/ai-service.test.ts)
  - [auth-service.test.ts](/Users/foundry/TriathenumDevelopment/Source/server/auth-service.test.ts)
  - [file-system-world.test.ts](/Users/foundry/TriathenumDevelopment/Source/world/file-system-world.test.ts)
- completed a focused runtime pass against the local server confirming:
  - owner login still succeeds with the cookie-backed session
  - authenticated world-browser loading still works without token headers or query params
  - collaborator `PUT /api/ai/settings` now returns `403`
  - the stored AI settings file contains ciphertext metadata instead of the raw API key

## Open Risks

- AI secret-at-rest hardening now avoids plaintext storage, but the local fallback encryption key still lives on disk for self-hosted convenience and is not equivalent to external secret management
- unauthenticated browser loads now incur a single `401` bootstrap request before the sign-in screen settles, which is acceptable but worth keeping in mind if the shell grows more expensive
- the custom frontmatter parser remains in place and is tracked separately in `STORY-20260415-worldforge-frontmatter-yaml-library-migration`

## Assumptions Carried Forward

- same-origin cookie auth remains the intended deployment model for current browser and media flows
- collaborators may still view AI baseline metadata, but only the owner may change it
- request-size limits of 5 MB for standard JSON and 12 MB for media-upload JSON are appropriate for the current useful-core scope

## QA Focus

- verify sign-in, reload, and media rendering still work without any session token in browser storage or media URLs
- verify traversal attempts are rejected for both static assets and world media
- verify oversized JSON and media-upload requests fail explicitly rather than exhausting process memory
- verify collaborator AI-settings writes are rejected while owner saves still succeed
- verify non-local bootstrap with default owner credentials fails fast

## Action And Approval Notes

- action class used: `local write`
- no risky-write or sensitive-production approval path was required for this cycle

## QA Verdict

- passed: move to `done`

## QA Evidence Summary

- reviewed all four acceptance criteria against the implementation and handoff evidence
- confirmed targeted regression coverage exists for request limits, path containment, AI secret persistence, bootstrap safety, and world-media containment
- confirmed the full validation set completed successfully:
  - `pnpm run typecheck`
  - `pnpm run test`
  - `pnpm run build`
- confirmed the focused runtime pass covered the highest-risk behavioral paths:
  - cookie-backed owner login still succeeds
  - authenticated world loading still works after removing token headers and query params
  - collaborator AI-settings writes now return `403`
  - persisted AI settings no longer store the raw secret

## QA Defects

- none

## Required Fixes

- none

## Evidence Quality Call

- strong enough for this security-hardening cycle

## QA State Recommendation

- move to `done`
