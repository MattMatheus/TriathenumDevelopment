# Story: WorldForge Developer And User Documentation Refresh

## Metadata
- `id`: STORY-20260415-worldforge-developer-and-user-documentation-refresh
- `owner_role`: Technical Writer
- `status`: qa
- `source`: pm
- `decision_refs`: [ARCH-20260414-worldforge-v1-platform-and-domain-architecture, ARCH-20260415-worldforge-owner-collaborator-rbac-decision, PLAN-2026-04-15-worldforge-documentation-refresh]
- `success_metric`: Developers and self-hosting users can set up, run, and understand the current WorldForge feature set from repo docs without relying on stale Phase 1-only or Docker-first guidance.
- `release_scope`: required

## Problem Statement

WorldForge now has accepted useful-core, optional AI collaboration, review, import/export, and navigation functionality, but the docs still mostly describe the earlier Phase 1 baseline. The root README uses Docker-first language even though this repo is operated with Podman, and there is no dedicated current user or developer guide for the shipped behavior.

## Scope
- In:
  - update the root README to reflect the shipped product surface and current local/container setup
  - add a developer-facing guide covering local setup, commands, test workflow, architecture seams, world data layout, and environment variables
  - add a user-facing guide covering authoring, browsing, permissions, AI review boundaries, and Phase 3 review/navigation workflows
  - align terminology around Podman, useful core, optional AI, owner/collaborator permissions, and markdown-first storage
- Out:
  - new application behavior
  - Phase 4 or other unshipped roadmap documentation
  - exhaustive API reference generation

## Assumptions

- the `done` engineering stories and accepted architecture decisions are the authoritative source for the current feature set
- it is acceptable to keep the compose filename as-is while documenting Podman as the intended operator command path
- first-pass docs should optimize for practical onboarding rather than full product-manual completeness
- the first-pass documentation surfaces should be:
  - root `README.md`
  - `docs/developer-guide.md`
  - `docs/user-guide.md`

## Acceptance Criteria
1. The root README accurately describes the current WorldForge product surface and local self-hosting path, with Podman-oriented instructions replacing Docker-first wording.
2. A developer-facing doc explains local setup, primary commands, test entry points, key environment variables, and the current app/server/world-data architecture in terms consistent with accepted Flywheel artifacts.
3. A user-facing doc explains the current workflows for browsing, editing, media, search/backlinks/stubs, permissions/visibility, optional AI features, and Phase 3 review/import/export/navigation surfaces without implying unshipped behavior.
4. Stale or conflicting documentation is removed or rewritten so the docs clearly distinguish required useful-core setup from optional AI configuration.

## Validation
- Required checks:
  - documentation read-through against the current `done` stories and architecture decisions
  - command and path sanity-check against repo artifacts such as `package.json`, `docker-compose.yml`, `Source/Dockerfile`, and existing script entry points
- Additional checks:
  - verify Podman-oriented examples map cleanly onto the current compose artifact and local runtime expectations
  - verify the new docs do not describe unshipped Phase 4 roadmap work

## Dependencies

- `ARCH-20260414-worldforge-v1-platform-and-domain-architecture`
- `ARCH-20260415-worldforge-owner-collaborator-rbac-decision`
- completed WorldForge Phase 1, Phase 2, and Phase 3 `done` stories

## Risks

- docs may drift into roadmap language if they are not tightly grounded in completed artifacts
- Podman-specific guidance could become misleading if it assumes compose behavior not validated by the current repo setup
- the first pass may reveal additional missing operational docs that should be split into follow-up stories

## Open Questions

- none for PM promotion; target surfaces are bounded for execution as `README.md`, `docs/developer-guide.md`, and `docs/user-guide.md`

## Next Step

- QA should validate the refreshed documentation against the current repo surface and accepted Flywheel artifacts.

## PM Handoff

- `What changed`: Promoted the documentation refresh into the engineering active queue with explicit target doc surfaces, Podman-first terminology, and validation guidance grounded in accepted Flywheel artifacts.
- `Why it matters`: The current docs underrepresent the shipped WorldForge surface and still lead operators toward Docker-first wording that does not match the repo's intended Podman workflow.
- `Acceptance criteria`: Refresh `README.md`; add `docs/developer-guide.md`; add `docs/user-guide.md`; keep useful-core and optional AI setup clearly separated; avoid roadmap drift.
- `Risks and assumptions`: The story must stay anchored to completed `done` work and current repo artifacts so the docs do not over-promise or describe container behavior that has not been validated.
- `Next state recommendation`: move to `engineering/active` as the next story because the active queue is currently empty.

## Implementation Summary

