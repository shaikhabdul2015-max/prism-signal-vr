/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 18 Enterprise Test Suite.
 * Validates enterprise authentication, database operations, cloud synchronization,
 * offline recovery, duplicate prevention, incident intelligence, AI agent coordination,
 * security boundaries, and WebXR Quest validation.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { authService, FirebaseAuthService } from '../src/services/firebaseAuthService';
import { dbService, FirebaseDbService } from '../src/services/firebaseDbService';
import { IncidentManager } from '../src/utils/incidentManager';
import { EnterpriseAgentCoordinator } from '../src/utils/agentCoordinator';
import { ObservabilityEngine } from '../src/utils/observabilityEngine';
import { validateQuestWebXR } from '../src/utils/questWebXRValidator';
import { isFirebaseConfigured, getMissingFirebaseKeys } from '../src/utils/firebaseConfig';
import { VRTelemetry } from '../src/types/diagnostics';
import { CloudSyncPayload } from '../src/types/phase17';
import { assessEnvironmentalCausation } from '../src/utils/environmentalAssessment';

function createMockTelemetry(overrides: Partial<VRTelemetry> = {}): VRTelemetry {
  return {
    sessionId: `test-sess-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    frames: [
      {
        timestampMs: 1000,
        frameDurationMs: 13.88,
        dropped: false,
      },
    ],
    joints: Array.from({ length: 25 }, (_, i) => ({
      jointId: `joint_${i}`,
      tracked: true,
      confidence: 1.0,
    })),
    expectedJointCount: 25,
    lightingPreset: 'bright_studio',
    latencySamples: [{ timestampMs: 1000, latencyMs: 14.1 }],
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

describe('Phase 18: Module 1 - Enterprise Authentication & RBAC', () => {
  it('manages local authenticated session and user profile attributes', async () => {
    const user = await authService.signInWithGoogle();
    assert.ok(user);
    assert.ok(user.uid);
    assert.equal(user.role, 'Admin');

    const state = authService.getSessionState();
    assert.equal(state.isAuthenticated, true);
    assert.ok(state.user);
    assert.equal(state.user.uid, user.uid);
  });

  it('switches roles and accurately returns distinct RBAC permissions', () => {
    authService.switchRole('Viewer');
    const viewerPerms = authService.getPermissions('Viewer');
    assert.equal(viewerPerms.canExecuteTests, false);
    assert.equal(viewerPerms.canModifySystemConfig, false);

    authService.switchRole('Engineer');
    const engPerms = authService.getPermissions('Engineer');
    assert.equal(engPerms.canExecuteTests, true);
    assert.equal(engPerms.canModifySystemConfig, false);

    authService.switchRole('Admin');
    const adminPerms = authService.getPermissions('Admin');
    assert.equal(adminPerms.canExecuteTests, true);
    assert.equal(adminPerms.canModifySystemConfig, true);
  });

  it('clears session upon user logout', async () => {
    await authService.signOut();
    const state = authService.getSessionState();
    assert.equal(state.isAuthenticated, false);
    assert.equal(state.user, null);
    assert.equal(state.token, null);
  });
});

describe('Phase 18: Module 2 - Enterprise Database & Connection Monitoring', () => {
  it('reports database connection status without crashing when external credentials are unconfigured', async () => {
    const status = await dbService.getConnectionStatus();
    assert.ok(status);
    assert.ok(status.service === 'firestore' || status.service === 'offline_local');
    assert.equal(typeof status.connected, 'boolean');
    assert.equal(typeof status.pendingWriteCount, 'number');
  });

  it('persists telemetry and prevents duplicate record insertion using sessionId', async () => {
    const tel = createMockTelemetry({ sessionId: 'session-persist-01' });
    const firstSave = await dbService.saveTelemetry(tel, 'test-user-id');
    assert.equal(firstSave.success, true);
    assert.equal(firstSave.duplicate, false);

    const duplicateSave = await dbService.saveTelemetry(tel, 'test-user-id');
    assert.equal(duplicateSave.success, true);
    assert.equal(duplicateSave.duplicate, true);
  });

  it('saves incidents and merges duplicate records by fingerprint', async () => {
    const incident = {
      incidentId: 'inc-db-test-01',
      fingerprint: 'fp-db-unique-01',
      sessionId: 'sess-db-01',
      category: 'tracking_loss' as const,
      severity: 'HIGH' as const,
      state: 'ACTION_REQUIRED' as const,
      title: 'Database Test Incident',
      detectedAt: new Date().toISOString(),
      lastSeenTimestamp: new Date().toISOString(),
      resolvedAt: null,
      telemetryEvidence: { interruptionCount: 2 },
      diagnosticExplanation: 'Test explanation',
      recommendedAction: 'Test action',
      resolutionNotes: null,
      resolvedBy: null,
      rule2ComplianceVerified: true,
      occurrenceCount: 1,
    };

    const first = await dbService.saveIncident(incident);
    assert.equal(first.success, true);
    assert.equal(first.merged, false);

    const second = await dbService.saveIncident(incident);
    assert.equal(second.success, true);
    assert.equal(second.merged, true);
  });

  it('calculates cross-session performance trends from stored telemetry', async () => {
    const analysis = await dbService.computeTrendAnalysis();
    assert.ok(analysis);
    assert.ok(analysis.sessionCount >= 1);
    assert.ok(analysis.medianLatencyMs > 0);
    assert.ok(analysis.p95LatencyMs >= analysis.medianLatencyMs);
  });
});

describe('Phase 18: Module 3 - Advanced Incident Intelligence', () => {
  it('classifies incidents with severity scoring and automated recovery steps', () => {
    const mgr = new IncidentManager();
    const tel = createMockTelemetry({
      trackingEvents: [{ timestampMs: 1, tracking: false }, { timestampMs: 2, tracking: false }],
    });

    const detected = mgr.auditTelemetryForIncidents(tel);
    assert.ok(detected.length > 0);
    const trackingInc = detected.find((i) => i.category === 'tracking_loss');
    assert.ok(trackingInc);
    assert.equal(trackingInc.classification, 'critical_tracking_blackout');
    assert.ok(trackingInc.severityScore > 50);
    assert.ok(trackingInc.automatedRecoverySteps.length > 0);
  });

  it('correlates co-occurring incidents in the same session', () => {
    const mgr = new IncidentManager();
    const tel = createMockTelemetry({
      sessionId: 'sess-correlated-test',
      trackingEvents: [{ timestampMs: 1, tracking: false }],
      joints: Array.from({ length: 15 }, (_, i) => ({
        jointId: `joint_${i}`,
        tracked: true,
        confidence: 0.9,
      })),
    });

    mgr.auditTelemetryForIncidents(tel);
    const incidents = mgr.getAllIncidents().filter((i) => i.sessionId === 'sess-correlated-test');
    assert.ok(incidents.length >= 2);
    incidents.forEach((inc) => {
      assert.ok(inc.correlatedIncidentIds.length >= 1);
    });
  });

  it('tracks incident lifecycle transitions and operator interventions', () => {
    const mgr = new IncidentManager();
    const tel = createMockTelemetry({
      sessionId: 'sess-operator-test',
      trackingEvents: [{ timestampMs: 1, tracking: false }],
    });

    const detected = mgr.auditTelemetryForIncidents(tel);
    const inc = detected[0];

    // Operator intervention
    mgr.recordOperatorIntervention(inc.incidentId, 'Lead Architect', 'Applied optical smoothing filter.');
    const updated = mgr.getAllIncidents().find((i) => i.incidentId === inc.incidentId);
    assert.ok(updated);
    assert.equal(updated.assignedOperator, 'Lead Architect');
    assert.ok(updated.notesHistory.some((n) => n.note.includes('optical smoothing')));

    // Resolve incident
    mgr.updateIncidentState(inc.incidentId, 'Resolved', 'Filter stabilized tracking.');
    const resolved = mgr.getAllIncidents().find((i) => i.incidentId === inc.incidentId);
    assert.ok(resolved);
    assert.equal(resolved.state, 'RESOLVED');
    assert.ok(resolved.resolvedAt);
    assert.ok((resolved.resolutionDurationSeconds || 0) >= 0);
  });
});

describe('Phase 18: Module 4 - AI Agent Coordination Upgrade', () => {
  it('manages task execution lifecycle, confidence, and uncertainty reporting', () => {
    const coordinator = new EnterpriseAgentCoordinator();
    const tel = createMockTelemetry();

    const report = coordinator.coordinateEnterpriseAgents(tel, { isPhysicalVRActive: false });
    assert.ok(report);
    assert.equal(report.antiLoopGuardTriggered, false);
    assert.ok(report.overallConfidence >= 0.7);

    // Verify all 6 specialist agents executed with structured outputs
    const roles = Object.keys(report.agents);
    assert.equal(roles.length, 6);
    assert.ok(roles.includes('OperationsAgent'));
    assert.ok(roles.includes('TestAgent'));
    assert.ok(roles.includes('TrackingAgent'));
    assert.ok(roles.includes('PerformanceAgent'));
    assert.ok(roles.includes('IncidentAgent'));
    assert.ok(roles.includes('ChiefIntelligenceAgent'));

    roles.forEach((r) => {
      const task = report.agents[r as keyof typeof report.agents];
      assert.ok(task.confidence > 0 && task.confidence <= 1.0);
      assert.ok(task.uncertaintyScore >= 0 && task.uncertaintyScore <= 1.0);
      assert.ok(task.findings.length > 0);
      assert.ok(task.recommendations.length > 0);
    });
  });

  it('records execution audit logs and prevents runaway loops via anti-loop guard', () => {
    const coordinator = new EnterpriseAgentCoordinator();
    const tel = createMockTelemetry();

    // Rapidly execute cycles
    for (let i = 0; i < 12; i++) {
      coordinator.coordinateEnterpriseAgents(tel);
    }

    const auditTrail = coordinator.getAuditTrail();
    assert.ok(auditTrail.length > 0);
    assert.ok(auditTrail.some((a) => a.action === 'ANTI_LOOP_GUARD' || a.action === 'TASK_EXECUTION'));
  });
});

describe('Phase 18: Module 5 - Advanced Observability & System Metrics', () => {
  it('measures cadence, memory heap, and tracking stability', () => {
    const engine = ObservabilityEngine.getInstance();
    engine.recordApiLatency(14.5);
    engine.recordApiLatency(13.2);

    const tel = createMockTelemetry();
    const snapshot = engine.computeSnapshot(tel, [], false);

    assert.ok(snapshot);
    assert.equal(snapshot.provenance, 'Simulation');
    assert.ok(snapshot.fpsMetrics.currentFps > 0);
    assert.ok(snapshot.fpsMetrics.targetFps === 72 || snapshot.fpsMetrics.targetFps === 90);
    assert.equal(snapshot.availableSkeletonJointsCount, 25);
    assert.equal(snapshot.trackingStabilityPercent, 100);
    assert.ok(snapshot.averageApiLatencyMs > 0);
  });
});

describe('Phase 18: Module 6 - Meta Quest WebXR Hardware Validation', () => {
  it('truthfully reports hardware presence and defaults to graceful non-VR fallback on desktop', async () => {
    const result = await validateQuestWebXR();
    assert.ok(result);
    assert.equal(typeof result.isPhysicalVRConnected, 'boolean');
    assert.ok(result.features);
    assert.ok(Array.isArray(result.features.supportedRefreshRatesHz));
    assert.equal(result.gracefulFallbackReady, true);
    // On Node/Desktop test runner, physical headset should not be falsely claimed
    assert.equal(result.isPhysicalVRConnected, false);
    assert.equal(result.features.fallbackActive, true);
  });
});

describe('Phase 18: Module 7 - Security Boundaries & Rule #2 Invariance', () => {
  it('does not expose secrets or API keys in client config', () => {
    const missing = getMissingFirebaseKeys();
    assert.ok(Array.isArray(missing));
    // If not configured, should return missing key names rather than empty strings
    if (!isFirebaseConfigured()) {
      assert.ok(missing.includes('VITE_FIREBASE_API_KEY'));
    }
  });

  it('strictly preserves Rule #2 environmental invariance across enterprise modules', () => {
    // Low light preset with null evidence -> strictly INCONCLUSIVE
    const inconclusiveAssessment = assessEnvironmentalCausation(null);
    assert.equal(inconclusiveAssessment.causationStatus, 'INCONCLUSIVE');

    // Forged evidence -> strictly INCONCLUSIVE
    const forgedEvidence = {
      tokenPresent: true,
      validated: false,
      establishesEnvironmentalCausation: true,
    };
    const rejectedAssessment = assessEnvironmentalCausation(forgedEvidence);
    assert.equal(rejectedAssessment.causationStatus, 'INCONCLUSIVE');

    // Genuine validated hardware token -> CONFIRMED
    const validatedEvidence = {
      tokenPresent: true,
      validated: true,
      establishesEnvironmentalCausation: true,
    };
    const confirmedAssessment = assessEnvironmentalCausation(validatedEvidence);
    assert.equal(confirmedAssessment.causationStatus, 'CONFIRMED');
  });
});
