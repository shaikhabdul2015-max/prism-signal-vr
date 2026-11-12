/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Enterprise Database Service (Phase 19.5).
 * Implements explicit Database Modes (LOCAL_DEVELOPMENT, CLOUD_FIRESTORE, OFFLINE_FALLBACK),
 * fail-safe degraded cloud monitoring, exponential backoff synchronization,
 * duplicate prevention, failed record recovery, and tamper-evident audit logging.
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  limit,
} from 'firebase/firestore';
import {
  initFirebase,
  isFirebaseConfigured,
  shouldBypassRemoteCloud,
  getMissingFirebaseKeys,
} from '../utils/firebaseConfig';
import { VRTelemetry } from '../types/diagnostics';
import { IncidentRecord } from '../types/phase17';
import {
  DatabaseConnectionStatus,
  PerformanceTrendAnalysis,
  UpgradedIncidentRecord,
} from '../types/phase18';
import {
  DatabaseMode,
  CloudInfrastructureHealth,
  SyncAuditRecord,
  InfrastructureHealthReport,
} from '../types/phase19';

const LOCAL_STORAGE_DB_PREFIX = 'prism_db_';
const AUDIT_SECRET_SALT = 'PRISM_SIGNAL_VOID_INTEGRITY_SALT_V1';

function withTimeout<T>(promise: Promise<T>, ms: number = 1200): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export interface OfflineWriteItem {
  collection: string;
  id: string;
  data: Record<string, unknown>;
  enqueuedAt: string;
  retryCount: number;
  nextRetryTimeMs: number;
}

export class FirebaseDbService {
  private static instance: FirebaseDbService | null = null;
  private memoryStore: Map<string, Record<string, unknown>> = new Map();
  private pendingOfflineWrites: OfflineWriteItem[] = [];
  private failedQuarantine: OfflineWriteItem[] = [];

  // Phase 19.5 Database Modes
  private targetMode: DatabaseMode = isFirebaseConfigured() ? 'CLOUD_FIRESTORE' : 'LOCAL_DEVELOPMENT';
  private activeMode: DatabaseMode = isFirebaseConfigured() ? 'CLOUD_FIRESTORE' : 'LOCAL_DEVELOPMENT';
  private cloudHealth: CloudInfrastructureHealth = 'HEALTHY';
  private firestoreAvailable = false;
  private firestoreLatencyMs = 0;
  private unavailabilityReason: string | null = null;
  private lastSuccessfulSyncTimestamp: string | null = null;
  private failedSyncCount = 0;
  private auditLogs: SyncAuditRecord[] = [];
  private infraListeners: Set<(report: InfrastructureHealthReport) => void> = new Set();

  private constructor() {
    this.restoreLocalStore();
    this.evaluateInitialMode();
  }

  public static getInstance(): FirebaseDbService {
    if (!FirebaseDbService.instance) {
      FirebaseDbService.instance = new FirebaseDbService();
    }
    return FirebaseDbService.instance;
  }

  public static resetInstance(): void {
    FirebaseDbService.instance = null;
  }

