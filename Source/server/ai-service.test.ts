import path from "node:path";
import { cp, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import type { AuthenticatedViewer } from "./auth-service.js";
import { AISettingsError, FileSystemAISettingsStore, loadAIWorldContext } from "./ai-service.js";

const fixtureRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "world",
  "__fixtures__",
  "world",
);

const tempDirs: string[] = [];

const ownerViewer: AuthenticatedViewer = {
  id: "account-owner",
  email: "owner@example.com",
  displayName: "Owner",
  role: "owner",
  createdAt: new Date().toISOString(),
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("FileSystemAISettingsStore", () => {
  it("defaults to a disabled provider baseline without breaking runtime", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-ai-"));
    tempDirs.push(tempRoot);

    const store = new FileSystemAISettingsStore(tempRoot);
    const payload = await store.load();

    expect(payload.provider.kind).toBe("disabled");
    expect(payload.provider.status.configured).toBe(false);
    expect(payload.provider.status.reason).toMatch(/disabled/i);
  });

  it("persists a hosted provider baseline and preserves the secret as configured metadata", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-ai-"));
    tempDirs.push(tempRoot);

    const store = new FileSystemAISettingsStore(tempRoot);
    const payload = await store.save({
      kind: "hosted",
      label: "OpenAI Compatible",
      endpoint: "https://api.example.test/v1",
      model: "gpt-test",
      apiKey: "secret-123",
    });

    expect(payload.provider.kind).toBe("hosted");
    expect(payload.provider.apiKeyConfigured).toBe(true);
    expect(payload.provider.status.configured).toBe(true);

    const reload = await store.load();
    expect(reload.provider.apiKeyConfigured).toBe(true);
    expect(reload.provider.status.available).toBe(true);
  });

  it("rejects incomplete provider configurations", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-ai-"));
    tempDirs.push(tempRoot);

    const store = new FileSystemAISettingsStore(tempRoot);

    await expect(
      store.save({
        kind: "mcp",
        model: "gpt-test",
      }),
    ).rejects.toBeInstanceOf(AISettingsError);
  });
});

describe("loadAIWorldContext", () => {
  it("builds a shared context payload with explicit guardrails", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-ai-world-"));
    tempDirs.push(tempRoot);
    await cp(fixtureRoot, tempRoot, { recursive: true });

    const context = await loadAIWorldContext(tempRoot, ownerViewer, "location-silverkeep");

    expect(context.provider.kind).toBe("disabled");
    expect(context.guardrails.approvalBoundary).toMatch(/human review/i);
    expect(context.world.entityCount).toBeGreaterThan(0);
    expect(context.subject?.id).toBe("location-silverkeep");
    expect(context.subject?.relationships).toEqual([
      {
        type: "governed_by",
        target: "Council of Twelve Regions",
      },
    ]);
    expect(context.promptScaffold[1]).toMatch(/inference/i);
  });
});
