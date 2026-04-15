import path from "node:path";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { FileSystemWorldDocumentStore, parseEntityDocument, serializeEntityDocument } from "./index.js";

const fixtureRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "__fixtures__",
  "world",
);

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("parseEntityDocument", () => {
  it("parses a markdown entity into the shared application model", async () => {
    const filePath = path.join(fixtureRoot, "characters", "eliana-tanaka.md");
    const source = await readFile(filePath, "utf8");

    const document = parseEntityDocument(filePath, source);

    expect(document.envelope.id).toBe("character-eliana-tanaka");
    expect(document.envelope.entityType).toBe("character");
    expect(document.envelope.aliases).toEqual(["Councilor Tanaka", "Eliana"]);
    expect(document.envelope.relationships).toHaveLength(2);
    expect(document.envelope.media).toEqual([]);
    expect(document.fields.status).toBe("alive");
    expect(document.body).toContain("[[Council of Twelve Regions]]");
  });
});

describe("serializeEntityDocument", () => {
  it("round-trips the entity model through YAML frontmatter serialization", async () => {
    const filePath = path.join(fixtureRoot, "locations", "silverkeep.md");
    const source = await readFile(filePath, "utf8");

    const parsed = parseEntityDocument(filePath, source);
    const serialized = serializeEntityDocument(parsed);
    const reparsed = parseEntityDocument(filePath, serialized);

    expect(reparsed).toEqual(parsed);
  });

  it("round-trips media assets in the shared document model", async () => {
    const filePath = path.join(fixtureRoot, "locations", "silverkeep.md");
    const source = await readFile(filePath, "utf8");
    const parsed = parseEntityDocument(filePath, source);
    parsed.envelope.media = [
      {
        id: "city-map",
        kind: "image",
        path: "media/location-silverkeep/city-map.png",
        contentType: "image/png",
        originalFileName: "city-map.png",
        alt: "Silverkeep from above",
        caption: "A useful map sketch.",
      },
    ];

    const reparsed = parseEntityDocument(filePath, serializeEntityDocument(parsed));
    expect(reparsed.envelope.media).toEqual(parsed.envelope.media);
  });
});

describe("FileSystemWorldDocumentStore", () => {
  it("loads markdown entities and writes updated documents back to disk", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-store-"));
    tempDirs.push(tempRoot);

    const store = new FileSystemWorldDocumentStore(fixtureRoot);
    const documents = await store.loadEntityDocuments();
    const writeStore = new FileSystemWorldDocumentStore(tempRoot);
    const targetDocument = store.withRootDocumentPath(
      {
        ...documents[0],
        body: `${documents[0]?.body}\nA new planning annotation.`,
      },
      "exports/copied-entity.md",
    );
    const writableDocument = writeStore.withRootDocumentPath(targetDocument, "exports/copied-entity.md");
    await writeStore.writeEntityDocument(writableDocument);
    const loaded = await writeStore.readEntityDocument(writableDocument.path);

    expect(documents).toHaveLength(4);
    expect(loaded.envelope.id).toBe(writableDocument.envelope.id);
    expect(loaded.body).toContain("A new planning annotation.");
  });
});
