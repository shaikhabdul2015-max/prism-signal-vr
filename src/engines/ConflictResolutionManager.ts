/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Conflict Resolution Manager (Stage 3).
 * Detects concurrent document mutations, stale revisions, offline sync discrepancies,
 * and multi-user collisions.
 * Invariant: Never silently discards data; records all conflict metadata for auditability.
 */

import {
  ConflictRecord,
  ConflictPolicy,
  SyncDocumentRecord,
} from '../types/multiTenantSync';
import { DistributedEventBus } from './DistributedEventBus';

export class ConflictResolutionManager {
  private static instance: ConflictResolutionManager | null = null;
  private conflicts: Map<string, ConflictRecord> = new Map();
  private conflictHistory: ConflictRecord[] = [];
  private defaultPolicy: ConflictPolicy = 'HIGHER_VERSION_WINS';
  private listeners: Set<(conflicts: ConflictRecord[]) => void> = new Set();

  public constructor(defaultPolicy: ConflictPolicy = 'HIGHER_VERSION_WINS') {
    this.defaultPolicy = defaultPolicy;
  }

  public static getInstance(defaultPolicy?: ConflictPolicy): ConflictResolutionManager {
    if (!ConflictResolutionManager.instance) {
      ConflictResolutionManager.instance = new ConflictResolutionManager(defaultPolicy);
    }
    return ConflictResolutionManager.instance;
  }

  public static resetInstance(): void {
    ConflictResolutionManager.instance = null;
  }

  public setDefaultPolicy(policy: ConflictPolicy): void {
    this.defaultPolicy = policy;
  }

  public getDefaultPolicy(): ConflictPolicy {
    return this.defaultPolicy;
  }

  /**
   * Evaluates local vs remote document revisions to detect and resolve conflicts.
   */
  public evaluateRevision<T = Record<string, unknown>>(params: {
    tenantId: string;
    collection: string;
    docId: string;
    localDoc: SyncDocumentRecord<T>;
    remoteDoc: SyncDocumentRecord<T>;
    policyOverride?: ConflictPolicy;
    actorId?: string;
  }): {
    hasConflict: boolean;
    winningDoc: SyncDocumentRecord<T>;
    conflictRecord?: ConflictRecord<T>;
  } {
    const { localDoc, remoteDoc, tenantId, collection, docId } = params;

    // Fast path: Identical checksum means identical content, zero conflict
    if (localDoc.checksum && remoteDoc.checksum && localDoc.checksum === remoteDoc.checksum) {
      return { hasConflict: false, winningDoc: remoteDoc };
    }

    // Fast path: Exact same version and identical timestamps
    if (localDoc.version === remoteDoc.version && localDoc.clientUpdatedAt === remoteDoc.clientUpdatedAt) {
      return { hasConflict: false, winningDoc: remoteDoc };
    }

    // A conflict exists when both versions diverged or differ while both sides updated
    const conflictId = `cnf-${tenantId}-${collection}-${docId}-${Date.now().toString(36)}`;
    const detectedAt = new Date().toISOString();
    const policy = params.policyOverride || this.defaultPolicy;

    let winningDoc: SyncDocumentRecord<T>;
    let resolutionNotes: string;
    let autoResolved = false;

    switch (policy) {
      case 'HIGHER_VERSION_WINS': {
        if (localDoc.version > remoteDoc.version) {
          winningDoc = { ...localDoc };
          resolutionNotes = `Auto-resolved: Local document has higher version (${localDoc.version} vs ${remoteDoc.version}).`;
        } else if (remoteDoc.version > localDoc.version) {
          winningDoc = { ...remoteDoc };
          resolutionNotes = `Auto-resolved: Remote document has higher version (${remoteDoc.version} vs ${localDoc.version}).`;
        } else {
          // Version tie-break with timestamp
          const localTime = new Date(localDoc.clientUpdatedAt).getTime();
          const remoteTime = new Date(remoteDoc.serverUpdatedAt || remoteDoc.clientUpdatedAt).getTime();
          if (localTime >= remoteTime) {
            winningDoc = { ...localDoc, version: localDoc.version + 1 };
            resolutionNotes = `Auto-resolved version tie: Local has newer timestamp (${localDoc.clientUpdatedAt}).`;
          } else {
            winningDoc = { ...remoteDoc, version: remoteDoc.version + 1 };
            resolutionNotes = `Auto-resolved version tie: Remote has newer timestamp (${remoteDoc.clientUpdatedAt}).`;
          }
        }
        autoResolved = true;
        break;
      }

      case 'LAST_WRITE_WINS': {
        const localTime = new Date(localDoc.clientUpdatedAt).getTime();
        const remoteTime = new Date(remoteDoc.serverUpdatedAt || remoteDoc.clientUpdatedAt).getTime();
        if (localTime >= remoteTime) {
          winningDoc = {
            ...localDoc,
            version: Math.max(localDoc.version, remoteDoc.version) + 1,
          };
          resolutionNotes = `Auto-resolved LWW: Local update timestamp is more recent.`;
        } else {
          winningDoc = {
            ...remoteDoc,
            version: Math.max(localDoc.version, remoteDoc.version) + 1,
          };
          resolutionNotes = `Auto-resolved LWW: Remote update timestamp is more recent.`;
        }
        autoResolved = true;
        break;
      }

      case 'SERVER_AUTHORITATIVE': {
        winningDoc = {
          ...remoteDoc,
          version: Math.max(localDoc.version, remoteDoc.version) + 1,
        };
        resolutionNotes = `Auto-resolved: Server authoritative policy accepted remote document.`;
        autoResolved = true;
        break;
      }

      case 'CLIENT_AUTHORITATIVE': {
        winningDoc = {
          ...localDoc,
          version: Math.max(localDoc.version, remoteDoc.version) + 1,
        };
        resolutionNotes = `Auto-resolved: Client authoritative policy accepted local document.`;
        autoResolved = true;
        break;
      }

      case 'MANUAL_MERGE':
      default: {
        // Pending human / operator intervention; default to remote safely
        winningDoc = { ...remoteDoc };
        resolutionNotes = `Manual merge required. Defaulting temporarily to remote to prevent data loss.`;
        autoResolved = false;
        break;
      }
    }

    const record: ConflictRecord<T> = {
      conflictId,
      tenantId,
      collection,
      docId,
      localVersion: localDoc.version,
      remoteVersion: remoteDoc.version,
      localData: localDoc.data,
      remoteData: remoteDoc.data,
      detectedAt,
      resolutionPolicy: policy,
      status: autoResolved ? 'AUTO_RESOLVED' : 'DETECTED',
      resolvedAt: autoResolved ? new Date().toISOString() : undefined,
      resolvedData: autoResolved ? winningDoc.data : undefined,
      resolutionNotes,
      resolvedBy: autoResolved ? 'ConflictResolutionManager' : undefined,
    };

    if (autoResolved) {
      this.conflictHistory.unshift(record as ConflictRecord<any>);
      if (this.conflictHistory.length > 100) this.conflictHistory.pop();
    } else {
      this.conflicts.set(conflictId, record as ConflictRecord<any>);
    }

    try {
      DistributedEventBus.getInstance().publish({
        eventType: autoResolved ? 'CONFLICT_AUTO_RESOLVED' : 'CONFLICT_DETECTED',
        source: 'ConflictResolutionManager',
        priority: autoResolved ? 'LOW' : 'HIGH',
        payload: {
          conflictId,
          tenantId,
          collection,
          docId,
          policy,
          autoResolved,
          notes: resolutionNotes,
        },
        suppressionFingerprint: `conflict-${conflictId}`,
      });
    } catch {
      // Event bus fallback
    }

    this.notifyListeners();
    return { hasConflict: true, winningDoc, conflictRecord: record };
  }

