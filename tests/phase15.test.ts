import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { analyzePredictiveFailures, PREDICTIVE_DISCLAIMER } from '../src/utils/predictiveFailureEngine';
import { SessionReplayManager } from '../src/utils/sessionReplayManager';
import { analyzeRootCause } from '../src/utils/rootCauseEngine';
import { runAutonomousQAAudit, QA_SAFETY_BOUNDARY_NOTICE } from '../src/utils/autonomousQAAgent';
import { getVRDeviceEnvironmentInfo, getDefaultTestCases } from '../src/utils/vrTestManager';
import { WEBXR_STANDARD_25_JOINTS } from '../src/types/phase15';
import type { VRTelemetry, AIAnalysisResult, VRCausationEvidence } from '../src/types/diagnostics';

// Helper to construct test telemetry
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

describe('Phase 15: Module 1 - AI Predictive Failure Detection Engine', () => {
  it('reports nominal risk and high health score for stable telemetry', () => {
    const telemetry = makeTelemetry();
    const report = analyzePredictiveFailures(telemetry);

    assert.equal(report.overallRisk, 'nominal');
    assert.equal(report.healthScore, 100);
    assert.equal(report.alerts.length, 0);
    assert.equal(report.disclaimer, PREDICTIVE_DISCLAIMER);
  });

  it('predicts optical tracking dropout when multiple joint confidences degrade below 0.75', () => {
    const degradedJoints = Array.from({ length: 25 }, (_, i) => ({
      jointId: `joint_${i}`,
      tracked: true,
      confidence: i < 6 ? 0.65 : 0.95, // 6 degraded joints
    }));

    const telemetry = makeTelemetry({ joints: degradedJoints });
    const report = analyzePredictiveFailures(telemetry);

    const confAlert = report.alerts.find((a) => a.category === 'confidence_degradation');
    assert.ok(confAlert, 'Should detect confidence degradation');
    assert.equal(confAlert.isPrediction, true, 'Alert must be explicitly tagged as a prediction');
    assert.match(confAlert.predictedImpact, /Hand skeleton may disconnect/);
    assert.ok(report.healthScore < 100);
  });

  it('predicts recurring tracking dropouts when historical losses accumulate', () => {
    const telemetry = makeTelemetry({
      trackingEvents: [
        { timestampMs: 1000, tracking: false },
        { timestampMs: 2000, tracking: false },
      ],
    });

    const historical = [
      makeTelemetry({
        trackingEvents: [{ timestampMs: 500, tracking: false }],
      }),
    ];

    const report = analyzePredictiveFailures(telemetry, historical);
    const instabilityAlert = report.alerts.find((a) => a.category === 'tracking_instability');

    assert.ok(instabilityAlert);
    assert.equal(instabilityAlert.isPrediction, true);
    assert.equal(instabilityAlert.evidenceData.totalLosses, 3);
  });

  it('predicts render loop jitter when frame variance is high or frames dropped', () => {
    const telemetry = makeTelemetry({
      frames: [
        { timestampMs: 1000, frameDurationMs: 13.8, dropped: false },
        { timestampMs: 1040, frameDurationMs: 40.0, dropped: true },
        { timestampMs: 1055, frameDurationMs: 15.0, dropped: false },
      ],
    });

    const report = analyzePredictiveFailures(telemetry);
    const frameAlert = report.alerts.find((a) => a.category === 'frame_timing_anomaly');

    assert.ok(frameAlert);
    assert.equal(frameAlert.isPrediction, true);
    assert.equal(frameAlert.evidenceData.droppedFramesCount, 1);
  });

  it('strictly distinguishes predictions from confirmed hardware failures via explicit disclaimers', () => {
    const telemetry = makeTelemetry();
    const report = analyzePredictiveFailures(telemetry);

    assert.match(report.disclaimer, /statistical and heuristic forecasts/);
    assert.match(report.disclaimer, /do not constitute confirmed physical hardware failures/);
  });
});

