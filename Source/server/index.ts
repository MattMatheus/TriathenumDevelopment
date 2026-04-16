import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { URL } from "node:url";

import { FileSystemVaultReader } from "../retrieval/index.js";
import type {
  AISettingsUpdateRequest,
  ActorReactionRequest,
  AuthAccountProvisionRequest,
  AuthLoginRequest,
  WorldConsistencyReviewRequest,
  WorldDigestRequest,
  WorldEditorSuggestionRequest,
  WorldEditorProseAssistRequest,
  WorldImportApplyRequest,
  WorldImportReviewRequest,
  WorldBrowserMediaUploadRequest,
  WorldBrowserEntitySaveRequest,
} from "../contracts/index.js";
import { AISettingsError, FileSystemAISettingsStore, loadAIWorldContext } from "./ai-service.js";
import { ActorReactionError, createActorReactionResponse, defaultVaultRoot } from "./actor-reaction-service.js";
import type { WorldEntityDraftRequest } from "../contracts/index.js";
import { assertSafeOwnerBootstrap, AuthError, FileSystemAuthStore } from "./auth-service.js";
import { PathContainmentError, RequestBodyError, readRequestBody, resolveStaticAssetPath } from "./http-utils.js";
import { generateWorldEntityDraft } from "./draft-generation-service.js";
import { generateWorldDigest } from "./digest-service.js";
import { generateEditorSuggestions } from "./editor-suggestion-service.js";
import { buildWorldExportPackage } from "./export-package-service.js";
import { loadEntityGraph } from "./graph-service.js";
import { applyImportPackage } from "./import-apply-service.js";
import { reviewImportPackage } from "./import-review-service.js";
import { loadWorldMapNavigation } from "./map-navigation-service.js";
import { assistEditorProse } from "./prose-assistance-service.js";
import { reviewWorldConsistency } from "./consistency-review-service.js";
import { searchWorldSemantically } from "./semantic-search-service.js";
import { loadWorldTimeline } from "./timeline-service.js";
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
const distRoot = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "dist");
const MAX_JSON_BODY_BYTES = 5 * 1024 * 1024;
const MAX_MEDIA_BODY_BYTES = 12 * 1024 * 1024;

assertSafeOwnerBootstrap(host);

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

function sendBuffer(
  response: ServerResponse,
  status: number,
  contents: Buffer,
  contentType: string,
  downloadName?: string,
  headers: Record<string, string> = {},
) {
  response.writeHead(status, {
    "content-type": contentType,
    ...(downloadName ? { "content-disposition": `attachment; filename="${safeDispositionFilename(downloadName)}"` } : {}),
    ...headers,
  });
  response.end(contents);
}

function authHeaders(session: { cookie: string } | null): Record<string, string> {
  return session ? { "set-cookie": session.cookie } : {};
}

