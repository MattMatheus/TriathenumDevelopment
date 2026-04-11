import { createDefaultRetrievalAdapters } from "./adapters.js";
import { buildGroundingBundleWithAdapters, resolveEntityWithAdapters } from "./orchestration.js";
import type { GroundingResult, ResolvedEntity, RetrievalOptions, VaultReader } from "./types.js";

export async function resolveEntity(reader: VaultReader, query: string): Promise<ResolvedEntity> {
  return resolveEntityWithAdapters(createDefaultRetrievalAdapters(reader), query);
}

export async function buildGroundingBundle(
  reader: VaultReader,
  query: string,
  decisionPrompt: string,
  options: RetrievalOptions = {},
): Promise<GroundingResult | ResolvedEntity> {
  return buildGroundingBundleWithAdapters(
    createDefaultRetrievalAdapters(reader),
    query,
    decisionPrompt,
    options,
  );
}
