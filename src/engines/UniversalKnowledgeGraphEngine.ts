/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Universal Knowledge Graph Engine (Phase 35)
 * Structured universal knowledge graph supporting entities, multi-typed relationships,
 * evidence references, provenance, confidence metadata, duplicate detection, graph traversal,
 * dependency discovery, lineage tracking, and consistency audits.
 */

import {
  UniversalKnowledgeNode,
  UniversalKnowledgeEdge,
  UniversalRelationshipType,
  KnowledgeLineageEntry,
  KnowledgeClassificationTier,
} from '../types/phase35';

export class UniversalKnowledgeGraphEngine {
  private static instance: UniversalKnowledgeGraphEngine | null = null;
  private nodes: Map<string, UniversalKnowledgeNode> = new Map();
  private edges: Map<string, UniversalKnowledgeEdge> = new Map();
  private lineageEntries: KnowledgeLineageEntry[] = [];
  private listeners: Set<() => void> = new Set();

  public constructor() {
    this.seedDefaultKnowledge();
  }

  public static getInstance(): UniversalKnowledgeGraphEngine {
    if (!UniversalKnowledgeGraphEngine.instance) {
      UniversalKnowledgeGraphEngine.instance = new UniversalKnowledgeGraphEngine();
    }
    return UniversalKnowledgeGraphEngine.instance;
  }

  public static resetInstance(): void {
    UniversalKnowledgeGraphEngine.instance = null;
  }

  private seedDefaultKnowledge(): void {
    const now = new Date().toISOString();

    // Seed Core Knowledge Nodes
    const nodes: UniversalKnowledgeNode[] = [
      {
        id: 'kn-telemetry-invariance',
        label: 'Rule #2 Telemetry Causation Invariance',
        category: 'SECURITY_RULE',
        properties: {
          statement: 'Causation is strictly inconclusive under simulated conditions.',
          mandate: 'Strictly enforced across all analytical subsystems',
        },
        evidenceReferences: ['EVID-P18-RULE2-VERIFIED', 'AUDIT-PHASE32-ZERO-TRUST'],
        provenanceSourceId: 'src-security-gateway',
        authorRole: 'ChiefIntelligenceAgent',
        confidence: 100,
        version: 1,
        createdAt: now,
        updatedAt: now,
        classification: 'OPERATIONAL',
      },
      {
        id: 'kn-holt-linear-horizon',
        label: 'Holt-Linear Horizon Sensitivity Protocol',
        category: 'OPTIMIZATION_ACTION',
        properties: {
          finding: 'Holt Linear Smoothing exhibits high variance on short 15s windows (MAPE 14.5%). Window extended to 30s.',
          parameter: 'aiRouting.primaryProvider',
        },
        evidenceReferences: ['EVID-P34-HORIZON-EVAL-30S'],
        provenanceSourceId: 'src-evolution-engine',
        authorRole: 'TrackingAgent',
        confidence: 94,
        version: 2,
        createdAt: now,
        updatedAt: now,
        classification: 'OPERATIONAL',
      },
      {
        id: 'kn-cadence-target-60fps',
        label: 'Target 60 FPS VR Cadence Baseline',
        category: 'DOMAIN_FACT',
        properties: {
          targetFps: 60.0,
          frameBudgetMs: 16.6,
          dynamicDownscalingTriggerFps: 45.0,
        },
        evidenceReferences: ['EVID-P30-RENDER-CADENCE-BENCHMARK'],
        provenanceSourceId: 'src-sensor-telemetry',
        authorRole: 'PerformanceAgent',
        confidence: 99,
        version: 1,
        createdAt: now,
        updatedAt: now,
        classification: 'OPERATIONAL',
      },
      {
        id: 'kn-multi-agent-mesh-topology',
        label: '6-Specialist Neural Mesh Consensus',
        category: 'MISSION_METRIC',
        properties: {
          roles: ['Operations', 'Test', 'Tracking', 'Performance', 'Incident', 'ChiefIntelligence'],
          consensusTarget: 80,
        },
        evidenceReferences: ['EVID-P31-DISTRIBUTED-MESH'],
        provenanceSourceId: 'src-six-agents-mesh',
        authorRole: 'OperationsAgent',
        confidence: 98,
        version: 1,
        createdAt: now,
        updatedAt: now,
        classification: 'OPERATIONAL',
      },
      {
        id: 'kn-predictive-risk-horizon',
        label: 'Predictive Operational Risk Forecast',
        category: 'PREDICTION',
        properties: {
          forecastHorizon: '120s',
          systemIntegrityConfidence: 96.4,
          driftDetectionMethod: 'CUSUM',
        },
        evidenceReferences: ['EVID-P33-CUSUM-STABILITY-SERIES'],
        provenanceSourceId: 'src-predictive-intel',
        authorRole: 'ChiefIntelligenceAgent',
        confidence: 95,
        version: 1,
        createdAt: now,
        updatedAt: now,
        classification: 'OPERATIONAL',
      },
    ];

    for (const n of nodes) {
      this.nodes.set(n.id, n);
    }

    // Seed Directed Relationships
    const edges: UniversalKnowledgeEdge[] = [
      {
        id: 'edge-pred-supports-cadence',
        sourceNodeId: 'kn-predictive-risk-horizon',
        targetNodeId: 'kn-cadence-target-60fps',
        relationship: 'SUPPORTS',
        weight: 0.9,
        confidence: 95,
        provenance: 'src-predictive-intel',
        createdAt: now,
      },
      {
        id: 'edge-opt-derived-telemetry',
        sourceNodeId: 'kn-holt-linear-horizon',
        targetNodeId: 'kn-telemetry-invariance',
        relationship: 'DEPENDS_ON',
        weight: 1.0,
        confidence: 98,
        provenance: 'src-evolution-engine',
        createdAt: now,
      },
      {
        id: 'edge-mesh-validates-rule2',
        sourceNodeId: 'kn-multi-agent-mesh-topology',
        targetNodeId: 'kn-telemetry-invariance',
        relationship: 'VALIDATED_BY',
        weight: 1.0,
        confidence: 100,
        provenance: 'src-six-agents-mesh',
        createdAt: now,
      },
    ];

    for (const e of edges) {
      this.edges.set(e.id, e);
    }
  }

