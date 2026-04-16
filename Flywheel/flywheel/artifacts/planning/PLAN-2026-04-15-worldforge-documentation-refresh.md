# Plan: WorldForge Documentation Refresh

## Context

The completed Flywheel engineering and architecture work now materially exceeds the current documentation baseline.

Reviewed completed artifacts on 2026-04-15:

- architecture:
  - `ARCH-20260414-worldforge-v1-platform-and-domain-architecture`
  - `ARCH-20260415-worldforge-owner-collaborator-rbac-decision`
- engineering Phase 1 useful core:
  - storage/index/entity foundation
  - responsive browser
  - markdown-safe editor
  - search, backlinks, and stub management
  - auth, visibility, and session baseline
  - media and compose baseline
- engineering Phase 2 optional AI collaboration:
  - AI provider and context baseline
  - semantic search and cited world answers
  - draft entity generation and stub filling
  - in-editor prose assistance
  - link, relationship, and summary suggestions
- engineering Phase 3 review and navigation:
  - canon consistency review
  - timeline workspace
  - relationship graph explorer
  - world-state digests and review briefs
  - map-linked location navigation
  - export package baseline
  - import package review
  - import apply and conflict policy
- cross-cutting follow-up work already accepted:
  - RBAC/auth hardening follow-ups
  - frontmatter YAML library migration
  - security baseline hardening

Current documentation baseline reviewed:

- root [README.md](/Users/foundry/TriathenumDevelopment/README.md)
- [Source/e2e/README.md](/Users/foundry/TriathenumDevelopment/Source/e2e/README.md)
- current repo deployment artifacts:
  - [docker-compose.yml](/Users/foundry/TriathenumDevelopment/docker-compose.yml)
  - [Source/Dockerfile](/Users/foundry/TriathenumDevelopment/Source/Dockerfile)

Observed gaps:

- the root README still describes only the Phase 1 useful core and does not reflect the accepted Phase 2 and Phase 3 feature set
- container instructions are written as `docker compose`, while this repo is operated with Podman and prior validation evidence explicitly referenced Podman host-side testing
- there is no dedicated user-facing guide for roles, visibility, world authoring, AI review boundaries, import/export, graph, timeline, digest, or map workflows
- there is no dedicated developer-facing guide for local setup, test commands, app/server boundaries, world data layout, environment variables, or container workflow expectations
- the current docs do not clearly separate required useful-core setup from optional AI configuration

## Goal

Prepare a bounded documentation refresh that brings developer and user docs into alignment with the shipped WorldForge behavior and self-hosted workflow.

## Scope Boundary

- In scope:
  - refresh the root README to reflect current shipped capability and the preferred Podman-oriented local deployment path
  - add or update user documentation for the current WorldForge workflows and permission model
  - add or update developer documentation for local development, testing, architecture seams, and operational setup
  - remove or rewrite stale Docker-first language where Podman is the intended operator path
  - clearly distinguish useful-core requirements from optional AI features
- Out of scope:
  - implementation of new product behavior
  - changing the actual container artifacts unless documentation reveals a blocking mismatch
  - new release engineering or hosted deployment guidance
  - Phase 4 collaboration/publishing work that has not been completed yet

## Assumptions

- the completed Flywheel `done` stories and accepted architecture decisions are the source of truth for current shipped behavior
- Podman is the intended container runtime vocabulary for repo docs, even though the compose artifact remains named [docker-compose.yml](/Users/foundry/TriathenumDevelopment/docker-compose.yml)
- one engineering documentation story can cover the README refresh plus first-pass user and developer docs without needing additional architecture discovery

## Risks

- the current docs refresh could accidentally over-promise behavior if it describes archived roadmap ideas instead of accepted `done` work
- Podman wording needs to stay accurate to the existing compose artifact and commands actually available in the repo
- a single documentation pass may still leave deeper admin or API reference gaps that should become follow-up work later

## Intake Artifacts Created

- `flywheel/backlog/engineering/intake/STORY-20260415-worldforge-developer-and-user-documentation-refresh.md`

## Recommended Next Stage

- `pm` to refine the documentation story, confirm the target doc surfaces, and place it into the engineering queue
