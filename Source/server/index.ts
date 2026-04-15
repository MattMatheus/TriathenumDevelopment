import { createServer } from "node:http";
import type { ServerResponse } from "node:http";
import { URL } from "node:url";

import { FileSystemVaultReader } from "../retrieval/index.js";
import type { ActorReactionRequest, WorldBrowserEntitySaveRequest } from "../contracts/index.js";
import { ActorReactionError, createActorReactionResponse, defaultVaultRoot } from "./actor-reaction-service.js";
import { defaultWorldRoot, loadWorldBrowserPayload, loadWorldEntityDetail, saveWorldEntity } from "./world-browser-service.js";

const port = Number.parseInt(process.env.PORT ?? "4174", 10);
const vaultRoot = process.env.TRIATHENUM_VAULT_ROOT ?? defaultVaultRoot();
const worldRoot = defaultWorldRoot();
const reader = new FileSystemVaultReader(vaultRoot);

function sendJson(response: ServerResponse, status: number, payload: unknown) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  response.end(JSON.stringify(payload));
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

  if (request.method === "GET" && requestUrl.pathname === "/api/world/entities") {
    try {
      const payload = await loadWorldBrowserPayload(worldRoot, requestUrl.searchParams.get("q") ?? undefined);
      sendJson(response, 200, payload);
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Unable to load world browser.",
      });
    }

    return;
  }

  if (request.method === "GET" && requestUrl.pathname.startsWith("/api/world/entities/")) {
    const entityId = decodeURIComponent(requestUrl.pathname.replace("/api/world/entities/", ""));

    try {
      const payload = await loadWorldEntityDetail(worldRoot, entityId);
      if (!payload) {
        sendJson(response, 404, { error: `Entity not found for id ${entityId}` });
        return;
      }

      sendJson(response, 200, payload);
    } catch (error) {
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
    let rawBody = "";

    for await (const chunk of request) {
      rawBody += chunk;
    }

    try {
      const payload = JSON.parse(rawBody) as WorldBrowserEntitySaveRequest;
      const result = await saveWorldEntity(worldRoot, {
        ...payload,
        id:
          request.method === "PUT"
            ? decodeURIComponent(requestUrl.pathname.replace("/api/world/entities/", ""))
            : payload.id,
      });
      sendJson(response, request.method === "POST" ? 201 : 200, result);
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Unable to save entity.",
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

  sendJson(response, 404, { error: `No route for ${request.method ?? "UNKNOWN"} ${request.url}` });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`triathenum-server listening on http://127.0.0.1:${port}`);
  console.log(`vault root: ${vaultRoot}`);
});