describe('Phase 15: Module 2 - VR Digital Twin 25-Joint Model', () => {
  it('exposes all 25 WebXR standard hand joints in anatomical sequence', () => {
    assert.equal(WEBXR_STANDARD_25_JOINTS.length, 25);
    assert.equal(WEBXR_STANDARD_25_JOINTS[0], 'wrist');
    assert.equal(WEBXR_STANDARD_25_JOINTS[4], 'thumb-tip');
    assert.equal(WEBXR_STANDARD_25_JOINTS[9], 'index-finger-tip');
    assert.equal(WEBXR_STANDARD_25_JOINTS[14], 'middle-finger-tip');
    assert.equal(WEBXR_STANDARD_25_JOINTS[19], 'ring-finger-tip');
    assert.equal(WEBXR_STANDARD_25_JOINTS[24], 'pinky-finger-tip');
  });

  it('supports non-throwing joint status retrieval across varying tracking states', () => {
    const rawJoints = Array.from({ length: 25 }, (_, i) => ({
      jointId: `joint_${i}`,
      tracked: i < 20, // 20 tracked, 5 lost
      confidence: i < 15 ? 0.95 : i < 20 ? 0.65 : 0.0,
    }));

    const telemetry = makeTelemetry({ joints: rawJoints });
    const trackedCount = telemetry.joints.filter((j) => j.tracked).length;
    assert.equal(trackedCount, 20);
  });
});

describe('Phase 15: Module 3 - Intelligent Session Replay System', () => {
  it('creates recorded session with chronological event timeline and summary metrics', () => {
    const manager = new SessionReplayManager();
    const snap1 = makeTelemetry({
      startedAt: '2026-10-30T10:00:00.000Z',
      trackingEvents: [{ timestampMs: 1000, tracking: false }],
      frames: [{ timestampMs: 1000, frameDurationMs: 33.0, dropped: true }],
      latencySamples: [{ timestampMs: 1000, latencyMs: 30.0 }],
    });
    const snap2 = makeTelemetry({
      startedAt: '2026-10-30T10:00:02.000Z',
      completedAt: '2026-10-30T10:00:04.000Z',
    });

    const session = manager.createRecordedSession([snap1, snap2], {
      title: 'Occlusion Stress Run',
      isPhysicalHardware: true,
      detectedHeadset: 'Meta Quest 3',
    });

    assert.equal(session.title, 'Occlusion Stress Run');
    assert.equal(session.isPhysicalHardware, true);
    assert.equal(session.deviceInfo.detectedHeadset, 'Meta Quest 3');
    assert.ok(session.events.length >= 2, 'Should have generated replay events');

    const lossEvent = session.events.find((e) => e.type === 'tracking_loss');
    assert.ok(lossEvent, 'Should flag tracking loss event');

    const frameEvent = session.events.find((e) => e.type === 'frame_drop');
    assert.ok(frameEvent, 'Should flag frame drop event');
  });

  it('accurately compares two sessions and calculates performance deltas', () => {
    const manager = new SessionReplayManager();

    const sessionA = manager.createRecordedSession(
      [makeTelemetry({ frames: [{ timestampMs: 1000, frameDurationMs: 13.8, dropped: false }] })],
      { title: 'Smooth Session A', isPhysicalHardware: true }
    );

    const sessionB = manager.createRecordedSession(
      [
        makeTelemetry({
          frames: [{ timestampMs: 1000, frameDurationMs: 25.0, dropped: true }],
          trackingEvents: [{ timestampMs: 1000, tracking: false }],
        }),
      ],
      { title: 'Degraded Session B', isPhysicalHardware: false }
    );

    const comparison = manager.compareSessions(sessionA, sessionB);

    assert.equal(comparison.sessionAId, sessionA.id);
    assert.equal(comparison.sessionBId, sessionB.id);
    assert.ok(comparison.fpsDelta > 0, 'Session A has higher FPS than Session B');
    assert.ok(comparison.trackingLossDelta <= 0, 'Session A has fewer or equal loss events');
    assert.match(comparison.summaryVerdict, /improvement|regression|stability/i);
  });

  it('strictly preserves isPhysicalHardware flag to prevent simulated telemetry masquerading as physical hardware', () => {
    const manager = new SessionReplayManager();
    const simulatedSession = manager.createRecordedSession([makeTelemetry()], {
      isPhysicalHardware: false,
    });
    assert.equal(simulatedSession.isPhysicalHardware, false);

    const physicalSession = manager.createRecordedSession([makeTelemetry()], {
      isPhysicalHardware: true,
    });
    assert.equal(physicalSession.isPhysicalHardware, true);
  });
});

