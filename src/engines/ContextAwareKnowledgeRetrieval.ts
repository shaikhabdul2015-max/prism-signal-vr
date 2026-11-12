/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Context-Aware Knowledge Retrieval (Phase 35)
 * Dynamically synthesizes customized knowledge dossiers scoped to active missions,
 * operational context, agent specialist roles, and zero-trust permission boundaries.
 * Strictly prevents cross-boundary data leakage and generates transparent citation dossiers.
 */

import {
  RetrievalContext,
  ContextualRetrievalDossier,
  UniversalKnowledgeNode,
  KnowledgeClassificationTier,
} from '../types/phase35';
import { UniversalKnowledgeGraphEngine } from './UniversalKnowledgeGraphEngine';

export class ContextAwareKnowledgeRetrieval {
  private static instance: ContextAwareKnowledgeRetrieval | null = null;

  public static getInstance(): ContextAwareKnowledgeRetrieval {
    if (!ContextAwareKnowledgeRetrieval.instance) {
      ContextAwareKnowledgeRetrieval.instance = new ContextAwareKnowledgeRetrieval();
    }
    return ContextAwareKnowledgeRetrieval.instance;
  }

  public static resetInstance(): void {
    ContextAwareKnowledgeRetrieval.instance = null;
  }

  private isAuthorized(nodeClassification: KnowledgeClassificationTier, userAccess: KnowledgeClassificationTier): boolean {
    const hierarchy: Record<KnowledgeClassificationTier, number> = {
      PUBLIC: 1,
      OPERATIONAL: 2,
      RESTRICTED: 3,
      CONFIDENTIAL: 4,
    };
    return hierarchy[userAccess] >= hierarchy[nodeClassification];
  }

  /**
   * Retrieves relevant knowledge nodes for a given operational context and permissions.
   */
  public retrieveContext(context: RetrievalContext): ContextualRetrievalDossier {
    const graph = UniversalKnowledgeGraphEngine.getInstance();
    const allNodes = graph.getAllNodes();

    const maxResults = context.maxResults || 6;
    const cleanContext = context.operationalContext.toLowerCase();
    const contextTokens = cleanContext.split(/\s+/).filter((t) => t.length > 2);

    const scoredItems: { node: UniversalKnowledgeNode; score: number; reason: string }[] = [];
    const missingContextWarnings: string[] = [];

    for (const node of allNodes) {
      // 1. Zero-Trust Access Check
      if (!this.isAuthorized(node.classification, context.accessLevel)) {
        continue; // Strictly skip nodes exceeding access level
      }

      let score = 0;
      const reasons: string[] = [];

      // Check agent author affinity
      if (node.authorRole === context.requestingAgent) {
        score += 20;
        reasons.push(`Created by requesting agent (${context.requestingAgent})`);
      }

      // Check keyword overlap with operational context
      const nodeText = `${node.label} ${JSON.stringify(node.properties)} ${node.category}`.toLowerCase();
      let matchCount = 0;
      for (const token of contextTokens) {
        if (nodeText.includes(token)) {
          score += 15;
          matchCount++;
        }
      }

      if (matchCount > 0) {
        reasons.push(`Matches ${matchCount} operational context tokens`);
      }

      // Base confidence contribution
      score += Math.round(node.confidence * 0.2);

      if (score > 15) {
        scoredItems.push({
          node,
          score,
          reason: reasons.join('; ') || 'General domain relevance',
        });
      }
    }

    scoredItems.sort((a, b) => b.score - a.score);
    const selected = scoredItems.slice(0, maxResults);

    // Citations & Explanations
    const citations: string[] = [];
    const explanations: string[] = [];
    for (const item of selected) {
      citations.push(`${item.node.label} [Source: ${item.node.provenanceSourceId}] (Ref: ${item.node.evidenceReferences.join(', ') || 'N/A'})`);
      explanations.push(`Node "${item.node.id}": ${item.reason}`);
    }

    // Missing context check: Check if critical Rule #2 node is absent during security/telemetry contexts
    const hasRule2 = selected.some((s) => s.node.id === 'kn-telemetry-invariance');
    if (!hasRule2 && (cleanContext.includes('telemetry') || cleanContext.includes('sensor') || cleanContext.includes('prediction'))) {
      missingContextWarnings.push('Rule #2 Telemetry Causation Invariance was not retrieved. Ensure simulated causation bounds are enforced.');
    }

    return {
      contextId: `ctx-${Date.now().toString(36)}`,
      requestingAgent: context.requestingAgent,
      operationalContext: context.operationalContext,
      items: selected.map((s) => s.node),
      citations,
      explanations,
      missingContextWarnings,
      retrievalTimestamp: new Date().toISOString(),
    };
  }
}
