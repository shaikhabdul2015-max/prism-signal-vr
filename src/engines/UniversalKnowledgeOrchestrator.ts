/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Universal Knowledge Orchestrator (Phase 35)
 * Central orchestrator governing ingestion, validation, duplicate prevention,
 * graph linkage, multi-source fusion triggers, and synchronization dispatch.
 */

import {
  UniversalKnowledgeNode,
  UniversalKnowledgeEdge,
} from '../types/phase35';
import { UniversalKnowledgeGraphEngine } from './UniversalKnowledgeGraphEngine';
import { KnowledgeGovernanceEngine } from './KnowledgeGovernanceEngine';
import { GlobalKnowledgeSynchronization } from './GlobalKnowledgeSynchronization';
import { DistributedEventBus } from './DistributedEventBus';
import { MultiSourceIntelligenceFusion } from './MultiSourceIntelligenceFusion';

export class UniversalKnowledgeOrchestrator {
  private static instance: UniversalKnowledgeOrchestrator | null = null;

  public static getInstance(): UniversalKnowledgeOrchestrator {
    if (!UniversalKnowledgeOrchestrator.instance) {
      UniversalKnowledgeOrchestrator.instance = new UniversalKnowledgeOrchestrator();
    }
    return UniversalKnowledgeOrchestrator.instance;
  }

  public static resetInstance(): void {
    UniversalKnowledgeOrchestrator.instance = null;
  }

  /**
   * Securely ingests a new knowledge node into the universal graph with governance,
   * duplicate check, and synchronization dispatch.
   */
  public ingestKnowledgeNode(
    node: UniversalKnowledgeNode,
    actor = 'KnowledgeOrchestrator'
  ): { success: boolean; node?: UniversalKnowledgeNode; error?: string; duplicateWarning?: boolean } {
    const gov = KnowledgeGovernanceEngine.getInstance();
    const graph = UniversalKnowledgeGraphEngine.getInstance();
    const sync = GlobalKnowledgeSynchronization.getInstance();

    // 1. Content Safety & Secret Leakage Check
    const safetyCheck = gov.inspectContentSafety(JSON.stringify(node.properties), node.provenanceSourceId);
    if (!safetyCheck.isSafe) {
      return { success: false, error: `Content rejected by governance: ${safetyCheck.flaggedPattern}` };
    }

    // 2. Integrity Verification
    if (!gov.verifyNodeIntegrity(node)) {
      return { success: false, error: 'Knowledge node failed integrity validation.' };
    }

    // 3. Duplicate Detection Check
    const existingMatches = graph.detectDuplicates(node.label, node.category);
    let duplicateWarning = false;
    if (existingMatches.length > 0) {
      duplicateWarning = true;
      gov.recordAudit({
        actor,
        action: 'NODE_MUTATED',
        resourceId: node.id,
        details: `Potential duplicate node detected matching "${existingMatches[0].label}". Ingesting as updated version.`,
        securityLevel: 'INFO',
      });
    }

    // 4. Ingest to Graph
    const createdNode = graph.addNode(node);

    // 5. Queue for Synchronization
    sync.queueForSync(createdNode);

    // 6. Record Audit
    gov.recordAudit({
      actor,
      action: 'NODE_CREATED',
      resourceId: createdNode.id,
      details: `Node "${createdNode.label}" ingested into universal graph (${createdNode.classification}).`,
      securityLevel: 'INFO',
    });

    // 7. Dispatch Event via DistributedEventBus
    try {
      DistributedEventBus.getInstance().publish({
        eventType: 'KNOWLEDGE_NODE_CREATED',
        source: 'UniversalKnowledgeOrchestrator',
        priority: 'LOW',
        payload: { nodeId: createdNode.id, label: createdNode.label, category: createdNode.category },
        suppressionFingerprint: `node-${createdNode.id}-${createdNode.version}`,
      });
    } catch {
      // Graceful fallback
    }

    return { success: true, node: createdNode, duplicateWarning };
  }

  /**
   * Ingests a typed relationship edge between two nodes.
   */
  public ingestRelationship(
    edge: UniversalKnowledgeEdge,
    actor = 'KnowledgeOrchestrator'
  ): { success: boolean; error?: string } {
    const graph = UniversalKnowledgeGraphEngine.getInstance();
    const gov = KnowledgeGovernanceEngine.getInstance();

    const result = graph.addRelationship(edge);
    if (!result.success) {
      return result;
    }

    gov.recordAudit({
      actor,
      action: 'NODE_MUTATED',
      resourceId: edge.id,
      details: `Edge "${edge.id}" (${edge.relationship}) established between "${edge.sourceNodeId}" and "${edge.targetNodeId}".`,
      securityLevel: 'INFO',
    });

    try {
      DistributedEventBus.getInstance().publish({
        eventType: 'KNOWLEDGE_RELATIONSHIP_CREATED',
        source: 'UniversalKnowledgeOrchestrator',
        priority: 'LOW',
        payload: { edgeId: edge.id, relationship: edge.relationship },
        suppressionFingerprint: `edge-${edge.id}`,
      });
    } catch {
      // Graceful fallback
    }

    return { success: true };
  }
}
