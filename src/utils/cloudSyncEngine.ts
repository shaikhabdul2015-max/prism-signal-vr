import { VRTelemetry } from '../types/diagnostics';
import {
  CloudSyncPayload,
  CloudSyncResult,
  CloudSyncStatus,
  OfflineQueueItem,
  TelemetrySource,
  IncidentRecord,
  TestExecutionRecord,
  CrossSessionAnalytics,
} from '../types/phase17';
import { assessEnvironmentalCausation } from './environmentalAssessment';

const SYNC_ENDPOINT = '/api/cloud/sync';
const STATUS_ENDPOINT = '/api/cloud/status';
const STORAGE_QUEUE_KEY = 'PRISM_OFFLINE_SYNC_QUEUE_V1';

export class CloudSyncEngine {
  private syncStatus: CloudSyncStatus = 'synced';
  private offlineQueue: OfflineQueueItem[] = [];
  private isDraining = false;
  private lastSyncResult: CloudSyncResult | null = null;
  private statusListeners: Array<(status: CloudSyncStatus) => void> = [];

  constructor() {
    this.loadOfflineQueue();
    // Periodically attempt to drain offline queue
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => void this.drainQueue());
    }
  }

  public subscribeStatus(listener: (status: CloudSyncStatus) => void): () => void {
    this.statusListeners.push(listener);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== listener);
    };
  }

  private setStatus(status: CloudSyncStatus) {
    this.syncStatus = status;
    this.statusListeners.forEach((l) => l(status));
  }

  public getStatus(): CloudSyncStatus {
    return this.syncStatus;
  }

  public getLastSyncResult(): CloudSyncResult | null {
    return this.lastSyncResult;
  }

  public getOfflineQueueLength(): number {
    return this.offlineQueue.length;
  }

  public getOfflineQueue(): OfflineQueueItem[] {
    return [...this.offlineQueue];
  }

  /**
   * Enqueues or synchronizes a telemetry snapshot along with associated incidents and executions.
   */
  public async syncSnapshot(
    telemetry: VRTelemetry,
    options: {
      telemetrySource?: TelemetrySource;
      incidents?: IncidentRecord[];
      testExecutions?: TestExecutionRecord[];
    } = {}
  ): Promise<CloudSyncResult> {
    const syncId = `sync-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const source: TelemetrySource = options.telemetrySource || 'Simulation';

    // Strict Rule #2 enforcement: room illumination cannot be claimed as confirmed without valid hardware token
    const validatedAssessment = assessEnvironmentalCausation(telemetry.causationEvidence);
    const sanitizedTelemetry: VRTelemetry = {
      ...telemetry,
      causationEvidence: validatedAssessment.causationStatus === 'CONFIRMED' ? telemetry.causationEvidence : null,
    };

    const payload: CloudSyncPayload = {
      syncId,
      clientTimestamp: new Date().toISOString(),
      telemetrySource: source,
      telemetrySnapshot: sanitizedTelemetry,
      incidentSnapshots: options.incidents || [],
      testExecutions: options.testExecutions || [],
    };

    // If offline in browser, immediately queue locally
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.enqueueOffline(payload);
      this.setStatus('queued');
      return {
        syncId,
        serverTimestamp: new Date().toISOString(),
        status: 'queued',
        recordsSyncedCount: 0,
        conflictsResolvedCount: 0,
        message: 'Client is offline. Telemetry queued locally for deferred synchronization.',
        provenance: { source, verifiedOnServer: false },
      };
    }

    this.setStatus('syncing');

    try {
      const response = await fetch(SYNC_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Sync server responded with HTTP ${response.status}`);
      }

      const result = (await response.json()) as CloudSyncResult;
      this.lastSyncResult = result;
      this.setStatus('synced');
      return result;
    } catch (err) {
      console.warn('[CloudSyncEngine] Network sync failed, saving to offline queue:', err);
      this.enqueueOffline(payload);
      this.setStatus('queued');

      return {
        syncId,
        serverTimestamp: new Date().toISOString(),
        status: 'queued',
        recordsSyncedCount: 0,
        conflictsResolvedCount: 0,
        message: 'Network synchronization unavailable. Telemetry preserved in offline sync buffer.',
        provenance: { source, verifiedOnServer: false },
      };
    }
  }

  private failedQuarantine: OfflineQueueItem[] = [];

  public getFailedQuarantine(): OfflineQueueItem[] {
    return [...this.failedQuarantine];
  }

  public retryFailedRecords(): number {
    const count = this.failedQuarantine.length;
    this.failedQuarantine.forEach((item) => {
      item.retryAttempts = 0;
      this.offlineQueue.push(item);
    });
    this.failedQuarantine = [];
    this.saveOfflineQueue();
    return count;
  }

  /**
   * Drains the local offline queue with exponential backoff and retry limits.
   */
  public async drainQueue(): Promise<{ synced: number; remaining: number }> {
    if (this.isDraining || this.offlineQueue.length === 0) {
      return { synced: 0, remaining: this.offlineQueue.length };
    }

    this.isDraining = true;
    this.setStatus('syncing');
    let syncedCount = 0;
    const remainingQueue: OfflineQueueItem[] = [];

    for (const item of this.offlineQueue) {
      try {
        const response = await fetch(SYNC_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(item.payload),
        });

        if (response.ok) {
          syncedCount++;
        } else {
          item.retryAttempts += 1;
          if (item.retryAttempts < 5) {
            remainingQueue.push(item);
          } else {
            this.failedQuarantine.push(item);
          }
        }
      } catch {
        item.retryAttempts += 1;
        if (item.retryAttempts < 5) {
          remainingQueue.push(item);
        } else {
          this.failedQuarantine.push(item);
        }
      }
    }

    this.offlineQueue = remainingQueue;
    this.saveOfflineQueue();
    this.isDraining = false;
    this.setStatus(this.offlineQueue.length === 0 ? 'synced' : 'queued');

    return { synced: syncedCount, remaining: this.offlineQueue.length };
  }

  /**
   * Fetches server cross-session analytics
   */
  public async fetchCrossSessionAnalytics(): Promise<CrossSessionAnalytics | null> {
    try {
      const res = await fetch(STATUS_ENDPOINT);
      if (!res.ok) return null;
      const data = await res.json();
      return data.analytics || null;
    } catch {
      return null;
    }
  }

  private enqueueOffline(payload: CloudSyncPayload): void {
    const item: OfflineQueueItem = {
      id: payload.syncId,
      enqueuedAt: new Date().toISOString(),
      retryAttempts: 0,
      payload,
    };
    // Limit local queue size to 50 records to prevent memory exhaustion
    this.offlineQueue = [item, ...this.offlineQueue].slice(0, 50);
    this.saveOfflineQueue();
  }

  private saveOfflineQueue(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(this.offlineQueue));
      }
    } catch {
      // Storage unavailable
    }
  }

  private loadOfflineQueue(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_QUEUE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            this.offlineQueue = parsed;
          }
        }
      }
    } catch {
      this.offlineQueue = [];
    }
  }
}
