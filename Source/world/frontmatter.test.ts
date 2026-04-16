import { describe, expect, it } from "vitest";

import { parseFrontmatterDocument, serializeFrontmatterDocument } from "./frontmatter.js";

describe("parseFrontmatterDocument", () => {
  it("parses quoted strings, booleans, arrays, and nested objects via YAML", () => {
    const input = `---
title: "The River: A History"
published: true
rating: 4
aliases:
  - Councilor Tanaka
  - "Eliana: River Voice"
extensions:
  nested:
    enabled: false
    labels:
      - alpha
      - beta
empty_list: []
empty_object: {}
---
Body text`;

    const parsed = parseFrontmatterDocument(input);

    expect(parsed.frontmatter).toEqual({
      title: "The River: A History",
      published: true,
      rating: 4,
      aliases: ["Councilor Tanaka", "Eliana: River Voice"],
      extensions: {
        nested: {
          enabled: false,
          labels: ["alpha", "beta"],
        },
      },
      empty_list: [],
      empty_object: {},
    });
    expect(parsed.body).toBe("Body text");
  });
});

describe("serializeFrontmatterDocument", () => {
  it("round-trips representative YAML edge cases without losing structure", () => {
    const frontmatter = {
      title: "The River: A History",
      published: false,
      aliases: ["Councilor Tanaka", "Eliana"],
      metadata: {
        summary: "North: River crossing",
        flags: [true, false],
        counts: [1, 2],
      },
      extensions: {
        nested: {
          enabled: true,
          notes: ["alpha", "beta"],
        },
      },
      empty_list: [],
      empty_object: {},
    };

    const serialized = serializeFrontmatterDocument(frontmatter, "Body text");
    const reparsed = parseFrontmatterDocument(serialized);

    expect(serialized).toContain("metadata:");
    expect(serialized).toContain("  summary:");
    expect(serialized).toContain("empty_list: []");
    expect(serialized).toContain("empty_object: {}");
    expect(reparsed).toEqual({
      frontmatter,
      body: "Body text",
    });
  });
});
