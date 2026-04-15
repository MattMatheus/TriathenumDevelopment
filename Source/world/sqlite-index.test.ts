import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { FileSystemWorldDocumentStore, SqliteWorldIndex } from "./index.js";

const fixtureRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "__fixtures__",
  "world",
);

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("SqliteWorldIndex", () => {
  it("rebuilds a deterministic local index from markdown entities", async () => {
    const store = new FileSystemWorldDocumentStore(fixtureRoot);
    const documents = await store.loadEntityDocuments();

    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "worldforge-index-"));
    tempDirs.push(tempRoot);

    const index = new SqliteWorldIndex(path.join(tempRoot, "worldforge.sqlite"));
    index.rebuild(documents);

    const entities = index.listEntities();
    const riverMatches = index.searchEntities("river");
    const silverkeepBacklinks = index.listBacklinks("location-silverkeep");
    const unresolved = index.listUnresolvedReferences();
    const references = index.listReferences();

    expect(entities.map((entity) => entity.id)).toEqual([
      "faction-council-of-twelve-regions",
      "character-eliana-tanaka",
      "location-silverkeep",
      "lore-river-levy-crisis",
    ]);
    expect(riverMatches.map((entity) => entity.id)).toEqual([
      "faction-council-of-twelve-regions",
      "location-silverkeep",
      "lore-river-levy-crisis",
    ]);
    expect(silverkeepBacklinks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceEntityId: "character-eliana-tanaka",
          referenceKind: "relationship",
        }),
        expect.objectContaining({
          sourceEntityId: "character-eliana-tanaka",
          referenceKind: "wikilink",
        }),
        expect.objectContaining({
          sourceEntityId: "faction-council-of-twelve-regions",
          referenceKind: "relationship",
        }),
      ]),
    );
    expect(unresolved).toEqual([
      expect.objectContaining({
        sourceEntityId: "character-eliana-tanaka",
        targetText: "Sunken Archive",
      }),
    ]);
    expect(
      references.some(
        (reference) =>
          reference.sourceEntityId === "character-eliana-tanaka" &&
          reference.targetEntityId === "faction-council-of-twelve-regions",
      ),
    ).toBe(true);

    index.close();
  });
});
