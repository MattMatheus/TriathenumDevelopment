# Architecture Story: WorldForge Owner Collaborator RBAC Decision

## Metadata
- `id`: ARCH-20260415-worldforge-owner-collaborator-rbac-decision
- `owner_role`: Software Architect
- `status`: done
- `source`: pm
- `decision_refs`: [PLAN-2026-04-15-worldforge-security-hardening-sprint, ARCH-20260414-worldforge-v1-platform-and-domain-architecture]
- `decision_owner`: Software Architect
- `success_metric`: A reviewed decision makes owner and collaborator permissions explicit for entity visibility, edit rights, account management, and AI settings so follow-on engineering can enforce one stable RBAC model.

## Decision Scope

Define the intended v1 RBAC contract for the existing owner and collaborator roles, with emphasis on:

- who can view and edit entities at each visibility level
- who can create new entities and what visibility they may assign
- who can provision accounts and manage AI settings
- which current server behaviors are intended policy versus implementation accidents

## Problem Statement

The current server implementation already enforces a coarse owner/collaborator split, but the product contract is not explicit enough to tell whether those behaviors are intentional. The open engineering follow-up mixes policy clarification, permission enforcement, and session performance work into one story. That creates avoidable risk: engineering could lock in the wrong collaborator behavior while "hardening" it.

The immediate need is a bounded decision that turns the current implicit RBAC model into an explicit contract before the implementation follow-up is promoted.

## Inputs
- Existing decisions:
  - [ARCH-20260414-worldforge-v1-platform-and-domain-architecture](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/architecture/done/ARCH-20260414-worldforge-v1-platform-and-domain-architecture.md)
  - [PLAN-2026-04-15-worldforge-security-hardening-sprint](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/artifacts/planning/PLAN-2026-04-15-worldforge-security-hardening-sprint.md)
- Existing architecture artifacts:
  - coarse-grained auth guidance in the v1 platform decision
- Constraints:
  - keep the v1 role set limited to owner and collaborator
  - preserve the simple self-hosted, owner-managed invite model
  - avoid expanding into external identity or multi-tenant policy work

## Outputs Required
- Decision updates:
  - explicit RBAC matrix for owner and collaborator actions
  - explicit visibility/edit policy for `all_users`, `owner_only`, and `hidden`
  - explicit guidance on account management and AI settings ownership
- Architecture artifacts:
  - this architecture story as the primary review surface
  - clear implementation guidance for the follow-on auth/RBAC engineering story
- Risks and tradeoffs:
  - collaboration flexibility versus owner control
  - simplicity versus future extensibility
  - policy stability versus preserving accidental current behavior

## Alternatives Considered

- codifying the current implementation exactly as-is without an explicit reviewable decision
- broadening collaborator permissions to owner-only and hidden content in v1
- delaying the RBAC clarification until a larger auth redesign

## Architecture Decision

Keep the v1 role model deliberately coarse-grained:

- `owner` is the administrative and canon-governance role
- `collaborator` is a contributing author role for shared, non-restricted content

This decision accepts the current two-role model and makes the intended behavior explicit rather than expanding into a richer permission system.

### RBAC Matrix

#### Entity Visibility

- owner:
  - may view `all_users`, `owner_only`, and `hidden`
  - may edit `all_users`, `owner_only`, and `hidden`
  - may assign `all_users`, `owner_only`, and `hidden`
- collaborator:
  - may view `all_users` only
  - may edit `all_users` only
  - may assign `all_users` only

#### Entity Creation And Media

- owner:
  - may create entities at any visibility level
  - may attach media to any entity they can edit
- collaborator:
  - may create new shared entities only when those entities remain `all_users`
  - may attach media only to `all_users` entities they are allowed to edit

#### Administrative Surfaces

- owner:
  - may provision collaborator accounts
  - may list account details
  - may read and mutate AI settings
- collaborator:
  - may not provision accounts
  - may not view account provisioning details
  - may not mutate AI settings
  - may continue to see only the limited session and product state required to use the shared workspace

### Intended Policy Versus Accidental Behavior

The following current behaviors are now intentional v1 policy:

- collaborators editing only `all_users` entities
- collaborators being unable to assign `owner_only` or `hidden`
- owner-only control of account provisioning
- owner-only control of AI settings

The system should not broaden collaborator access to `owner_only` or `hidden` in v1. Those visibilities are reserved for owner-governed or private working material.

### Why This Decision

