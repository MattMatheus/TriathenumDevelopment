import { createServer } from "node:http";
import type { ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { URL } from "node:url";

import { FileSystemVaultReader } from "../retrieval/index.js";
import type {
  AISettingsUpdateRequest,
  ActorReactionRequest,
  AuthAccountProvisionRequest,
  AuthLoginRequest,
  WorldEditorSuggestionRequest,
  WorldEditorProseAssistRequest,
  WorldBrowserMediaUploadRequest,
  WorldBrowserEntitySaveRequest,
} from "../contracts/index.js";
import { AISettingsError, FileSystemAISettingsStore, loadAIWorldContext } from "./ai-service.js";
import { ActorReactionError, createActorReactionResponse, defaultVaultRoot } from "./actor-reaction-service.js";
import type { WorldEntityDraftRequest } from "../contracts/index.js";
import { AuthError, FileSystemAuthStore } from "./auth-service.js";
import { generateWorldEntityDraft } from "./draft-generation-service.js";
import { generateEditorSuggestions } from "./editor-suggestion-service.js";
import { assistEditorProse } from "./prose-assistance-service.js";
import { searchWorldSemantically } from "./semantic-search-service.js";
import {
  attachMediaToEntity,
  defaultWorldRoot,
  loadWorldBrowserPayload,
  loadWorldEntityDetail,
  loadWorldEntityMedia,
  saveWorldEntity,
} from "./world-browser-service.js";

const port = Number.parseInt(process.env.PORT ?? "4174", 10);
const host = process.env.HOST ?? "127.0.0.1";
const vaultRoot = process.env.TRIATHENUM_VAULT_ROOT ?? defaultVaultRoot();
const worldRoot = defaultWorldRoot();
const reader = new FileSystemVaultReader(vaultRoot);
const authStore = new FileSystemAuthStore(worldRoot);
const aiSettingsStore = new FileSystemAISettingsStore(worldRoot);
const SESSION_HEADER = "x-worldforge-session";
const distRoot = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "dist");

function contentTypeFor(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".html") return "text/html; charset=utf-8";
  if (extension === ".js") return "application/javascript; charset=utf-8";
  if (extension === ".css") return "text/css; charset=utf-8";
  if (extension === ".json") return "application/json; charset=utf-8";
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".gif") return "image/gif";
  if (extension === ".svg") return "image/svg+xml";
  if (extension === ".webp") return "image/webp";
  return "application/octet-stream";
}

function sendJson(response: ServerResponse, status: number, payload: unknown, headers: Record<string, string> = {}) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type",
    ...headers,
  });
  response.end(JSON.stringify(payload));
}

function sendText(response: ServerResponse, status: number, payload: string, headers: Record<string, string> = {}) {
  response.writeHead(status, {
    "content-type": "text/plain; charset=utf-8",
    ...headers,
  });
  response.end(payload);
}

