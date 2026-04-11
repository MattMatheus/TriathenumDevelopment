import { createServer } from "node:http";
import type { ServerResponse } from "node:http";

import { FileSystemVaultReader } from "../retrieval/index.js";
import type { ActorReactionRequest } from "../contracts/index.js";
import { ActorReactionError, createActorReactionResponse, defaultVaultRoot } from "./actor-reaction-service.js";

const port = Number.parseInt(process.env.PORT ?? "4174", 10);
const vaultRoot = process.env.TRIATHENUM_VAULT_ROOT ?? defaultVaultRoot();
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
    sendJson(response, 200, { ok: true, vaultRoot });
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
