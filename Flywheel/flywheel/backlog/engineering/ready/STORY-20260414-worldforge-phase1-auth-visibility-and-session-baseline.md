# Story: WorldForge Phase 1 Auth, Visibility, And Session Baseline

## Metadata
- `id`: STORY-20260414-worldforge-phase1-auth-visibility-and-session-baseline
- `owner_role`: Software Architect
- `status`: ready
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