function safeDispositionFilename(fileName: string): string {
  return fileName
    .replace(/[\r\n"]/g, "")
    .replace(/[^\x20-\x7E]/g, "_")
    .trim() || "download";
}

async function sendFile(response: ServerResponse, filePath: string, contentType: string, downloadName?: string) {
  const contents = await readFile(filePath);
  response.writeHead(200, {
    "content-type": contentType,
    ...(downloadName ? { "content-disposition": `inline; filename="${safeDispositionFilename(downloadName)}"` } : {}),
  });
  response.end(contents);
}

const server = createServer(async (request, response) => {
  if (!request.url) {
    sendJson(response, 400, { error: "Missing request URL." });
    return;
  }

  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return;
  }

  if (request.method === "GET" && request.url === "/health") {
    sendJson(response, 200, { ok: true, vaultRoot, worldRoot });
    return;
  }

  const requestUrl = new URL(request.url, `http://127.0.0.1:${port}`);
  const headerSessionToken = Array.isArray(request.headers[SESSION_HEADER])
    ? request.headers[SESSION_HEADER][0]
    : request.headers[SESSION_HEADER];
  const querySessionToken = requestUrl.searchParams.get("sessionToken");
  const session = await authStore.resolveSession(request.headers.cookie, headerSessionToken ?? querySessionToken);
  const viewer = session?.payload.viewer ?? null;

  if (request.method === "GET" && requestUrl.pathname === "/api/auth/session") {
    if (!session) {
      sendJson(response, 401, { error: "No active session." });
      return;
    }

    sendJson(response, 200, session.payload, {
      "set-cookie": session.cookie,
      [SESSION_HEADER]: session.token,
    });
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/auth/session") {
    let rawBody = "";

    for await (const chunk of request) {
      rawBody += chunk;
    }

    try {
      const payload = JSON.parse(rawBody) as AuthLoginRequest;
      const result = await authStore.createSession(payload);
      sendJson(response, 200, result.payload, {
        "set-cookie": result.cookie,
        [SESSION_HEADER]: result.token,
      });
    } catch (error) {
      if (error instanceof AuthError) {
        sendJson(response, error.status, { error: error.message });
        return;
      }

      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Unable to sign in.",
      });
    }

    return;
  }

  if (request.method === "DELETE" && requestUrl.pathname === "/api/auth/session") {
    const cookie = await authStore.destroySession(request.headers.cookie);
    sendJson(response, 204, {}, { "set-cookie": cookie });
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/auth/accounts") {
    if (!viewer) {
      sendJson(response, 401, { error: "Sign in is required." });
      return;
    }

    try {
      const accounts = await authStore.listAccounts(viewer);
      sendJson(response, 200, { accounts }, session ? { "set-cookie": session.cookie, [SESSION_HEADER]: session.token } : {});
    } catch (error) {
      if (error instanceof AuthError) {
        sendJson(response, error.status, { error: error.message });
        return;
      }

      sendJson(response, 500, { error: error instanceof Error ? error.message : "Unable to load accounts." });
    }

    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/ai/settings") {
    if (!viewer) {
      sendJson(response, 401, { error: "Sign in is required." });
      return;
    }

    try {
      const payload = await aiSettingsStore.load();
      sendJson(response, 200, payload, session ? { "set-cookie": session.cookie, [SESSION_HEADER]: session.token } : {});
    } catch (error) {
      sendJson(response, 500, { error: error instanceof Error ? error.message : "Unable to load AI settings." });
    }

    return;
  }

  if (request.method === "PUT" && requestUrl.pathname === "/api/ai/settings") {
    if (!viewer) {
      sendJson(response, 401, { error: "Sign in is required." });
      return;
    }

    let rawBody = "";

    for await (const chunk of request) {
      rawBody += chunk;
    }

    try {
      const payload = JSON.parse(rawBody) as AISettingsUpdateRequest;
      const result = await aiSettingsStore.save(payload);
      sendJson(response, 200, result, session ? { "set-cookie": session.cookie, [SESSION_HEADER]: session.token } : {});
    } catch (error) {
      if (error instanceof AISettingsError) {
        sendJson(response, error.status, { error: error.message });
        return;
      }

      sendJson(response, 500, { error: error instanceof Error ? error.message : "Unable to save AI settings." });
    }

    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/ai/context") {
    if (!viewer) {
      sendJson(response, 401, { error: "Sign in is required." });
      return;
    }

    try {
      const payload = await loadAIWorldContext(worldRoot, viewer, requestUrl.searchParams.get("entityId") ?? undefined);
      sendJson(response, 200, payload, session ? { "set-cookie": session.cookie, [SESSION_HEADER]: session.token } : {});
    } catch (error) {
      if (error instanceof AuthError) {
        sendJson(response, error.status, { error: error.message });
        return;
      }

      sendJson(response, 500, { error: error instanceof Error ? error.message : "Unable to load AI context." });
    }

    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/auth/accounts") {
    if (!viewer) {
      sendJson(response, 401, { error: "Sign in is required." });
      return;
    }

    let rawBody = "";

    for await (const chunk of request) {
      rawBody += chunk;
    }

    try {
      const payload = JSON.parse(rawBody) as AuthAccountProvisionRequest;
      const account = await authStore.createOwnerManagedAccount(viewer, payload);
      sendJson(response, 201, account, session ? { "set-cookie": session.cookie, [SESSION_HEADER]: session.token } : {});
    } catch (error) {
      if (error instanceof AuthError) {
        sendJson(response, error.status, { error: error.message });
        return;
      }

      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Unable to provision account.",
      });
    }

    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/world/entities") {
    if (!viewer) {
      sendJson(response, 401, { error: "Sign in is required." });
      return;
    }

    try {
      const payload = await loadWorldBrowserPayload(worldRoot, viewer, requestUrl.searchParams.get("q") ?? undefined);
      sendJson(response, 200, payload, session ? { "set-cookie": session.cookie, [SESSION_HEADER]: session.token } : {});
    } catch (error) {
      if (error instanceof AuthError) {
        sendJson(response, error.status, { error: error.message });
        return;
      }

      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Unable to load world browser.",
      });
    }

    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/world/semantic-search") {
    if (!viewer) {
      sendJson(response, 401, { error: "Sign in is required." });
      return;
    }

    try {
      const payload = await searchWorldSemantically(worldRoot, viewer, requestUrl.searchParams.get("q") ?? "");
      sendJson(response, 200, payload, session ? { "set-cookie": session.cookie, [SESSION_HEADER]: session.token } : {});
    } catch (error) {
      if (error instanceof AuthError) {
        sendJson(response, error.status, { error: error.message });
        return;
      }

      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Unable to run semantic search.",
      });
    }

    return;
  }

  if (
    request.method === "POST" &&
    requestUrl.pathname.startsWith("/api/world/entities/") &&
    requestUrl.pathname.endsWith("/media")
  ) {
    if (!viewer) {
      sendJson(response, 401, { error: "Sign in is required." });
      return;
    }

    const entityId = decodeURIComponent(requestUrl.pathname.replace("/api/world/entities/", "").replace("/media", ""));
    let rawBody = "";

    for await (const chunk of request) {
      rawBody += chunk;
    }

    try {
      const payload = JSON.parse(rawBody) as WorldBrowserMediaUploadRequest;
      const result = await attachMediaToEntity(worldRoot, viewer, entityId, payload);
      sendJson(response, 201, result, session ? { "set-cookie": session.cookie, [SESSION_HEADER]: session.token } : {});
    } catch (error) {
      if (error instanceof AuthError) {
        sendJson(response, error.status, { error: error.message });
        return;
      }

      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Unable to attach media.",
      });
    }

    return;
  }

  if (request.method === "GET" && requestUrl.pathname.includes("/api/world/entities/") && requestUrl.pathname.includes("/media/")) {
    if (!viewer) {
      sendJson(response, 401, { error: "Sign in is required." });
      return;
    }

    const [, encodedEntityId, encodedMediaId] =
      requestUrl.pathname.match(/^\/api\/world\/entities\/([^/]+)\/media\/([^/]+)$/) ?? [];
    if (!encodedEntityId || !encodedMediaId) {
      sendJson(response, 404, { error: `No route for ${request.method ?? "UNKNOWN"} ${request.url}` });
      return;
    }

    try {
      const media = await loadWorldEntityMedia(
        worldRoot,
        viewer,
        decodeURIComponent(encodedEntityId),
        decodeURIComponent(encodedMediaId),
      );
      if (!media) {
        sendJson(response, 404, { error: "Media not found." });
        return;
      }

      await sendFile(response, media.absolutePath, media.contentType, media.originalFileName);
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Unable to load media.",
      });
    }

    return;
  }

  if (request.method === "GET" && requestUrl.pathname.startsWith("/api/world/entities/")) {
    if (!viewer) {
      sendJson(response, 401, { error: "Sign in is required." });
      return;
    }

    const entityId = decodeURIComponent(requestUrl.pathname.replace("/api/world/entities/", ""));

    try {
      const payload = await loadWorldEntityDetail(worldRoot, viewer, entityId);
      if (!payload) {
        sendJson(response, 404, { error: `Entity not found for id ${entityId}` });
        return;
      }

      sendJson(response, 200, payload, session ? { "set-cookie": session.cookie, [SESSION_HEADER]: session.token } : {});
    } catch (error) {
      if (error instanceof AuthError) {
        sendJson(response, error.status, { error: error.message });
        return;
      }

      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Unable to load entity detail.",
      });
    }

    return;
  }

  if (
    (request.method === "POST" && requestUrl.pathname === "/api/world/entities") ||
    (request.method === "PUT" && requestUrl.pathname.startsWith("/api/world/entities/"))
  ) {
    if (!viewer) {
      sendJson(response, 401, { error: "Sign in is required." });
      return;
    }

    let rawBody = "";

    for await (const chunk of request) {
      rawBody += chunk;
    }

    try {
      const payload = JSON.parse(rawBody) as WorldBrowserEntitySaveRequest;
      const result = await saveWorldEntity(worldRoot, viewer, {
        ...payload,
        id:
          request.method === "PUT"
            ? decodeURIComponent(requestUrl.pathname.replace("/api/world/entities/", ""))
            : payload.id,
      });
      sendJson(response, request.method === "POST" ? 201 : 200, result, session ? { "set-cookie": session.cookie, [SESSION_HEADER]: session.token } : {});
    } catch (error) {
      if (error instanceof AuthError) {
        sendJson(response, error.status, { error: error.message });
        return;
      }

      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Unable to save entity.",
      });
    }

    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/world/entity-drafts") {
    if (!viewer) {
      sendJson(response, 401, { error: "Sign in is required." });
      return;
    }

    let rawBody = "";

    for await (const chunk of request) {
      rawBody += chunk;
    }

    try {
      const payload = JSON.parse(rawBody) as WorldEntityDraftRequest;
      const result = await generateWorldEntityDraft(worldRoot, viewer, payload);
      sendJson(response, 200, result, session ? { "set-cookie": session.cookie, [SESSION_HEADER]: session.token } : {});
    } catch (error) {
      if (error instanceof AuthError) {
        sendJson(response, error.status, { error: error.message });
        return;
      }

      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Unable to generate draft entity.",
      });
    }

    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/world/prose-assistance") {
    if (!viewer) {
      sendJson(response, 401, { error: "Sign in is required." });
      return;
    }

    let rawBody = "";

    for await (const chunk of request) {
      rawBody += chunk;
    }

    try {
      const payload = JSON.parse(rawBody) as WorldEditorProseAssistRequest;
      const result = await assistEditorProse(worldRoot, viewer, payload);
      sendJson(response, 200, result, session ? { "set-cookie": session.cookie, [SESSION_HEADER]: session.token } : {});
    } catch (error) {
      if (error instanceof AuthError) {
        sendJson(response, error.status, { error: error.message });
        return;
      }

      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Unable to generate prose assistance.",
      });
    }

    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/world/editor-suggestions") {
    if (!viewer) {
      sendJson(response, 401, { error: "Sign in is required." });
      return;
    }

    let rawBody = "";

    for await (const chunk of request) {
      rawBody += chunk;
    }

    try {
      const payload = JSON.parse(rawBody) as WorldEditorSuggestionRequest;
      const result = await generateEditorSuggestions(worldRoot, viewer, payload);
      sendJson(response, 200, result, session ? { "set-cookie": session.cookie, [SESSION_HEADER]: session.token } : {});
    } catch (error) {
      if (error instanceof AuthError) {
        sendJson(response, error.status, { error: error.message });
        return;
      }

      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Unable to review editor suggestions.",
      });
    }

    return;
  }

  if (request.method === "POST" && request.url === "/api/actor-reaction") {
    let rawBody = "";

    for await (const chunk of request) {
      rawBody += chunk;
    }

    try {
      const payload = JSON.parse(rawBody) as ActorReactionRequest;
      const result = await createActorReactionResponse(reader, payload);
      sendJson(response, 200, result);
    } catch (error) {
      if (error instanceof ActorReactionError) {
        sendJson(response, error.status, {
          error: error.message,
          details: error.details ?? null,
        });
        return;
      }

      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Unexpected server error.",
      });
    }

    return;
  }

  if (request.method === "GET" && !requestUrl.pathname.startsWith("/api")) {
    const requestedPath =
      requestUrl.pathname === "/"
        ? path.join(distRoot, "index.html")
        : path.join(distRoot, requestUrl.pathname.replace(/^\/+/, ""));

    try {
      const target = await stat(requestedPath).then((entry) => (entry.isFile() ? requestedPath : path.join(distRoot, "index.html")));
      await sendFile(response, target, contentTypeFor(target));
      return;
    } catch {
      const fallbackPath = path.join(distRoot, "index.html");
      try {
        await sendFile(response, fallbackPath, contentTypeFor(fallbackPath));
        return;
      } catch {
        sendText(response, 404, "Built app assets are not present. Run `pnpm run build` in Source/ first.");
        return;
      }
    }
  }

  sendJson(response, 404, { error: `No route for ${request.method ?? "UNKNOWN"} ${request.url}` });
});

server.listen(port, host, () => {
  console.log(`triathenum-server listening on http://${host}:${port}`);
  console.log(`vault root: ${vaultRoot}`);
});
