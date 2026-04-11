export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

export function firstNonEmptyLine(input: string): string {
  return (
    input
      .split("\n")
      .map((line) => line.trim())
      .find(Boolean) ?? ""
  );
}

export function makeExcerpt(input: string, maxLength = 220): string {
  const collapsed = input.replace(/\s+/g, " ").trim();
  if (collapsed.length <= maxLength) {
    return collapsed;
  }

  return `${collapsed.slice(0, maxLength - 1).trimEnd()}…`;
}

export function extractWikilinks(input: string): string[] {
  const matches = input.matchAll(/\[\[([^\]]+)\]\]/g);

  return uniqueStrings(
    Array.from(matches, (match) => {
      const raw = match[1] ?? "";
      const [target] = raw.split("|", 1);
      return target.trim();
    }).filter(Boolean),
  );
}
