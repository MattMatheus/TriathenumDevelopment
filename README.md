# WorldForge

WorldForge is a markdown-first, self-hostable worldbuilding tool for browsing, editing, reviewing, and exporting a fictional world without giving up filesystem ownership of your canon.

Markdown files with YAML frontmatter remain the source of truth. WorldForge layers a web UI, rebuildable SQLite index, optional AI workflows, and review/navigation tools on top of that local world data.

## Shipped Surface

The current repo includes:

- Phase 1 useful core:
  - filesystem-backed entity storage
  - rebuildable SQLite indexing
  - responsive browse and detail views
  - markdown-safe entity editing
  - search, backlinks, and unresolved stub tracking
  - owner/collaborator auth with visibility rules
  - media attachment support
- Phase 2 optional AI workflows:
  - configurable AI baseline
  - semantic search with citations
  - draft entity generation and stub filling
  - in-editor prose assistance
  - link, relationship, and summary suggestions
- Phase 3 review and navigation:
  - consistency review
  - timeline workspace
  - relationship graph explorer
  - world-state digests
  - map-linked location navigation
  - export packages
  - import review and apply flow

AI features are optional. The useful core runs without any provider configured.

## Quick Start

### Local Development

From [Source](/Users/foundry/TriathenumDevelopment/Source):

```bash
pnpm install
pnpm run dev:server
pnpm run dev:app
```

Development URLs:

- app: `http://127.0.0.1:4173`
- server: `http://127.0.0.1:4174`
- health check: `http://127.0.0.1:4174/health`

By default, the server boots against the fixture world at `Source/world/__fixtures__/world`.

### Podman Compose

This repo uses Podman for container workflow. The compose file is still named [docker-compose.yml](/Users/foundry/TriathenumDevelopment/docker-compose.yml), and `podman compose` consumes it directly.

From the repo root:

```bash
podman compose up --build
```

That starts a single `worldforge` service on `http://127.0.0.1:4174`.

Default compose sign-in credentials:

- email: `owner@worldforge.container`
- password: `worldforge-compose-owner`

The compose stack keeps auth and AI settings state in a separate named volume so the mounted fixture world does not override the container bootstrap account.

For background startup:

```bash
podman compose up -d --build
```

To stop it:

```bash
podman compose down
```

## Configuration

### Minimum Owner Bootstrap

- `WORLDFORGE_OWNER_EMAIL`
- `WORLDFORGE_OWNER_PASSWORD`
- `WORLDFORGE_OWNER_NAME` optional convenience label

The current defaults are only safe for local-only startup on `127.0.0.1`, `localhost`, or `::1`. For any non-local host bind, set explicit owner credentials before starting WorldForge.

The Podman compose path in this repo already provides non-default fallback owner credentials so the container can boot on `0.0.0.0` without tripping that safety guard. Override them in your own environment for any real deployment.

### Common Runtime Variables

- `HOST`
  - defaults to `127.0.0.1` in local development
  - set to `0.0.0.0` in container runs so Podman port publishing works
- `PORT`
  - defaults to `4174`
- `TRIATHENUM_WORLD_ROOT`
  - path to the markdown world directory
  - defaults to the fixture world in local development
- `TRIATHENUM_VAULT_ROOT`
  - optional vault/canon root used by retrieval-oriented services
- `TRIATHENUM_AUTH_ROOT`
  - optional override for auth-state storage
  - defaults under `<world-root>/.worldforge`
- `TRIATHENUM_AI_SETTINGS_ROOT`
  - optional override for AI settings storage
  - defaults under `<world-root>/.worldforge`
- `TRIATHENUM_AI_SETTINGS_SECRET`
  - optional secret used to protect persisted AI provider credentials

## World Data Model

WorldForge expects a world directory containing markdown entities in subfolders such as:

- `characters/`
- `locations/`
- `factions/`
- `lore/`

The app currently treats these entity types as first-class:

- `character`
- `location`
- `faction`
- `magic_system_or_technology`
- `artifact`
- `lore_article`

WorldForge also writes runtime-managed data under the world root:

- `media/` for attached files and images
- `.worldforge/` for auth and AI settings state unless overridden

The SQLite index is rebuildable and not canonical.

## Roles And Visibility

Current v1 roles:

- `owner`
  - can view and edit `all_users`, `owner_only`, and `hidden`
  - can provision collaborator accounts
  - can manage AI settings
  - can run owner-only import/apply flows
- `collaborator`
  - can view and edit `all_users` entities only
  - cannot assign restricted visibility
  - cannot manage accounts or AI settings

Current visibility levels:

- `all_users`
- `owner_only`
- `hidden`

## Documentation

- Developer guide: [docs/developer-guide.md](/Users/foundry/TriathenumDevelopment/docs/developer-guide.md)
- User guide: [docs/user-guide.md](/Users/foundry/TriathenumDevelopment/docs/user-guide.md)
- Browser automation notes: [Source/e2e/README.md](/Users/foundry/TriathenumDevelopment/Source/e2e/README.md)

## Notes

- WorldForge is intentionally markdown-first and review-oriented. AI suggestions do not silently become canon.
- The current container path is a single-service setup with mounted world data, not a multi-service platform.
- The compose filename remains `docker-compose.yml` for compatibility, but Podman is the intended operator workflow in this repo.
