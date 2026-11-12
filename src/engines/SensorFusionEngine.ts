/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Sensor Fusion Engine (Phase 30)
 * Combines multi-source sensor streams (Orientation, Motion, WebXR Tracking, Performance):
 * - Normalizes data across distinct sampling rates and timestamps
 * - Evaluates confidence weights per sensor modality
 * - Detects conflicting measurements (e.g., IMU motion spikes without WebXR spatial translation)
 * - Computes fused spatial vectors while preserving dimensional validity
 * - Maintains strict provenance tracking
 */

import {
  SensorType,
  NormalizedSensorTelemetry,
  SensorFusionSummary,
  SensorConflictRecord,
  SensorProvenanceTier,
} from '../types/phase30';

export class SensorFusionEngine {
  private static instance: SensorFusionEngine | null = null;
  private lastSummary: SensorFusionSummary | null = null;
  private listeners: Set<(summary: SensorFusionSummary) => void> = new Set();

  public constructor() {}

  public static getInstance(): SensorFusionEngine {
    if (!SensorFusionEngine.instance) {
      SensorFusionEngine.instance = new SensorFusionEngine();
    }
    return SensorFusionEngine.instance;
  }

  public static resetInstance(): void {
    SensorFusionEngine.instance = null;
  }

  /**
   * Performs sensor fusion on incoming normalized telemetry
   */
  public fuse(telemetry: NormalizedSensorTelemetry): SensorFusionSummary {
    const contributingSensors: SensorType[] = [];
    const conflicts: SensorConflictRecord[] = [];

    // Check contributing modalities
    if (telemetry.orientation) contributingSensors.push('DEVICE_ORIENTATION');
    if (telemetry.motion) contributingSensors.push('DEVICE_MOTION');
    if (telemetry.xrTracking) contributingSensors.push('WEBXR_TRACKING');
    if (telemetry.performance) contributingSensors.push('BROWSER_PERFORMANCE');

    // 1. Fused Orientation Vector [pitch (x), yaw (y), roll (z)]
    let fusedOrientation: [number, number, number] = [0, 0, 0];
    if (telemetry.orientation && telemetry.xrTracking) {
      // Both orientation API and WebXR head tracking are available
      // WebXR tracking has higher accuracy; blend 70% WebXR + 30% IMU orientation
      const xrRot = telemetry.xrTracking.headRotation;
      const imuRot: [number, number, number] = [
        telemetry.orientation.beta,
        telemetry.orientation.alpha,
        telemetry.orientation.gamma,
      ];

      fusedOrientation = [
        xrRot[0] * 0.7 + imuRot[0] * 0.3,
        xrRot[1] * 0.7 + imuRot[1] * 0.3,
        xrRot[2] * 0.7 + imuRot[2] * 0.3,
      ];

      // Detect divergence
      const pitchDiff = Math.abs(xrRot[0] - imuRot[0]);
      if (pitchDiff > 35.0) {
        conflicts.push({
          sensorA: 'DEVICE_ORIENTATION',
          sensorB: 'WEBXR_TRACKING',
          parameter: 'pitchAngle',
          divergence: Number(pitchDiff.toFixed(1)),
          reason: `Significant pitch discrepancy between WebXR tracking (${xrRot[0].toFixed(1)}°) and device orientation (${imuRot[0].toFixed(1)}°).`,
        });
      }
    } else if (telemetry.orientation) {
      fusedOrientation = [
        telemetry.orientation.beta,
        telemetry.orientation.alpha,
        telemetry.orientation.gamma,
      ];
    } else if (telemetry.xrTracking) {
      fusedOrientation = [...telemetry.xrTracking.headRotation];
    }

    // 2. Fused Motion Vector [ax, ay, az]
    let fusedMotion: [number, number, number] = [0, 0, 0];
    if (telemetry.motion) {
      fusedMotion = [...telemetry.motion.acceleration];

      // Check conflict if motion reports high acceleration (>10 m/s²) but XR tracking reports tracking loss
      const accMag = Math.sqrt(
        fusedMotion[0] * fusedMotion[0] +
        fusedMotion[1] * fusedMotion[1] +
        fusedMotion[2] * fusedMotion[2]
      );

      if (accMag > 8.0 && telemetry.xrTracking?.isTrackingLost) {
        conflicts.push({
          sensorA: 'DEVICE_MOTION',
          sensorB: 'WEBXR_TRACKING',
          parameter: 'accelerationVsTracking',
          divergence: Number(accMag.toFixed(1)),
          reason: 'Severe acceleration impulse coincides with optical tracking loss, indicating violent motion or sensor occlusion.',
        });
      }
    }

    // 3. Cadence Stability
    const fps = telemetry.performance?.fps ?? 72;
    const cadenceStability = Math.round(Math.max(10, Math.min(100, (fps / 72) * 100)));

    // 4. Overall Confidence
    let confidence = 0.4;
    if (contributingSensors.includes('DEVICE_ORIENTATION')) confidence += 0.2;
    if (contributingSensors.includes('DEVICE_MOTION')) confidence += 0.15;
    if (contributingSensors.includes('WEBXR_TRACKING')) confidence += 0.25;
    if (conflicts.length > 0) confidence *= 0.8; // Penalize conflicting signals

    const summary: SensorFusionSummary = {
      timestampMs: telemetry.timestampMs || Date.now(),
      overallConfidence: Number(Math.min(1.0, confidence).toFixed(2)),
      contributingSensors,
      fusedMotionVector: [
        Number(fusedMotion[0].toFixed(2)),
        Number(fusedMotion[1].toFixed(2)),
        Number(fusedMotion[2].toFixed(2)),
      ],
      fusedOrientationVector: [
        Number(fusedOrientation[0].toFixed(2)),
        Number(fusedOrientation[1].toFixed(2)),
        Number(fusedOrientation[2].toFixed(2)),
      ],
      cadenceStability,
      conflictingSignals: conflicts,
      provenance: telemetry.provenance,
    };

    this.lastSummary = summary;
    this.notify();
    return summary;
  }

  public getLatestSummary(): SensorFusionSummary | null {
    return this.lastSummary;
  }

  public subscribe(callback: (summary: SensorFusionSummary) => void): () => void {
    this.listeners.add(callback);
    if (this.lastSummary) {
      callback(this.lastSummary);
    }
    return () => this.listeners.delete(callback);
  }

  private notify(): void {
    if (!this.lastSummary) return;
    const s = this.lastSummary;
    this.listeners.forEach((cb) => {
      try {
        cb(s);
      } catch (err) {
        console.error('[SensorFusionEngine] listener error:', err);
      }
    });
  }
}

export const sensorFusionEngine = SensorFusionEngine.getInstance();
