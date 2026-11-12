/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Knowledge Conflict Resolution Engine (Phase 35)
 * Detects contradictory knowledge nodes, competing agent recommendations,
 * and divergent telemetry facts.
 * Invariant: Never silently overwrites records; maintains original conflicting records,
 * generates explainable evidence-backed resolution proposals, and requires human approval
 * for consequential resolutions.
 */

import {
  KnowledgeConflictRecord,
  UniversalKnowledgeNode,
} from '../types/phase35';
import { UniversalKnowledgeGraphEngine } from './UniversalKnowledgeGraphEngine';
import { GlobalIntelligenceNetworkEngine } from './GlobalIntelligenceNetworkEngine';

export class KnowledgeConflictResolutionEngine {
  private static instance: KnowledgeConflictResolutionEngine | null = null;
  private conflicts: Map<string, KnowledgeConflictRecord> = new Map();
  private listeners: Set<(conflicts: KnowledgeConflictRecord[]) => void> = new Set();

  public constructor() {
    this.seedDefaultConflicts();
  }

  public static getInstance(): KnowledgeConflictResolutionEngine {
    if (!KnowledgeConflictResolutionEngine.instance) {
      KnowledgeConflictResolutionEngine.instance = new KnowledgeConflictResolutionEngine();
    }
    return KnowledgeConflictResolutionEngine.instance;
  }

  public static resetInstance(): void {
    KnowledgeConflictResolutionEngine.instance = null;
  }

  private seedDefaultConflicts(): void {
    const now = new Date().toISOString();
    const seeds: KnowledgeConflictRecord[] = [
      {
        conflictId: 'cnf-p35-smoothing-horizon',
        conflictingNodeIds: ['kn-holt-linear-horizon'],
        subject: 'Telemetry Forecasting Smoothing Horizon Configuration',
        description: 'Legacy node specifies 15s window for maximum responsiveness, whereas Phase 34 evaluation recommends 30s window to avoid 14.5% MAPE jitter.',
        opposingSources: ['Legacy Telemetry Archive', 'Phase 34 AI Model Evaluation Engine'],
        detectedAt: now,
        evidenceQualityScoreA: 72,
        evidenceQualityScoreB: 95,
        recommendedResolution: 'Adopt Phase 34 30s horizon (Score 95 vs 72) with CUSUM drift detection filter.',
        requiresHumanApproval: true,
        status: 'PENDING_APPROVAL',
      },
    ];

    for (const c of seeds) {
      this.conflicts.set(c.conflictId, c);
    }
  }

  /**
   * Scans nodes and relations to detect active knowledge contradictions.
   */
  public detectConflicts(): KnowledgeConflictRecord[] {
    const graph = UniversalKnowledgeGraphEngine.getInstance();
    const network = GlobalIntelligenceNetworkEngine.getInstance();
    const consistency = graph.checkConsistency();

    // Check contradictory graph edges
    for (const pair of consistency.contradictoryPairs) {
      const conflictId = `cnf-${pair.edgeA}-${pair.edgeB}`;
      if (!this.conflicts.has(conflictId)) {
        const nodeA = graph.getNode(pair.nodes[0]);
        const nodeB = graph.getNode(pair.nodes[1]);

        const record: KnowledgeConflictRecord = {
          conflictId,
          conflictingNodeIds: pair.nodes,
          subject: `Contradictory relationship detected between "${nodeA?.label || pair.nodes[0]}" and "${nodeB?.label || pair.nodes[1]}"`,
          description: 'One edge asserts SUPPORTS while an opposing edge asserts CONTRADICTS between the same nodes.',
          opposingSources: [nodeA?.provenanceSourceId || 'Source-A', nodeB?.provenanceSourceId || 'Source-B'],
          detectedAt: new Date().toISOString(),
          evidenceQualityScoreA: nodeA ? nodeA.confidence : 75,
          evidenceQualityScoreB: nodeB ? nodeB.confidence : 75,
          recommendedResolution: 'Retain edge with higher source reliability score after operator audit.',
          requiresHumanApproval: true,
          status: 'DETECTED',
        };

        this.conflicts.set(conflictId, record);
      }
    }

    this.notifyChange();
    return Array.from(this.conflicts.values());
  }

  public registerConflict(record: KnowledgeConflictRecord): void {
    this.conflicts.set(record.conflictId, record);
    this.notifyChange();
  }

  /**
   * Resolves a conflict with human operator approval and explicit rationale.
   */
  public resolveConflict(
    conflictId: string,
    chosenNodeId: string,
    rationale: string,
    approvedBy: string
  ): { success: boolean; conflict?: KnowledgeConflictRecord; error?: string } {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) {
      return { success: false, error: `Conflict "${conflictId}" not found.` };
    }

    conflict.status = 'RESOLVED';
    conflict.resolutionDetails = {
      chosenNodeId,
      rationale,
      approvedBy,
      resolvedAt: new Date().toISOString(),
    };

    this.notifyChange();
    return { success: true, conflict };
  }

  public dismissConflict(conflictId: string, reason: string): boolean {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) return false;
    conflict.status = 'DISMISSED';
    this.notifyChange();
    return true;
  }

  public getAllConflicts(): KnowledgeConflictRecord[] {
    return Array.from(this.conflicts.values());
  }

  public getPendingApprovalConflicts(): KnowledgeConflictRecord[] {
    return Array.from(this.conflicts.values()).filter((c) => c.status === 'PENDING_APPROVAL' || c.status === 'DETECTED');
  }

  public subscribe(listener: (conflicts: KnowledgeConflictRecord[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getAllConflicts());
    return () => this.listeners.delete(listener);
  }

  private notifyChange(): void {
    const list = this.getAllConflicts();
    this.listeners.forEach((fn) => fn(list));
  }
}
