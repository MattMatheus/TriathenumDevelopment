import type { FrontmatterObject, FrontmatterValue, ParsedFrontmatterDocument } from "./types.js";

function countIndent(line: string): number {
  const match = line.match(/^ */);
  return match?.[0].length ?? 0;
}

function isScalarCandidate(value: string): boolean {
  return !value.includes(": ") && value !== "" && value !== "-" && value !== "{}" && value !== "[]";
}

function parseQuotedString(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  return value;
}

function parseInlineArray(value: string): FrontmatterValue[] {
  const inner = value.slice(1, -1).trim();
  if (!inner) {
    return [];
  }

  return inner
    .split(",")
    .map((part) => parseScalar(part.trim()))
    .filter((part) => part !== undefined);
}

function parseScalar(value: string): FrontmatterValue {
  if (value === "null") {
    return null;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  if (value === "{}") {
    return {};
  }

  if (value === "[]") {
    return [];
  }

  if (value.startsWith("[") && value.endsWith("]")) {
    return parseInlineArray(value);
  }

  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }

  return parseQuotedString(value);
}

function collectNestedBlock(lines: string[], startIndex: number, parentIndent: number): [string[], number] {
  const nested: string[] = [];
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (!line.trim()) {
      nested.push(line);
      index += 1;
      continue;
    }

    if (countIndent(line) <= parentIndent) {
      break;
    }

    nested.push(line);
    index += 1;
  }

  return [nested, index];
}

function parseNode(lines: string[], indent: number): FrontmatterValue {
  const first = lines.find((line) => line.trim());
  if (!first) {
    return {};
  }

  if (first.trim().startsWith("-")) {
    return parseArray(lines, indent);
  }

  return parseObject(lines, indent);
}

function parseArray(lines: string[], indent: number): FrontmatterValue[] {
  const result: FrontmatterValue[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const lineIndent = countIndent(line);
    if (lineIndent < indent) {
      break;
    }

    if (lineIndent !== indent) {
      index += 1;
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed.startsWith("-")) {
      break;
    }

    const remainder = trimmed.slice(1).trimStart();
    if (!remainder) {
      const [nestedLines, nextIndex] = collectNestedBlock(lines, index + 1, indent);
      result.push(parseNode(nestedLines, indent + 2));
      index = nextIndex;
      continue;
    }

    if (remainder.includes(":")) {
      const [nestedLines, nextIndex] = collectNestedBlock(lines, index + 1, indent);
      const syntheticLines = [`${" ".repeat(indent + 2)}${remainder}`, ...nestedLines];
      result.push(parseObject(syntheticLines, indent + 2));
      index = nextIndex;
      continue;
    }

    result.push(parseScalar(remainder));
    index += 1;
  }

  return result;
}

function parseObject(lines: string[], indent: number): FrontmatterObject {
  const result: FrontmatterObject = {};
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const lineIndent = countIndent(line);
    if (lineIndent < indent) {
      break;
    }

    if (lineIndent > indent) {
      index += 1;
      continue;
    }

    const trimmed = line.trim();
    const separatorIndex = trimmed.indexOf(":");
    if (separatorIndex === -1) {
      index += 1;
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const remainder = trimmed.slice(separatorIndex + 1).trim();

    if (remainder) {
      result[key] = parseScalar(remainder);
      index += 1;
      continue;
    }

    const [nestedLines, nextIndex] = collectNestedBlock(lines, index + 1, indent);
    result[key] = nestedLines.length > 0 ? parseNode(nestedLines, indent + 2) : null;
    index = nextIndex;
  }

  return result;
}

function shouldQuote(value: string): boolean {
  return value === "" || /^[-?:[\]{},&*!|>'"%@`]/.test(value) || /:\s/.test(value);
}

function formatScalar(value: Exclude<FrontmatterValue, FrontmatterObject | FrontmatterValue[]>): string {
  if (value === null) {
    return "null";
  }

  if (typeof value === "boolean" || typeof value === "number") {
    return String(value);
  }

  return shouldQuote(value) ? JSON.stringify(value) : value;
}

function serializeArray(values: FrontmatterValue[], indent: number): string[] {
  if (values.length === 0) {
    return [`${" ".repeat(indent)}[]`];
  }

  return values.flatMap((value) => {
    const prefix = `${" ".repeat(indent)}-`;
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return [`${prefix} []`];
      }

      return [prefix, ...serializeArray(value, indent + 2)];
    }

    if (value && typeof value === "object") {
      const entries = Object.entries(value);
      if (entries.length === 0) {
        return [`${prefix} {}`];
      }

      return [prefix, ...serializeObject(value, indent + 2)];
    }

    return [`${prefix} ${formatScalar(value)}`];
  });
}

function serializeObject(value: FrontmatterObject, indent: number): string[] {
  const lines: string[] = [];

  for (const [key, entry] of Object.entries(value)) {
    const prefix = `${" ".repeat(indent)}${key}:`;
    if (Array.isArray(entry)) {
      if (entry.length === 0) {
        lines.push(`${prefix} []`);
        continue;
      }

      const canInline = entry.every(
        (item) => typeof item !== "object" && item !== null && isScalarCandidate(formatScalar(item)),
      );
      if (canInline) {
        lines.push(`${prefix} [${entry.map((item) => formatScalar(item as string | number | boolean | null)).join(", ")}]`);
        continue;
      }

      lines.push(prefix);
      lines.push(...serializeArray(entry, indent + 2));
      continue;
    }

    if (entry && typeof entry === "object") {
      const nestedEntries = Object.keys(entry);
      if (nestedEntries.length === 0) {
        lines.push(`${prefix} {}`);
        continue;
      }

      lines.push(prefix);
      lines.push(...serializeObject(entry, indent + 2));
      continue;
    }

    lines.push(`${prefix} ${formatScalar(entry)}`);
  }

  return lines;
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
  const lines = frontmatterSource.split("\n");

  return {
    frontmatter: parseObject(lines, 0),
    body,
  };
}

export function serializeFrontmatterDocument(frontmatter: FrontmatterObject, body: string): string {
  const lines = serializeObject(frontmatter, 0);
  return `---\n${lines.join("\n")}\n---\n${body}`;
}