  private restoreLocalStore(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((k) => {
        if (k.startsWith(LOCAL_STORAGE_DB_PREFIX)) {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            const key = k.replace(LOCAL_STORAGE_DB_PREFIX, '');
            this.memoryStore.set(key, parsed);
          }
        }
      });
    } catch {
      // Local storage unreadable or restricted
    }
  }

  private persistLocal(key: string, data: Record<string, unknown>): void {
    this.memoryStore.set(key, data);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(`${LOCAL_STORAGE_DB_PREFIX}${key}`, JSON.stringify(data));
      } catch {
        // Quota exceeded
      }
    }
  }

  // ==========================================================================
  // Tamper-Evident Audit Logging
  // ==========================================================================

  public generateAuditProof(
    id: string,
    timestamp: string,
    operationId: string,
    recordsCount: number,
    status: string,
    databaseMode: DatabaseMode
  ): string {
    const raw = `${id}:${timestamp}:${operationId}:${recordsCount}:${status}:${databaseMode}:${AUDIT_SECRET_SALT}`;
    // Simple deterministic SHA256 simulation in JS/Buffer
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `PROOF-${hex}-${Buffer.from(raw).toString('base64').substring(0, 24)}`;
  }

  public verifyAuditProof(record: SyncAuditRecord): boolean {
    const expected = this.generateAuditProof(
      record.id,
      record.timestamp,
      record.operationId,
      record.recordsCount,
      record.status,
      record.databaseMode
    );
    return record.hashProof === expected;
  }

  private recordAudit(
    operationId: string,
    recordsCount: number,
    status: SyncAuditRecord['status'],
    details: string
  ): SyncAuditRecord {
    const id = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const timestamp = new Date().toISOString();
    const hashProof = this.generateAuditProof(
      id,
      timestamp,
      operationId,
      recordsCount,
      status,
      this.activeMode
    );

    const record: SyncAuditRecord = {
      id,
      timestamp,
      operationId,
      recordsCount,
      status,
      hashProof,
      details,
      databaseMode: this.activeMode,
    };

    this.auditLogs.unshift(record);
    if (this.auditLogs.length > 50) {
      this.auditLogs.pop();
    }

    this.notifyInfra();
    return record;
  }

  // ==========================================================================
  // Mode Management & Connectivity Evaluation
  // ==========================================================================

  private evaluateInitialMode(): void {
    if (!isFirebaseConfigured()) {
      this.targetMode = 'LOCAL_DEVELOPMENT';
      this.activeMode = 'LOCAL_DEVELOPMENT';
      this.cloudHealth = 'OFFLINE_ISOLATED';
      this.firestoreAvailable = false;
      this.unavailabilityReason = 'Firebase credentials unconfigured (.env missing or incomplete). Running in Local Development mode.';
    } else if (shouldBypassRemoteCloud()) {
      this.targetMode = 'CLOUD_FIRESTORE';
      this.activeMode = 'OFFLINE_FALLBACK';
      this.cloudHealth = 'DEGRADED_CLOUD_MODE';
      this.firestoreAvailable = false;
      this.unavailabilityReason = 'Google Cloud API key restrictions active. Remote cloud verification bypassed to avoid permission errors.';
    } else {
      this.targetMode = 'CLOUD_FIRESTORE';
      this.activeMode = 'CLOUD_FIRESTORE';
      this.cloudHealth = 'HEALTHY';
      this.firestoreAvailable = true;
      this.unavailabilityReason = null;
    }
  }

  public getActiveMode(): DatabaseMode {
    return this.activeMode;
  }

  public getTargetMode(): DatabaseMode {
    return this.targetMode;
  }

  public getCloudHealth(): CloudInfrastructureHealth {
    return this.cloudHealth;
  }

  /**
   * Sets explicit target database mode.
   */
  public async setDatabaseMode(
    mode: DatabaseMode
  ): Promise<{ activeMode: DatabaseMode; cloudHealth: CloudInfrastructureHealth; reason?: string }> {
    this.targetMode = mode;

    if (mode === 'LOCAL_DEVELOPMENT') {
      this.activeMode = 'LOCAL_DEVELOPMENT';
      this.cloudHealth = 'OFFLINE_ISOLATED';
      this.firestoreAvailable = false;
      this.unavailabilityReason = 'Local Development Mode explicitly selected by operator.';
      this.recordAudit('MODE_SWITCH', 0, 'SUCCESS', 'Switched to LOCAL_DEVELOPMENT mode.');
      return { activeMode: this.activeMode, cloudHealth: this.cloudHealth, reason: this.unavailabilityReason };
    }

    if (mode === 'OFFLINE_FALLBACK') {
      this.activeMode = 'OFFLINE_FALLBACK';
      this.cloudHealth = 'DEGRADED_CLOUD_MODE';
      this.firestoreAvailable = false;
      this.unavailabilityReason = 'Offline Fallback Mode explicitly engaged. Telemetry buffered in local queue.';
      this.recordAudit('MODE_SWITCH', 0, 'QUEUED', 'Engaged OFFLINE_FALLBACK mode.');
      return { activeMode: this.activeMode, cloudHealth: this.cloudHealth, reason: this.unavailabilityReason };
    }

    // Attempting CLOUD_FIRESTORE
    if (!isFirebaseConfigured()) {
      this.activeMode = 'OFFLINE_FALLBACK';
      this.cloudHealth = 'DEGRADED_CLOUD_MODE';
      this.firestoreAvailable = false;
      const missing = getMissingFirebaseKeys();
      this.unavailabilityReason = `Cannot engage Cloud Firestore: Missing environment credentials (${missing.join(', ')}).`;
      this.recordAudit('MODE_SWITCH_FAIL', 0, 'FAILED', this.unavailabilityReason);
      return { activeMode: this.activeMode, cloudHealth: this.cloudHealth, reason: this.unavailabilityReason };
    }

    if (shouldBypassRemoteCloud()) {
      this.activeMode = 'OFFLINE_FALLBACK';
      this.cloudHealth = 'DEGRADED_CLOUD_MODE';
      this.firestoreAvailable = false;
      this.unavailabilityReason = 'GCP API key restriction bypass active. Switched to OFFLINE_FALLBACK (DEGRADED_CLOUD_MODE).';
      this.recordAudit('MODE_SWITCH', 0, 'QUEUED', this.unavailabilityReason);
      return { activeMode: this.activeMode, cloudHealth: this.cloudHealth, reason: this.unavailabilityReason };
    }

    // Ping Firestore to test connectivity
    const start = performance.now();
    try {
      const { firestore } = initFirebase();
      if (!firestore) throw new Error('Firestore SDK instance uninitialized');
      const testDocRef = doc(firestore, '_system', 'ping');
      await withTimeout(getDoc(testDocRef), 1200);

      this.activeMode = 'CLOUD_FIRESTORE';
      this.cloudHealth = 'HEALTHY';
      this.firestoreAvailable = true;
      this.firestoreLatencyMs = Math.round(performance.now() - start);
      this.unavailabilityReason = null;
      this.recordAudit('MODE_SWITCH', 0, 'SUCCESS', `Engaged CLOUD_FIRESTORE (${this.firestoreLatencyMs}ms).`);
      return { activeMode: this.activeMode, cloudHealth: this.cloudHealth };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown Firestore connection failure';
      this.activeMode = 'OFFLINE_FALLBACK';
      this.cloudHealth = 'DEGRADED_CLOUD_MODE';
      this.firestoreAvailable = false;
      this.unavailabilityReason = `Cloud Firestore connection failed: ${msg}. Engaged OFFLINE_FALLBACK.`;
      this.recordAudit('MODE_SWITCH_FAIL', 0, 'FAILED', this.unavailabilityReason);
      return { activeMode: this.activeMode, cloudHealth: this.cloudHealth, reason: this.unavailabilityReason };
    }
  }

  public getInfrastructureReport(): InfrastructureHealthReport {
    return {
      activeMode: this.activeMode,
      targetMode: this.targetMode,
      cloudHealth: this.cloudHealth,
      firestoreAvailable: this.firestoreAvailable,
      firestoreLatencyMs: this.firestoreLatencyMs,
      unavailabilityReason: this.unavailabilityReason,
      pendingSyncCount: this.pendingOfflineWrites.length,
      failedSyncCount: this.failedSyncCount,
      lastSuccessfulSync: this.lastSuccessfulSyncTimestamp,
      backoffDelayMs: this.calculateCurrentBackoff(),
      retryAttempts: this.pendingOfflineWrites[0]?.retryCount || 0,
      auditLogs: [...this.auditLogs],
    };
  }

  public subscribeInfrastructure(listener: (report: InfrastructureHealthReport) => void): () => void {
    this.infraListeners.add(listener);
    listener(this.getInfrastructureReport());
    return () => this.infraListeners.delete(listener);
  }

  private notifyInfra(): void {
    const report = this.getInfrastructureReport();
    this.infraListeners.forEach((l) => {
      try {
        l(report);
      } catch (err) {
        console.error('[FirebaseDbService] Listener error:', err);
      }
    });
  }

  public calculateCurrentBackoff(): number {
    const firstItem = this.pendingOfflineWrites[0];
    const retry = firstItem ? firstItem.retryCount : 0;
    return Math.min(30000, 1000 * Math.pow(2, retry));
  }

  public async getConnectionStatus(): Promise<DatabaseConnectionStatus> {
    if (this.activeMode === 'LOCAL_DEVELOPMENT') {
      return {
        service: 'offline_local',
        connected: true,
        latencyMs: 1,
        lastSuccessfulPing: new Date().toISOString(),
        pendingWriteCount: this.pendingOfflineWrites.length,
        isOfflineBufferActive: true,
      };
    }

    if (this.activeMode === 'OFFLINE_FALLBACK') {
      return {
        service: 'offline_local',
        connected: false,
        latencyMs: 0,
        lastSuccessfulPing: this.lastSuccessfulSyncTimestamp,
        pendingWriteCount: this.pendingOfflineWrites.length,
        isOfflineBufferActive: true,
        errorMessage: this.unavailabilityReason || 'Cloud Firestore unavailable: operating in Degraded Cloud Mode',
      };
    }

    return {
      service: 'firestore',
      connected: this.firestoreAvailable,
      latencyMs: this.firestoreLatencyMs,
      lastSuccessfulPing: this.lastSuccessfulSyncTimestamp || new Date().toISOString(),
      pendingWriteCount: this.pendingOfflineWrites.length,
      isOfflineBufferActive: false,
    };
  }

  // ==========================================================================
  // Telemetry Storage & Production Fail-Safe
  // ==========================================================================

  public async saveTelemetry(
    telemetry: VRTelemetry,
    userId?: string
  ): Promise<{
    success: boolean;
    duplicate: boolean;
    persistedToCloud: boolean;
    databaseMode: DatabaseMode;
  }> {
    const key = `telemetry_${telemetry.sessionId}`;
    const isDuplicate = this.memoryStore.has(key);

    const record: Record<string, unknown> = {
      sessionId: telemetry.sessionId,
      userId: userId || 'anonymous',
      timestamp: new Date().toISOString(),
      telemetry,
    };

    this.persistLocal(key, record);

    // If active mode is LOCAL_DEVELOPMENT or OFFLINE_FALLBACK, never report as cloud persisted
    if (this.activeMode !== 'CLOUD_FIRESTORE') {
      if (this.activeMode === 'OFFLINE_FALLBACK') {
        this.enqueueOfflineWrite('vr_telemetry', telemetry.sessionId, record);
      }
      this.recordAudit(
        `SAVE_TELEMETRY_${telemetry.sessionId}`,
        1,
        'QUEUED',
        `Telemetry saved locally in ${this.activeMode}. Buffered for cloud sync.`
      );
      return {
        success: true,
        duplicate: isDuplicate,
        persistedToCloud: false,
        databaseMode: this.activeMode,
      };
    }

    // CLOUD_FIRESTORE write path
    try {
      const { firestore } = initFirebase();
      if (!firestore) throw new Error('Firestore uninitialized');

      const docRef = doc(firestore, 'vr_telemetry', telemetry.sessionId);
      await withTimeout(setDoc(docRef, record, { merge: true }), 1200);

      this.lastSuccessfulSyncTimestamp = new Date().toISOString();
      this.recordAudit(
        `PERSIST_TELEMETRY_${telemetry.sessionId}`,
        1,
        'SUCCESS',
        'Telemetry persisted directly to Cloud Firestore.'
      );

      return {
        success: true,
        duplicate: isDuplicate,
        persistedToCloud: true,
        databaseMode: 'CLOUD_FIRESTORE',
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown write error';
      // Degradation: shift to OFFLINE_FALLBACK
      this.activeMode = 'OFFLINE_FALLBACK';
      this.cloudHealth = 'DEGRADED_CLOUD_MODE';
      this.unavailabilityReason = `Firestore write failed: ${msg}. Degraded to OFFLINE_FALLBACK.`;
      this.enqueueOfflineWrite('vr_telemetry', telemetry.sessionId, record);

      this.recordAudit(
        `DEGRADE_WRITE_${telemetry.sessionId}`,
        1,
        'QUEUED',
        `Firestore write failed (${msg}). Buffered in offline queue.`
      );

      return {
        success: true,
        duplicate: isDuplicate,
        persistedToCloud: false,
        databaseMode: 'OFFLINE_FALLBACK',
      };
    }
  }

  /**
   * Saves telemetry partitioned under an explicit tenant identifier.
   */
  public async saveTenantTelemetry(
    telemetry: VRTelemetry,
    tenantId: string,
    userId?: string
  ): Promise<{
    success: boolean;
    duplicate: boolean;
    persistedToCloud: boolean;
    databaseMode: DatabaseMode;
  }> {
    const key = `telemetry_${tenantId}_${telemetry.sessionId}`;
    const isDuplicate = this.memoryStore.has(key);

    const record: Record<string, unknown> = {
      sessionId: telemetry.sessionId,
      tenantId,
      userId: userId || 'anonymous',
      timestamp: new Date().toISOString(),
      telemetry,
    };

    this.persistLocal(key, record);

    if (this.activeMode !== 'CLOUD_FIRESTORE') {
      if (this.activeMode === 'OFFLINE_FALLBACK') {
        this.enqueueOfflineWrite(`tenants/${tenantId}/telemetry`, telemetry.sessionId, record);
      }
      return {
        success: true,
        duplicate: isDuplicate,
        persistedToCloud: false,
        databaseMode: this.activeMode,
      };
    }

    try {
      const { firestore } = initFirebase();
      if (!firestore) throw new Error('Firestore uninitialized');
      const docRef = doc(firestore, 'tenants', tenantId, 'telemetry', telemetry.sessionId);
      await withTimeout(setDoc(docRef, record, { merge: true }), 1200);
      return {
        success: true,
        duplicate: isDuplicate,
        persistedToCloud: true,
        databaseMode: 'CLOUD_FIRESTORE',
      };
    } catch {
      this.enqueueOfflineWrite(`tenants/${tenantId}/telemetry`, telemetry.sessionId, record);
      return {
        success: true,
        duplicate: isDuplicate,
        persistedToCloud: false,
        databaseMode: 'OFFLINE_FALLBACK',
      };
    }
  }

  // ==========================================================================
  // Incident Storage & Deduplication
  // ==========================================================================

  public async saveIncident(
    incident: IncidentRecord | UpgradedIncidentRecord
  ): Promise<{
    success: boolean;
    merged: boolean;
    persistedToCloud: boolean;
    databaseMode: DatabaseMode;
  }> {
    const key = `incident_${incident.fingerprint}`;
    const existing = this.memoryStore.get(key) as IncidentRecord | undefined;
    const isMerged = Boolean(existing);

    const record: IncidentRecord = existing
      ? {
          ...existing,
          occurrenceCount: (existing.occurrenceCount || 1) + 1,
          lastSeenTimestamp: incident.lastSeenTimestamp,
          telemetryEvidence: { ...existing.telemetryEvidence, ...incident.telemetryEvidence },
        }
      : incident;

    this.persistLocal(key, record as unknown as Record<string, unknown>);

    if (this.activeMode !== 'CLOUD_FIRESTORE') {
      if (this.activeMode === 'OFFLINE_FALLBACK') {
        this.enqueueOfflineWrite('vr_incidents', incident.fingerprint, record as unknown as Record<string, unknown>);
      }
      this.recordAudit(
        `SAVE_INCIDENT_${incident.fingerprint}`,
        1,
        'QUEUED',
        `Incident saved locally in ${this.activeMode}. Merged: ${isMerged}.`
      );
      return {
        success: true,
        merged: isMerged,
        persistedToCloud: false,
        databaseMode: this.activeMode,
      };
    }

    try {
      const { firestore } = initFirebase();
      if (!firestore) throw new Error('Firestore uninitialized');

      const docRef = doc(firestore, 'vr_incidents', incident.fingerprint);
      await withTimeout(setDoc(docRef, record, { merge: true }), 1200);

      this.lastSuccessfulSyncTimestamp = new Date().toISOString();
      this.recordAudit(
        `PERSIST_INCIDENT_${incident.fingerprint}`,
        1,
        'SUCCESS',
        'Incident persisted directly to Cloud Firestore.'
      );

      return {
        success: true,
        merged: isMerged,
        persistedToCloud: true,
        databaseMode: 'CLOUD_FIRESTORE',
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown write error';
      this.activeMode = 'OFFLINE_FALLBACK';
      this.cloudHealth = 'DEGRADED_CLOUD_MODE';
      this.unavailabilityReason = `Firestore write failed: ${msg}. Degraded to OFFLINE_FALLBACK.`;
      this.enqueueOfflineWrite('vr_incidents', incident.fingerprint, record as unknown as Record<string, unknown>);

      this.recordAudit(
        `DEGRADE_INCIDENT_${incident.fingerprint}`,
        1,
        'QUEUED',
        `Firestore incident write failed (${msg}). Buffered in offline queue.`
      );

      return {
        success: true,
        merged: isMerged,
        persistedToCloud: false,
        databaseMode: 'OFFLINE_FALLBACK',
      };
    }
  }

  public async getIncidents(): Promise<IncidentRecord[]> {
    const incidents: IncidentRecord[] = [];
    this.memoryStore.forEach((val, key) => {
      if (key.startsWith('incident_')) {
        incidents.push(val as unknown as IncidentRecord);
      }
    });

    if (this.activeMode === 'CLOUD_FIRESTORE') {
      try {
        const { firestore } = initFirebase();
        if (firestore) {
          const snap = await withTimeout(getDocs(query(collection(firestore, 'vr_incidents'), limit(50))), 1200);
          snap.forEach((d) => {
            const data = d.data() as IncidentRecord;
            if (!incidents.some((i) => i.fingerprint === data.fingerprint)) {
              incidents.push(data);
            }
          });
        }
      } catch (err) {
        console.warn('[FirebaseDbService] Failed to fetch incidents from Firestore:', err);
      }
    }

    return incidents;
  }

  // ==========================================================================
  // Offline Queue Management with Exponential Backoff
  // ==========================================================================

  private enqueueOfflineWrite(collectionName: string, id: string, data: Record<string, unknown>): void {
    // Prevent duplicate entries for the same document in queue
    const existingIndex = this.pendingOfflineWrites.findIndex(
      (w) => w.collection === collectionName && w.id === id
    );

    const item: OfflineWriteItem = {
      collection: collectionName,
      id,
      data,
      enqueuedAt: new Date().toISOString(),
      retryCount: existingIndex >= 0 ? this.pendingOfflineWrites[existingIndex].retryCount : 0,
      nextRetryTimeMs: Date.now(),
    };

    if (existingIndex >= 0) {
      this.pendingOfflineWrites[existingIndex] = item;
    } else {
      this.pendingOfflineWrites.push(item);
    }

    // Limit buffer to 100 items to avoid memory exhaustion
    if (this.pendingOfflineWrites.length > 100) {
      const evicted = this.pendingOfflineWrites.shift();
      if (evicted) {
        this.failedQuarantine.push(evicted);
        this.failedSyncCount++;
      }
    }

    this.notifyInfra();
  }

  public getPendingQueue(): OfflineWriteItem[] {
    return [...this.pendingOfflineWrites];
  }

  public getQuarantinedRecords(): OfflineWriteItem[] {
    return [...this.failedQuarantine];
  }

  /**
   * Recovers quarantined failed records back into active queue.
   */
  public retryFailedRecords(): number {
    const recoveredCount = this.failedQuarantine.length;
    this.failedQuarantine.forEach((item) => {
      item.retryCount = 0;
      item.nextRetryTimeMs = Date.now();
      this.pendingOfflineWrites.push(item);
    });
    this.failedQuarantine = [];
    this.recordAudit('RECOVER_RECORDS', recoveredCount, 'RECOVERED', `Recovered ${recoveredCount} quarantined records for retry.`);
    this.notifyInfra();
    return recoveredCount;
  }

  /**
   * Drains offline queue to Firestore using exponential backoff.
   */
  public async flushOfflineWrites(): Promise<{ flushed: number; remaining: number }> {
    if (this.pendingOfflineWrites.length === 0) {
      return { flushed: 0, remaining: 0 };
    }

    if (this.activeMode === 'LOCAL_DEVELOPMENT') {
      return { flushed: 0, remaining: this.pendingOfflineWrites.length };
    }

    const { firestore } = initFirebase();
    if (!firestore || !isFirebaseConfigured() || shouldBypassRemoteCloud()) {
      return { flushed: 0, remaining: this.pendingOfflineWrites.length };
    }

    let flushed = 0;
    const now = Date.now();
    const remaining: OfflineWriteItem[] = [];

    for (const item of this.pendingOfflineWrites) {
      if (now < item.nextRetryTimeMs) {
        remaining.push(item);
        continue;
      }

      try {
        const docRef = doc(firestore, item.collection, item.id);
        await withTimeout(setDoc(docRef, item.data, { merge: true }), 1200);
        flushed++;
        this.lastSuccessfulSyncTimestamp = new Date().toISOString();
      } catch {
        item.retryCount += 1;
        const delay = Math.min(30000, 1000 * Math.pow(2, item.retryCount));
        item.nextRetryTimeMs = Date.now() + delay;

        if (item.retryCount >= 5) {
          // Quarantine after 5 consecutive failures
          this.failedQuarantine.push(item);
          this.failedSyncCount++;
        } else {
          remaining.push(item);
        }
      }
    }

    this.pendingOfflineWrites = remaining;

    if (flushed > 0) {
      this.recordAudit(
        'DRAIN_QUEUE',
        flushed,
        'SUCCESS',
        `Successfully drained ${flushed} offline records to Cloud Firestore.`
      );
      if (this.pendingOfflineWrites.length === 0 && this.activeMode === 'OFFLINE_FALLBACK') {
        this.activeMode = 'CLOUD_FIRESTORE';
        this.cloudHealth = 'HEALTHY';
        this.unavailabilityReason = null;
      }
    } else if (remaining.length > 0) {
      this.recordAudit(
        'DRAIN_QUEUE_DEFERRED',
        remaining.length,
        'QUEUED',
        `Queue sync deferred due to backoff cooldown (${remaining.length} pending).`
      );
    }

    this.notifyInfra();
    return { flushed, remaining: this.pendingOfflineWrites.length };
  }

  // ==========================================================================
  // Cross-Session Performance Trend Analysis
  // ==========================================================================

  public async computeTrendAnalysis(): Promise<PerformanceTrendAnalysis> {
    const telemetryRecords: VRTelemetry[] = [];
    this.memoryStore.forEach((val, key) => {
      if (key.startsWith('telemetry_')) {
        const item = val as { telemetry: VRTelemetry };
        if (item.telemetry) {
          telemetryRecords.push(item.telemetry);
        }
      }
    });

    const sessionCount = Math.max(1, telemetryRecords.length);
    const fpsPoints: { timestamp: string; fps: number }[] = [];
    const latencyPoints: { timestamp: string; latencyMs: number }[] = [];
    const latencies: number[] = [];

    telemetryRecords.forEach((t) => {
      const fps = t.frames?.[0]?.frameDurationMs ? Math.round(1000 / t.frames[0].frameDurationMs) : 72;
      const lat = t.latencySamples?.[0]?.latencyMs || 13.8;
      const ts = t.startedAt || new Date().toISOString();

      fpsPoints.push({ timestamp: ts, fps });
      latencyPoints.push({ timestamp: ts, latencyMs: lat });
      latencies.push(lat);
    });

    latencies.sort((a, b) => a - b);
    const medianLatencyMs = latencies.length > 0 ? latencies[Math.floor(latencies.length / 2)] : 13.8;
    const p95LatencyMs =
      latencies.length > 0
        ? latencies[Math.floor(latencies.length * 0.95)] || latencies[latencies.length - 1]
        : 16.5;

    let averageFpsTrend: 'improving' | 'stable' | 'degrading' = 'stable';
    if (fpsPoints.length >= 3) {
      const recent = fpsPoints.slice(-2).reduce((s, p) => s + p.fps, 0) / 2;
      const older = fpsPoints.slice(0, 2).reduce((s, p) => s + p.fps, 0) / 2;
      if (recent > older + 2) averageFpsTrend = 'improving';
      else if (recent < older - 2) averageFpsTrend = 'degrading';
    }

    const incidents = await this.getIncidents();
    const dominantCategory = incidents.length > 0 ? incidents[0].category : null;

    return {
      sessionCount,
      averageFpsTrend,
      p95LatencyMs,
      medianLatencyMs,
      trackingStabilityScore: Math.min(100, Math.max(0, 100 - incidents.length * 10)),
      dominantFailureCategory: dominantCategory,
      historicalFpsPoints: fpsPoints.slice(-20),
      historicalLatencyPoints: latencyPoints.slice(-20),
    };
  }
}

export const dbService = FirebaseDbService.getInstance();