  public addNode(node: UniversalKnowledgeNode): UniversalKnowledgeNode {
    this.nodes.set(node.id, { ...node, updatedAt: new Date().toISOString() });
    this.notifyChange();
    return node;
  }

  public updateNode(nodeId: string, updates: Partial<UniversalKnowledgeNode>): UniversalKnowledgeNode | null {
    const existing = this.nodes.get(nodeId);
    if (!existing) return null;

    const updated: UniversalKnowledgeNode = {
      ...existing,
      ...updates,
      version: existing.version + 1,
      updatedAt: new Date().toISOString(),
    };
    this.nodes.set(nodeId, updated);
    this.notifyChange();
    return updated;
  }

  public getNode(nodeId: string): UniversalKnowledgeNode | undefined {
    return this.nodes.get(nodeId);
  }

  public getAllNodes(): UniversalKnowledgeNode[] {
    return Array.from(this.nodes.values());
  }

  public addRelationship(edge: UniversalKnowledgeEdge): { success: boolean; error?: string } {
    if (edge.sourceNodeId === edge.targetNodeId) {
      return { success: false, error: 'Self-referential relationships are not permitted in universal knowledge graph.' };
    }
    if (!this.nodes.has(edge.sourceNodeId)) {
      return { success: false, error: `Source node "${edge.sourceNodeId}" does not exist.` };
    }
    if (!this.nodes.has(edge.targetNodeId)) {
      return { success: false, error: `Target node "${edge.targetNodeId}" does not exist.` };
    }

    this.edges.set(edge.id, edge);
    this.notifyChange();
    return { success: true };
  }

  public getAllEdges(): UniversalKnowledgeEdge[] {
    return Array.from(this.edges.values());
  }

