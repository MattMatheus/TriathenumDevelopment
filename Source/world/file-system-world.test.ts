import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";

import { afterEach, describe, expect, it } from "vitest";

import { FileSystemWorldDocumentStore } from "./file-system-world.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("FileSystemWorldDocumentStore", () => {
  it("resolves media paths inside the world root", async () => {
    const worldRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-world-"));
    tempDirs.push(worldRoot);

    const store = new FileSystemWorldDocumentStore(worldRoot);
    expect(store.resolveMediaPath("media/entity/asset.png")).toBe(path.join(worldRoot, "media", "entity", "asset.png"));
  });

  it("rejects media paths that escape the world root", async () => {
    const worldRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-world-"));
    tempDirs.push(worldRoot);

    const store = new FileSystemWorldDocumentStore(worldRoot);
    expect(() => store.resolveMediaPath("../secret.txt")).toThrow(/escapes the world root/i);
  });
});
