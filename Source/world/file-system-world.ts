import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { EntityDocument, WorldEntityType } from "../contracts/index.js";
import { PathContainmentError } from "../server/http-utils.js";
import { parseEntityDocument, serializeEntityDocument, updateEntityDocumentPath } from "./document.js";
import type { WorldDocumentStore } from "./types.js";

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...(await walk(fullPath)));
      continue;
    }

    if (entry.isFile() && fullPath.endsWith(".md")) {
      results.push(fullPath);
    }
  }

  return results.sort((left, right) => left.localeCompare(right));
}

function resolvePathInsideWorld(worldRoot: string, relativePath: string): string {
  const resolvedRoot = path.resolve(worldRoot);
  const resolvedPath = path.resolve(resolvedRoot, relativePath);

  if (resolvedPath !== resolvedRoot && !resolvedPath.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new PathContainmentError("Media path escapes the world root.");
  }

  return resolvedPath;
}

export class FileSystemWorldDocumentStore implements WorldDocumentStore {
  constructor(private readonly worldRoot: string) {}

  mediaRoot(): string {
    return path.join(this.worldRoot, "media");
  }

  async listEntityPaths(): Promise<string[]> {
    return walk(this.worldRoot);
  }

  async readEntityDocument(filePath: string): Promise<EntityDocument> {
    const source = await readFile(filePath, "utf8");
    return parseEntityDocument(filePath, source);
  }

  async writeEntityDocument(document: EntityDocument): Promise<void> {
    await mkdir(path.dirname(document.path), { recursive: true });
    await writeFile(document.path, serializeEntityDocument(document), "utf8");
  }

  async loadEntityDocuments(): Promise<EntityDocument[]> {
    const paths = await this.listEntityPaths();
    return Promise.all(paths.map((filePath) => this.readEntityDocument(filePath)));
  }

  withRootDocumentPath(document: EntityDocument, relativePath: string): EntityDocument {
    return updateEntityDocumentPath(document, path.join(this.worldRoot, relativePath));
  }

  buildEntityPath(entityType: WorldEntityType, nameOrId: string): string {
    const folder = entityType === "magic_system_or_technology" ? "systems" : `${entityType}s`;
    const slug = nameOrId
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "untitled-entity";

    return path.join(this.worldRoot, folder, `${slug}.md`);
  }

  resolveMediaPath(relativeMediaPath: string): string {
    return resolvePathInsideWorld(this.worldRoot, relativeMediaPath);
  }

  buildMediaPath(entityId: string, originalFileName: string): string {
    const parsed = path.parse(originalFileName);
    const safeBaseName = (parsed.name || "asset")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "asset";
    const extension = parsed.ext.toLowerCase();
    return path.join("media", entityId, `${safeBaseName}-${randomUUID().slice(0, 8)}${extension}`);
  }

  async writeMediaAsset(relativeMediaPath: string, contents: Buffer): Promise<string> {
    const absolutePath = this.resolveMediaPath(relativeMediaPath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, contents);
    return absolutePath;
  }
}
