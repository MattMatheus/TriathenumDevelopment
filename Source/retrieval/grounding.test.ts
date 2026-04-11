import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { FileSystemVaultReader } from "./file-system-vault.js";
import { buildGroundingBundle, resolveEntity } from "./grounding.js";

const fixtureRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "__fixtures__",
  "vault",
);

describe("resolveEntity", () => {
  it("resolves an actor note by exact title match", async () => {
    const reader = new FileSystemVaultReader(fixtureRoot);
    const result = await resolveEntity(reader, "Eliana Tanaka");

    expect(result.kind).toBe("resolved");
    if (result.kind !== "resolved") {
      return;
    }

    expect(result.entity.name).toBe("Eliana Tanaka");
    expect(result.entity.entityType).toBe("character");
  });

  it("returns not_found when no actor matches", async () => {
    const reader = new FileSystemVaultReader(fixtureRoot);
    const result = await resolveEntity(reader, "Unknown Person");

    expect(result).toEqual({
      kind: "not_found",
      query: "Unknown Person",
    });
  });
});

describe("buildGroundingBundle", () => {
  it("builds a deterministic grounding bundle with citations", async () => {
    const reader = new FileSystemVaultReader(fixtureRoot);
    const result = await buildGroundingBundle(
      reader,
      "Eliana Tanaka",
      "Support a controversial council infrastructure vote",
    );

    expect("kind" in result).toBe(false);
    if ("kind" in result) {
      return;
    }

    expect(result.bundle.subject.name).toBe("Eliana Tanaka");
    expect(result.bundle.facts.length).toBeGreaterThan(0);
    expect(result.bundle.facts.some((fact) => fact.statement === "---")).toBe(false);
    expect(result.bundle.facts.some((fact) => fact.statement.startsWith("type:"))).toBe(false);
    expect(result.bundle.sources.map((source) => source.title)).toContain("Council of Twelve Regions");
    expect(result.bundle.sourceGroups.subjectNote).toHaveLength(1);
    expect(result.bundle.sourceGroups.linkedCanon.map((source) => source.title)).toContain("Council of Twelve Regions");
    expect(
      result.bundle.sources.every(
        (source) => source.sourceRole !== undefined && (source.inclusionReasons?.length ?? 0) > 0,
      ),
    ).toBe(true);
    expect(result.bundle.tensions.some((tension) => tension.statement.includes("How much political risk"))).toBe(
      true,
    );
    expect(result.bundle.unresolvedQuestions.length).toBeGreaterThan(0);
  });
});
