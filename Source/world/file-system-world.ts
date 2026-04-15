import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { EntityDocument, WorldEntityType } from "../contracts/index.js";
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

export class FileSystemWorldDocumentStore implements WorldDocumentStore {
  constructor(private readonly worldRoot: string) {}

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
}
