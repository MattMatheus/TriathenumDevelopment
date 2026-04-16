import type { IncomingMessage } from "node:http";
import path from "node:path";

export class RequestBodyError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "RequestBodyError";
  }
}

export class PathContainmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PathContainmentError";
  }
}

export function resolveContainedPath(root: string, candidatePath: string): string {
  const resolvedRoot = path.resolve(root);
  const resolvedCandidate = path.resolve(resolvedRoot, candidatePath);

  if (resolvedCandidate !== resolvedRoot && !resolvedCandidate.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new PathContainmentError("Requested path escapes the allowed root.");
  }

  return resolvedCandidate;
}

export function resolveStaticAssetPath(distRoot: string, requestPathname: string): string {
  return resolveContainedPath(distRoot, requestPathname === "/" ? "index.html" : requestPathname.replace(/^\/+/, ""));
}

export async function readRequestBody(request: IncomingMessage, maxBytes: number): Promise<string> {
  const contentLengthHeader = request.headers["content-length"];
  const contentLength = Array.isArray(contentLengthHeader)
    ? Number.parseInt(contentLengthHeader[0] ?? "", 10)
    : Number.parseInt(contentLengthHeader ?? "", 10);

  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new RequestBodyError(413, `Request body exceeds the ${maxBytes}-byte limit.`);
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += bufferChunk.byteLength;
    if (totalBytes > maxBytes) {
      throw new RequestBodyError(413, `Request body exceeds the ${maxBytes}-byte limit.`);
    }

    chunks.push(bufferChunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}