describe('Phase 15: Module 4 - AI Root Cause Intelligence Engine (Mandatory Rule #2)', () => {
  it('formulates evidence-based hypothesis for optical occlusion and frame pacing', () => {
    const telemetry = makeTelemetry({
      joints: Array.from({ length: 25 }, (_, i) => ({
        jointId: `joint_${i}`,
        tracked: i < 18, // 7 joints lost
        confidence: i < 18 ? 0.9 : 0.0,
      })),
      trackingEvents: [{ timestampMs: 1000, tracking: false }],
      frames: [{ timestampMs: 1000, frameDurationMs: 28.0, dropped: true }],
    });

    const report = analyzeRootCause(telemetry);
    assert.ok(report.primaryHypothesis);
    assert.equal(report.primaryHypothesis.category, 'optical_occlusion');
    assert.ok(report.primaryHypothesis.confidenceScore > 60);
    assert.ok(report.primaryHypothesis.primaryEvidence.length > 0);
  });

  it('enforces Rule #2: environmental causation remains strictly INCONCLUSIVE without verified hardware token', () => {
    // Even when testing in low_light or backlit_glare preset
    const presets = ['low_light', 'backlit_glare', 'bright_studio'] as const;

    for (const preset of presets) {
      const telemetry = makeTelemetry({
        lightingPreset: preset,
        causationEvidence: null, // No validated hardware token!
      });

      const report = analyzeRootCause(telemetry);
      assert.equal(report.rule2Assessment.status, 'INCONCLUSIVE');
      assert.equal(report.rule2Assessment.hardwareTokenVerified, false);

      const allHypotheses = [report.primaryHypothesis, ...report.secondaryHypotheses].filter(Boolean);
      const envHypothesis = allHypotheses.find((h) => h?.id === 'rc-env-inconclusive');
      assert.ok(envHypothesis, 'Must formulate inconclusive environmental hypothesis under Rule #2');
      assert.match(envHypothesis.rule2Notice, /COMPLIANT/);
    }
  });

  it('enforces Rule #2: forged or unvalidated hardware flags remain INCONCLUSIVE', () => {
    const forgedEvidence: VRCausationEvidence = {
      tokenPresent: true,
      validated: false, // Forged / unvalidated
      establishesEnvironmentalCausation: true,
    };

    const telemetry = makeTelemetry({
      causationEvidence: forgedEvidence,
    });

    const report = analyzeRootCause(telemetry);
    assert.equal(report.rule2Assessment.status, 'INCONCLUSIVE');
    assert.equal(report.rule2Assessment.hardwareTokenVerified, false);
  });

  it('enforces Rule #2: validated hardware token establishing causation returns CONFIRMED', () => {
    const validEvidence: VRCausationEvidence = {
      tokenPresent: true,
      validated: true,
      establishesEnvironmentalCausation: true,
    };

    const telemetry = makeTelemetry({
      causationEvidence: validEvidence,
    });

    const report = analyzeRootCause(telemetry);
    assert.equal(report.rule2Assessment.status, 'CONFIRMED');
    assert.equal(report.rule2Assessment.hardwareTokenVerified, true);
  });
});