- refreshed [README.md](/Users/foundry/TriathenumDevelopment/README.md) to describe the shipped WorldForge surface across the useful core, optional AI workflows, and Phase 3 review/navigation tools
- replaced Docker-first operator wording in the root README with Podman-oriented compose instructions while still documenting the existing [docker-compose.yml](/Users/foundry/TriathenumDevelopment/docker-compose.yml) filename accurately
- added a developer-facing guide at [docs/developer-guide.md](/Users/foundry/TriathenumDevelopment/docs/developer-guide.md) covering local setup, primary commands, Podman workflow, environment variables, architecture seams, and validation entry points
- added a user-facing guide at [docs/user-guide.md](/Users/foundry/TriathenumDevelopment/docs/user-guide.md) covering roles, visibility, browse/edit flows, optional AI workflows, review/navigation tools, and export/import behavior
- kept the documentation grounded in accepted architecture and engineering `done` artifacts rather than deferred Phase 4 roadmap work

## Validation Results

- reviewed the new documentation against:
  - [ARCH-20260414-worldforge-v1-platform-and-domain-architecture](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/architecture/done/ARCH-20260414-worldforge-v1-platform-and-domain-architecture.md)
  - [ARCH-20260415-worldforge-owner-collaborator-rbac-decision](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/backlog/architecture/done/ARCH-20260415-worldforge-owner-collaborator-rbac-decision.md)
  - completed Phase 1, Phase 2, and Phase 3 WorldForge engineering stories in `flywheel/backlog/engineering/done`
- sanity-checked commands and runtime details against current repo artifacts:
  - [Source/package.json](/Users/foundry/TriathenumDevelopment/Source/package.json)
  - [docker-compose.yml](/Users/foundry/TriathenumDevelopment/docker-compose.yml)
  - [Source/Dockerfile](/Users/foundry/TriathenumDevelopment/Source/Dockerfile)
  - [Source/server/index.ts](/Users/foundry/TriathenumDevelopment/Source/server/index.ts)
  - [Source/server/auth-service.ts](/Users/foundry/TriathenumDevelopment/Source/server/auth-service.ts)
  - [Source/server/world-browser-service.ts](/Users/foundry/TriathenumDevelopment/Source/server/world-browser-service.ts)
  - [Source/app/App.tsx](/Users/foundry/TriathenumDevelopment/Source/app/App.tsx)
- verified the new docs set does not retain `docker compose` operator instructions in the refreshed repo docs and instead documents Podman as the intended workflow

## Open Risks

- operator documentation still assumes `podman compose` is the preferred host command path and does not yet include a deeper troubleshooting guide for host-specific Podman differences
- the first pass improves practical onboarding but does not attempt a full API reference or admin operations manual

## Assumptions Carried Forward

- the accepted Flywheel `done` stories and architecture decisions remain the source of truth for current product behavior
- documenting Podman as the intended runtime is correct even though the compose artifact keeps the conventional `docker-compose.yml` filename

## QA Focus

- verify the README and new guides stay within shipped behavior and do not drift into deferred roadmap scope
- verify Podman-oriented instructions match the existing compose and container artifacts
- verify the docs clearly separate useful-core setup from optional AI configuration

## Action And Approval Notes

- action class used: `local write`
- no risky-write or sensitive-production approval path was required for this documentation cycle

## QA Verdict

- passed: move to `done`

## QA Evidence Summary

- reviewed all four acceptance criteria against the delivered docs:
  - [README.md](/Users/foundry/TriathenumDevelopment/README.md)
  - [docs/developer-guide.md](/Users/foundry/TriathenumDevelopment/docs/developer-guide.md)
  - [docs/user-guide.md](/Users/foundry/TriathenumDevelopment/docs/user-guide.md)
- confirmed the refreshed README now reflects the shipped WorldForge surface instead of the earlier Phase 1-only baseline and uses Podman-oriented operator guidance while still accurately naming [docker-compose.yml](/Users/foundry/TriathenumDevelopment/docker-compose.yml)
- confirmed the developer guide covers local setup, commands, environment variables, architecture seams, and validation entry points that match current repo artifacts in `Source/`
- confirmed the user guide covers browse/edit workflows, roles and visibility, optional AI behavior, and Phase 3 review/import/export/navigation surfaces without describing deferred Phase 4 work
- confirmed the validation evidence cited by engineering is strong enough for a documentation-only cycle:
  - accepted architecture and engineering `done` artifacts were used as the source of truth
  - commands and runtime details were checked against current repo files including [Source/package.json](/Users/foundry/TriathenumDevelopment/Source/package.json), [Source/server/index.ts](/Users/foundry/TriathenumDevelopment/Source/server/index.ts), [Source/server/auth-service.ts](/Users/foundry/TriathenumDevelopment/Source/server/auth-service.ts), [Source/server/world-browser-service.ts](/Users/foundry/TriathenumDevelopment/Source/server/world-browser-service.ts), and [Source/app/App.tsx](/Users/foundry/TriathenumDevelopment/Source/app/App.tsx)

## QA Defects

- none

## Required Fixes

- none

## Evidence Quality Call

- strong enough for this documentation-refresh cycle

## QA State Recommendation

- move to `done`
