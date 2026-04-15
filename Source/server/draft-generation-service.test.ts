import path from "node:path";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import type { AuthenticatedViewer } from "./auth-service.js";
import { generateWorldEntityDraft } from "./draft-generation-service.js";

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

async function configureHostedBaseline(worldRoot: string): Promise<void> {
  await mkdir(path.join(worldRoot, ".worldforge"), { recursive: true });
  await writeFile(
    path.join(worldRoot, ".worldforge", "ai-settings.json"),
    JSON.stringify(
      {
        kind: "hosted",
        endpoint: "https://api.example.test/v1",
        model: "gpt-test",
        apiKey: "secret-123",
      },
      null,
      2,
    ),
    "utf8",
  );
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("generateWorldEntityDraft", () => {
  it("returns an unavailable response when AI baseline is not configured", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-draft-"));
    tempDirs.push(tempRoot);
    await cp(fixtureRoot, tempRoot, { recursive: true });

    const result = await generateWorldEntityDraft(tempRoot, ownerViewer, {
      entityType: "location",
      proposedName: "Sunken Archive",
    });

    expect(result.status).toBe("unavailable");
    expect(result.unavailableReason).toMatch(/provider baseline/i);
  });

  it("generates a reviewable draft for a new entity without saving canon", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-draft-"));
    tempDirs.push(tempRoot);
    await cp(fixtureRoot, tempRoot, { recursive: true });
    await configureHostedBaseline(tempRoot);

    const before = await readFile(path.join(tempRoot, "locations", "silverkeep.md"), "utf8");
    const result = await generateWorldEntityDraft(tempRoot, ownerViewer, {
      entityType: "location",
      proposedName: "Sunken Archive",
    });
    const after = await readFile(path.join(tempRoot, "locations", "silverkeep.md"), "utf8");

    expect(result.status).toBe("ready");
    expect(result.draft?.name).toBe("Sunken Archive");
    expect(result.draft?.entityType).toBe("location");
    expect(result.provenance?.approvalRequired).toBe(true);
    expect(before).toBe(after);
  });

  it("generates a stub-fill draft tied to the unresolved reference source", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-draft-"));
    tempDirs.push(tempRoot);
    await cp(fixtureRoot, tempRoot, { recursive: true });
    await configureHostedBaseline(tempRoot);

    const result = await generateWorldEntityDraft(tempRoot, ownerViewer, {
      entityType: "location",
      unresolvedTargetText: "Sunken Archive",
    });

    expect(result.status).toBe("ready");
    expect(result.provenance?.mode).toBe("stub_fill");
    expect(result.provenance?.sourceEntityId).toBe("character-eliana-tanaka");
    expect(result.draft?.relationships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          target: "Eliana Tanaka",
        }),
      ]),
    );
  });
});
