# WorldForge

WorldForge is a markdown-first, self-hostable worldbuilding tool.

## Useful Core

The current Phase 1 baseline includes:

- filesystem-backed markdown entities
- rebuildable SQLite indexing
- browser, detail, editor, search, backlinks, and stub workflow
- owner-managed auth and coarse entity visibility
- local media attachments stored inside the world data directory

Optional AI and canon-retrieval infrastructure are not required to run the useful core.

## Local Development

From [Source](/Users/foundry/TriathenumDevelopment/Source):

```bash
pnpm install
pnpm run dev:server
pnpm run dev:app
```

The app runs on `http://127.0.0.1:4173` in dev and proxies API requests to the local server on `http://127.0.0.1:4174`.

## Docker Compose

The simplest local deployment path is:

```bash
docker compose up --build
```

This starts a single `worldforge` service on `http://127.0.0.1:4174`.
The container binds the app server to `0.0.0.0` internally so Podman or Docker port publishing can reach it correctly.

### Minimum configuration

- `WORLDFORGE_OWNER_EMAIL`
- `WORLDFORGE_OWNER_PASSWORD`
- `WORLDFORGE_OWNER_NAME` (optional convenience)

The default compose file mounts the fixture world at `./Source/world/__fixtures__/world:/world` so the useful core can launch without any AI-side infrastructure.

To use your own world data, replace that bind mount with your own markdown world directory. WorldForge expects that directory to hold:

- markdown entity files in subfolders
- a local `media/` folder managed by the app
- optional SQLite/auth state created by the runtime

## Media Attachments

Media is stored on the local filesystem under the mounted world directory. Entity markdown owns only portable relative media references, while the server handles upload and authenticated rendering.
