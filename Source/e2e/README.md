# Browser Automation

This repo now supports two complementary browser paths:

- `agent-browser` for agent-driven exploratory UI work from Codex or Claude Code
- Playwright for durable end-to-end tests and future CI coverage

## Quick Start

### Agent Browser

`agent-browser` is already available globally on this machine, and the repo ships a project config at [agent-browser.json](/Users/foundry/TriathenumDevelopment/Source/agent-browser.json).

Common commands from `Source/`:

```bash
pnpm browser:agent -- snapshot
pnpm browser:agent -- open http://127.0.0.1:4173
pnpm browser:agent -- open http://127.0.0.1:4173
pnpm browser:agent -- snapshot --interactive
pnpm browser:agent -- screenshot ./.browser/screenshots/home.png
```

The wrapper script preserves the project config automatically, including:

- persistent local browser profile under `Source/.browser/profile`
- screenshots and downloads in ignored local artifact folders
- local-domain restrictions for `localhost` and `127.0.0.1`

### Playwright

The repo includes a scaffolded Playwright config at [playwright.config.js](/Users/foundry/TriathenumDevelopment/Source/playwright.config.js) and an initial smoke suite in [app-shell.smoke.spec.js](/Users/foundry/TriathenumDevelopment/Source/e2e/app-shell.smoke.spec.js).

Playwright is not installed in this sandbox yet. When package access is available, run:

```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium webkit
```

Then use:

```bash
pnpm test:e2e
pnpm test:e2e:headed
pnpm test:e2e:ui
```

## Why Both

- Use `agent-browser` when an agent should drive and inspect the UI live.
- Use Playwright when we want stable assertions, traces, and repeatable regression coverage.
- Prefer Chromium for day-to-day debugging and WebKit for compatibility checks.

## Current Pause Point

The next likely UI-heavy story is the final Phase 2 suggestion workflow. This setup is intended to give both Codex and Claude Code a shared browser toolbox before that work starts.
