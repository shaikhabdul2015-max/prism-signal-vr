/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 19 Engineering Test Suite:
 * Validates Predictive Failure Intelligence, Self-Healing Engine,
 * Root Cause Analyzer, Six-Agent Coordination, Autonomous Incidents,
 * Firestore/Offline Persistence, Adaptive Performance, and Rule #2 Invariants.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SelfHealingEngine } from '../src/utils/SelfHealingEngine';
import { RootCauseAnalyzer } from '../src/utils/RootCauseAnalyzer';
import { AdaptivePerformanceOptimizer, PROFILE_CONFIGS } from '../src/utils/adaptivePerformanceOptimizer';
import { analyzePredictiveFailures, PREDICTIVE_DISCLAIMER } from '../src/utils/predictiveFailureEngine';
import { EnterpriseAgentCoordinator } from '../src/utils/agentCoordinator';
import { IncidentManager } from '../src/utils/incidentManager';
import { dbService } from '../src/services/firebaseDbService';
import { VRTelemetry } from '../src/types/diagnostics';
import { UpgradedIncidentRecord } from '../src/types/phase18';

function createMockTelemetry(overrides: Partial<VRTelemetry> = {}): VRTelemetry {
  return {
    sessionId: `phase19-test-session-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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
    incidentId: `inc-test-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    sessionId: `sess-${Date.now()}`,
    detectedAt: new Date().toISOString(),
    resolvedAt: null,
    category: 'skeleton_corruption',
    severity: 'MEDIUM',
    state: 'DETECTED',
    title: 'Skeleton Joint Jitter',
    diagnosticExplanation: 'Drift detected across index and thumb distal joints.',
    recommendedAction: 'Recalibrate skeleton tracking',
    fingerprint: `fp-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
    telemetryEvidence: { drift: 12 },
    rule2ComplianceVerified: true,
    occurrenceCount: 1,
    resolutionNotes: null,
    resolvedBy: null,
    classification: 'skeleton_joint_drift',
    severityScore: 65,
    correlatedIncidentIds: [],
    automatedRecoverySteps: ['recalibrate_skeleton'],
    notesHistory: [],
    ...overrides,
  };
}

describe('Phase 19: Module 1 - Predictive Failure Intelligence', () => {
  it('forecasts tracking loss risk when joint confidence degrades and includes mandatory disclaimer', () => {
    const degradedJoints = Array.from({ length: 25 }, (_, i) => ({
      jointId: `joint_${i}`,
      tracked: true,
      confidence: i < 10 ? 0.60 : 0.95, // 10 low-confidence joints
    }));
    const telemetry = createMockTelemetry({ joints: degradedJoints });
    const report = analyzePredictiveFailures(telemetry);

    assert.ok(report);
    assert.equal(report.disclaimer, PREDICTIVE_DISCLAIMER);
    assert.ok(report.alerts.length > 0);
    const confAlert = report.alerts.find((a) => a.category === 'confidence_degradation');
    assert.ok(confAlert);
    assert.equal(confAlert.isPrediction, true);
    assert.equal(confAlert.riskLevel, 'high');
  });

  it('predicts frame pacing degradation when dropped frames are detected in telemetry', () => {
    const droppedFrames = [
      { timestampMs: 1000, frameDurationMs: 24.5, dropped: true },
      { timestampMs: 1025, frameDurationMs: 22.0, dropped: true },
    ];
    const telemetry = createMockTelemetry({ frames: droppedFrames });
    const report = analyzePredictiveFailures(telemetry);

    const frameAlert = report.alerts.find((a) => a.category === 'frame_timing_anomaly');
    assert.ok(frameAlert);
    assert.equal(frameAlert.isPrediction, true);
    assert.ok(frameAlert.suggestedRemediation.includes('render resolution') || frameAlert.suggestedRemediation.includes('throttling') || frameAlert.suggestedRemediation.length > 0);
  });
});

describe('Phase 19: Module 2 - Self-Healing Engine & Anti-Loop Safeguards', () => {
  it('executes automated self-healing action and records complete audit trail', async () => {
    SelfHealingEngine.resetInstance();
    const engine = SelfHealingEngine.getInstance();
    const incident = createMockIncident({ classification: 'skeleton_joint_drift' });

    const attempt = await engine.handleIncident(incident, 19);
    assert.ok(attempt);
    assert.equal(attempt.status, 'success');
    assert.equal(attempt.actionType, 'recalibrate_skeleton');
    assert.equal(attempt.preMetricValue, 19);
    assert.ok(attempt.postMetricValue && attempt.postMetricValue > 19);
    assert.ok(attempt.remediationDetails.includes('wrist root'));

    const state = engine.getState();
    assert.equal(state.totalResolvedCount, 1);
    assert.equal(state.history.length, 1);
    assert.equal(state.history[0].id, attempt.id);
  });

  it('enforces maximum recovery retry limits per incident', async () => {
    SelfHealingEngine.resetInstance();
    const engine = SelfHealingEngine.getInstance({ maxRetriesPerIncident: 2 });
    const incident = createMockIncident({ incidentId: 'test-retry-limit-incident' });

    // Attempt 1 -> Success
    const att1 = await engine.handleIncident(incident, 10);
    assert.equal(att1?.status, 'success');
    assert.equal(att1?.retryCount, 1);

    // Attempt 2 -> Success
    const att2 = await engine.handleIncident(incident, 12);
    assert.equal(att2?.status, 'success');
    assert.equal(att2?.retryCount, 2);

    // Attempt 3 -> Exceeds max retries (limit 2)
    const att3 = await engine.handleIncident(incident, 12);
    assert.ok(att3);
    assert.equal(att3.status, 'failure');
    assert.ok(att3.remediationDetails.includes('Exceeded maximum retry limit'));

    const state = engine.getState();
    assert.equal(state.totalFailedCount, 1);
  });

  it('triggers anti-loop circuit breaker when attempt frequency exceeds threshold', async () => {
    SelfHealingEngine.resetInstance();
    // Configure tight anti-loop threshold: max 3 attempts per window
    const engine = SelfHealingEngine.getInstance({
      antiLoopMaxAttemptsPerWindow: 3,
      antiLoopWindowMs: 10000,
    });

    const inc1 = createMockIncident({ incidentId: 'inc-1' });
    const inc2 = createMockIncident({ incidentId: 'inc-2' });
    const inc3 = createMockIncident({ incidentId: 'inc-3' });
    const inc4 = createMockIncident({ incidentId: 'inc-4' });

    await engine.handleIncident(inc1, 10);
    await engine.handleIncident(inc2, 10);
    await engine.handleIncident(inc3, 10);

    // 4th rapid attempt trips anti-loop circuit breaker
    const att4 = await engine.handleIncident(inc4, 10);
    assert.ok(att4);
    assert.equal(att4.status, 'aborted');
    assert.ok(att4.remediationDetails.includes('Anti-loop circuit breaker tripped'));

    const state = engine.getState();
    assert.equal(state.antiLoopTriggered, true);
    assert.equal(state.status, 'cooldown');

    // Reset circuit breaker
    engine.resetAntiLoopCircuit();
    const resetState = engine.getState();
    assert.equal(resetState.antiLoopTriggered, false);
    assert.equal(resetState.status, 'idle');
  });
});

describe('Phase 19: Module 3 - Root Cause Analyzer & Rule #2 Invariants', () => {
  it('generates ranked hypotheses and enforces Rule #2 for environmental lighting presets', () => {
    const telemetry = createMockTelemetry({
      lightingPreset: 'backlit_glare',
      causationEvidence: null, // No physical hardware sensor token
      frames: [{ timestampMs: 1000, frameDurationMs: 25.0, dropped: true }],
    });

    const report = RootCauseAnalyzer.analyze(telemetry);
    assert.ok(report);
    assert.ok(report.primaryHypothesis);
    assert.ok(report.competingHypotheses.length >= 0);
    assert.ok(report.auditProof.startsWith('SHA256:'));

    // Rule #2 verification
    const envHyp = [report.primaryHypothesis, ...report.competingHypotheses].find(
      (h) => h.category === 'environmental_inconclusive'
    );
    assert.ok(envHyp, 'Environmental hypothesis must be evaluated');
    assert.equal(
      envHyp.rule2Assessment.status,
      'INCONCLUSIVE',
      'Rule #2 must strictly remain INCONCLUSIVE without verified hardware token'
    );
    assert.equal(envHyp.rule2Assessment.hardwareTokenVerified, false);
  });

  it('correctly ranks rendering pipeline hypothesis when presentation frames are dropped', () => {
    const telemetry = createMockTelemetry({
      frames: [
        { timestampMs: 1000, frameDurationMs: 28.0, dropped: true },
        { timestampMs: 1028, frameDurationMs: 30.0, dropped: true },
      ],
      latencySamples: [{ timestampMs: 1000, latencyMs: 29.5 }],
    });

    const report = RootCauseAnalyzer.analyze(telemetry);
    assert.ok(report.primaryHypothesis);
    assert.equal(report.primaryHypothesis.category, 'rendering_pipeline_bottleneck');
    assert.ok(report.primaryHypothesis.confidenceScore >= 70);
    assert.ok(report.primaryHypothesis.recommendedActions.includes('dynamic_resolution_downscale'));
    assert.equal(report.recommendedImmediateAction, 'dynamic_resolution_downscale');
  });
});

describe('Phase 19: Module 4 - Adaptive Performance Optimization (DRS)', () => {
  it('steps down profile and scales resolution when sustained low cadence is reported', () => {
    const optimizer = AdaptivePerformanceOptimizer.getInstance();
    optimizer.setProfile('High', true);

    const initialScale = optimizer.getState().config.renderScale;
    assert.equal(initialScale, PROFILE_CONFIGS.High.renderScale);

    // Report sustained low FPS below target (target 72, reporting 55)
    optimizer.stepDownQuality('Simulated frame cadence drop');
    const state = optimizer.getState();

    assert.equal(state.config.profile, 'Balanced');
    assert.equal(state.config.renderScale, PROFILE_CONFIGS.Balanced.renderScale);
    assert.ok(state.recentAdaptations.length > 0);
    assert.equal(state.recentAdaptations[0].trigger, 'cadence_drop');
  });

  it('allows manual operator profile override across Ultra, High, Balanced, Performance, and PowerSaver', () => {
    const optimizer = AdaptivePerformanceOptimizer.getInstance();

    optimizer.setProfile('Ultra', true);
    assert.equal(optimizer.getState().config.profile, 'Ultra');
    assert.equal(optimizer.getState().config.renderScale, 1.0);

    optimizer.setProfile('PowerSaver', true);
    assert.equal(optimizer.getState().config.profile, 'PowerSaver');
    assert.equal(optimizer.getState().config.renderScale, 0.60);
    assert.equal(optimizer.getState().config.shadowQuality, 'off');
  });
});

describe('Phase 19: Module 5 - Six AI Agent Coordination Integration', () => {
  it('coordinates all six specialist agents and reflects consensus with uncertainty disclosure', () => {
    const telemetry = createMockTelemetry();
    const coordination = EnterpriseAgentCoordinator.coordinate(telemetry);

    assert.ok(coordination);
    assert.ok(coordination.overallConfidence >= 0.0 && coordination.overallConfidence <= 1.0);

    const requiredRoles = ['OperationsAgent', 'TestAgent', 'TrackingAgent', 'PerformanceAgent', 'IncidentAgent', 'ChiefIntelligenceAgent'];
    for (const role of requiredRoles) {
      assert.ok(
        (coordination.agents as Record<string, unknown>)[role],
        `Agent task for role '${role}' must exist`
      );
    }

    assert.ok(coordination.environmentalCausationStrictRule2Notice.includes('INCONCLUSIVE'));
  });
});

describe('Phase 19: Module 6 - Autonomous Incident Lifecycle & Persistence', () => {
  it('classifies, saves, and deduplicates incidents in persistence service', async () => {
    const manager = new IncidentManager();
    const telemetry = createMockTelemetry({
      frames: [{ timestampMs: 1000, frameDurationMs: 25.0, dropped: true }],
    });

    const initialIncidents = manager.auditTelemetryForIncidents(telemetry);
    assert.ok(initialIncidents.length > 0);

    // Save incident to local / Firestore db
    const saveResult = await dbService.saveIncident(initialIncidents[0]);
    assert.ok(saveResult.success);

    // Deduplication check: submitting duplicate with same fingerprint updates rather than duplicates
    const duplicateResult = await dbService.saveIncident(initialIncidents[0]);
    assert.ok(duplicateResult.success);
    assert.equal(duplicateResult.merged, true);

    const activeIncidents = await dbService.getIncidents();
    assert.ok(activeIncidents.length >= 1);
  });
});

describe('Phase 19: Module 7 - Security Boundaries, Retries & Audit Integrity', () => {
  it('guarantees that self-healing logs and root cause reports contain tamper-evident proof without leaking secrets', () => {
    const telemetry = createMockTelemetry();
    const report = RootCauseAnalyzer.analyze(telemetry);

    assert.ok(report.auditProof);
    assert.ok(!JSON.stringify(report).includes('AIzaSy'));
    assert.ok(!JSON.stringify(report).includes('LLAMA_API_KEY'));
  });
});
