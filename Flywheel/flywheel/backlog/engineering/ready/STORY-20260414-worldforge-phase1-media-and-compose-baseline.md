# Story: WorldForge Phase 1 Media And Compose Baseline

## Metadata
- `id`: STORY-20260414-worldforge-phase1-media-and-compose-baseline
- `owner_role`: Software Architect
- `status`: ready
- `source`: pm
- `decision_refs`: [PLAN-2026-04-14-worldforge-roadmap-and-product-phase, ARCH-20260414-worldforge-v1-platform-and-domain-architecture]
- `success_metric`: A self-hosted user can run the useful core with a simple local deployment path and attach media to world entities without breaking markdown ownership principles.
- `release_scope`: required

## Problem Statement

The useful core is not complete if it only works as a development artifact. Early users need a simple deployment path and the ability to attach images or files to entities without introducing proprietary storage or excessive infrastructure.

## Scope
- In:
  - support a local media storage path for entity attachments
  - surface media in entity views and editing workflows at a basic useful level
  - provide a straightforward Docker Compose path for local or home-server deployment
  - document the minimum configuration needed to run the useful core
- Out:
  - map pin authoring
  - advanced CDN or object storage support
  - production-hardening for large public deployments

## Assumptions

- local filesystem media is sufficient for Phase 1
- simple deployment is part of the product promise, not just an ops afterthought
- reverse proxy examples can remain documentation-level until later

## Acceptance Criteria
1. Users can attach and view basic media assets for entities using local storage.
2. The useful core can be launched through a simple Docker Compose workflow.
3. The deployment path does not require optional AI infrastructure to be present.

## Validation
- Required checks: local compose startup verification and basic media upload/render verification
- Additional checks: smoke test of a fresh setup using only documented minimum configuration

## Dependencies

- `ARCH-20260414-worldforge-v1-platform-and-domain-architecture`
- `STORY-20260414-worldforge-phase1-markdown-safe-entity-editor`
- `STORY-20260414-worldforge-phase1-auth-visibility-and-session-baseline`

## Risks

- deployment support could get deferred until too late and create a false sense of progress
- media paths could complicate markdown portability if not designed carefully
- compose setup could accidentally imply optional services are mandatory

## Open Questions

- whether file attachments and inline images should share one storage convention in Phase 1

## Next Step

Promote after the core browse, edit, and access patterns are validated.
