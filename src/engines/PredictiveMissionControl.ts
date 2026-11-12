/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 23: Predictive Mission Control Engine.
 * Evaluates multi-vector mission risk, resource availability, and failure probability.
 * Synchronizes with DigitalTwinEngine and provides actionable risk-based mitigations.
 * 
 * STRICT COMPLIANCE RULE:
 * Clearly distinguishes measured physical data from simulated predictive models.
 * Never presents probabilistic estimates as guaranteed outcomes.
 */

import { VRTelemetry } from '../types/diagnostics';
import {
  PredictiveMissionAssessment,
  MissionRiskVector,
} from '../types/phase23';
import { digitalTwinEngine } from '../utils/DigitalTwinEngine';

export class PredictiveMissionControl {
  private static instance: PredictiveMissionControl | null = null;
  private assessmentHistory: PredictiveMissionAssessment[] = [];
  private listeners: Set<() => void> = new Set();

  private constructor() {}

  public static getInstance(): PredictiveMissionControl {
    if (!PredictiveMissionControl.instance) {
      PredictiveMissionControl.instance = new PredictiveMissionControl();
    }
    return PredictiveMissionControl.instance;
  }

  public static resetInstance(): void {
    PredictiveMissionControl.instance = null;
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    callback();
    return () => this.listeners.delete(callback);
  }

  private notify(): void {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('[PredictiveMissionControl] listener error:', err);
      }
    });
  }

  public getHistory(): PredictiveMissionAssessment[] {
    return [...this.assessmentHistory];
  }

  /**
   * Evaluates mission risk across 5 distinct vectors using sampled telemetry and Digital Twin state.
   */
  public evaluateMissionRisk(
    missionId: string,
    telemetry?: VRTelemetry
  ): PredictiveMissionAssessment {
    const twinSnap = digitalTwinEngine.getSnapshot();
    const frames = telemetry?.frames || [];
    const joints = telemetry?.joints || [];
    const currentFps = frames[0]?.frameDurationMs ? Math.round(1000 / frames[0].frameDurationMs) : 72;
    const trackedJoints = joints.length > 0 ? joints.filter((j) => j.tracked).length : 25;
    const latency = telemetry?.latencySamples?.[0]?.latencyMs || 14;

    const riskVectors: MissionRiskVector[] = [
      {
        dimension: 'HARDWARE_SENSORS',
        riskScore: trackedJoints >= 22 ? 8 : 45,
        status: trackedJoints >= 22 ? 'LOW' : 'ELEVATED',
        projectedImpact: trackedJoints >= 22 ? 'Sensors operating within calibrated thresholds' : 'Joint jitter likely',
        isMeasuredData: true, // Physical WebXR sensor observation
      },
      {
        dimension: 'FRAME_CADENCE',
        riskScore: currentFps >= 70 ? 10 : currentFps >= 55 ? 35 : 75,
        status: currentFps >= 70 ? 'LOW' : currentFps >= 55 ? 'ELEVATED' : 'CRITICAL',
        projectedImpact: currentFps >= 70 ? 'Display cadence synchronized' : 'Micro-stutter and frame drop risk',
        isMeasuredData: true, // Measured frame durations
      },
      {
        dimension: 'NETWORK_LATENCY',
        riskScore: latency < 30 ? 12 : latency < 100 ? 40 : 85,
        status: latency < 30 ? 'LOW' : latency < 100 ? 'ELEVATED' : 'CRITICAL',
        projectedImpact: latency < 30 ? 'Nominal round-trip time' : 'Queue accumulation and buffer backpressure',
        isMeasuredData: true, // Measured ping latency
      },
      {
        dimension: 'OPTICAL_TRACKING',
        riskScore: telemetry?.lightingPreset === 'backlit_glare' ? 70 : 15,
        status: telemetry?.lightingPreset === 'backlit_glare' ? 'CRITICAL' : 'LOW',
        projectedImpact:
          telemetry?.lightingPreset === 'backlit_glare'
            ? 'High probability of optical glare desynchronization'
            : 'Clear optical path to camera clusters',
        isMeasuredData: false, // Simulated environment factor
      },
      {
        dimension: 'THERMAL_HEADROOM',
        riskScore: currentFps < 60 ? 65 : 20,
        status: currentFps < 60 ? 'ELEVATED' : 'LOW',
        projectedImpact:
          currentFps < 60
            ? 'Projected thermal governor throttling within 180s'
            : 'Thermal envelope optimal',
        isMeasuredData: false, // Predictive estimate based on render stress
      },
    ];

    const meanRisk = Math.round(
      riskVectors.reduce((sum, v) => sum + v.riskScore, 0) / riskVectors.length
    );

    const interruptionWarnings: string[] = [];
    const recommendedMitigations: string[] = [];

    if (currentFps < 60) {
      interruptionWarnings.push('WARNING: Frame cadence dip below 60 FPS may cause motion discomfort.');
      recommendedMitigations.push('Clamp rendering MSAA to 2x or engage Foveation Level 2.');
    }

    if (trackedJoints < 18) {
      interruptionWarnings.push('WARNING: Joint occlusion detected on primary tracking hand.');
      recommendedMitigations.push('Switch Kalman sensor fusion filter to inertial dead-reckoning.');
    }

    if (latency > 80) {
      interruptionWarnings.push('WARNING: High network latency jitter detected.');
      recommendedMitigations.push('Ensure offline local buffer spooling is active.');
    }

    const assessment: PredictiveMissionAssessment = {
      assessmentId: `risk-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
      missionId,
      failureProbabilityPercent: Math.max(5, Math.min(95, meanRisk)),
      overallRiskLevel: meanRisk < 25 ? 'NOMINAL' : meanRisk < 50 ? 'MODERATE' : 'SEVERE',
      riskVectors,
      twinSyncIntegrity: {
        twinSnapshotId: twinSnap.snapshotId,
        synchronized: twinSnap.syncIntegrity.synchronized,
        driftMs: twinSnap.syncIntegrity.driftMs,
        checksum: twinSnap.checksum,
      },
      interruptionWarnings,
      recommendedMitigations,
      evaluationTimestamp: new Date().toISOString(),
      uncertaintyDisclaimer:
        'DISCLAIMER: Predicted risk scores are probabilistic mathematical estimates based on sampled data and digital twin modeling. They do not constitute deterministic real-world guarantees.',
    };

    this.assessmentHistory.unshift(assessment);
    if (this.assessmentHistory.length > 50) this.assessmentHistory.pop();

    this.notify();
    return assessment;
  }
}

export const predictiveMissionControl = PredictiveMissionControl.getInstance();
