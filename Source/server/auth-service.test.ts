import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { FileSystemAuthStore, type AuthenticatedViewer, parseSessionToken } from "./auth-service.js";

const tempDirs: string[] = [];
const originalAuthRoot = process.env.TRIATHENUM_AUTH_ROOT;
const originalOwnerEmail = process.env.WORLDFORGE_OWNER_EMAIL;
const originalOwnerPassword = process.env.WORLDFORGE_OWNER_PASSWORD;
const originalOwnerName = process.env.WORLDFORGE_OWNER_NAME;

async function createStore() {
  const worldRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-auth-world-"));
  const authRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-auth-store-"));
  tempDirs.push(worldRoot, authRoot);
  process.env.TRIATHENUM_AUTH_ROOT = authRoot;
  process.env.WORLDFORGE_OWNER_EMAIL = "owner@example.com";
  process.env.WORLDFORGE_OWNER_PASSWORD = "owner-secret";
  process.env.WORLDFORGE_OWNER_NAME = "Forge Owner";
  return new FileSystemAuthStore(worldRoot);
}

async function loginOwner(store: FileSystemAuthStore): Promise<AuthenticatedViewer> {
  const session = await store.createSession({
    email: "owner@example.com",
    password: "owner-secret",
  });
  return session.payload.viewer;
}

beforeEach(() => {
  delete process.env.TRIATHENUM_AUTH_ROOT;
});

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));

  if (originalAuthRoot === undefined) {
    delete process.env.TRIATHENUM_AUTH_ROOT;
  } else {
    process.env.TRIATHENUM_AUTH_ROOT = originalAuthRoot;
  }

  if (originalOwnerEmail === undefined) {
    delete process.env.WORLDFORGE_OWNER_EMAIL;
  } else {
    process.env.WORLDFORGE_OWNER_EMAIL = originalOwnerEmail;
  }

  if (originalOwnerPassword === undefined) {
    delete process.env.WORLDFORGE_OWNER_PASSWORD;
  } else {
    process.env.WORLDFORGE_OWNER_PASSWORD = originalOwnerPassword;
  }

  if (originalOwnerName === undefined) {
    delete process.env.WORLDFORGE_OWNER_NAME;
  } else {
    process.env.WORLDFORGE_OWNER_NAME = originalOwnerName;
  }
});

describe("FileSystemAuthStore", () => {
  it("bootstraps the owner account and creates a persistent session cookie", async () => {
    const store = await createStore();

    const result = await store.createSession({
      email: "owner@example.com",
      password: "owner-secret",
    });

    expect(result.payload.viewer.role).toBe("owner");
    expect(result.payload.canManageAccounts).toBe(true);
    expect(result.payload.visibilityOptions).toEqual(["all_users", "owner_only", "hidden"]);
    expect(parseSessionToken(result.cookie)).toMatch(/[a-f0-9]{48}/);
  });

  it("allows the owner to provision collaborator accounts", async () => {
    const store = await createStore();
    const owner = await loginOwner(store);

    const account = await store.createOwnerManagedAccount(owner, {
      email: "writer@example.com",
      displayName: "Writer",
      password: "writer-secret",
    });

    expect(account.role).toBe("collaborator");
    const accounts = await store.listAccounts(owner);
    expect(accounts.map((item) => item.email)).toEqual(["owner@example.com", "writer@example.com"]);
  });
});
