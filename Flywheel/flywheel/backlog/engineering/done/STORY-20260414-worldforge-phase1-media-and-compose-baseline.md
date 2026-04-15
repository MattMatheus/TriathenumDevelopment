# Story: WorldForge Phase 1 Media And Compose Baseline

## Metadata
- `id`: STORY-20260414-worldforge-phase1-media-and-compose-baseline
- `owner_role`: Software Architect
- `status`: qa
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

## Implementation Summary

- added a portable media model to the shared world contracts in [world.ts](/Users/foundry/TriathenumDevelopment/Source/contracts/world.ts) and [browser.ts](/Users/foundry/TriathenumDevelopment/Source/contracts/browser.ts)
- updated [document.ts](/Users/foundry/TriathenumDevelopment/Source/world/document.ts) so entity markdown can round-trip `media` references in frontmatter without losing markdown ownership principles
- extended [file-system-world.ts](/Users/foundry/TriathenumDevelopment/Source/world/file-system-world.ts) with local media path generation and local file writes under a world-owned `media/` directory
- updated [world-browser-service.ts](/Users/foundry/TriathenumDevelopment/Source/server/world-browser-service.ts) to:
  - expose media metadata on entity detail payloads
  - attach uploaded files to existing entities
  - resolve attached media for authenticated serving
- updated [server/index.ts](/Users/foundry/TriathenumDevelopment/Source/server/index.ts) with:
  - media upload route
  - authenticated media file route
  - built-app static serving so the useful core can run as a single service in a compose deployment
- updated [App.tsx](/Users/foundry/TriathenumDevelopment/Source/app/App.tsx) and [styles.css](/Users/foundry/TriathenumDevelopment/Source/app/styles.css) with:
  - media attachment upload in the entity editor for saved entities
  - image/file rendering in entity detail
  - basic media cards and previews
- added deployment artifacts:
  - [Dockerfile](/Users/foundry/TriathenumDevelopment/Source/Dockerfile)
  - [.dockerignore](/Users/foundry/TriathenumDevelopment/Source/.dockerignore)
  - [docker-compose.yml](/Users/foundry/TriathenumDevelopment/docker-compose.yml)
  - [README.md](/Users/foundry/TriathenumDevelopment/README.md)

## Validation Results

- ran `pnpm run typecheck` successfully in `Source/`
- ran `pnpm run test` successfully in `Source/`
- ran `pnpm run build` successfully in `Source/`
- added and passed media-focused coverage in:
  - [document.test.ts](/Users/foundry/TriathenumDevelopment/Source/world/document.test.ts)
  - [world-browser-service.test.ts](/Users/foundry/TriathenumDevelopment/Source/server/world-browser-service.test.ts)
- confirmed host-side container validation with Podman:
  - containerized startup path was exercised on the host
  - `/health` was reachable after the container bind fix
  - media upload and open/render behavior was exercised end to end
  - follow-up routing and header issues discovered during that smoke test were fixed in [server/index.ts](/Users/foundry/TriathenumDevelopment/Source/server/index.ts)

## Current Engineering Note

- media attachments now live in a world-owned local filesystem path and are referenced from markdown by stable relative paths
- the useful core can be served by the API server from built app assets, which keeps the compose path to a single service and avoids optional AI infrastructure
- the editor currently supports attaching media only after an entity has been saved once, which keeps the storage convention simple for Phase 1

## Open Risks

- this slice does not yet support removing or reordering media assets
- image rendering in the browser still relies on the existing session mechanisms, so QA should confirm attached media loads cleanly in the normal signed-in flow
- compose provider differences between Docker Compose, Podman Compose, and direct Podman runs may still deserve one final QA sanity check on the target host workflow

## Assumptions Carried Forward

- basic existing-entity attachment flow is enough for the useful-core phase
- filesystem-backed media plus portable relative references is the right v1 tradeoff over object storage or CDN complexity
- a single-service compose deployment is acceptable for early self-hosted usage

## QA Focus

- confirm signed-in users can attach a basic image or file to an existing entity and then view/open it successfully
- confirm attached media respects the same entity visibility boundary as detail views
- confirm the built-app server path works as expected for the compose-oriented deployment flow
- review the compose and README docs for minimum useful-core setup clarity, especially that no AI infrastructure is required

## Action And Approval Notes

- action class used: `local write`
- no risky or production actions were performed

## QA Verdict

- passed: move to `done`

## QA Evidence Summary

- confirmed automated validation is green:
  - `pnpm run typecheck`
  - `pnpm run test`
  - `pnpm run build`
- confirmed media-focused automated coverage for document round-trip, attachment persistence, and authenticated media resolution
- confirmed host-side Podman verification:
  - containerized startup succeeded
  - `/health` responded
  - media upload and open/render succeeded end to end
- confirmed the deployment path remains useful-core only and does not require optional AI infrastructure

## Evidence Quality Call

- strong for the intended Phase 1 scope

## Next State Recommendation

- move to `done`