  public getNeighbors(nodeId: string): { outgoing: UniversalKnowledgeEdge[]; incoming: UniversalKnowledgeEdge[] } {
    const outgoing: UniversalKnowledgeEdge[] = [];
    const incoming: UniversalKnowledgeEdge[] = [];

    this.edges.forEach((edge) => {
      if (edge.sourceNodeId === nodeId) outgoing.push(edge);
      if (edge.targetNodeId === nodeId) incoming.push(edge);
    });

    return { outgoing, incoming };
  }

  /**
   * Discovers upstream and downstream dependencies up to a bounded depth.
   */
  public findDependencies(nodeId: string, maxDepth = 3): UniversalKnowledgeNode[] {
    const visited = new Set<string>();
    const results: UniversalKnowledgeNode[] = [];
    const queue: { id: string; depth: number }[] = [{ id: nodeId, depth: 0 }];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.id) || current.depth >= maxDepth) continue;
      visited.add(current.id);

      const neighbors = this.getNeighbors(current.id);
      for (const edge of neighbors.outgoing) {
        if (edge.relationship === 'DEPENDS_ON' || edge.relationship === 'DERIVED_FROM') {
          const target = this.nodes.get(edge.targetNodeId);
          if (target && !visited.has(target.id)) {
            results.push(target);
            queue.push({ id: target.id, depth: current.depth + 1 });
          }
        }
      }
    }

    return results;
  }

  /**
   * Duplicate detection: checks if a proposed node matches an existing node in category and label similarity.
   */
  public detectDuplicates(label: string, category: UniversalKnowledgeNode['category']): UniversalKnowledgeNode[] {
    const cleanLabel = label.toLowerCase().trim();
    const matches: UniversalKnowledgeNode[] = [];

    this.nodes.forEach((node) => {
      if (node.category === category) {
        const other = node.label.toLowerCase().trim();
        if (other === cleanLabel || other.includes(cleanLabel) || cleanLabel.includes(other)) {
          matches.push(node);
        }
      }
    });

    return matches;
  }

  /**
   * Graph consistency audit: checks for orphaned edges and contradictory relationships.
   */
  public checkConsistency(): {
    isConsistent: boolean;
    orphanedEdges: string[];
    contradictoryPairs: { edgeA: string; edgeB: string; nodes: [string, string] }[];
  } {
    const orphanedEdges: string[] = [];
    const contradictoryPairs: { edgeA: string; edgeB: string; nodes: [string, string] }[] = [];

    this.edges.forEach((edge) => {
      if (!this.nodes.has(edge.sourceNodeId) || !this.nodes.has(edge.targetNodeId)) {
        orphanedEdges.push(edge.id);
      }
    });

    // Check for contradictory edge pairs between identical nodes (e.g. SUPPORTS and CONTRADICTS)
    const edgeList = Array.from(this.edges.values());
    for (let i = 0; i < edgeList.length; i++) {
      for (let j = i + 1; j < edgeList.length; j++) {
        const e1 = edgeList[i];
        const e2 = edgeList[j];
        if (
          ((e1.sourceNodeId === e2.sourceNodeId && e1.targetNodeId === e2.targetNodeId) ||
           (e1.sourceNodeId === e2.targetNodeId && e1.targetNodeId === e2.sourceNodeId)) &&
          ((e1.relationship === 'SUPPORTS' && e2.relationship === 'CONTRADICTS') ||
           (e1.relationship === 'CONTRADICTS' && e2.relationship === 'SUPPORTS'))
        ) {
          contradictoryPairs.push({
            edgeA: e1.id,
            edgeB: e2.id,
            nodes: [e1.sourceNodeId, e1.targetNodeId],
          });
        }
      }
    }

    return {
      isConsistent: orphanedEdges.length === 0 && contradictoryPairs.length === 0,
      orphanedEdges,
      contradictoryPairs,
    };
  }

  public recordLineage(entry: KnowledgeLineageEntry): void {
    this.lineageEntries.push(entry);
  }

  public getLineage(nodeId: string): KnowledgeLineageEntry[] {
    return this.lineageEntries.filter((l) => l.nodeId === nodeId);
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyChange(): void {
    this.listeners.forEach((fn) => fn());
  }
}
