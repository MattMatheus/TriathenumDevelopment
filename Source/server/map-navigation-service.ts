import type { EntityDocument, WorldMapNavigationPayload, WorldMapPin } from "../contracts/index.js";
import { FileSystemWorldDocumentStore } from "../world/index.js";
import { canViewEntity, type AuthenticatedViewer } from "./auth-service.js";

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function regionFor(document: EntityDocument): string {
  const fieldRegion = typeof document.fields.map_region === "string" ? document.fields.map_region.trim() : "";
  const extensionRegion =
    typeof document.envelope.extensions.map_region === "string" ? document.envelope.extensions.map_region.trim() : "";
  return fieldRegion || extensionRegion || "Unregioned";
}

function summaryFor(document: EntityDocument): string {
  return document.body.trim().split("\n").find(Boolean)?.trim() ?? "No location summary is available yet.";
}

function pinFor(document: EntityDocument): WorldMapPin | null {
  const x = asNumber(document.fields.map_x);
  const y = asNumber(document.fields.map_y);
  if (x === null || y === null) {
    return null;
  }

  return {
    entityId: document.envelope.id,
    entityName: document.envelope.name,
    region: regionFor(document),
    x: clampPercent(x),
    y: clampPercent(y),
    summary: summaryFor(document),
  };
}

function backdropFor(documents: EntityDocument[]): { url: string; label: string } | null {
  for (const document of documents) {
    const backdropEnabled =
      document.fields.map_backdrop === true ||
      document.fields.map_backdrop === "true" ||
      document.envelope.extensions.map_backdrop === true;
    const image = document.envelope.media.find((asset) => asset.kind === "image");

    if (backdropEnabled && image) {
      return {
        url: `/api/world/entities/${encodeURIComponent(document.envelope.id)}/media/${encodeURIComponent(image.id)}`,
        label: image.caption ?? image.alt ?? image.originalFileName,
      };
    }
  }

  return null;
}

export async function loadWorldMapNavigation(
  worldRoot: string,
  viewer: AuthenticatedViewer,
): Promise<WorldMapNavigationPayload> {
  const store = new FileSystemWorldDocumentStore(worldRoot);
  const documents = (await store.loadEntityDocuments()).filter(
    (document) => document.envelope.entityType === "location" && canViewEntity(viewer, document.envelope.visibility),
  );

  const pins = documents
    .flatMap((document) => {
      const pin = pinFor(document);
      return pin ? [pin] : [];
    })
    .sort((left, right) => left.region.localeCompare(right.region) || left.entityName.localeCompare(right.entityName));
  const backdrop = backdropFor(documents);
  const regions = [...new Set(pins.map((pin) => pin.region))];

  return {
    scope: "world",
    summary: pins.length
      ? `Showing ${pins.length} pinned location${pins.length === 1 ? "" : "s"} across ${regions.length || 1} region${regions.length === 1 ? "" : "s"}.`
      : backdrop
        ? "A map backdrop is available, but no pinned locations are configured yet."
        : "No map asset or pinned locations are configured yet.",
    regions,
    hasBackdrop: Boolean(backdrop),
    ...(backdrop ? { backdropUrl: backdrop.url, backdropLabel: backdrop.label } : {}),
    pins,
  };
}
