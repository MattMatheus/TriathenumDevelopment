import YAML from "yaml";

import type { FrontmatterObject, FrontmatterValue, ParsedFrontmatterDocument } from "./types.js";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function normalizeFrontmatterValue(value: unknown): FrontmatterValue | undefined {
  if (value === null) {
    return null;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => {
      const normalized = normalizeFrontmatterValue(entry);
      return normalized === undefined ? [] : [normalized];
    });
  }

  if (!isPlainObject(value)) {
    return undefined;
  }

  const normalized: FrontmatterObject = {};

  for (const [key, entry] of Object.entries(value)) {
    const normalizedEntry = normalizeFrontmatterValue(entry);
    if (normalizedEntry !== undefined) {
      normalized[key] = normalizedEntry;
    }
  }

  return normalized;
}

function normalizeFrontmatterObject(value: unknown): FrontmatterObject {
  const normalized = normalizeFrontmatterValue(value);
  return normalized && typeof normalized === "object" && !Array.isArray(normalized) ? normalized : {};
}

export function parseFrontmatterDocument(input: string): ParsedFrontmatterDocument {
  if (!input.startsWith("---\n")) {
    return {
      frontmatter: {},
      body: input,
    };
  }

  const endIndex = input.indexOf("\n---\n", 4);
  if (endIndex === -1) {
    return {
      frontmatter: {},
      body: input,
    };
  }

  const frontmatterSource = input.slice(4, endIndex);
  const body = input.slice(endIndex + 5);
  const document = YAML.parseDocument(frontmatterSource, {
    merge: false,
    prettyErrors: false,
  });

  if (document.errors.length > 0) {
    return {
      frontmatter: {},
      body,
    };
  }

  return {
    frontmatter: normalizeFrontmatterObject(document.toJS()),
    body,
  };
}

export function serializeFrontmatterDocument(frontmatter: FrontmatterObject, body: string): string {
  const source = YAML.stringify(normalizeFrontmatterObject(frontmatter), {
    defaultStringType: "PLAIN",
    indent: 2,
    lineWidth: 0,
  }).trimEnd();

  return `---\n${source}\n---\n${body}`;
}