async function readJsonRequestBody(request: IncomingMessage, maxBytes: number): Promise<string> {
  return readRequestBody(request, maxBytes);
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
  const session = await authStore.resolveSession(request.headers.cookie);
  const viewer = session?.payload.viewer ?? null;

  if (request.method === "GET" && requestUrl.pathname === "/api/auth/session") {
    if (!session) {
      sendJson(response, 401, { error: "No active session." });
      return;
    }

    sendJson(response, 200, session.payload, authHeaders(session));
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/auth/session") {
    try {
      const rawBody = await readJsonRequestBody(request, MAX_JSON_BODY_BYTES);
      const payload = JSON.parse(rawBody) as AuthLoginRequest;
      const result = await authStore.createSession(payload);
      sendJson(response, 200, result.payload, { "set-cookie": result.cookie });
    } catch (error) {
      if (error instanceof RequestBodyError) {
        sendJson(response, error.status, { error: error.message });
        return;
      }
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
      sendJson(response, 200, { accounts }, authHeaders(session));
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
      sendJson(response, 200, payload, authHeaders(session));
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

    if (viewer.role !== "owner") {
      sendJson(response, 403, { error: "Only the owner can update AI settings." }, authHeaders(session));
      return;
    }

    try {
      const rawBody = await readJsonRequestBody(request, MAX_JSON_BODY_BYTES);
      const payload = JSON.parse(rawBody) as AISettingsUpdateRequest;
      const result = await aiSettingsStore.save(payload);
      sendJson(response, 200, result, authHeaders(session));
    } catch (error) {
      if (error instanceof RequestBodyError) {
        sendJson(response, error.status, { error: error.message });
        return;
      }
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
      sendJson(response, 200, payload, authHeaders(session));
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

    try {
      const rawBody = await readJsonRequestBody(request, MAX_JSON_BODY_BYTES);
      const payload = JSON.parse(rawBody) as AuthAccountProvisionRequest;
      const account = await authStore.createOwnerManagedAccount(viewer, payload);
      sendJson(response, 201, account, authHeaders(session));
    } catch (error) {
      if (error instanceof RequestBodyError) {
        sendJson(response, error.status, { error: error.message });
        return;
      }
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
      sendJson(response, 200, payload, authHeaders(session));
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
      sendJson(response, 200, payload, authHeaders(session));
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
    try {
      const rawBody = await readJsonRequestBody(request, MAX_MEDIA_BODY_BYTES);
      const payload = JSON.parse(rawBody) as WorldBrowserMediaUploadRequest;
      const result = await attachMediaToEntity(worldRoot, viewer, entityId, payload);
      sendJson(response, 201, result, authHeaders(session));
    } catch (error) {
      if (error instanceof RequestBodyError) {
        sendJson(response, error.status, { error: error.message });
        return;
      }
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
      if (error instanceof PathContainmentError) {
        sendJson(response, 400, { error: error.message }, authHeaders(session));
        return;
      }
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

      sendJson(response, 200, payload, authHeaders(session));
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

    try {
      const rawBody = await readJsonRequestBody(request, MAX_JSON_BODY_BYTES);
      const payload = JSON.parse(rawBody) as WorldBrowserEntitySaveRequest;
      const result = await saveWorldEntity(worldRoot, viewer, {
        ...payload,
        id:
          request.method === "PUT"
            ? decodeURIComponent(requestUrl.pathname.replace("/api/world/entities/", ""))
            : payload.id,
      });
      sendJson(response, request.method === "POST" ? 201 : 200, result, authHeaders(session));
    } catch (error) {
      if (error instanceof RequestBodyError) {
        sendJson(response, error.status, { error: error.message });
        return;
      }
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

    try {
      const rawBody = await readJsonRequestBody(request, MAX_JSON_BODY_BYTES);
      const payload = JSON.parse(rawBody) as WorldEntityDraftRequest;
      const result = await generateWorldEntityDraft(worldRoot, viewer, payload);
      sendJson(response, 200, result, authHeaders(session));
    } catch (error) {
      if (error instanceof RequestBodyError) {
        sendJson(response, error.status, { error: error.message });
        return;
      }
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

    try {
      const rawBody = await readJsonRequestBody(request, MAX_JSON_BODY_BYTES);
      const payload = JSON.parse(rawBody) as WorldEditorProseAssistRequest;
      const result = await assistEditorProse(worldRoot, viewer, payload);
      sendJson(response, 200, result, authHeaders(session));
    } catch (error) {
      if (error instanceof RequestBodyError) {
        sendJson(response, error.status, { error: error.message });
        return;
      }
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

    try {
      const rawBody = await readJsonRequestBody(request, MAX_JSON_BODY_BYTES);
      const payload = JSON.parse(rawBody) as WorldEditorSuggestionRequest;
      const result = await generateEditorSuggestions(worldRoot, viewer, payload);
      sendJson(response, 200, result, authHeaders(session));
    } catch (error) {
      if (error instanceof RequestBodyError) {
        sendJson(response, error.status, { error: error.message });
        return;
      }
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

  if (request.method === "POST" && requestUrl.pathname === "/api/world/consistency-review") {
    if (!viewer) {
      sendJson(response, 401, { error: "Sign in is required." });
      return;
    }

    try {
      const rawBody = await readJsonRequestBody(request, MAX_JSON_BODY_BYTES);
      const payload = JSON.parse(rawBody) as WorldConsistencyReviewRequest;
      const result = await reviewWorldConsistency(worldRoot, viewer, payload);
      sendJson(response, 200, result, authHeaders(session));
    } catch (error) {
      if (error instanceof RequestBodyError) {
        sendJson(response, error.status, { error: error.message });
        return;
      }
      if (error instanceof AuthError) {
        sendJson(response, error.status, { error: error.message });
        return;
      }

      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Unable to review world consistency.",
      });
    }

    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/world/timeline") {
    if (!viewer) {
      sendJson(response, 401, { error: "Sign in is required." });
      return;
    }

    try {
      const result = await loadWorldTimeline(worldRoot, viewer);
      sendJson(response, 200, result, authHeaders(session));
    } catch (error) {
      if (error instanceof AuthError) {
        sendJson(response, error.status, { error: error.message });
        return;
      }

      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Unable to load the timeline workspace.",
      });
    }

    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/world/graph") {
    if (!viewer) {
      sendJson(response, 401, { error: "Sign in is required." });
      return;
    }

    const entityId = requestUrl.searchParams.get("entityId")?.trim();
    if (!entityId) {
      sendJson(response, 400, { error: "An entityId query parameter is required." }, authHeaders(session));
      return;
    }

    try {
      const result = await loadEntityGraph(worldRoot, viewer, entityId);
      if (!result) {
        sendJson(response, 404, { error: "Entity graph not found." }, authHeaders(session));
        return;
      }

      sendJson(response, 200, result, authHeaders(session));
    } catch (error) {
      if (error instanceof AuthError) {
        sendJson(response, error.status, { error: error.message });
        return;
      }

      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Unable to load the graph explorer.",
      });
    }

    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/world/digest") {
    if (!viewer) {
      sendJson(response, 401, { error: "Sign in is required." });
      return;
    }

    try {
      const rawBody = await readJsonRequestBody(request, MAX_JSON_BODY_BYTES);
      const payload = JSON.parse(rawBody) as WorldDigestRequest;
      const result = await generateWorldDigest(worldRoot, viewer, payload);
      sendJson(response, 200, result, authHeaders(session));
    } catch (error) {
      if (error instanceof RequestBodyError) {
        sendJson(response, error.status, { error: error.message });
        return;
      }
      if (error instanceof AuthError) {
        sendJson(response, error.status, { error: error.message });
        return;
      }

      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Unable to generate the world-state digest.",
      });
    }

    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/world/map-navigation") {
    if (!viewer) {
      sendJson(response, 401, { error: "Sign in is required." });
      return;
    }

    try {
      const result = await loadWorldMapNavigation(worldRoot, viewer);
      sendJson(response, 200, result, authHeaders(session));
    } catch (error) {
      if (error instanceof AuthError) {
        sendJson(response, error.status, { error: error.message });
        return;
      }

      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Unable to load the map-linked navigator.",
      });
    }

    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/world/export-package") {
    if (!viewer) {
      sendJson(response, 401, { error: "Sign in is required." });
      return;
    }

    try {
      const result = await buildWorldExportPackage(worldRoot, viewer);
      sendBuffer(response, 200, result.contents, result.contentType, result.fileName, authHeaders(session));
    } catch (error) {
      if (error instanceof AuthError) {
        sendJson(response, error.status, { error: error.message });
        return;
      }

      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Unable to export the world package.",
      });
    }

    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/world/import-review") {
    if (!viewer) {
      sendJson(response, 401, { error: "Sign in is required." });
      return;
    }

    try {
      const rawBody = await readJsonRequestBody(request, MAX_MEDIA_BODY_BYTES);
      const payload = JSON.parse(rawBody) as WorldImportReviewRequest;
      const result = await reviewImportPackage(worldRoot, viewer, payload);
      sendJson(response, 200, result, authHeaders(session));
    } catch (error) {
      if (error instanceof RequestBodyError) {
        sendJson(response, error.status, { error: error.message });
        return;
      }
      if (error instanceof AuthError) {
        sendJson(response, error.status, { error: error.message });
        return;
      }

      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Unable to review the import package.",
      });
    }

    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/world/import-apply") {
    if (!viewer) {
      sendJson(response, 401, { error: "Sign in is required." });
      return;
    }

    try {
      const rawBody = await readJsonRequestBody(request, MAX_MEDIA_BODY_BYTES);
      const payload = JSON.parse(rawBody) as WorldImportApplyRequest;
      const result = await applyImportPackage(worldRoot, viewer, payload);
      sendJson(response, 200, result, authHeaders(session));
    } catch (error) {
      if (error instanceof RequestBodyError) {
        sendJson(response, error.status, { error: error.message });
        return;
      }
      if (error instanceof AuthError) {
        sendJson(response, error.status, { error: error.message });
        return;
      }

      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Unable to apply the import package.",
      });
    }

    return;
  }

  if (request.method === "POST" && request.url === "/api/actor-reaction") {
    try {
      const rawBody = await readJsonRequestBody(request, MAX_JSON_BODY_BYTES);
      const payload = JSON.parse(rawBody) as ActorReactionRequest;
      const result = await createActorReactionResponse(reader, payload);
      sendJson(response, 200, result);
    } catch (error) {
      if (error instanceof RequestBodyError) {
        sendJson(response, error.status, { error: error.message });
        return;
      }
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
    try {
      const requestedPath = resolveStaticAssetPath(distRoot, requestUrl.pathname);
      const target = await stat(requestedPath).then((entry) => (entry.isFile() ? requestedPath : path.join(distRoot, "index.html")));
      await sendFile(response, target, contentTypeFor(target));
      return;
    } catch (error) {
      if (error instanceof PathContainmentError) {
        sendText(response, 404, "Not found.");
        return;
      }
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
