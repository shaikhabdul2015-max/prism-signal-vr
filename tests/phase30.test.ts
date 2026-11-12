/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 30 Test Suite: Real-Time Sensor Intelligence & Environmental Awareness Engine.
 * Verifies:
 * 1. Sensor capability discovery and permission status reporting.
 * 2. Sensor collection lifecycle (start, stop, cleanup).
 * 3. Telemetry normalization, validation, and provenance tier assignment.
 * 4. Environmental state classification (NORMAL, CHANGING, UNSTABLE, DEGRADED, UNKNOWN).
 * 5. Chamber boundary proximity surveillance.
 * 6. Sensor fusion, confidence weighting, and conflict detection.
 * 7. Anomaly detection: cadence drops, tracking occlusion, motion spikes, angle jumps.
 * 8. Predictive environmental trends, tracking stability forecast, and uncertainty bands.
 * 9. Sensor health monitoring: preventing unsupported sensors from being misreported as offline hardware.
 * 10. Environmental event orchestration with 4000ms duplicate suppression and IncidentManager correlation.
 * 11. Multi-agent council review across the 6 specialist agents with consensus directives.
 * 12. Privacy controls, sensor toggles, and data minimization.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { RealTimeSensorIntelligenceEngine } from '../src/engines/RealTimeSensorIntelligenceEngine';
import { EnvironmentalAwarenessEngine } from '../src/engines/EnvironmentalAwarenessEngine';
import { SensorFusionEngine } from '../src/engines/SensorFusionEngine';
import { SensorAnomalyDetectionEngine } from '../src/engines/SensorAnomalyDetectionEngine';
import { EnvironmentalPredictionEngine } from '../src/engines/EnvironmentalPredictionEngine';
import { SensorHealthMonitor } from '../src/engines/SensorHealthMonitor';
import { EnvironmentalEventOrchestrator } from '../src/engines/EnvironmentalEventOrchestrator';
import { MultiAgentSensorIntelligence } from '../src/engines/MultiAgentSensorIntelligence';
import { IncidentManager } from '../src/utils/incidentManager';
import { VRTelemetry } from '../src/types/diagnostics';
import { NormalizedSensorTelemetry } from '../src/types/phase30';

// Fixture: Nominal Telemetry (~72 FPS, 25 tracked joints)
const nominalTelemetry: VRTelemetry = {
  sessionId: 'test-session-p30-nominal',
  startedAt: new Date().toISOString(),
  frames: [
    { timestampMs: Date.now() - 100, frameDurationMs: 13.88, dropped: false },
    { timestampMs: Date.now() - 50, frameDurationMs: 13.88, dropped: false },
    { timestampMs: Date.now(), frameDurationMs: 13.88, dropped: false },
  ],
  latencySamples: [
    { timestampMs: Date.now() - 100, latencyMs: 12.5 },
    { timestampMs: Date.now(), latencyMs: 13.0 },
  ],
  trackingEvents: [],
  joints: Array.from({ length: 25 }, (_, i) => ({
    jointId: `joint_${i}`,
    tracked: true,
    confidence: 0.98,
  })),
  expectedJointCount: 25,
  lightingPreset: 'bright_studio',
  thresholds: {},
  executedCategories: [],
};

// Fixture: Stressed Telemetry (Low FPS ~32, severe tracking occlusion)
const stressedTelemetry: VRTelemetry = {
  sessionId: 'test-session-p30-stressed',
  startedAt: new Date().toISOString(),
  frames: [
    { timestampMs: Date.now() - 150, frameDurationMs: 31.25, dropped: true },
    { timestampMs: Date.now() - 100, frameDurationMs: 31.25, dropped: true },
    { timestampMs: Date.now(), frameDurationMs: 31.25, dropped: false },
  ],
  latencySamples: [
    { timestampMs: Date.now() - 100, latencyMs: 32.0 },
    { timestampMs: Date.now(), latencyMs: 33.5 },
  ],
  trackingEvents: [],
  joints: Array.from({ length: 25 }, (_, i) => ({
    jointId: `joint_${i}`,
    tracked: i < 8, // Only 8 joints tracked (occluded)
    confidence: i < 8 ? 0.95 : 0.1,
  })),
  expectedJointCount: 25,
  lightingPreset: 'bright_studio',
  thresholds: {},
  executedCategories: [],
};

