import { Readable } from "node:stream";

import { describe, expect, it } from "vitest";

import { PathContainmentError, RequestBodyError, readRequestBody, resolveContainedPath, resolveStaticAssetPath } from "./http-utils.js";

function fakeRequest(chunks: string[], headers: Record<string, string> = {}) {
  const request = Readable.from(chunks) as Readable & { headers: Record<string, string> };
  request.headers = headers;
  return request as unknown as import("node:http").IncomingMessage;
}

describe("resolveContainedPath", () => {
  it("returns a path inside the allowed root", () => {
    expect(resolveContainedPath("/tmp/world", "media/entity/image.png")).toBe("/tmp/world/media/entity/image.png");
  });

  it("rejects traversal outside the allowed root", () => {
    expect(() => resolveContainedPath("/tmp/world", "../secrets.txt")).toThrow(PathContainmentError);
  });
});

describe("resolveStaticAssetPath", () => {
  it("maps the root request to index.html", () => {
    expect(resolveStaticAssetPath("/tmp/dist", "/")).toBe("/tmp/dist/index.html");
  });

  it("rejects traversal attempts", () => {
    expect(() => resolveStaticAssetPath("/tmp/dist", "/../../etc/passwd")).toThrow(PathContainmentError);
  });
});

describe("readRequestBody", () => {
  it("reads request data within the configured limit", async () => {
    const request = fakeRequest(["hello"]);

    await expect(readRequestBody(request, 8)).resolves.toBe("hello");
  });

  it("rejects requests that exceed the configured content-length", async () => {
    const request = fakeRequest(["hello"], { "content-length": "12" });

    await expect(readRequestBody(request, 8)).rejects.toBeInstanceOf(RequestBodyError);
  });

  it("rejects requests that grow past the configured limit while streaming", async () => {
    const request = fakeRequest(["hello", "world"]);

    await expect(readRequestBody(request, 8)).rejects.toBeInstanceOf(RequestBodyError);
  });
});
