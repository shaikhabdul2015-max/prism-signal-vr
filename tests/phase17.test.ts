import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { TestOrchestrator, DEFAULT_TEST_SCENARIOS } from '../src/utils/testOrchestrator';
import { IncidentManager } from '../src/utils/incidentManager';
import { CloudSyncEngine } from '../src/utils/cloudSyncEngine';
import { coordinateAIAgents } from '../src/utils/agentCoordinator';
import { assessEnvironmentalCausation } from '../src/utils/environmentalAssessment';
import type { VRTelemetry, VRCausationEvidence } from '../src/types/diagnostics';
import type { TestScenarioConfig, CloudSyncPayload } from '../src/types/phase17';

function makeTelemetry(overrides: Partial<VRTelemetry> = {}): VRTelemetry {
  const joints = Array.from({ length: 25 }, (_, i) => ({
    jointId: `joint_${i}`,
    tracked: true,
    confidence: 0.95,
  }));

  return {
    sessionId: `sess-test-${Date.now()}`,
    startedAt: new Date(Date.now() - 5000).toISOString(),
    completedAt: new Date().toISOString(),
    expectedJointCount: 25,
    joints,
    frames: [
      { timestampMs: 1000, frameDurationMs: 13.8, dropped: false },
      { timestampMs: 1014, frameDurationMs: 13.8, dropped: false },
    ],
    trackingEvents: [{ timestampMs: 1000, tracking: true }],
    latencySamples: [{ timestampMs: 1000, latencyMs: 13.8 }],
    lightingPreset: 'bright_studio',
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

describe('Phase 17: Module 2 - Global VR Operations Center & Telemetry Provenance', () => {
  it('clearly separates Physical Hardware from Simulation provenance', () => {
    const physicalConsolidation = coordinateAIAgents(makeTelemetry(), {
      telemetrySource: 'Physical Hardware',
      isPhysicalVRActive: true,
    });
    assert.match(physicalConsolidation.chiefExecutiveBriefing, /Physical Hardware/);

    const simConsolidation = coordinateAIAgents(makeTelemetry(), {
      telemetrySource: 'Simulation',
      isPhysicalVRActive: false,
    });
    assert.match(simConsolidation.chiefExecutiveBriefing, /Simulation/);
    assert.equal(simConsolidation.systemVerdict, 'Simulated');
  });

  it('determines Warning or Critical operational statuses upon severe telemetry degradation', () => {
    const degradedTelemetry = makeTelemetry({
      frames: [{ timestampMs: 1000, frameDurationMs: 35.0, dropped: true }], // Low FPS (~28 FPS)
      joints: Array.from({ length: 25 }, (_, i) => ({ jointId: `j_${i}`, tracked: i < 10, confidence: 0.4 })),
      trackingEvents: [{ timestampMs: 1000, tracking: false }, { timestampMs: 1200, tracking: false }, { timestampMs: 1400, tracking: false }, { timestampMs: 1600, tracking: false }],
    });

    const consolidation = coordinateAIAgents(degradedTelemetry, {
      telemetrySource: 'Physical Hardware',
      isPhysicalVRActive: true,
    });

    assert.ok(consolidation.systemVerdict === 'Critical' || consolidation.systemVerdict === 'Warning');
    assert.ok(consolidation.criticalDirectives.length > 0);
  });
});

describe('Phase 17: Module 3 - Intelligent Test Orchestrator', () => {
  it('enqueues test scenarios according to priority weighting (critical > high > medium > low)', () => {
    const orchestrator = new TestOrchestrator();

    orchestrator.enqueueTest('scen-pinch-hysteresis', 'key-low'); // low
    orchestrator.enqueueTest('scen-skeleton-25', 'key-critical'); // critical
    orchestrator.enqueueTest('scen-latency-bound', 'key-medium'); // medium
    orchestrator.enqueueTest('scen-cadence-72hz', 'key-high'); // high

    const queue = orchestrator.getQueue();
    assert.equal(queue.length, 4);
    assert.equal(queue[0].priority, 'critical');
    assert.equal(queue[1].priority, 'high');
    assert.equal(queue[2].priority, 'medium');
    assert.equal(queue[3].priority, 'low');
  });

  it('enforces idempotency control to prevent duplicate test execution', () => {
    const orchestrator = new TestOrchestrator();
    const idemKey = 'idempotent-run-123';

    const first = orchestrator.enqueueTest('scen-skeleton-25', idemKey);
    const second = orchestrator.enqueueTest('scen-skeleton-25', idemKey);

    assert.equal(first.executionId, second.executionId);
    assert.equal(orchestrator.getQueue().length, 1);
  });

  it('safely cancels queued and running tests with audit logging', () => {
    const orchestrator = new TestOrchestrator();
    const item = orchestrator.enqueueTest('scen-cadence-72hz');

    const cancelled = orchestrator.cancelExecution(item.executionId, 'User requested cancellation');
    assert.equal(cancelled, true);
    assert.equal(orchestrator.getQueue().length, 0);

    const historyItem = orchestrator.getHistory().find((h) => h.executionId === item.executionId);
    assert.ok(historyItem);
    assert.equal(historyItem.state, 'CANCELLED');
    assert.match(historyItem.logs[historyItem.logs.length - 1].message, /User requested cancellation/);
  });

  it('executes test and enforces retry policy with max retry ceiling without infinite loops', async () => {
    const orchestrator = new TestOrchestrator();
    const item = orchestrator.enqueueTest('scen-skeleton-25');

    // Telemetry with only 10 joints (fails 25-joint requirement)
    const failingTelemetry = makeTelemetry({
      joints: Array.from({ length: 25 }, (_, i) => ({ jointId: `joint_${i}`, tracked: i < 10, confidence: 0.8 })),
    });

    // Attempt 1 -> Triggers retry (re-queued)
    const afterAttempt1 = await orchestrator.executeTest(item.executionId, failingTelemetry);
    assert.equal(afterAttempt1.retryCount, 1);
    assert.equal(afterAttempt1.state, 'QUEUED');

    // Attempt 2 -> Triggers retry 2 (re-queued)
    const afterAttempt2 = await orchestrator.executeTest(item.executionId, failingTelemetry);
    assert.equal(afterAttempt2.retryCount, 2);

    // Attempt 3 -> Hits maxRetries ceiling (marked FAILED)
    const afterAttempt3 = await orchestrator.executeTest(item.executionId, failingTelemetry);
    assert.equal(afterAttempt3.state, 'FAILED');
    assert.equal(afterAttempt3.resultStatus, 'FAIL');
    assert.ok(afterAttempt3.error);
  });
});

describe('Phase 17: Module 4 - Cloud Intelligence Engine & Synchronization', () => {
  it('queues telemetry in offline sync queue when network is unavailable without dropping data', async () => {
    const cloudEngine = new CloudSyncEngine();
    const originalFetch = globalThis.fetch;

    // Simulate network offline error
    globalThis.fetch = async () => {
      throw new Error('Network offline');
    };

    try {
      const tel = makeTelemetry();
      const result = await cloudEngine.syncSnapshot(tel, { telemetrySource: 'Simulation' });

      assert.equal(result.status, 'queued');
      assert.ok(cloudEngine.getOfflineQueueLength() > 0);
      const queuedItem = cloudEngine.getOfflineQueue()[0];
      assert.equal(queuedItem.payload.telemetrySource, 'Simulation');
      assert.equal(queuedItem.payload.telemetrySnapshot.sessionId, tel.sessionId);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('synchronizes and drains offline queue when connectivity is restored', async () => {
    const cloudEngine = new CloudSyncEngine();
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async () =>
      new Response(JSON.stringify({ status: 'synced', recordsSyncedCount: 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    try {
      const drainResult = await cloudEngine.drainQueue();
      assert.ok(drainResult.synced >= 0);
      assert.equal(cloudEngine.getStatus(), 'synced');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('preserves Rule #2 invariant across client cloud sync payloads', async () => {
    const cloudEngine = new CloudSyncEngine();
    const originalFetch = globalThis.fetch;
    let sentPayload: CloudSyncPayload | null = null;

    globalThis.fetch = async (_url, options) => {
      sentPayload = JSON.parse(options?.body as string);
      return new Response(JSON.stringify({ status: 'synced', recordsSyncedCount: 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    try {
      // Telemetry has low_light preset but no validated token
      const tel = makeTelemetry({
        lightingPreset: 'low_light',
        causationEvidence: null,
      });

      await cloudEngine.syncSnapshot(tel, { telemetrySource: 'Simulation' });
      assert.ok(sentPayload);
      assert.equal((sentPayload as CloudSyncPayload).telemetrySnapshot.causationEvidence, null);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('Phase 17: Module 5 - AI Incident Management System', () => {
  it('detects tracking loss and render cadence drops and assigns appropriate severities', () => {
    const incidentManager = new IncidentManager();
    const degradedTelemetry = makeTelemetry({
      sessionId: 'sess-incident-test-1',
      trackingEvents: [{ timestampMs: 1000, tracking: false }],
      frames: [{ timestampMs: 1000, frameDurationMs: 38.0, dropped: true }], // ~26 FPS
    });

    const detected = incidentManager.auditTelemetryForIncidents(degradedTelemetry);
    assert.ok(detected.length >= 2);

    const lossInc = detected.find((i) => i.category === 'tracking_loss');
    assert.ok(lossInc);
    assert.equal(lossInc.state, 'ACTION_REQUIRED');

    const cadenceInc = detected.find((i) => i.category === 'render_cadence_drop');
    assert.ok(cadenceInc);
    assert.equal(cadenceInc.severity, 'CRITICAL');
  });

  it('deduplicates recurring incidents using session fingerprints instead of creating duplicate records', () => {
    const incidentManager = new IncidentManager();
    const tel = makeTelemetry({
      sessionId: 'sess-dedup-test',
      trackingEvents: [{ timestampMs: 1000, tracking: false }],
    });

    // Run audit twice
    incidentManager.auditTelemetryForIncidents(tel);
    incidentManager.auditTelemetryForIncidents(tel);

    const allIncidents = incidentManager.getAllIncidents().filter((i) => i.sessionId === 'sess-dedup-test');
    const lossIncidents = allIncidents.filter((i) => i.category === 'tracking_loss');

    // Must be deduplicated into 1 record with occurrenceCount = 2
    assert.equal(lossIncidents.length, 1);
    assert.equal(lossIncidents[0].occurrenceCount, 2);
  });

  it('transitions incident lifecycle state and records operator resolution notes', () => {
    const incidentManager = new IncidentManager();
    const tel = makeTelemetry({
      sessionId: 'sess-lifecycle-test',
      trackingEvents: [{ timestampMs: 1000, tracking: false }],
    });

    const detected = incidentManager.auditTelemetryForIncidents(tel);
    const inc = detected[0];

    const resolved = incidentManager.updateIncidentState(
      inc.incidentId,
      'RESOLVED',
      'Optical center re-calibrated successfully',
      'Lead QA Operator'
    );

    assert.equal(resolved, true);
    const updated = incidentManager.getAllIncidents().find((i) => i.incidentId === inc.incidentId);
    assert.ok(updated);
    assert.equal(updated.state, 'RESOLVED');
    assert.equal(updated.resolvedBy, 'Lead QA Operator');
    assert.match(updated.resolutionNotes || '', /Optical center re-calibrated/);
  });
});

describe('Phase 17: Module 8 & 9 - AI Agent Coordination & Mandatory Rule #2 Invariants', () => {
  it('coordinates all 6 specialist agents with explicit confidence and uncertainty disclosures', () => {
    const tel = makeTelemetry();
    const consolidation = coordinateAIAgents(tel, {
      telemetrySource: 'Physical Hardware',
      isPhysicalVRActive: true,
    });

    assert.equal(consolidation.agentReports.length, 6);
    const roles = consolidation.agentReports.map((r) => r.role);
    assert.ok(roles.includes('ChiefIntelligenceAgent'));
    assert.ok(roles.includes('OperationsAgent'));
    assert.ok(roles.includes('TestAgent'));
    assert.ok(roles.includes('TrackingAgent'));
    assert.ok(roles.includes('PerformanceAgent'));
    assert.ok(roles.includes('IncidentAgent'));

    consolidation.agentReports.forEach((r) => {
      assert.ok(r.confidenceScore > 0);
      assert.ok(r.findings.length > 0);
      assert.equal(typeof r.uncertaintyDisclosed, 'boolean');
    });
  });

  it('enforces Mandatory Rule #2 across agent consolidation: causation remains INCONCLUSIVE without verified token', () => {
    const presets = ['bright_studio', 'low_light', 'backlit_glare'] as const;

    for (const preset of presets) {
      const tel = makeTelemetry({
        lightingPreset: preset,
        causationEvidence: null, // No hardware token!
      });

      const consolidation = coordinateAIAgents(tel, { telemetrySource: 'Simulation' });
      assert.equal(consolidation.rule2ComplianceAudit.status, 'INCONCLUSIVE');
      assert.equal(consolidation.rule2ComplianceAudit.isViolated, false);
    }
  });

  it('enforces Mandatory Rule #2: forged hardware tokens are strictly rejected as INCONCLUSIVE', () => {
    const forgedEvidence: VRCausationEvidence = {
      tokenPresent: true,
      validated: false, // Forged
      establishesEnvironmentalCausation: true,
    };

    const tel = makeTelemetry({ causationEvidence: forgedEvidence });
    const assessment = assessEnvironmentalCausation(tel.causationEvidence);
    assert.equal(assessment.causationStatus, 'INCONCLUSIVE');
    assert.equal(assessment.causationEvidence, null);
  });

  it('enforces Mandatory Rule #2: validated hardware token establishing causation returns CONFIRMED', () => {
    const validEvidence: VRCausationEvidence = {
      tokenPresent: true,
      validated: true,
      establishesEnvironmentalCausation: true,
    };

    const tel = makeTelemetry({ causationEvidence: validEvidence });
    const assessment = assessEnvironmentalCausation(tel.causationEvidence);
    assert.equal(assessment.causationStatus, 'CONFIRMED');
    assert.notEqual(assessment.causationEvidence, null);
  });
});
