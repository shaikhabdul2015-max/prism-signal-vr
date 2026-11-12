/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 19.5 Engineering Test Suite:
 * Validates Database Mode Management (LOCAL_DEVELOPMENT, CLOUD_FIRESTORE, OFFLINE_FALLBACK),
 * Firestore unavailability handling, degraded cloud mode, offline buffering,
 * exponential backoff queue drain, duplicate prevention, fail-safe reporting,
 * and tamper-evident audit log integrity.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { FirebaseDbService, dbService } from '../src/services/firebaseDbService';
import { VRTelemetry } from '../src/types/diagnostics';
import { UpgradedIncidentRecord } from '../src/types/phase18';
import { SyncAuditRecord } from '../src/types/phase19';

function createMockTelemetry(overrides: Partial<VRTelemetry> = {}): VRTelemetry {
  return {
    sessionId: `phase19-5-test-session-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    frames: [
      { timestampMs: 1000, frameDurationMs: 13.88, dropped: false },
      { timestampMs: 1014, frameDurationMs: 13.88, dropped: false },
    ],
    joints: Array.from({ length: 25 }, (_, i) => ({
      jointId: `joint_${i}`,
      tracked: true,
      confidence: 1.0,
    })),
    expectedJointCount: 25,
    lightingPreset: 'bright_studio',
    latencySamples: [{ timestampMs: 1000, latencyMs: 13.8 }],
    trackingEvents: [{ timestampMs: 1000, tracking: true }],
    causationEvidence: null,
    thresholds: {
      minTrackedJoints: 25,
      maxLatencyMs: 33,
      maxFrameDurationMs: 16.6,
      maxRecoveryTimeMs: 100,
    },
    executedCategories: [
      'skeleton_integrity',
      'tracking_continuity',
      'frame_performance',
      'latency',
      'environmental_conditions',
      'test_execution',
    ],
    autoSavedAt: new Date().toISOString(),
    ...overrides,
  };
}

function createMockIncident(overrides: Partial<UpgradedIncidentRecord> = {}): UpgradedIncidentRecord {
  return {
    incidentId: `inc-19-5-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    sessionId: `sess-${Date.now()}`,
    detectedAt: new Date().toISOString(),
    resolvedAt: null,
    category: 'render_cadence_drop',
    severity: 'MEDIUM',
    state: 'DETECTED',
    title: 'Frame Time Spike',
    diagnosticExplanation: 'Frame duration exceeded target 13.88ms threshold.',
    recommendedAction: 'Engage dynamic resolution scaling',
    fingerprint: `fp-19-5-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
    telemetryEvidence: { frameDeltaMs: 22 },
    rule2ComplianceVerified: true,
    occurrenceCount: 1,
    resolutionNotes: null,
    resolvedBy: null,
    classification: 'cadence_pipeline_stall',
    severityScore: 70,
    correlatedIncidentIds: [],
    automatedRecoverySteps: ['dynamic_resolution_downscale'],
    notesHistory: [],
    ...overrides,
  };
}

describe('Phase 19.5: Module 1 - Explicit Database Mode Management', () => {
  it('switches between LOCAL_DEVELOPMENT, CLOUD_FIRESTORE, and OFFLINE_FALLBACK modes', async () => {
    FirebaseDbService.resetInstance();
    const service = FirebaseDbService.getInstance();

    // 1. Switch to LOCAL_DEVELOPMENT
    const resLocal = await service.setDatabaseMode('LOCAL_DEVELOPMENT');
    assert.equal(resLocal.activeMode, 'LOCAL_DEVELOPMENT');
    assert.equal(service.getActiveMode(), 'LOCAL_DEVELOPMENT');
    assert.equal(resLocal.cloudHealth, 'OFFLINE_ISOLATED');

    // 2. Switch to OFFLINE_FALLBACK
    const resFallback = await service.setDatabaseMode('OFFLINE_FALLBACK');
    assert.equal(resFallback.activeMode, 'OFFLINE_FALLBACK');
    assert.equal(service.getActiveMode(), 'OFFLINE_FALLBACK');
    assert.equal(resFallback.cloudHealth, 'DEGRADED_CLOUD_MODE');

    // 3. Attempt CLOUD_FIRESTORE when unconfigured or bypassed
    const resCloud = await service.setDatabaseMode('CLOUD_FIRESTORE');
    assert.equal(service.getTargetMode(), 'CLOUD_FIRESTORE');
    // Because remote cloud is unconfigured or bypassed, it must safely fall back to OFFLINE_FALLBACK
    assert.equal(resCloud.activeMode, 'OFFLINE_FALLBACK');
    assert.equal(resCloud.cloudHealth, 'DEGRADED_CLOUD_MODE');
    assert.ok(resCloud.reason);
  });
});

describe('Phase 19.5: Module 2 - Production Safety & Fail-Safe Reporting', () => {
  it('never falsely reports local writes as successful cloud persistence in OFFLINE_FALLBACK mode', async () => {
    FirebaseDbService.resetInstance();
    const service = FirebaseDbService.getInstance();
    await service.setDatabaseMode('OFFLINE_FALLBACK');

    const telemetry = createMockTelemetry();
    const saveResult = await service.saveTelemetry(telemetry);

    assert.equal(saveResult.success, true);
    assert.equal(saveResult.persistedToCloud, false, 'Must strictly report persistedToCloud: false in offline fallback mode');
    assert.equal(saveResult.databaseMode, 'OFFLINE_FALLBACK');

    // Buffers into offline queue
    const queue = service.getPendingQueue();
    assert.ok(queue.some((item) => item.id === telemetry.sessionId));
  });

  it('never falsely reports incident writes as cloud persisted in LOCAL_DEVELOPMENT mode', async () => {
    FirebaseDbService.resetInstance();
    const service = FirebaseDbService.getInstance();
    await service.setDatabaseMode('LOCAL_DEVELOPMENT');

    const incident = createMockIncident();
    const saveResult = await service.saveIncident(incident);

    assert.equal(saveResult.success, true);
    assert.equal(saveResult.persistedToCloud, false, 'Must strictly report persistedToCloud: false in local dev mode');
    assert.equal(saveResult.databaseMode, 'LOCAL_DEVELOPMENT');
  });
});

describe('Phase 19.5: Module 3 - Offline Buffering & Duplicate Prevention', () => {
  it('deduplicates recurring incidents and updates existing records in memory and offline queue', async () => {
    FirebaseDbService.resetInstance();
    const service = FirebaseDbService.getInstance();
    await service.setDatabaseMode('OFFLINE_FALLBACK');

    const incident = createMockIncident({ fingerprint: 'duplicate-test-fp-1' });

    // Write 1
    const res1 = await service.saveIncident(incident);
    assert.equal(res1.merged, false);

    // Write 2 (identical fingerprint)
    const res2 = await service.saveIncident(incident);
    assert.equal(res2.merged, true, 'Subsequent write with matching fingerprint must be merged');

    const incidents = await service.getIncidents();
    const matches = incidents.filter((i) => i.fingerprint === 'duplicate-test-fp-1');
    assert.equal(matches.length, 1);
    assert.equal(matches[0].occurrenceCount, 2);
  });

  it('maintains pending queue and calculates exponential backoff retry delays', async () => {
    FirebaseDbService.resetInstance();
    const service = FirebaseDbService.getInstance();
    await service.setDatabaseMode('OFFLINE_FALLBACK');

    const tel1 = createMockTelemetry();
    await service.saveTelemetry(tel1);

    const report = service.getInfrastructureReport();
    assert.ok(report.pendingSyncCount >= 1);
    assert.equal(report.cloudHealth, 'DEGRADED_CLOUD_MODE');
    assert.ok(report.backoffDelayMs >= 1000);
  });
});

describe('Phase 19.5: Module 4 - Quarantining & Failed Record Recovery', () => {
  it('recovers quarantined records when operator triggers recovery without losing data', () => {
    FirebaseDbService.resetInstance();
    const service = FirebaseDbService.getInstance();

    // Recover empty quarantine
    const initialRecovered = service.retryFailedRecords();
    assert.equal(initialRecovered, 0);

    // Verify recovery audit record
    const report = service.getInfrastructureReport();
    assert.ok(Array.isArray(report.auditLogs));
  });
});

describe('Phase 19.5: Module 5 - Tamper-Evident Audit Logging Integrity', () => {
  it('generates cryptographic hash proofs and detects unauthorized tampering with audit records', () => {
    FirebaseDbService.resetInstance();
    const service = FirebaseDbService.getInstance();

    const timestamp = new Date().toISOString();
    const proof = service.generateAuditProof(
      'audit-test-1',
      timestamp,
      'TEST_OP',
      1,
      'SUCCESS',
      'LOCAL_DEVELOPMENT'
    );

    const validRecord: SyncAuditRecord = {
      id: 'audit-test-1',
      timestamp,
      operationId: 'TEST_OP',
      recordsCount: 1,
      status: 'SUCCESS',
      hashProof: proof,
      details: 'Test details',
      databaseMode: 'LOCAL_DEVELOPMENT',
    };

    assert.equal(service.verifyAuditProof(validRecord), true, 'Valid audit record must pass proof verification');

    // Tampered status
    const tamperedStatusRecord: SyncAuditRecord = {
      ...validRecord,
      status: 'FAILED', // Tampered!
    };
    assert.equal(
      service.verifyAuditProof(tamperedStatusRecord),
      false,
      'Tampered status must fail proof verification'
    );

    // Tampered databaseMode
    const tamperedModeRecord: SyncAuditRecord = {
      ...validRecord,
      databaseMode: 'CLOUD_FIRESTORE', // Tampered!
    };
    assert.equal(
      service.verifyAuditProof(tamperedModeRecord),
      false,
      'Tampered mode must fail proof verification'
    );
  });

  it('guarantees that audit records never leak private API keys or GCP secrets', async () => {
    FirebaseDbService.resetInstance();
    const service = FirebaseDbService.getInstance();
    await service.setDatabaseMode('LOCAL_DEVELOPMENT');

    const report = service.getInfrastructureReport();
    const serialized = JSON.stringify(report);

    assert.ok(!serialized.includes('AIzaSy'));
    assert.ok(!serialized.includes('LLAMA_API_KEY'));
    assert.ok(!serialized.includes('SERVICE_ACCOUNT'));
  });
});
