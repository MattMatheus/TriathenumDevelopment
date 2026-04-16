# Developer Guide

## Overview

WorldForge is a single-service web application with:

- a React app in [Source/app](/Users/foundry/TriathenumDevelopment/Source/app)
- an HTTP API in [Source/server](/Users/foundry/TriathenumDevelopment/Source/server)
- shared contracts in [Source/contracts](/Users/foundry/TriathenumDevelopment/Source/contracts)
- markdown and indexing services in [Source/world](/Users/foundry/TriathenumDevelopment/Source/world)
- retrieval and grounding helpers in [Source/retrieval](/Users/foundry/TriathenumDevelopment/Source/retrieval)

Markdown files are canonical. The SQLite index is an acceleration layer rebuilt from those documents.

## Workspace Layout

- [Source/app](/Users/foundry/TriathenumDevelopment/Source/app): browser UI and editor interaction logic
- [Source/server](/Users/foundry/TriathenumDevelopment/Source/server): HTTP routes and application services
- [Source/contracts](/Users/foundry/TriathenumDevelopment/Source/contracts): shared request/response and domain types
- [Source/world](/Users/foundry/TriathenumDevelopment/Source/world): markdown parsing, serialization, filesystem storage, SQLite index
- [Source/retrieval](/Users/foundry/TriathenumDevelopment/Source/retrieval): retrieval and grounding path used by AI/review features
- [Source/world/__fixtures__/world](/Users/foundry/TriathenumDevelopment/Source/world/__fixtures__/world): local sample world used by default
- [docker-compose.yml](/Users/foundry/TriathenumDevelopment/docker-compose.yml): compose file used with Podman
- [Source/Dockerfile](/Users/foundry/TriathenumDevelopment/Source/Dockerfile): single-service container build

## Local Setup

From [Source](/Users/foundry/TriathenumDevelopment/Source):

```bash
pnpm install
pnpm run dev:server
pnpm run dev:app
```

Default local endpoints:

- app: `http://127.0.0.1:4173`
- server: `http://127.0.0.1:4174`
- health: `http://127.0.0.1:4174/health`

The default world root is the fixture world. Override it with `TRIATHENUM_WORLD_ROOT` when you want to work against a real world directory.

## Primary Commands

From [Source](/Users/foundry/TriathenumDevelopment/Source):

```bash
pnpm run dev:app
pnpm run dev:server
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run diagnose:retrieval
pnpm run browser:agent -- snapshot
pnpm run test:e2e
```

E2E/browser details live in [Source/e2e/README.md](/Users/foundry/TriathenumDevelopment/Source/e2e/README.md).

## Podman Workflow

This repo documents Podman as the container path.

From the repo root:

```bash
podman compose up --build
```

The compose file builds [Source/Dockerfile](/Users/foundry/TriathenumDevelopment/Source/Dockerfile), publishes port `4174`, mounts the fixture world at `/world`, and sets `HOST=0.0.0.0` so the service is reachable through Podman port publishing.

The compose filename remains `docker-compose.yml`. Do not read that filename as a Docker-only instruction in this repo.

## Environment Variables

Current runtime knobs surfaced by the server/auth/AI services:

- `HOST`
  - server bind host
  - defaults to `127.0.0.1`
- `PORT`
  - server port
  - defaults to `4174`
- `TRIATHENUM_WORLD_ROOT`
  - markdown world root
  - defaults to the fixture world
- `TRIATHENUM_VAULT_ROOT`
  - optional retrieval vault root
- `TRIATHENUM_AUTH_ROOT`
  - optional auth-state override
  - otherwise stored under `<world-root>/.worldforge`
- `TRIATHENUM_AI_SETTINGS_ROOT`
  - optional AI-settings override
  - otherwise stored under `<world-root>/.worldforge`
- `TRIATHENUM_AI_SETTINGS_SECRET`
  - optional encryption secret for persisted provider credentials
- `WORLDFORGE_OWNER_EMAIL`
  - owner bootstrap email
- `WORLDFORGE_OWNER_PASSWORD`
  - owner bootstrap password
- `WORLDFORGE_OWNER_NAME`
  - owner bootstrap display name

For non-local hosts, set explicit owner credentials. The server rejects the default local bootstrap credentials when not bound to a local-only host.

## Architecture Notes

### App

The UI in [App.tsx](/Users/foundry/TriathenumDevelopment/Source/app/App.tsx) is the main product shell. It drives:

- browse and detail flows
- entity creation and editing
- keyword and semantic search
- account provisioning
- AI settings
- suggestions and prose assistance
- consistency review
- timeline, graph, map, digest, export, and import review/apply surfaces

The app talks only to the API. It does not read markdown or SQLite directly.

### Server

[server/index.ts](/Users/foundry/TriathenumDevelopment/Source/server/index.ts) hosts:

- auth/session endpoints
- world browse/detail/save/media endpoints
- AI settings and context endpoints
- semantic search and draft generation
- editor suggestion and prose assistance endpoints
- consistency review, digest, timeline, graph, and map endpoints
- export and import review/apply endpoints
- static asset serving for the built frontend

Important current behavior:

- cookie-backed auth uses an HttpOnly session cookie
- request bodies are size-limited
- media and static paths are contained to safe roots
- collaborator writes are restricted to `all_users` content
- only the owner can manage accounts and AI settings

### World Storage

[Source/world](/Users/foundry/TriathenumDevelopment/Source/world) owns:

- markdown parsing and serialization
- frontmatter handling
- filesystem reads and writes
- media placement
- SQLite indexing

The canonical write path is:

1. UI submits a normalized save request.
2. Server validates permissions and payload shape.
3. World document services write markdown/frontmatter to disk.
4. The index is refreshed from canonical documents.

## Testing

Core validation commands:

```bash
pnpm run typecheck
pnpm run test
pnpm run build
```

For browser automation:

- `pnpm run browser:agent -- ...` for agent-driven exploration
- `pnpm run test:e2e` for Playwright-based checks once the browser dependencies are installed

## Current Documentation Boundaries

This guide is intentionally practical rather than exhaustive. It covers the current shipped architecture and operator setup. It does not serve as a full API reference or roadmap document.