- it matches the broader architecture guidance to keep access control coarse-grained in v1
- it preserves the owner-managed operating model already chosen for self-hosted deployment
- it avoids inventing a more granular permission matrix before the collaboration workflow is better validated
- it keeps the meaning of restricted visibility simple for users and implementation alike

### Tradeoffs

- collaborators remain more limited than they might be in a richer team model
- owner-only and hidden content become governance tools rather than shared drafting spaces
- the system gains clarity and lower implementation risk at the cost of reduced flexibility

This is acceptable for v1 because the product is still optimizing for simple self-hosted operation and a small creative team with one accountable owner.

## Operational Impact

- clarifies what behavior QA and engineering should treat as regressions
- reduces risk of surprising collaborator workflows during auth hardening
- keeps future performance work separate from unresolved product-policy questions
- keeps onboarding and support simpler because restricted visibility has one clear owner-governed meaning
- provides an explicit contract for browser copy, tests, and permission error paths

## Risks And Mitigations

- risk: collaborators may expect to help draft restricted material
  - mitigation: keep restricted visibilities owner-only in v1 and revisit only when there is real pressure for a richer permission model
- risk: engineering could still partially enforce the decision and leave inconsistent edge cases
  - mitigation: the follow-on engineering story should add targeted permission tests around entity save, media attach, AI settings, and account-management paths
- risk: session performance work could obscure the policy change surface
  - mitigation: keep the implementation story explicitly dependent on this decision and treat caching as separate from RBAC semantics

## Follow-On Implementation Paths

1. Refine and promote [STORY-20260415-worldforge-auth-and-rbac-hardening-followups](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/engineering/intake/STORY-20260415-worldforge-auth-and-rbac-hardening-followups.md) with this decision as an explicit dependency.
2. Verify server enforcement and tests align with the approved matrix for:
   - entity read/edit rules
   - visibility assignment
   - media attachment
   - account provisioning surfaces
   - AI settings ownership
3. Implement a bounded session lookup optimization without changing the approved role semantics.

## Acceptance Criteria
1. The v1 owner/collaborator RBAC matrix is explicit and reviewable.
2. The decision states which current permission behaviors are intended to remain and which should change.
3. The follow-on engineering story can reference this decision without rediscovering the product policy.

## Review Focus

- does the decision keep access control coarse-grained enough for v1 simplicity
- does it make entity visibility and edit rights unambiguous for both roles
- does it preserve owner-managed operation without over-expanding scope

## Next Step

Architecture QA accepted this decision. PM/engineering can now promote the follow-on auth hardening story with the policy ambiguity removed.

## Architecture Handoff

- `Architecture decision`: keep the v1 RBAC model coarse-grained, with collaborators limited to shared `all_users` content and owners retaining all restricted visibility and administrative controls.
- `Alternatives considered`: preserve current behavior without a written decision, broaden collaborator access to restricted content, or defer the question until a larger auth redesign.
- `Key risks`: collaborator expectations may outgrow the coarse model, engineering might enforce the matrix inconsistently, and performance work could blur policy boundaries if not kept separate.
- `Follow-on implementation paths`: tighten the auth/RBAC engineering story around enforcement plus session lookup optimization, with targeted permission coverage for every affected surface.
- `Next state recommendation`: move to `architecture/qa`.

## Architecture QA Verdict

- passed: move to `done`

## Architecture QA Evidence Summary

- reviewed the decision against all three acceptance criteria
- confirmed the RBAC matrix is explicit for entity visibility, edit rights, account provisioning, and AI settings ownership
- confirmed the approved policy matches the current coarse-grained implementation in:
  - [auth-service.ts](/Users/foundry/TriathenumDevelopment/Source/server/auth-service.ts)
  - [world-browser-service.ts](/Users/foundry/TriathenumDevelopment/Source/server/world-browser-service.ts)
  - [world-browser-service.test.ts](/Users/foundry/TriathenumDevelopment/Source/server/world-browser-service.test.ts)
- confirmed the follow-on engineering story now depends on this decision and no longer tries to define policy itself

## Architecture QA Defects

- none

## Required Fixes

- none

## Evidence Quality Call

- strong enough for architecture acceptance

## Architecture QA State Recommendation

- move to `done`

## Intake Promotion Checklist
- [x] Decision scope is explicit and bounded.
- [x] Problem statement explains why the decision is needed now.
- [x] Inputs are listed and available.
- [x] Outputs are concrete and reviewable.
- [x] Alternatives and operational impact are explicit.
- [x] Follow-on implementation work is split out when needed.
