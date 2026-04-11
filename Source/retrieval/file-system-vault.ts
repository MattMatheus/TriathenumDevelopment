import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { extractWikilinks, firstNonEmptyLine, makeExcerpt } from "./text.js";
import type { NoteDocument, VaultReader } from "./types.js";

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

  return results;
}

function extractTitle(body: string, filePath: string): string {
  const heading = body
    .split("\n")
    .find((line) => line.trim().startsWith("# "))
    ?.replace(/^#\s+/, "")
    .trim();

  if (heading) {
    return heading;
  }

  return path.basename(filePath, ".md");
}

export class FileSystemVaultReader implements VaultReader {
  constructor(private readonly vaultRoot: string) {}

  async listMarkdownFiles(): Promise<string[]> {
    return walk(this.vaultRoot);
  }

  async readNote(filePath: string): Promise<NoteDocument> {
    const body = await readFile(filePath, "utf8");
    const title = extractTitle(body, filePath);
    const excerptSource = body.replace(/^---[\s\S]*?---\n?/, "");

    return {
      path: filePath,
      title,
      body,
      excerpt: makeExcerpt(firstNonEmptyLine(excerptSource) || excerptSource),
      wikilinks: extractWikilinks(body),
    };
  }
}
