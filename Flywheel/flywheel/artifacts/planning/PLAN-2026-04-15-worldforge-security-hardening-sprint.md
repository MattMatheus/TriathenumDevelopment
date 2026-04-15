# Plan: WorldForge Security Hardening Sprint

## Context

Claude review findings were validated against the current `Source/` implementation on 2026-04-15. Several high-confidence issues are actionable without architecture discovery:

- session tokens are exposed through `localStorage` and `?sessionToken=` URLs
- media asset paths are not constrained to the world root
- JSON request bodies and base64 media uploads have no size limits
- AI provider secrets are stored on disk in plaintext
- AI settings management is not owner-restricted
- Docker and UI defaults still normalize unsafe owner bootstrap credentials for non-local use

The review also surfaced lower-priority but still actionable follow-up work:

- replace the custom frontmatter parser with a supported YAML library
- clarify and codify the intended RBAC model and reduce auth/session lookup inefficiency

## Goal

Create bounded engineering stories for the validated findings, then execute one focused sprint that closes the highest-confidence security baseline gaps in a single Flywheel cycle.

## Scope Boundary

- In scope for the immediate sprint:
  - session-token transport and storage hardening
  - path containment for static assets and world media
  - request and upload size limits
  - owner-only AI settings management plus secret-at-rest hardening
  - non-local default-credential safeguards
- Out of scope for the immediate sprint:
  - RBAC product redesign
  - session-cache performance refactor
  - real AI provider integration
  - broad frontend decomposition

## Assumptions

- the app remains same-origin in the current deployment model, so HttpOnly cookies can carry authenticated media requests without query-string tokens
- AI settings secrets still need to be configurable through the app for local self-hosting, so encryption-at-rest is preferable to simply dropping the field
- one focused engineering cycle should batch the security baseline fixes because they touch the same auth/server/settings surfaces and benefit from shared regression coverage

## Risks

- cookie-only media access may reveal implicit dependencies on the header token fallback
- encrypting stored AI secrets introduces migration behavior that must preserve existing settings files
- tightening bootstrap behavior must avoid breaking local smoke-test ergonomics on `127.0.0.1`
- parser migration remains important but is better separated to reduce regression surface in this sprint

## Intake Artifacts Created

- `flywheel/backlog/engineering/intake/STORY-20260415-worldforge-security-baseline-hardening.md`
- `flywheel/backlog/engineering/intake/STORY-20260415-worldforge-frontmatter-yaml-library-migration.md`
- `flywheel/backlog/engineering/intake/STORY-20260415-worldforge-auth-and-rbac-hardening-followups.md`

## Recommended Next Stage

- immediate execution path: promote `STORY-20260415-worldforge-security-baseline-hardening` to engineering `active`
- follow-up queue path: keep the parser migration and RBAC/auth follow-up stories in intake for later PM refinement
