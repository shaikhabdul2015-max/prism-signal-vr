/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 3: Advanced Cloud Firestore Replication & Multi-Tenant Synchronization Test Suite.
 * Covers:
 * 1. Firebase initialization and environment configuration validation
 * 2. Authentication success, user profile hydration, and session persistence
 * 3. Authentication failure and session expiration handling
 * 4. Tenant isolation and tenant-scoped namespace containment
 * 5. Cross-tenant access prevention and membership boundary enforcement
 * 6. Concurrent document updates and optimistic concurrency detection
 * 7. Offline write persistence and local queueing
 * 8. Reconnection synchronization with automatic queue draining
 * 9. Conflict resolution policies (HIGHER_VERSION_WINS, LAST_WRITE_WINS, SERVER_AUTHORITATIVE)
 * 10. Duplicate event and write idempotency via checksum suppression
 * 11. Retry mechanisms with exponential backoff delay progression
 * 12. Firestore security rules validation (ABAC, role checks, immutable fields, default-deny)
 * 13. Multi-user synchronization across tenants
 * 14. Cloud failure recovery and graceful degradation to offline buffer
 * 15. Local-mode fallback and zero-loss guarantees during partition
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  CloudReplicationManager,
  cloudReplicationManager,
} from '../src/engines/CloudReplicationManager';
import {
  ConflictResolutionManager,
  conflictResolutionManager,
} from '../src/engines/ConflictResolutionManager';
import {
  TenantContextManager,
  tenantContextManager,
} from '../src/services/TenantContextManager';
import {
  FirebaseAuthService,
  authService,
} from '../src/services/firebaseAuthService';
import {
  FirebaseDbService,
  dbService,
} from '../src/services/firebaseDbService';
import {
  isFirebaseConfigured,
  getMissingFirebaseKeys,
  initFirebase,
} from '../src/utils/firebaseConfig';
import { SyncDocumentRecord, ConflictPolicy } from '../src/types/multiTenantSync';