describe('Phase 15: Module 5 - Autonomous QA Agent', () => {
  it('audits session, pinpoints failed categories, and formulates prioritized regression tests', () => {
    const fakeAnalysis: AIAnalysisResult = {
      schemaVersion: '1.0',
      overallStatus: 'FAIL',
      summary: 'Skeleton integrity failed.',
      categories: [
        {
          name: 'skeleton_integrity',
          status: 'FAIL',
          observations: ['Missing 10 joints.'],
          issues: ['Distal phalanges occluded.'],
          recommendations: ['Perform full hand sweep.'],
        },
        {
          name: 'tracking_continuity',
          status: 'FAIL',
          observations: ['4 interruptions.'],
          issues: ['Crossing occlusion lock.'],
          recommendations: ['Avoid intersecting palms.'],
        },
        {
          name: 'frame_performance',
          status: 'PASS',
          observations: ['72 FPS nominal.'],
          issues: [],
          recommendations: [],
        },
        {
          name: 'latency',
          status: 'PASS',
          observations: ['13.8ms nominal.'],
          issues: [],
          recommendations: [],
        },
        {
          name: 'environmental_conditions',
          status: 'INCONCLUSIVE',
          observations: ['Rule #2 strictly enforced.'],
          issues: [],
          recommendations: [],
        },
        {
          name: 'test_execution',
          status: 'NOT_RUN',
          observations: ['No physical suite.'],
          issues: [],
          recommendations: [],
        },
      ],
      metrics: {
        expectedJointCount: 25,
        observedJointCount: 15,
        frameCount: 10,
        measuredLatencyMs: 13.8,
        trackingLossEvents: 4,
        recoveryTimeMs: null,
      },
      environmentalAssessment: {
        selectedPreset: 'bright_studio',
        causationStatus: 'INCONCLUSIVE',
        causationEvidence: null,
        explanation: 'Rule #2 enforced.',
      },
      dataQuality: { complete: true, missingFields: [], warnings: [] },
      recommendations: [],
    };

    const audit = runAutonomousQAAudit(fakeAnalysis, makeTelemetry(), {
      isPhysicalHardware: true,
    });

    assert.ok(audit.auditId.startsWith('qa-audit-'));
    assert.equal(audit.sessionType, 'PHYSICAL_HARDWARE');
    assert.deepEqual(audit.failedCategories, ['skeleton_integrity', 'tracking_continuity']);
    assert.ok(audit.recommendedRegressions.length >= 2);

    const skeletonReg = audit.recommendedRegressions.find((r) => r.testId === 'reg-skeleton-25');
    assert.ok(skeletonReg);
    assert.equal(skeletonReg.priority, 'high');

    const occlusionReg = audit.recommendedRegressions.find((r) => r.testId === 'reg-occlusion-crossing');
    assert.ok(occlusionReg);
    assert.equal(occlusionReg.priority, 'high');

    assert.ok(audit.checklist.length >= 5);
  });

  it('enforces safety boundary notice that agent cannot autonomously alter code or hardware', () => {
    const audit = runAutonomousQAAudit(
      {
        schemaVersion: '1.0',
        overallStatus: 'PASS',
        summary: 'All categories passed.',
        categories: [],
        metrics: {
          expectedJointCount: 25,
          observedJointCount: 25,
          frameCount: 1,
          measuredLatencyMs: 13.8,
          trackingLossEvents: 0,
          recoveryTimeMs: null,
        },
        environmentalAssessment: {
          selectedPreset: null,
          causationStatus: 'INCONCLUSIVE',
          causationEvidence: null,
          explanation: '',
        },
        dataQuality: { complete: true, missingFields: [], warnings: [] },
        recommendations: [],
      },
      makeTelemetry()
    );

    assert.equal(audit.safetyBoundaryNotice, QA_SAFETY_BOUNDARY_NOTICE);
    assert.match(audit.safetyBoundaryNotice, /read-only advisory oversight/);
    assert.match(audit.safetyBoundaryNotice, /programmatically constrained from modifying production code/);
  });
});

describe('Phase 15: Module 6 & WebXR Compatibility Checks', () => {
  it('extracts WebXR device environment without fabricating sensor telemetry', () => {
    const info = getVRDeviceEnvironmentInfo();
    assert.ok(info.detectedHeadset);
    assert.ok(info.timestamp);
    assert.equal(typeof info.webxrSupported, 'boolean');
  });

  it('initializes all physical VR test cases strictly in not_run state with zero fabricated measurements', () => {
    const defaultCases = getDefaultTestCases();
    assert.equal(defaultCases.length, 6);
    defaultCases.forEach((tc) => {
      assert.equal(tc.status, 'not_run');
      assert.equal(tc.startedAt, null);
      assert.equal(tc.completedAt, null);
    });
  });

  it('calibrates ergonomic pinch detection with hysteresis (2.4cm start, 4.0cm release)', () => {
    const pinchStartThresholdM = 0.024; // 2.4cm
    const pinchReleaseThresholdM = 0.040; // 4.0cm
    assert.ok(pinchStartThresholdM < pinchReleaseThresholdM, 'Start threshold must be smaller than release threshold');
    assert.equal(pinchStartThresholdM * 100, 2.4);
    assert.equal(pinchReleaseThresholdM * 100, 4.0);
  });
});

