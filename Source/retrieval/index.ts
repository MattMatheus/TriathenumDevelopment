export { createDefaultRetrievalAdapters } from "./adapters.js";
export { buildRetrievalDiagnostics, formatRetrievalDiagnostics } from "./diagnostics.js";
export { FileSystemVaultReader } from "./file-system-vault.js";
export { buildGroundingBundle, resolveEntity } from "./grounding.js";
export { buildGroundingBundleWithAdapters, resolveEntityWithAdapters } from "./orchestration.js";
export type {
  FallbackRetrievalAdapter,
  GroundingResult,
  IndexedRetrievalAdapter,
  NoteDocument,
  RankedEntityMatch,
  RetrievalAdapterSet,
  RetrievalAdapterName,
  ResolvedEntity,
  RetrievalScoreBreakdown,
  RetrievalOptions,
  StructuralRetrievalAdapter,
  VaultReader,
} from "./types.js";
