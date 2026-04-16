import type { EntityDocument, WorldTimelineItem, WorldTimelinePayload, WorldTimelinePrecision } from "../contracts/index.js";
import { FileSystemWorldDocumentStore } from "../world/index.js";
import { canViewEntity, type AuthenticatedViewer } from "./auth-service.js";

type ParsedChronology = {
  chronologyLabel: string;
  precision: WorldTimelinePrecision;
  sortBucket: number;
  sortKey: string;
};

function fieldValue(document: EntityDocument, key: string): string {
  const value = document.fields[key];
  return typeof value === "string" ? value.trim() : "";
}

function parseDateValue(value: string): { label: string; precision: WorldTimelinePrecision; sortKey: string } | null {
  if (!value) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return {
      label: value,
      precision: "day",
      sortKey: value,
    };
  }

  if (/^\d{4}-\d{2}$/.test(value)) {
    return {
      label: value,
      precision: "month",
      sortKey: `${value}-00`,
    };
  }

  if (/^\d{4}$/.test(value)) {
    return {
      label: value,
      precision: "year",
      sortKey: `${value}-00-00`,
    };
  }

  return null;
}

function buildChronology(document: EntityDocument): ParsedChronology | null {
  const startDate = parseDateValue(fieldValue(document, "start_date"));
  const endDate = parseDateValue(fieldValue(document, "end_date"));
  if (startDate && endDate) {
    return {
      chronologyLabel: `${startDate.label} to ${endDate.label}`,
      precision: "range",
      sortBucket: 0,
      sortKey: startDate.sortKey,
    };
  }

  const singleDate = parseDateValue(fieldValue(document, "date"));
  if (singleDate) {
    return {
      chronologyLabel: singleDate.label,
      precision: singleDate.precision,
      sortBucket: 0,
      sortKey: singleDate.sortKey,
    };
  }

  const orderValue = fieldValue(document, "chronology_order");
  if (orderValue) {
    const numeric = Number.parseFloat(orderValue);
    const label = fieldValue(document, "chronology_label") || orderValue;
    return {
      chronologyLabel: label,
      precision: "relative",
      sortBucket: 1,
      sortKey: Number.isFinite(numeric) ? numeric.toString().padStart(12, "0") : orderValue.toLowerCase(),
    };
  }

  const era = fieldValue(document, "era");
  if (era) {
    return {
      chronologyLabel: era,
      precision: "relative",
      sortBucket: 2,
      sortKey: era.toLowerCase(),
    };
  }

  const label = fieldValue(document, "chronology_label");
  if (label) {
    return {
      chronologyLabel: label,
      precision: "relative",
      sortBucket: 3,
      sortKey: label.toLowerCase(),
    };
  }

  return null;
}

function makeSummary(document: EntityDocument): string {
  return document.body.trim().split("\n").find(Boolean)?.trim() ?? "No summary line is available for this timeline item yet.";
}

function compareTimelineItems(left: WorldTimelineItem & ParsedChronology, right: WorldTimelineItem & ParsedChronology): number {
  return (
    left.sortBucket - right.sortBucket ||
    left.sortKey.localeCompare(right.sortKey) ||
    left.entityName.localeCompare(right.entityName)
  );
}

export async function loadWorldTimeline(
  worldRoot: string,
  viewer: AuthenticatedViewer,
): Promise<WorldTimelinePayload> {
  const store = new FileSystemWorldDocumentStore(worldRoot);
  const documents = (await store.loadEntityDocuments()).filter((document) =>
    canViewEntity(viewer, document.envelope.visibility),
  );

  const items = documents
    .flatMap((document) => {
      const chronology = buildChronology(document);
      if (!chronology) {
        return [];
      }

      return [
        {
          entityId: document.envelope.id,
          entityName: document.envelope.name,
          entityType: document.envelope.entityType,
          path: document.path,
          title: document.envelope.name,
          chronologyLabel: chronology.chronologyLabel,
          precision: chronology.precision,
          summary: makeSummary(document),
          sortBucket: chronology.sortBucket,
          sortKey: chronology.sortKey,
        },
      ];
    })
    .sort(compareTimelineItems)
    .map(({ sortBucket: _sortBucket, sortKey: _sortKey, ...item }) => item);

  return {
    scope: "world",
    summary: items.length
      ? `Showing ${items.length} chronology item${items.length === 1 ? "" : "s"} from the visible world.`
      : "No chronology fields are available in the visible world yet.",
    items,
  };
}
