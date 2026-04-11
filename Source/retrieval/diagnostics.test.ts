import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { FileSystemVaultReader } from "./file-system-vault.js";
import { buildRetrievalDiagnostics, formatRetrievalDiagnostics } from "./diagnostics.js";

const fixtureRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "__fixtures__",
  "vault",
);

describe("buildRetrievalDiagnostics", () => {
  it("returns a resolved diagnostics bundle with grouped source context", async () => {
    const reader = new FileSystemVaultReader(fixtureRoot);
    const diagnostics = await buildRetrievalDiagnostics(
      reader,
      "Eliana Tanaka",
      "Support a controversial infrastructure vote that may require public ratification.",
    );

    expect(diagnostics.outcome).toBe("resolved");
    expect(diagnostics.bundle?.sources.length).toBeGreaterThan(0);
    expect(diagnostics.bundle?.sourceGroups.subjectNote).toHaveLength(1);
    expect(diagnostics.bundle?.sources[0]?.retrievalAdapter).toBeDefined();
    expect(diagnostics.resolution.kind).toBe("resolved");
    if (diagnostics.resolution.kind !== "resolved") {
      return;
    }

    expect(diagnostics.resolution.note.body.length).toBeGreaterThan(0);
    expect(diagnostics.resolution.note.title).toBe("Eliana Tanaka");
  });

  it("formats readable diagnostics output for a resolved actor query", async () => {
    const reader = new FileSystemVaultReader(fixtureRoot);
    const diagnostics = await buildRetrievalDiagnostics(
      reader,
      "Eliana Tanaka",
      "Support a controversial infrastructure vote that may require public ratification.",
    );

    const output = formatRetrievalDiagnostics(diagnostics);

    expect(output).toContain("Outcome: resolved");
    expect(output).toContain("Selected Sources:");
    expect(output).toContain("role=subject_note");
    expect(output).toContain("adapter=");
  });
});
