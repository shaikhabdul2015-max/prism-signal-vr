/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 25: Knowledge Graph Engine.
 * Manages topological systems knowledge, typed nodes, directed relationships,
 * semantic dependency mapping, and circular dependency detection algorithms.
 */

import {
  KnowledgeNode,
  KnowledgeNodeType,
  KnowledgeRelationship,
  KnowledgeRelationType,
  KnowledgeGraphSnapshot,
} from '../types/phase25';

export class KnowledgeGraphEngine {
  private static instance: KnowledgeGraphEngine | null = null;
  private nodes: Map<string, KnowledgeNode> = new Map();
  private relationships: Map<string, KnowledgeRelationship> = new Map();

  private constructor() {
    this.seedDefaultGraph();
  }

  public static getInstance(): KnowledgeGraphEngine {
    if (!KnowledgeGraphEngine.instance) {
      KnowledgeGraphEngine.instance = new KnowledgeGraphEngine();
    }
    return KnowledgeGraphEngine.instance;
  }

  public static resetInstance(): void {
    KnowledgeGraphEngine.instance = null;
  }

  /**
   * Seed default system knowledge graph representing PRISM SIGNAL architecture
   */
  private seedDefaultGraph(): void {
    // Register System Modules
    this.addNode({
      id: 'node-mod-telemetry',
      name: 'Physical & Synthetic Telemetry Pipeline',
      type: 'MODULE',
      properties: { version: 'Phase 18', layer: 'Core' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    this.addNode({
      id: 'node-mod-digital-twin',
      name: 'Digital Twin Simulation Engine',
      type: 'MODULE',
      properties: { version: 'Phase 21', layer: 'Simulation' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    this.addNode({
      id: 'node-mod-mission',
      name: 'Autonomous Mission Planning Engine',
      type: 'MODULE',
      properties: { version: 'Phase 22', layer: 'Operations' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    this.addNode({
      id: 'node-mod-command-center',
      name: 'Unified Command & Control Center',
      type: 'MODULE',
      properties: { version: 'Phase 23', layer: 'Executive' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    this.addNode({
      id: 'node-mod-self-healing',
      name: 'Autonomous Self-Healing Engine',
      type: 'MODULE',
      properties: { version: 'Phase 19', layer: 'Resilience' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Register 6 Specialist Agents
    const agents = [
      { id: 'node-agent-ops', name: 'Operations Lead Agent' },
      { id: 'node-agent-test', name: 'Automated Test Orchestrator' },
      { id: 'node-agent-track', name: 'Tracking Specialist Agent' },
      { id: 'node-agent-perf', name: 'Performance Engineer Agent' },
      { id: 'node-agent-incident', name: 'Incident Commander Agent' },
      { id: 'node-agent-cio', name: 'Chief Intelligence Officer Agent' },
    ];

    agents.forEach((a) => {
      this.addNode({
        id: a.id,
        name: a.name,
        type: 'AGENT',
        properties: { status: 'ACTIVE', authorityLevel: a.id === 'node-agent-cio' ? 5 : 4 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    // Register Safety Rules
    this.addNode({
      id: 'node-rule-2-inconclusive',
      name: 'Rule #2: Enforce INCONCLUSIVE on Ambiguous Hardware',
      type: 'SAFETY_RULE',
      properties: { priority: 'MANDATORY', bypassAllowed: false },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    this.addNode({
      id: 'node-rule-human-gate',
      name: 'Human Operator Authorization Gate for High-Risk Actions',
      type: 'SAFETY_RULE',
      properties: { timeoutSeconds: 300, riskThreshold: 0.75 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Add Relationships
    this.addRelationship({
      id: 'rel-telemetry-twin',
      sourceNodeId: 'node-mod-telemetry',
      targetNodeId: 'node-mod-digital-twin',
      relation: 'FEEDS_INTO',
      weight: 0.95,
    });

    this.addRelationship({
      id: 'rel-track-telemetry',
      sourceNodeId: 'node-agent-track',
      targetNodeId: 'node-mod-telemetry',
      relation: 'MONITORS',
      weight: 1.0,
    });

    this.addRelationship({
      id: 'rel-perf-telemetry',
      sourceNodeId: 'node-agent-perf',
      targetNodeId: 'node-mod-telemetry',
      relation: 'MONITORS',
      weight: 0.9,
    });

    this.addRelationship({
      id: 'rel-incident-healing',
      sourceNodeId: 'node-agent-incident',
      targetNodeId: 'node-mod-self-healing',
      relation: 'CONTROLS',
      weight: 0.85,
    });

    this.addRelationship({
      id: 'rel-healing-rule2',
      sourceNodeId: 'node-mod-self-healing',
      targetNodeId: 'node-rule-2-inconclusive',
      relation: 'DEPENDS_ON',
      weight: 1.0,
    });

    this.addRelationship({
      id: 'rel-command-gate',
      sourceNodeId: 'node-mod-command-center',
      targetNodeId: 'node-rule-human-gate',
      relation: 'DEPENDS_ON',
      weight: 1.0,
    });

    this.addRelationship({
      id: 'rel-cio-command',
      sourceNodeId: 'node-agent-cio',
      targetNodeId: 'node-mod-command-center',
      relation: 'EVALUATES',
      weight: 0.9,
    });
  }

  public addNode(node: KnowledgeNode): void {
    this.nodes.set(node.id, {
      ...node,
      updatedAt: new Date().toISOString(),
    });
  }

  public getNode(id: string): KnowledgeNode | undefined {
    return this.nodes.get(id);
  }

  public getAllNodes(): KnowledgeNode[] {
    return Array.from(this.nodes.values());
  }

  public getNodesByType(type: KnowledgeNodeType): KnowledgeNode[] {
    return this.getAllNodes().filter((n) => n.type === type);
  }

  public removeNode(id: string): boolean {
    if (!this.nodes.has(id)) return false;
    this.nodes.delete(id);
    // Remove connected relationships
    const relsToRemove: string[] = [];
    this.relationships.forEach((rel, relId) => {
      if (rel.sourceNodeId === id || rel.targetNodeId === id) {
        relsToRemove.push(relId);
      }
    });
    relsToRemove.forEach((relId) => this.relationships.delete(relId));
    return true;
  }

  public addRelationship(rel: KnowledgeRelationship): { success: boolean; wouldCauseCycle: boolean } {
    if (!this.nodes.has(rel.sourceNodeId) || !this.nodes.has(rel.targetNodeId)) {
      return { success: false, wouldCauseCycle: false };
    }

    // Speculative cycle check for dependency relationships
    if (rel.relation === 'DEPENDS_ON') {
      const wouldCycle = this.checkIfAddingCausesCycle(rel.sourceNodeId, rel.targetNodeId);
      if (wouldCycle) {
        return { success: false, wouldCauseCycle: true };
      }
    }

    this.relationships.set(rel.id, rel);
    return { success: true, wouldCauseCycle: false };
  }

  public getRelationship(id: string): KnowledgeRelationship | undefined {
    return this.relationships.get(id);
  }

  public getAllRelationships(): KnowledgeRelationship[] {
    return Array.from(this.relationships.values());
  }

  public getNeighbors(nodeId: string): { inbound: KnowledgeRelationship[]; outbound: KnowledgeRelationship[] } {
    const inbound: KnowledgeRelationship[] = [];
    const outbound: KnowledgeRelationship[] = [];

    this.relationships.forEach((rel) => {
      if (rel.targetNodeId === nodeId) inbound.push(rel);
      if (rel.sourceNodeId === nodeId) outbound.push(rel);
    });

    return { inbound, outbound };
  }

  /**
   * Depth-First Search for cycle detection on DEPENDS_ON relations
   */
  public detectCycles(): { hasCycles: boolean; cycles: string[][] } {
    const adj = new Map<string, string[]>();
    this.nodes.forEach((_, id) => adj.set(id, []));

    this.relationships.forEach((rel) => {
      if (rel.relation === 'DEPENDS_ON') {
        adj.get(rel.sourceNodeId)?.push(rel.targetNodeId);
      }
    });

    const visited = new Set<string>();
    const recStack = new Set<string>();
    const path: string[] = [];
    const foundCycles: string[][] = [];

    const dfs = (curr: string) => {
      visited.add(curr);
      recStack.add(curr);
      path.push(curr);

      const neighbors = adj.get(curr) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        } else if (recStack.has(neighbor)) {
          const cycleStartIndex = path.indexOf(neighbor);
          if (cycleStartIndex !== -1) {
            foundCycles.push([...path.slice(cycleStartIndex), neighbor]);
          }
        }
      }

      path.pop();
      recStack.delete(curr);
    };

    this.nodes.forEach((_, id) => {
      if (!visited.has(id)) {
        dfs(id);
      }
    });

    return {
      hasCycles: foundCycles.length > 0,
      cycles: foundCycles,
    };
  }

  private checkIfAddingCausesCycle(sourceId: string, targetId: string): boolean {
    if (sourceId === targetId) return true;

    // Check if targetId already reaches sourceId through DEPENDS_ON
    const visited = new Set<string>();
    const queue = [targetId];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr === sourceId) return true;
      if (visited.has(curr)) continue;
      visited.add(curr);

      this.relationships.forEach((rel) => {
        if (rel.relation === 'DEPENDS_ON' && rel.sourceNodeId === curr) {
          queue.push(rel.targetNodeId);
        }
      });
    }

    return false;
  }

  public searchNodes(query: string): KnowledgeNode[] {
    const q = query.toLowerCase().trim();
    if (!q) return this.getAllNodes();
    return this.getAllNodes().filter(
      (n) => n.name.toLowerCase().includes(q) || n.type.toLowerCase().includes(q) || n.id.toLowerCase().includes(q)
    );
  }

  public getSnapshot(): KnowledgeGraphSnapshot {
    const cyclesResult = this.detectCycles();
    return {
      nodes: this.getAllNodes(),
      relationships: this.getAllRelationships(),
      nodeCount: this.nodes.size,
      relationshipCount: this.relationships.size,
      timestamp: new Date().toISOString(),
      cyclicDependencyDetected: cyclesResult.hasCycles,
      cycles: cyclesResult.cycles,
    };
  }
}

export const knowledgeGraphEngine = KnowledgeGraphEngine.getInstance();
