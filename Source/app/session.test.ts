import { describe, expect, it } from "vitest";

import { nextStoredSessionToken, shouldAttemptWorldLoad } from "./session.js";

describe("shouldAttemptWorldLoad", () => {
  it("allows bootstrap when a stored session token exists even before session state is hydrated", () => {
    expect(shouldAttemptWorldLoad("token-123", false)).toBe(true);
  });

  it("allows refresh when session state already exists", () => {
    expect(shouldAttemptWorldLoad(null, true)).toBe(true);
  });

  it("skips bootstrap when no token or session exists", () => {
    expect(shouldAttemptWorldLoad(null, false)).toBe(false);
  });
});

describe("nextStoredSessionToken", () => {
  it("persists the latest response token", () => {
    expect(nextStoredSessionToken("old-token", 200, "new-token")).toBe("new-token");
  });

  it("clears the token after unauthorized responses", () => {
    expect(nextStoredSessionToken("old-token", 401, null)).toBeNull();
  });

  it("preserves the current token when a non-auth response omits the header", () => {
    expect(nextStoredSessionToken("existing-token", 200, null)).toBe("existing-token");
  });
});
