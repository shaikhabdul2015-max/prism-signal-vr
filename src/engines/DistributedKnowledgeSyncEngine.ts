/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Distributed Knowledge Synchronization Engine (Phase 31)
 * Manages shared knowledge across the multi-agent intelligence network with
 * semantic versioning, deterministic checksums, collision & conflict detection,
 * offline synchronization queues, and non-destructive resolution strategies.
 * Integrates with CrossPhaseKnowledgeIntegrator and AdaptiveIntelligenceMemory.
 */

import {
  DistributedKnowledgeItem,
  SystemAuditHistoryRecord,
} from '../types/phase31';
import { CrossPhaseKnowledgeIntegrator } from './CrossPhaseKnowledgeIntegrator';
import { DistributedEventBus } from './DistributedEventBus';

export class DistributedKnowledgeSyncEngine {
  private static instance: DistributedKnowledgeSyncEngine | null = null;
  private knowledgeStore: Map<string, DistributedKnowledgeItem> = new Map();
  private offlineQueue: DistributedKnowledgeItem[] = [];
  private conflictHistory: Array<{
    key: string;
    existingItem: DistributedKnowledgeItem;
    incomingItem: DistributedKnowledgeItem;
    resolution: string;
    resolvedAt: string;
  }> = [];
  private auditLogs: SystemAuditHistoryRecord[] = [];
  private listeners: Set<(items: DistributedKnowledgeItem[]) => void> = new Set();
  private isOnline = true;

  public constructor() {
    this.seedCanonicalKnowledge();
  }

  public static getInstance(): DistributedKnowledgeSyncEngine {
    if (!DistributedKnowledgeSyncEngine.instance) {
      DistributedKnowledgeSyncEngine.instance = new DistributedKnowledgeSyncEngine();
    }
    return DistributedKnowledgeSyncEngine.instance;
  }

  public static resetInstance(): void {
    DistributedKnowledgeSyncEngine.instance = null;
  }

  private seedCanonicalKnowledge(): void {
    const seeds: Partial<DistributedKnowledgeItem>[] = [
      {
        id: 'k-rule2-invariance',
        key: 'safety.rule2.invariance',
        domain: 'SAFETY_GOVERNANCE',
        data: {
          statement: 'Rule #2: Causation is strictly inconclusive under simulated conditions.',
          enforced: true,
          verificationSource: 'ChiefIntelligenceAgent',
        },
        version: 3,
        sourceAgentId: 'agent-chief-intelligence',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        checksum: 'chk-rule2-inv-948f',
        conflictState: 'SYNCHRONIZED',
        resolutionStrategy: 'HIGHER_VERSION',
      },
      {
        id: 'k-webxr-cadence-target',
        key: 'telemetry.cadence.baseline',
        domain: 'SPATIAL_PERFORMANCE',
        data: {
          targetFps: 72,
          minimumAcceptableFps: 60,
          criticalFloorFps: 40,
          p95LatencyCeilingMs: 20.0,
        },
        version: 2,
        sourceAgentId: 'agent-performance-engineer',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        checksum: 'chk-cadence-base-881a',
        conflictState: 'SYNCHRONIZED',
        resolutionStrategy: 'LATEST_TIMESTAMP',
      },
      {
        id: 'k-skeleton-joint-model',
        key: 'spatial.skeleton.anatomy',
        domain: 'TRACKING_INTELLIGENCE',
        data: {
          totalJoints: 25,
          hands: ['left', 'right'],
          criticalJoints: ['wrist', 'index-finger-tip', 'thumb-tip'],
        },
        version: 1,
        sourceAgentId: 'agent-tracking-specialist',
        timestamp: new Date(Date.now() - 2400000).toISOString(),
        checksum: 'chk-joint-model-412e',
        conflictState: 'SYNCHRONIZED',
        resolutionStrategy: 'HIGHER_VERSION',
      },
    ];

    for (const s of seeds) {
      if (s.id && s.key) {
        this.knowledgeStore.set(s.key, s as DistributedKnowledgeItem);
      }
    }
  }

