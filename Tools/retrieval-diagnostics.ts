import path from "node:path";

import { buildRetrievalDiagnostics, FileSystemVaultReader, formatRetrievalDiagnostics } from "../Source/retrieval/index.js";

type CliOptions = {
  actor?: string;
  prompt?: string;
  vaultRoot?: string;
  json: boolean;
  maxSearchNotes?: number;
  maxLinkedNotes?: number;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const next = argv[index + 1];

    if (argument === "--actor" && next) {
      options.actor = next;
      index += 1;
      continue;
    }

    if (argument === "--prompt" && next) {
      options.prompt = next;
      index += 1;
      continue;
    }

    if (argument === "--vault-root" && next) {
      options.vaultRoot = next;
      index += 1;
      continue;
    }

    if (argument === "--max-search-notes" && next) {
      options.maxSearchNotes = Number(next);
      index += 1;
      continue;
    }

    if (argument === "--max-linked-notes" && next) {
      options.maxLinkedNotes = Number(next);
      index += 1;
      continue;
    }

    if (argument === "--json") {
      options.json = true;
    }
  }

  return options;
}

function defaultVaultRoot(): string {
  return path.resolve(process.cwd(), "..", "Triathenum", "canon");
}

function printUsage(): void {
  console.error(
    "Usage: pnpm run diagnose:retrieval -- --actor \"Name\" --prompt \"Decision prompt\" [--vault-root /path/to/canon] [--json]",
  );
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (!options.actor || !options.prompt) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const reader = new FileSystemVaultReader(options.vaultRoot ?? defaultVaultRoot());
  const diagnostics = await buildRetrievalDiagnostics(reader, options.actor, options.prompt, {
    maxLinkedNotes: options.maxLinkedNotes,
    maxSearchNotes: options.maxSearchNotes,
  });

  if (options.json) {
    console.log(JSON.stringify(diagnostics, null, 2));
    return;
  }

  console.log(formatRetrievalDiagnostics(diagnostics));
}

void main();