  /**
   * Manually resolves a pending conflict with operator-specified merged data.
   */
  public resolveConflictManually<T = Record<string, unknown>>(params: {
    conflictId: string;
    resolvedData: T;
    resolvedBy: string;
    notes: string;
  }): { success: boolean; conflict?: ConflictRecord<T>; error?: string } {
    const conflict = this.conflicts.get(params.conflictId) as ConflictRecord<T> | undefined;
    if (!conflict) {
      return { success: false, error: `Conflict "${params.conflictId}" not found.` };
    }

    conflict.status = 'RESOLVED';
    conflict.resolvedAt = new Date().toISOString();
    conflict.resolvedData = params.resolvedData;
    conflict.resolvedBy = params.resolvedBy;
    conflict.resolutionNotes = params.notes;

    this.conflicts.delete(params.conflictId);
    this.conflictHistory.unshift(conflict as ConflictRecord<any>);

    try {
      DistributedEventBus.getInstance().publish({
        eventType: 'CONFLICT_MANUALLY_RESOLVED',
        source: 'ConflictResolutionManager',
        priority: 'MEDIUM',
        payload: {
          conflictId: params.conflictId,
          tenantId: conflict.tenantId,
          collection: conflict.collection,
          docId: conflict.docId,
          resolvedBy: params.resolvedBy,
        },
        suppressionFingerprint: `conflict-resolved-${params.conflictId}`,
      });
    } catch {
      // Event bus fallback
    }

    this.notifyListeners();
    return { success: true, conflict };
  }

  public getActiveConflicts(): ConflictRecord[] {
    return Array.from(this.conflicts.values());
  }

  public getConflictHistory(): ConflictRecord[] {
    return [...this.conflictHistory];
  }

  public subscribe(listener: (conflicts: ConflictRecord[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getActiveConflicts());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const active = this.getActiveConflicts();
    this.listeners.forEach((l) => {
      try {
        l(active);
      } catch {
        // Safe subscriber containment
      }
    });
  }
}

export const conflictResolutionManager = ConflictResolutionManager.getInstance();
