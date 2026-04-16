import type { EntityDocument, WorldGraphEdge, WorldGraphNode, WorldGraphPayload } from "../contracts/index.js";
import { FileSystemWorldDocumentStore, SqliteWorldIndex } from "../world/index.js";
import { canViewEntity, type AuthenticatedViewer } from "./auth-service.js";

function neighborSummary(label: string, entityName: string): string {
  return `${label.replace(/_/g, " ")} ${entityName}`.trim();
}

function buildNode(document: EntityDocument, role: "center" | "neighbor"): WorldGraphNode {
  return {
    entityId: document.envelope.id,
    entityName: document.envelope.name,
    entityType: document.envelope.entityType,
    role,
  };
}

export async function loadEntityGraph(
  worldRoot: string,
  viewer: AuthenticatedViewer,
  entityId: string,
): Promise<WorldGraphPayload | null> {
  const store = new FileSystemWorldDocumentStore(worldRoot);
  const documents = (await store.loadEntityDocuments()).filter((document) =>
    canViewEntity(viewer, document.envelope.visibility),
  );
  const center = documents.find((document) => document.envelope.id === entityId);
  if (!center) {
    return null;
  }

  const index = new SqliteWorldIndex();

  try {
    index.rebuild(documents);
    const nodeMap = new Map<string, WorldGraphNode>([[center.envelope.id, buildNode(center, "center")]]);
    const edges = new Map<string, WorldGraphEdge>();

    for (const relationship of center.envelope.relationships) {
      const target = documents.find((document) => document.envelope.name === relationship.target);
      if (!target) {
        continue;
      }

      nodeMap.set(target.envelope.id, buildNode(target, "neighbor"));
      const edgeId = `outbound:${center.envelope.id}:${target.envelope.id}:${relationship.type}`;
      edges.set(edgeId, {
        id: edgeId,
        sourceEntityId: center.envelope.id,
        targetEntityId: target.envelope.id,
        label: relationship.type,
        direction: "outbound",
        summary: relationship.summary ?? neighborSummary(relationship.type, target.envelope.name),
      });
    }

    for (const backlink of index.listBacklinks(center.envelope.id)) {
      const source = documents.find((document) => document.envelope.id === backlink.sourceEntityId);
      if (!source) {
        continue;
      }

      nodeMap.set(source.envelope.id, buildNode(source, "neighbor"));
      const edgeId = `inbound:${source.envelope.id}:${center.envelope.id}:${backlink.referenceKind}:${backlink.targetText}`;
      edges.set(edgeId, {
        id: edgeId,
        sourceEntityId: source.envelope.id,
        targetEntityId: center.envelope.id,
        label: backlink.referenceKind === "relationship" ? "references via relationship" : "references via wikilink",
        direction: "inbound",
        summary: `${source.envelope.name} references ${center.envelope.name} via ${backlink.referenceKind}.`,
      });
    }

    const orderedNodes = [...nodeMap.values()].sort((left, right) =>
      left.role.localeCompare(right.role) || left.entityName.localeCompare(right.entityName),
    );
    const orderedEdges = [...edges.values()].sort((left, right) =>
      left.direction.localeCompare(right.direction) ||
      left.label.localeCompare(right.label) ||
      left.id.localeCompare(right.id),
    );

    return {
      scope: "entity",
      entityId: center.envelope.id,
      entityName: center.envelope.name,
      summary: orderedEdges.length
        ? `Showing ${orderedNodes.length} nodes and ${orderedEdges.length} relationship edges around ${center.envelope.name}.`
        : `No graph neighbors surfaced for ${center.envelope.name} yet.`,
      nodes: orderedNodes,
      edges: orderedEdges,
    };
  } finally {
    index.close();
  }
}