  private computeChecksum(data: any): string {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return `chk-${Math.abs(hash).toString(16)}`;
  }

  /**
   * Publishes or synchronizes a knowledge entity.
   * If a conflict is detected (different data with same or lower version), non-destructive conflict handling is executed.
   */
  public publishKnowledge<T = any>(params: {
    key: string;
    domain: string;
    data: T;
    sourceAgentId: string;
    version?: number;
    resolutionStrategy?: 'LATEST_TIMESTAMP' | 'HIGHER_VERSION' | 'MANUAL_SUPERVISOR';
  }): { item: DistributedKnowledgeItem; conflictDetected: boolean } {
    const existing = this.knowledgeStore.get(params.key);
    const checksum = this.computeChecksum(params.data);
    const now = new Date().toISOString();
    const strategy = params.resolutionStrategy || 'HIGHER_VERSION';

    // If offline, buffer into offline queue
    if (!this.isOnline) {
      const offlineItem: DistributedKnowledgeItem = {
        id: `k-off-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        key: params.key,
        domain: params.domain,
        data: params.data,
        version: params.version ?? (existing ? existing.version + 1 : 1),
        sourceAgentId: params.sourceAgentId,
        timestamp: now,
        checksum,
        conflictState: 'LOCAL_PENDING',
        resolutionStrategy: strategy,
      };
      this.offlineQueue.push(offlineItem);
      this.recordAudit('KNOWLEDGE', 'QUEUE_OFFLINE', params.sourceAgentId, `Queued offline knowledge for ${params.key}`, true);
      this.notifyListeners();
      return { item: offlineItem, conflictDetected: false };
    }

    if (existing) {
      // Check if duplicate identical data
      if (existing.checksum === checksum) {
        return { item: existing, conflictDetected: false };
      }

      const incomingVersion = params.version ?? existing.version + 1;

      // Conflict detection: incoming version is <= existing version with divergent checksum
      if (incomingVersion <= existing.version) {
        let conflictDetected = true;
        let resolvedItem: DistributedKnowledgeItem = existing;

        if (strategy === 'LATEST_TIMESTAMP') {
          // Compare timestamps
          if (new Date(now).getTime() > new Date(existing.timestamp).getTime()) {
            resolvedItem = {
              ...existing,
              data: params.data,
              version: existing.version + 1,
              sourceAgentId: params.sourceAgentId,
              timestamp: now,
              checksum,
              conflictState: 'SYNCHRONIZED',
            };
            this.knowledgeStore.set(params.key, resolvedItem);
            this.conflictHistory.push({
              key: params.key,
              existingItem: existing,
              incomingItem: resolvedItem,
              resolution: 'Auto-resolved via LATEST_TIMESTAMP priority',
              resolvedAt: now,
            });
            conflictDetected = false;
          }
        } else if (strategy === 'HIGHER_VERSION') {
          // Existing version wins because incoming was lower or equal
          existing.conflictState = 'CONFLICT_DETECTED';
          this.conflictHistory.push({
            key: params.key,
            existingItem: existing,
            incomingItem: {
              id: `k-conflict-${Date.now()}`,
              key: params.key,
              domain: params.domain,
              data: params.data,
              version: incomingVersion,
              sourceAgentId: params.sourceAgentId,
              timestamp: now,
              checksum,
              conflictState: 'CONFLICT_DETECTED',
            },
            resolution: 'Preserved existing record (HIGHER_VERSION strategy). Manual review required.',
            resolvedAt: now,
          });
        } else {
          // MANUAL_SUPERVISOR
          existing.conflictState = 'CONFLICT_DETECTED';
        }

        this.recordAudit(
          'KNOWLEDGE',
          'CONFLICT',
          params.sourceAgentId,
          `Conflict on key "${params.key}" (v${existing.version} vs incoming v${incomingVersion})`,
          false
        );

        DistributedEventBus.getInstance().publish({
          eventType: 'KNOWLEDGE_CONFLICT',
          source: 'DistributedKnowledgeSyncEngine',
          priority: 'HIGH',
          payload: { key: params.key, existingVersion: existing.version, incomingVersion },
          suppressionFingerprint: `knowledge-conflict-${params.key}`,
        });

        this.notifyListeners();
        return { item: resolvedItem, conflictDetected };
      }

      // Safe forward upgrade
      const upgradedItem: DistributedKnowledgeItem = {
        id: existing.id,
        key: params.key,
        domain: params.domain,
        data: params.data,
        version: incomingVersion,
        sourceAgentId: params.sourceAgentId,
        timestamp: now,
        checksum,
        conflictState: 'SYNCHRONIZED',
        resolutionStrategy: strategy,
      };

      this.knowledgeStore.set(params.key, upgradedItem);
      this.recordAudit('KNOWLEDGE', 'UPDATE', params.sourceAgentId, `Updated knowledge "${params.key}" to v${incomingVersion}`, true);
      this.notifyListeners();
      return { item: upgradedItem, conflictDetected: false };
    }

    // New knowledge item
    const newItem: DistributedKnowledgeItem = {
      id: `k-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      key: params.key,
      domain: params.domain,
      data: params.data,
      version: params.version ?? 1,
      sourceAgentId: params.sourceAgentId,
      timestamp: now,
      checksum,
      conflictState: 'SYNCHRONIZED',
      resolutionStrategy: strategy,
    };

    this.knowledgeStore.set(params.key, newItem);
    this.recordAudit('KNOWLEDGE', 'CREATE', params.sourceAgentId, `Created knowledge entity "${params.key}" (v1)`, true);
    this.notifyListeners();
    return { item: newItem, conflictDetected: false };
  }

  /**
   * Flushes offline queue once connectivity is restored.
   */
  public flushOfflineQueue(): number {
    if (!this.isOnline || this.offlineQueue.length === 0) return 0;

    let processed = 0;
    while (this.offlineQueue.length > 0) {
      const queued = this.offlineQueue.shift()!;
      this.publishKnowledge({
        key: queued.key,
        domain: queued.domain,
        data: queued.data,
        sourceAgentId: queued.sourceAgentId,
        version: queued.version,
        resolutionStrategy: queued.resolutionStrategy,
      });
      processed++;
    }

    this.recordAudit('KNOWLEDGE', 'SYNC_FLUSH', 'System', `Flushed ${processed} offline knowledge entities`, true);
    this.notifyListeners();
    return processed;
  }

  public setOnlineStatus(online: boolean): void {
    this.isOnline = online;
    if (online) {
      this.flushOfflineQueue();
    }
    this.notifyListeners();
  }

  public getKnowledge(key: string): DistributedKnowledgeItem | undefined {
    return this.knowledgeStore.get(key);
  }

  public getAllKnowledge(): DistributedKnowledgeItem[] {
    return Array.from(this.knowledgeStore.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  public getOfflineQueue(): DistributedKnowledgeItem[] {
    return [...this.offlineQueue];
  }

  public getConflictHistory(): Array<{
    key: string;
    existingItem: DistributedKnowledgeItem;
    incomingItem: DistributedKnowledgeItem;
    resolution: string;
    resolvedAt: string;
  }> {
    return [...this.conflictHistory];
  }

  public getAuditLogs(): SystemAuditHistoryRecord[] {
    return [...this.auditLogs];
  }

  private recordAudit(
    category: SystemAuditHistoryRecord['category'],
    action: string,
    actor: string,
    details: string,
    success: boolean
  ): void {
    this.auditLogs.unshift({
      id: `audit-knw-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      category,
      action,
      actor,
      details,
      success,
    });
    if (this.auditLogs.length > 100) {
      this.auditLogs.pop();
    }
  }

  public subscribe(listener: (items: DistributedKnowledgeItem[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getAllKnowledge());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const list = this.getAllKnowledge();
    this.listeners.forEach((l) => l(list));
  }
}
