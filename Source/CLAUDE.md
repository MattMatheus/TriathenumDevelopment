# Source Browser Instructions

Use the browser automation setup in this folder for UI work.

## Preferred Tools

1. Use `agent-browser` first for exploratory or agent-driven flows.
2. Use Playwright for durable regression tests.
3. Treat WebKit as the compatibility lane, not the primary debugging target.

## Commands

Run these from `/Users/foundry/TriathenumDevelopment/Source`:

```bash
pnpm browser:agent -- open http://127.0.0.1:4173
pnpm browser:agent -- snapshot --interactive
pnpm test:e2e
pnpm test:e2e:headed
```

## Expectations

- Keep browser artifacts inside ignored local folders under `Source/.browser/`, `Source/playwright-report/`, and `Source/test-results/`.
- When adding Playwright tests, prefer resilient accessibility-first locators.
- When driving the browser as an agent, use `snapshot` frequently instead of relying on screenshots alone.
- For new UI flows, start with an agent-browser smoke pass, then convert stable paths into Playwright coverage.