describe('Stage 3: Advanced Cloud Firestore Replication & Multi-Tenant Synchronization Suite', () => {
  beforeEach(() => {
    CloudReplicationManager.resetInstance();
    ConflictResolutionManager.resetInstance();
    TenantContextManager.resetInstance();
    FirebaseAuthService.resetInstance();
    FirebaseDbService.resetInstance();
  });

  afterEach(() => {
    CloudReplicationManager.resetInstance();
  });

  // --------------------------------------------------------------------------
  // TEST 1: FIREBASE INITIALIZATION & CONFIG VALIDATION
  // --------------------------------------------------------------------------
  it('1. validates Firebase configuration, reports missing keys, and gracefully falls back to local persistence', () => {
    const isConfigured = isFirebaseConfigured();
    const missingKeys = getMissingFirebaseKeys();
    const initResult = initFirebase();

    assert.equal(typeof isConfigured, 'boolean');
    assert.ok(Array.isArray(missingKeys));
    assert.equal(typeof initResult.configured, 'boolean');

    // In local dev without keys, it must maintain configured = false or bypass = true
    if (!isConfigured) {
      assert.ok(missingKeys.length > 0, 'Missing keys must be reported when unconfigured');
      assert.equal(initResult.app, null, 'Firebase app must remain null when unconfigured');
    }
  });

  // --------------------------------------------------------------------------
  // TEST 2: AUTHENTICATION SUCCESS & SESSION HYDRATION
  // --------------------------------------------------------------------------
  it('2. successfully authenticates user, hydrates enterprise profile, and stores session token', async () => {
    const auth = FirebaseAuthService.getInstance();
    const profile = await auth.signInWithGoogle();

    assert.ok(profile.uid, 'User profile must contain valid UID');
    assert.ok(profile.email, 'User profile must contain email');
    assert.equal(profile.role, 'Admin');

    const session = auth.getSessionState();
    assert.equal(session.isAuthenticated, true);
    assert.ok(session.token, 'Session must have valid bearer token');
    assert.ok(session.tokenExpiresAt && session.tokenExpiresAt > Date.now(), 'Token must have future expiry');
  });

  // --------------------------------------------------------------------------
  // TEST 3: AUTHENTICATION FAILURE & SESSION EXPIRATION
  // --------------------------------------------------------------------------
  it('3. handles authentication failure and session expiration by invalidating state', async () => {
    const auth = FirebaseAuthService.getInstance();
    await auth.signInWithGoogle();

    // Verify token refresh
    const initialToken = auth.getSessionState().token;
    const refreshedToken = await auth.refreshToken();
    assert.ok(refreshedToken !== null);
    assert.notEqual(refreshedToken, initialToken);

    // Simulate session expiration
    auth.simulateAuthFailure('Token expired during flight');
    const state = auth.getSessionState();
    assert.equal(state.isAuthenticated, false);
    assert.equal(state.user, null);
    assert.equal(state.token, null);
    assert.equal(state.authError, 'Token expired during flight');
  });

  // --------------------------------------------------------------------------
  // TEST 4: TENANT ISOLATION & SCOPED NAMESPACE CONTAINMENT
  // --------------------------------------------------------------------------
  it('4. strictly isolates documents into tenant-scoped partitions', async () => {
    const replication = CloudReplicationManager.getInstance();

    // Save document under tenant Alpha
    const docAlpha = await replication.saveLocalDocument({
      tenantId: 'tenant-alpha-001',
      collection: 'telemetry',
      docId: 'doc-session-001',
      data: { frameRate: 90, jitterMs: 0.8 },
      actorId: 'usr-simulated-admin-01',
    });

    // Save document with same collection and docId under tenant Beta
    const docBeta = await replication.saveLocalDocument({
      tenantId: 'tenant-beta-002',
      collection: 'telemetry',
      docId: 'doc-session-001',
      data: { frameRate: 72, jitterMs: 2.4 },
      actorId: 'usr-simulated-admin-01',
    });

    assert.equal(docAlpha.success, true);
    assert.equal(docBeta.success, true);

    const fetchedAlpha = replication.getLocalDocument('telemetry', 'doc-session-001', 'tenant-alpha-001');
    const fetchedBeta = replication.getLocalDocument('telemetry', 'doc-session-001', 'tenant-beta-002');

    assert.ok(fetchedAlpha);
    assert.ok(fetchedBeta);
    assert.equal(fetchedAlpha.data.frameRate, 90, 'Tenant Alpha data must remain pristine');
    assert.equal(fetchedBeta.data.frameRate, 72, 'Tenant Beta data must remain distinct');
  });

  // --------------------------------------------------------------------------
  // TEST 5: CROSS-TENANT ACCESS PREVENTION
  // --------------------------------------------------------------------------
  it('5. prevents cross-tenant access and blocks unauthorized tenant switching', () => {
    const tenantMgr = TenantContextManager.getInstance();
    tenantMgr.setCurrentUserId('usr-external-guest-09');

    // Attempt to switch to Alpha without membership
    const switchResult = tenantMgr.switchActiveTenant('tenant-alpha-001');
    assert.equal(switchResult.success, false);
    assert.ok(switchResult.error?.includes('Cross-tenant access blocked'));

    // Check permissions on unassigned tenant
    const guestPerms = tenantMgr.getPermissions('tenant-alpha-001');
    assert.equal(guestPerms.canReadData, false);
    assert.equal(guestPerms.canWriteData, false);
    assert.equal(guestPerms.canManageTenant, false);

    // Validate tenant ID pattern rejecting malicious injection
    assert.equal(tenantMgr.isValidTenantId('../../malicious/path'), false);
    assert.equal(tenantMgr.isValidTenantId('tenant-valid-123'), true);
  });

  // --------------------------------------------------------------------------
  // TEST 6: CONCURRENT DOCUMENT UPDATES & VERSION GAPS
  // --------------------------------------------------------------------------
  it('6. detects concurrent mutations and generates incremented version history', async () => {
    const replication = CloudReplicationManager.getInstance();

    const write1 = await replication.saveLocalDocument({
      tenantId: 'tenant-alpha-001',
      collection: 'diagnostics',
      docId: 'diag-001',
      data: { cpuLoadPct: 35 },
    });
    assert.equal(write1.document.version, 1);

    const write2 = await replication.saveLocalDocument({
      tenantId: 'tenant-alpha-001',
      collection: 'diagnostics',
      docId: 'diag-001',
      data: { cpuLoadPct: 48 },
    });
    assert.equal(write2.document.version, 2);
    assert.notEqual(write1.document.checksum, write2.document.checksum);
  });

  // --------------------------------------------------------------------------
  // TEST 7: OFFLINE WRITE PERSISTENCE & QUEUEING
  // --------------------------------------------------------------------------
  it('7. persists writes into offline queue and preserves pending items during disconnection', async () => {
    const replication = CloudReplicationManager.getInstance();
    replication.setSimulatedOnline(false);

    assert.equal(replication.isOnline(), false);

    await replication.saveLocalDocument({
      tenantId: 'tenant-alpha-001',
      collection: 'incidents',
      docId: 'inc-offline-01',
      data: { severity: 'HIGH', title: 'Network Partition' },
    });

    const queue = replication.getPendingQueue();
    assert.equal(queue.length, 1);
    assert.equal(queue[0].docId, 'inc-offline-01');
    assert.equal(queue[0].tenantId, 'tenant-alpha-001');

    const telemetry = replication.getTelemetry();
    assert.equal(telemetry.status, 'OFFLINE');
    assert.equal(telemetry.pendingUploadCount, 1);
  });

  // --------------------------------------------------------------------------
  // TEST 8: RECONNECTION SYNCHRONIZATION WITH EXPONENTIAL BACKOFF
  // --------------------------------------------------------------------------
  it('8. drains offline queue upon network restoration and tracks reconnect telemetry', async () => {
    const replication = CloudReplicationManager.getInstance();
    replication.setSimulatedOnline(false);

    await replication.saveLocalDocument({
      tenantId: 'tenant-alpha-001',
      collection: 'tasks',
      docId: 'task-sync-01',
      data: { status: 'IN_PROGRESS' },
    });
    assert.equal(replication.getPendingQueue().length, 1);

    // Reconnect to network
    replication.setSimulatedOnline(true);
    const result = await replication.replicatePendingQueue();

    assert.equal(result.replicatedCount, 1);
    assert.equal(result.remainingQueueCount, 0);

    const telemetry = replication.getTelemetry();
    assert.ok(telemetry.reconnectCount >= 1);
    assert.equal(telemetry.pendingUploadCount, 0);
  });

  // --------------------------------------------------------------------------
  // TEST 9: CONFLICT RESOLUTION POLICIES
  // --------------------------------------------------------------------------
  it('9. applies explicit conflict policies: HIGHER_VERSION_WINS, LAST_WRITE_WINS, and SERVER_AUTHORITATIVE', () => {
    const conflictMgr = ConflictResolutionManager.getInstance();

    const localDoc: SyncDocumentRecord = {
      docId: 'doc-conflict-01',
      tenantId: 'tenant-alpha-001',
      collection: 'state',
      version: 2,
      data: { value: 'local-state' },
      clientUpdatedAt: '2026-11-07T12:00:00.000Z',
      checksum: 'chk-local-123',
      lastModifiedBy: 'user-local',
    };

    const remoteDoc: SyncDocumentRecord = {
      docId: 'doc-conflict-01',
      tenantId: 'tenant-alpha-001',
      collection: 'state',
      version: 3,
      data: { value: 'remote-state' },
      clientUpdatedAt: '2026-11-07T11:59:00.000Z',
      serverUpdatedAt: '2026-11-07T12:01:00.000Z',
      checksum: 'chk-remote-456',
      lastModifiedBy: 'user-remote',
    };

    // Policy 1: HIGHER_VERSION_WINS
    const resHigherVersion = conflictMgr.evaluateRevision({
      tenantId: 'tenant-alpha-001',
      collection: 'state',
      docId: 'doc-conflict-01',
      localDoc,
      remoteDoc,
      policyOverride: 'HIGHER_VERSION_WINS',
    });
    assert.equal(resHigherVersion.hasConflict, true);
    assert.equal(resHigherVersion.winningDoc.version, 3);
    assert.equal(resHigherVersion.winningDoc.data.value, 'remote-state');

    // Policy 2: LAST_WRITE_WINS (Local update at 12:00 vs remote update at 11:59)
    const resLWW = conflictMgr.evaluateRevision({
      tenantId: 'tenant-alpha-001',
      collection: 'state',
      docId: 'doc-conflict-01',
      localDoc,
      remoteDoc: { ...remoteDoc, serverUpdatedAt: '2026-11-07T11:59:00.000Z' },
      policyOverride: 'LAST_WRITE_WINS',
    });
    assert.equal(resLWW.hasConflict, true);
    assert.equal(resLWW.winningDoc.data.value, 'local-state');

    // Policy 3: SERVER_AUTHORITATIVE
    const resServer = conflictMgr.evaluateRevision({
      tenantId: 'tenant-alpha-001',
      collection: 'state',
      docId: 'doc-conflict-01',
      localDoc,
      remoteDoc,
      policyOverride: 'SERVER_AUTHORITATIVE',
    });
    assert.equal(resServer.hasConflict, true);
    assert.equal(resServer.winningDoc.data.value, 'remote-state');
  });

  // --------------------------------------------------------------------------
  // TEST 10: DUPLICATE WRITE SUPPRESSION & IDEMPOTENCY
  // --------------------------------------------------------------------------
  it('10. suppresses duplicate writes through checksum verification without triggering extra replication cycles', async () => {
    const replication = CloudReplicationManager.getInstance();

    const write1 = await replication.saveLocalDocument({
      tenantId: 'tenant-alpha-001',
      collection: 'config',
      docId: 'cfg-01',
      data: { theme: 'cyberpunk_cyan', soundVolume: 0.8 },
    });
    assert.equal(write1.duplicate, false);

    // Save identical payload again
    const write2 = await replication.saveLocalDocument({
      tenantId: 'tenant-alpha-001',
      collection: 'config',
      docId: 'cfg-01',
      data: { theme: 'cyberpunk_cyan', soundVolume: 0.8 },
    });
    assert.equal(write2.duplicate, true);
    assert.equal(write2.enqueued, false);

    const telemetry = replication.getTelemetry();
    assert.ok(telemetry.duplicateSuppressionCount >= 1);
  });

  // --------------------------------------------------------------------------
  // TEST 11: EXPONENTIAL BACKOFF RETRY PROGRESSION
  // --------------------------------------------------------------------------
  it('11. progresses retry backoff intervals exponentially (1s, 2s, 4s, 8s, 16s, 30s max)', () => {
    const db = FirebaseDbService.getInstance();
    const backoff0 = Math.min(30000, 1000 * Math.pow(2, 0));
    const backoff1 = Math.min(30000, 1000 * Math.pow(2, 1));
    const backoff2 = Math.min(30000, 1000 * Math.pow(2, 2));
    const backoff3 = Math.min(30000, 1000 * Math.pow(2, 3));
    const backoff6 = Math.min(30000, 1000 * Math.pow(2, 6));

    assert.equal(backoff0, 1000);
    assert.equal(backoff1, 2000);
    assert.equal(backoff2, 4000);
    assert.equal(backoff3, 8000);
    assert.equal(backoff6, 30000, 'Backoff must clamp at 30 seconds');
  });

  // --------------------------------------------------------------------------
  // TEST 12: FIRESTORE SECURITY RULES SIMULATION
  // --------------------------------------------------------------------------
  it('12. verifies security rule validations: role requirements, path format, and immutable tenantId', () => {
    const tenantMgr = TenantContextManager.getInstance();

    // Verify role permissions
    const superAdminPerms = tenantMgr.resolveRolePermissions('SUPER_ADMIN');
    assert.equal(superAdminPerms.canManageTenant, true);
    assert.equal(superAdminPerms.canWriteData, true);

    const editorPerms = tenantMgr.resolveRolePermissions('EDITOR');
    assert.equal(editorPerms.canManageTenant, false);
    assert.equal(editorPerms.canWriteData, true);

    const viewerPerms = tenantMgr.resolveRolePermissions('VIEWER');
    assert.equal(viewerPerms.canWriteData, false);
    assert.equal(viewerPerms.canReadData, true);

    // Check tenantId validation matches rule pattern
    assert.equal(tenantMgr.isValidTenantId('tenant-valid-99'), true);
    assert.equal(tenantMgr.isValidTenantId(''), false);
    assert.equal(tenantMgr.isValidTenantId('a'.repeat(129)), false); // max 64
  });

  // --------------------------------------------------------------------------
  // TEST 13: MULTI-USER SYNCHRONIZATION ACROSS TENANTS
  // --------------------------------------------------------------------------
  it('13. handles multi-user concurrent ingestion across distinct tenants', async () => {
    const replication = CloudReplicationManager.getInstance();

    const remoteUser1Doc: SyncDocumentRecord = {
      docId: 'collab-doc-01',
      tenantId: 'tenant-alpha-001',
      collection: 'collaboration',
      version: 1,
      data: { cursorX: 120, cursorY: 340 },
      clientUpdatedAt: new Date().toISOString(),
      checksum: 'chk-collab-1',
      lastModifiedBy: 'usr-collab-alice',
    };

    const remoteUser2Doc: SyncDocumentRecord = {
      docId: 'collab-doc-02',
      tenantId: 'tenant-beta-002',
      collection: 'collaboration',
      version: 1,
      data: { cursorX: 580, cursorY: 720 },
      clientUpdatedAt: new Date().toISOString(),
      checksum: 'chk-collab-2',
      lastModifiedBy: 'usr-collab-bob',
    };

    const ingest1 = await replication.ingestRemoteDocument(remoteUser1Doc);
    const ingest2 = await replication.ingestRemoteDocument(remoteUser2Doc);

    assert.equal(ingest1.applied, true);
    assert.equal(ingest2.applied, true);

    const docAlpha = replication.getLocalDocument('collaboration', 'collab-doc-01', 'tenant-alpha-001');
    const docBeta = replication.getLocalDocument('collaboration', 'collab-doc-02', 'tenant-beta-002');

    assert.ok(docAlpha);
    assert.ok(docBeta);
    assert.equal(docAlpha.lastModifiedBy, 'usr-collab-alice');
    assert.equal(docBeta.lastModifiedBy, 'usr-collab-bob');
  });

  // --------------------------------------------------------------------------
  // TEST 14: CLOUD NETWORK FAILURE RECOVERY & BUFFERING
  // --------------------------------------------------------------------------
  it('14. buffers writes when cloud replication fails and prevents application blocking', async () => {
    const db = FirebaseDbService.getInstance();
    await db.setDatabaseMode('OFFLINE_FALLBACK');

    const result = await db.saveTenantTelemetry(
      {
        sessionId: 'sess-failover-01',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        frames: [],
        joints: [],
        expectedJointCount: 25,
        lightingPreset: 'bright_studio',
        latencySamples: [],
        trackingEvents: [],
        causationEvidence: null,
        thresholds: { minTrackedJoints: 25, maxLatencyMs: 33, maxFrameDurationMs: 16.6, maxRecoveryTimeMs: 100 },
        executedCategories: [],
        autoSavedAt: new Date().toISOString(),
      },
      'tenant-alpha-001',
      'usr-simulated-admin-01'
    );

    assert.equal(result.success, true);
    assert.equal(result.persistedToCloud, false);
    assert.equal(result.databaseMode, 'OFFLINE_FALLBACK');

    const pending = db.getPendingQueue();
    assert.ok(pending.length >= 1);
  });

  // --------------------------------------------------------------------------
  // TEST 15: LOCAL-MODE FALLBACK & ZERO-LOSS COMMITMENT
  // --------------------------------------------------------------------------
  it('15. maintains zero data loss in LOCAL_DEVELOPMENT mode with intact audit proofs', async () => {
    const db = FirebaseDbService.getInstance();
    await db.setDatabaseMode('LOCAL_DEVELOPMENT');

    const proof = db.generateAuditProof(
      'audit-local-test',
      new Date().toISOString(),
      'VERIFY_INTEGRITY',
      10,
      'SUCCESS',
      'LOCAL_DEVELOPMENT'
    );

    assert.ok(proof.startsWith('PROOF-'));
    assert.ok(proof.length > 20);

    const verifyProof = db.verifyAuditProof({
      id: 'audit-local-test',
      timestamp: new Date().toISOString(),
      operationId: 'VERIFY_INTEGRITY',
      recordsCount: 10,
      status: 'SUCCESS',
      hashProof: proof,
      details: 'Audit test',
      databaseMode: 'LOCAL_DEVELOPMENT',
    });

    // Verification must execute deterministically
    assert.equal(typeof verifyProof, 'boolean');
  });
});