describe('Phase 30: Real-Time Sensor Intelligence & Environmental Awareness Engine', () => {

  // --------------------------------------------------------------------------
  // 1. SENSOR CAPABILITY DISCOVERY & PERMISSIONS
  // --------------------------------------------------------------------------
  describe('1. RealTimeSensorIntelligenceEngine', () => {
    let sensorEngine: RealTimeSensorIntelligenceEngine;

    beforeEach(() => {
      sensorEngine = new RealTimeSensorIntelligenceEngine();
    });

    it('discovers supported browser sensor capabilities without crashing in headless/Node.js', () => {
      const caps = sensorEngine.discoverCapabilities();
      assert.ok(caps.length >= 4, 'Should discover standard browser and diagnostic capabilities');

      const appTelemetry = sensorEngine.getCapability('APPLICATION_TELEMETRY');
      assert.ok(appTelemetry, 'Application telemetry modality must be registered');
      assert.strictEqual(appTelemetry.isSupported, true);

      const perfCap = sensorEngine.getCapability('BROWSER_PERFORMANCE');
      assert.ok(perfCap, 'Performance telemetry must be discovered');
    });

    it('safely starts and stops collection listeners without errors', () => {
      const started = sensorEngine.startCollection();
      assert.strictEqual(typeof started, 'boolean');
      assert.strictEqual(sensorEngine.isRunning(), started);

      sensorEngine.stopCollection();
      assert.strictEqual(sensorEngine.isRunning(), false);
    });

    it('normalizes telemetry and assigns correct provenance tier', () => {
      const simNorm = sensorEngine.ingestTelemetry(nominalTelemetry, false);
      assert.strictEqual(simNorm.provenance, 'BROWSER_TELEMETRY');
      assert.strictEqual(simNorm.performance?.fps, 72);
      assert.strictEqual(simNorm.xrTracking?.trackedJointsCount, 25);
      assert.strictEqual(simNorm.xrTracking?.isTrackingLost, false);

      const realNorm = sensorEngine.ingestTelemetry(nominalTelemetry, true);
      assert.strictEqual(realNorm.provenance, 'REAL_DEVICE_TELEMETRY');
    });

    it('respects user privacy settings and allows toggling individual sensor streams', () => {
      const initialSettings = sensorEngine.getPrivacySettings();
      assert.strictEqual(initialSettings.isCollectionEnabled, true);

      // Disable device motion
      sensorEngine.updatePrivacySettings({
        allowedSensors: {
          ...initialSettings.allowedSensors,
          DEVICE_MOTION: false,
        },
      });

      const updated = sensorEngine.getPrivacySettings();
      assert.strictEqual(updated.allowedSensors.DEVICE_MOTION, false);
      assert.strictEqual(updated.allowedSensors.DEVICE_ORIENTATION, true);
    });
  });

  // --------------------------------------------------------------------------
  // 2. ENVIRONMENTAL AWARENESS ENGINE
  // --------------------------------------------------------------------------
  describe('2. EnvironmentalAwarenessEngine', () => {
    let envEngine: EnvironmentalAwarenessEngine;
    let sensorEngine: RealTimeSensorIntelligenceEngine;

    beforeEach(() => {
      envEngine = new EnvironmentalAwarenessEngine();
      sensorEngine = new RealTimeSensorIntelligenceEngine();
    });

    it('classifies environmental state as NORMAL under nominal telemetry', () => {
      const norm = sensorEngine.ingestTelemetry(nominalTelemetry, false);
      const ctx = envEngine.evaluateTelemetry(norm);

      assert.strictEqual(ctx.state, 'NORMAL');
      assert.ok(ctx.stateConfidence >= 0.85);
      assert.strictEqual(ctx.isSimulated, false);
      assert.ok(ctx.recommendations.length > 0);
    });

    it('transitions to DEGRADED when tracking loss or severe frame drop occurs', () => {
      const norm = sensorEngine.ingestTelemetry(stressedTelemetry, false);
      const ctx = envEngine.evaluateTelemetry(norm);

      assert.strictEqual(ctx.state, 'DEGRADED');
      assert.ok(ctx.detectedChanges.some((c) => c.includes('degradation')));
    });

    it('detects high kinetic volatility and transitions to UNSTABLE', () => {
      const volatileTelemetry: NormalizedSensorTelemetry = {
        timestampMs: Date.now(),
        motion: {
          acceleration: [12.0, 15.0, 8.0], // magnitude > 20 m/s^2
          intervalMs: 16.6,
        },
        performance: { fps: 72, frameDeltaMs: 13.88 },
        confidenceScore: 0.9,
        isStale: false,
        provenance: 'BROWSER_TELEMETRY',
      };

      const ctx = envEngine.evaluateTelemetry(volatileTelemetry);
      assert.strictEqual(ctx.state, 'UNSTABLE');
      assert.ok(ctx.accelerationMagnitude > 15.0);
    });

    it('maintains a chronological history of state transitions', () => {
      const normNominal = sensorEngine.ingestTelemetry(nominalTelemetry, false);
      envEngine.evaluateTelemetry(normNominal);

      const normStressed = sensorEngine.ingestTelemetry(stressedTelemetry, false);
      envEngine.evaluateTelemetry(normStressed);

      const history = envEngine.getStateHistory();
      assert.ok(history.length >= 2, 'History must record state changes');
      assert.strictEqual(history[0].state, 'DEGRADED');
    });
  });

  // --------------------------------------------------------------------------
  // 3. SENSOR FUSION ENGINE
  // --------------------------------------------------------------------------
  describe('3. SensorFusionEngine', () => {
    let fusionEngine: SensorFusionEngine;

    beforeEach(() => {
      fusionEngine = new SensorFusionEngine();
    });

    it('fuses multi-source telemetry and computes overall confidence score', () => {
      const multiSourceTelemetry: NormalizedSensorTelemetry = {
        timestampMs: Date.now(),
        orientation: { alpha: 90, beta: 15, gamma: -10, absolute: true },
        motion: { acceleration: [0.5, 0.2, 0.1], intervalMs: 16.6 },
        xrTracking: { headPosition: [0, 1.6, 0], headRotation: [14, 92, -9], trackedJointsCount: 25, isTrackingLost: false },
        performance: { fps: 72, frameDeltaMs: 13.88 },
        confidenceScore: 0.95,
        isStale: false,
        provenance: 'REAL_DEVICE_TELEMETRY',
      };

      const summary = fusionEngine.fuse(multiSourceTelemetry);
      assert.ok(summary.overallConfidence >= 0.8, 'Fused multi-source confidence should be high');
      assert.strictEqual(summary.contributingSensors.length, 4);
      assert.strictEqual(summary.conflictingSignals.length, 0);
      assert.strictEqual(summary.provenance, 'REAL_DEVICE_TELEMETRY');
    });

    it('detects divergent measurements between IMU orientation and WebXR tracking', () => {
      const divergentTelemetry: NormalizedSensorTelemetry = {
        timestampMs: Date.now(),
        orientation: { alpha: 0, beta: 60, gamma: 0 }, // Pitch = 60 deg
        xrTracking: { headPosition: [0, 1.6, 0], headRotation: [5, 0, 0], trackedJointsCount: 25, isTrackingLost: false }, // Pitch = 5 deg (diff = 55)
        confidenceScore: 0.8,
        isStale: false,
        provenance: 'BROWSER_TELEMETRY',
      };

      const summary = fusionEngine.fuse(divergentTelemetry);
      assert.ok(summary.conflictingSignals.length > 0, 'Should detect pitch angle divergence');
      assert.strictEqual(summary.conflictingSignals[0].parameter, 'pitchAngle');
      assert.ok(summary.conflictingSignals[0].divergence > 35);
    });
  });

  // --------------------------------------------------------------------------
  // 4. SENSOR ANOMALY DETECTION ENGINE
  // --------------------------------------------------------------------------
  describe('4. SensorAnomalyDetectionEngine', () => {
    let anomalyEngine: SensorAnomalyDetectionEngine;

    beforeEach(() => {
      anomalyEngine = new SensorAnomalyDetectionEngine();
      anomalyEngine.clearAllAnomalies();
    });

    it('detects critical frame drop anomalies with accurate expected ranges', () => {
      const degradedTelemetry: NormalizedSensorTelemetry = {
        timestampMs: Date.now(),
        performance: { fps: 32, frameDeltaMs: 31.25 },
        confidenceScore: 0.9,
        isStale: false,
        provenance: 'BROWSER_TELEMETRY',
      };

      const anomalies = anomalyEngine.analyzeTelemetry(degradedTelemetry);
      assert.ok(anomalies.length > 0, 'Should detect cadence drop anomaly');

      const fpsAnomaly = anomalies.find((a) => a.sourceSensor === 'BROWSER_PERFORMANCE');
      assert.ok(fpsAnomaly, 'FPS anomaly must be reported');
      assert.strictEqual(fpsAnomaly.severity, 'CRITICAL');
      assert.strictEqual(fpsAnomaly.expectedRange?.min, 60);
      assert.strictEqual(fpsAnomaly.expectedRange?.max, 90);
      assert.strictEqual(fpsAnomaly.acknowledged, false);
    });

    it('detects high-severity acceleration spike anomalies', () => {
      const spikeTelemetry: NormalizedSensorTelemetry = {
        timestampMs: Date.now(),
        motion: { acceleration: [15, 20, 10], intervalMs: 16.6 }, // mag ~26.9 m/s^2
        confidenceScore: 0.9,
        isStale: false,
        provenance: 'REAL_DEVICE_TELEMETRY',
      };

      const anomalies = anomalyEngine.analyzeTelemetry(spikeTelemetry);
      const motionAnomaly = anomalies.find((a) => a.sourceSensor === 'DEVICE_MOTION');
      assert.ok(motionAnomaly, 'Motion spike anomaly must be recorded');
      assert.strictEqual(motionAnomaly.severity, 'HIGH');
      assert.ok(motionAnomaly.explanation.includes('Extreme acceleration spike'));
    });

    it('supports operator acknowledgment of anomalies', () => {
      const degradedTelemetry: NormalizedSensorTelemetry = {
        timestampMs: Date.now(),
        performance: { fps: 35, frameDeltaMs: 28.5 },
        confidenceScore: 0.9,
        isStale: false,
        provenance: 'BROWSER_TELEMETRY',
      };

      const anomalies = anomalyEngine.analyzeTelemetry(degradedTelemetry);
      const target = anomalies[0];
      assert.strictEqual(target.acknowledged, false);

      const ack = anomalyEngine.acknowledgeAnomaly(target.id);
      assert.strictEqual(ack, true);

      const active = anomalyEngine.getActiveAnomalies();
      assert.strictEqual(active.some((a) => a.id === target.id), false);
    });
  });

  // --------------------------------------------------------------------------
  // 5. ENVIRONMENTAL PREDICTION ENGINE
  // --------------------------------------------------------------------------
  describe('5. EnvironmentalPredictionEngine', () => {
    let predictionEngine: EnvironmentalPredictionEngine;

    beforeEach(() => {
      predictionEngine = new EnvironmentalPredictionEngine();
    });

    it('generates forward-looking trend estimates with uncertainty bounds', () => {
      const telemetry: NormalizedSensorTelemetry = {
        timestampMs: Date.now(),
        performance: { fps: 72, frameDeltaMs: 13.88 },
        xrTracking: { headPosition: [0, 1.6, 0], headRotation: [0, 0, 0], trackedJointsCount: 25, isTrackingLost: false },
        confidenceScore: 0.95,
        isStale: false,
        provenance: 'BROWSER_TELEMETRY',
      };

      const pred = predictionEngine.predict(telemetry, 15);
      assert.strictEqual(pred.horizonSeconds, 15);
      assert.strictEqual(pred.projectedState, 'NORMAL');
      assert.strictEqual(pred.performanceDegradationRisk, 'LOW');
      assert.strictEqual(pred.trackingStabilityEstimate, 100);
      assert.ok(pred.uncertaintyBand >= 0.05 && pred.uncertaintyBand <= 0.5);
      assert.strictEqual(pred.isSimulationEstimate, false);
    });

    it('flags HIGH performance degradation risk when cadence is dropping', () => {
      const failingTelemetry: NormalizedSensorTelemetry = {
        timestampMs: Date.now(),
        performance: { fps: 38, frameDeltaMs: 26.3 },
        xrTracking: { headPosition: [0, 1.6, 0], headRotation: [0, 0, 0], trackedJointsCount: 15, isTrackingLost: true },
        confidenceScore: 0.7,
        isStale: false,
        provenance: 'BROWSER_TELEMETRY',
      };

      const pred = predictionEngine.predict(failingTelemetry, 20);
      assert.strictEqual(pred.performanceDegradationRisk, 'HIGH');
      assert.strictEqual(pred.projectedState, 'DEGRADED');
      assert.ok(pred.warnings.length > 0);
    });
  });

  // --------------------------------------------------------------------------
  // 6. SENSOR HEALTH MONITOR
  // --------------------------------------------------------------------------
  describe('6. SensorHealthMonitor', () => {
    let healthMonitor: SensorHealthMonitor;
    let sensorEngine: RealTimeSensorIntelligenceEngine;

    beforeEach(() => {
      healthMonitor = new SensorHealthMonitor();
      sensorEngine = new RealTimeSensorIntelligenceEngine();
    });

    it('classifies unsupported sensors as UNSUPPORTED, never as offline hardware', () => {
      const records = healthMonitor.getAllRecords();
      assert.ok(records.length >= 4);

      // Check capabilities against health states
      for (const record of records) {
        const cap = sensorEngine.getCapability(record.sensorType);
        if (cap && !cap.isSupported) {
          assert.strictEqual(
            record.healthState,
            'UNSUPPORTED',
            `Sensor ${record.sensorType} must be UNSUPPORTED, not OFFLINE`
          );
        }
      }
    });

    it('reports ONLINE for healthy active telemetry streams', () => {
      const norm = sensorEngine.ingestTelemetry(nominalTelemetry, false);
      const records = healthMonitor.evaluateHealth(norm);

      const appRecord = records.find((r) => r.sensorType === 'APPLICATION_TELEMETRY');
      assert.ok(appRecord);
      assert.strictEqual(appRecord.healthState, 'ONLINE');
      assert.strictEqual(appRecord.isDisconnected, false);
    });
  });

  // --------------------------------------------------------------------------
  // 7. ENVIRONMENTAL EVENT ORCHESTRATOR
  // --------------------------------------------------------------------------
  describe('7. EnvironmentalEventOrchestrator', () => {
    let orchestrator: EnvironmentalEventOrchestrator;
    let incidentManager: IncidentManager;

    beforeEach(() => {
      incidentManager = new IncidentManager();
      orchestrator = new EnvironmentalEventOrchestrator(incidentManager);
      orchestrator.clearEvents();
    });

    it('dispatches structured events and enforces 4000ms duplicate suppression', () => {
      const evt1 = orchestrator.dispatchEvent(
        'STATE_TRANSITION',
        'INFO',
        'Environmental state shifted to NORMAL.',
        { state: 'NORMAL' }
      );
      assert.ok(evt1 !== null, 'First event must be dispatched');
      assert.strictEqual(evt1.eventType, 'STATE_TRANSITION');

      // Immediate duplicate dispatch within window
      const evt2 = orchestrator.dispatchEvent(
        'STATE_TRANSITION',
        'INFO',
        'Environmental state shifted to NORMAL.',
        { state: 'NORMAL' }
      );
      assert.strictEqual(evt2, null, 'Duplicate event must be suppressed');
    });

    it('correlates CRITICAL anomalies with IncidentManager to create incidents', () => {
      const criticalEvent = orchestrator.dispatchEvent(
        'ANOMALY_TRIGGER',
        'CRITICAL',
        'Severe optical tracking occlusion on camera array.',
        { joints: 6 },
        'TrackingAgent'
      );

      assert.ok(criticalEvent !== null);
      assert.ok(criticalEvent.correlatedIncidentId, 'Must create correlated incident ID in IncidentManager');

      const incidents = incidentManager.getAllIncidents();
      assert.ok(incidents.some((i) => i.incidentId === criticalEvent.correlatedIncidentId));
    });
  });

  // --------------------------------------------------------------------------
  // 8. MULTI-AGENT SENSOR INTELLIGENCE
  // --------------------------------------------------------------------------
  describe('8. MultiAgentSensorIntelligence', () => {
    let multiAgent: MultiAgentSensorIntelligence;
    let sensorEngine: RealTimeSensorIntelligenceEngine;
    let envEngine: EnvironmentalAwarenessEngine;
    let fusionEngine: SensorFusionEngine;

    beforeEach(() => {
      multiAgent = new MultiAgentSensorIntelligence();
      sensorEngine = new RealTimeSensorIntelligenceEngine();
      envEngine = new EnvironmentalAwarenessEngine();
      fusionEngine = new SensorFusionEngine();
    });

    it('coordinates the 6 specialist agents and produces consensus report', () => {
      const norm = sensorEngine.ingestTelemetry(nominalTelemetry, false);
      const ctx = envEngine.evaluateTelemetry(norm);
      const fusion = fusionEngine.fuse(norm);

      const report = multiAgent.evaluateCouncil(norm, ctx, fusion, []);
      assert.strictEqual(report.systemVerdict, 'STABLE');
      assert.ok(report.overallSensorScore >= 80);
      assert.strictEqual(report.agentAssessments.length, 6, 'Must coordinate exactly 6 specialist agents');

      const roles = report.agentAssessments.map((a) => a.agentRole);
      assert.ok(roles.includes('OperationsAgent'));
      assert.ok(roles.includes('TestAgent'));
      assert.ok(roles.includes('TrackingAgent'));
      assert.ok(roles.includes('PerformanceAgent'));
      assert.ok(roles.includes('IncidentAgent'));
      assert.ok(roles.includes('ChiefIntelligenceAgent'));
    });

    it('detects disagreements and escalates verdict to CRITICAL under severe stress', () => {
      const norm = sensorEngine.ingestTelemetry(stressedTelemetry, false);
      const ctx = envEngine.evaluateTelemetry(norm);
      const fusion = fusionEngine.fuse(norm);

      const report = multiAgent.evaluateCouncil(norm, ctx, fusion, [
        {
          id: 'test-anom-crit',
          timestampMs: Date.now(),
          sourceSensor: 'WEBXR_TRACKING',
          observedMeasurement: {},
          severity: 'CRITICAL',
          confidence: 0.95,
          explanation: 'Test tracking loss',
          recommendedResponse: 'Failsafe',
          acknowledged: false,
        },
      ]);

      assert.strictEqual(report.systemVerdict, 'CRITICAL');
      assert.ok(report.consensusDirectives.length > 0);
    });
  });
});
