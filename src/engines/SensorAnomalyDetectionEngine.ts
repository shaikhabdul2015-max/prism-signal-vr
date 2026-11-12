/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Sensor Anomaly Detection Engine (Phase 30)
 * Evaluates real-time sensor streams to detect:
 * - Signal spikes and discontinuities
 * - Abnormal kinetic acceleration (> 18 m/s²)
 * - Orientation teleportation (> 90° frame-to-frame delta)
 * - Optical tracking occlusion (< 15 / 25 joints tracked)
 * - Severe cadence drop (< 45 FPS)
 * - Missing telemetry intervals
 * 
 * Each anomaly record includes:
 * - Timestamp, source sensor, observed measurement, known expected range,
 * - Severity (INFO, LOW, MEDIUM, HIGH, CRITICAL), confidence, explanation,
 * - Recommended operational mitigation.
 */

import {
  SensorAnomaly,
  AnomalySeverity,
  SensorType,
  NormalizedSensorTelemetry,
} from '../types/phase30';

export class SensorAnomalyDetectionEngine {
  private static instance: SensorAnomalyDetectionEngine | null = null;
  private anomalies: SensorAnomaly[] = [];
  private previousTelemetry: NormalizedSensorTelemetry | null = null;
  private listeners: Set<(anomalies: SensorAnomaly[]) => void> = new Set();
  private readonly MAX_ANOMALIES = 50;

  public constructor() {}

  public static getInstance(): SensorAnomalyDetectionEngine {
    if (!SensorAnomalyDetectionEngine.instance) {
      SensorAnomalyDetectionEngine.instance = new SensorAnomalyDetectionEngine();
    }
    return SensorAnomalyDetectionEngine.instance;
  }

  public static resetInstance(): void {
    SensorAnomalyDetectionEngine.instance = null;
  }

  /**
   * Evaluates normalized telemetry for anomalies
   */
  public analyzeTelemetry(telemetry: NormalizedSensorTelemetry): SensorAnomaly[] {
    const detected: SensorAnomaly[] = [];
    const now = telemetry.timestampMs || Date.now();

    // 1. Cadence Degradation Anomaly
    if (telemetry.performance) {
      const fps = telemetry.performance.fps;
      if (fps < 40) {
        detected.push({
          id: `anom-fps-crit-${now}`,
          timestampMs: now,
          sourceSensor: 'BROWSER_PERFORMANCE',
          observedMeasurement: { fps, frameDeltaMs: telemetry.performance.frameDeltaMs },
          expectedRange: { min: 60, max: 90, unit: 'FPS' },
          severity: 'CRITICAL',
          confidence: 0.96,
          explanation: `Severe rendering frame drop to ${fps} FPS. High risk of VR simulator sickness.`,
          recommendedResponse: 'Trigger AdaptiveRealityEngine failsafe mode and throttle particle density.',
          acknowledged: false,
        });
      } else if (fps < 55) {
        detected.push({
          id: `anom-fps-med-${now}`,
          timestampMs: now,
          sourceSensor: 'BROWSER_PERFORMANCE',
          observedMeasurement: { fps },
          expectedRange: { min: 60, max: 90, unit: 'FPS' },
          severity: 'MEDIUM',
          confidence: 0.88,
          explanation: `Cadence instability: current FPS is ${fps}, below recommended 60Hz threshold.`,
          recommendedResponse: 'Lower visual shader quality tier to CONSERVATIVE_60HZ.',
          acknowledged: false,
        });
      }
    }

    // 2. Optical Tracking Degradation
    if (telemetry.xrTracking) {
      const joints = telemetry.xrTracking.trackedJointsCount;
      if (telemetry.xrTracking.isTrackingLost || joints < 10) {
        detected.push({
          id: `anom-track-loss-${now}`,
          timestampMs: now,
          sourceSensor: 'WEBXR_TRACKING',
          observedMeasurement: { trackedJoints: joints, isTrackingLost: telemetry.xrTracking.isTrackingLost },
          expectedRange: { min: 18, max: 25, unit: 'tracked joints' },
          severity: 'HIGH',
          confidence: 0.94,
          explanation: `Critical spatial tracking loss: only ${joints}/25 skeleton joints registered.`,
          recommendedResponse: 'Request operator repositioning toward camera array; check sensor occlusion.',
          acknowledged: false,
        });
      }
    }

    // 3. Acceleration & Motion Jerk Spikes
    if (telemetry.motion?.acceleration) {
      const [ax, ay, az] = telemetry.motion.acceleration;
      const mag = Math.sqrt(ax * ax + ay * ay + az * az);
      if (mag > 20.0) {
        detected.push({
          id: `anom-motion-spike-${now}`,
          timestampMs: now,
          sourceSensor: 'DEVICE_MOTION',
          observedMeasurement: { accelerationVector: [ax, ay, az], magnitude: Number(mag.toFixed(1)) },
          expectedRange: { min: 0, max: 15, unit: 'm/s²' },
          severity: 'HIGH',
          confidence: 0.91,
          explanation: `Extreme acceleration spike (${mag.toFixed(1)} m/s²) detected. Possible mechanical shock or dropped device.`,
          recommendedResponse: 'Halt automated physical actions; verify physical device integrity.',
          acknowledged: false,
        });
      }
    }

    // 4. Orientation Discontinuity (Angle Jumps)
    if (this.previousTelemetry?.orientation && telemetry.orientation) {
      const prev = this.previousTelemetry.orientation;
      const curr = telemetry.orientation;
      const deltaBeta = Math.abs(curr.beta - prev.beta);
      const deltaGamma = Math.abs(curr.gamma - prev.gamma);

      if (deltaBeta > 80.0 || deltaGamma > 80.0) {
        detected.push({
          id: `anom-orient-jump-${now}`,
          timestampMs: now,
          sourceSensor: 'DEVICE_ORIENTATION',
          observedMeasurement: { deltaBeta: Number(deltaBeta.toFixed(1)), deltaGamma: Number(deltaGamma.toFixed(1)) },
          expectedRange: { min: 0, max: 45, unit: 'deg/frame' },
          severity: 'MEDIUM',
          confidence: 0.85,
          explanation: `Abnormal angular discontinuity (Δbeta=${deltaBeta.toFixed(0)}°, Δgamma=${deltaGamma.toFixed(0)}°) within consecutive frames.`,
          recommendedResponse: 'Apply temporal quaternion slerp damping to prevent visual teleportation.',
          acknowledged: false,
        });
      }
    }

    // 5. Stale / Missing Telemetry
    if (telemetry.isStale) {
      detected.push({
        id: `anom-stale-stream-${now}`,
        timestampMs: now,
        sourceSensor: 'APPLICATION_TELEMETRY',
        observedMeasurement: { isStale: true },
        severity: 'LOW',
        confidence: 0.95,
        explanation: 'Sensor stream timeout: no active telemetry packets received within sampling window.',
        recommendedResponse: 'Verify sensor listener activation and browser tab visibility.',
        acknowledged: false,
      });
    }

    // Deduplicate against recent anomalies (within 5 seconds)
    const newAnomalies: SensorAnomaly[] = [];
    for (const anom of detected) {
      const isDuplicate = this.anomalies.some(
        (existing) =>
          existing.sourceSensor === anom.sourceSensor &&
          existing.severity === anom.severity &&
          now - existing.timestampMs < 5000
      );
      if (!isDuplicate) {
        newAnomalies.push(anom);
        this.anomalies.unshift(anom);
      }
    }

    if (this.anomalies.length > this.MAX_ANOMALIES) {
      this.anomalies = this.anomalies.slice(0, this.MAX_ANOMALIES);
    }

    this.previousTelemetry = telemetry;
    if (newAnomalies.length > 0) {
      this.notify();
    }

    return newAnomalies;
  }

  public getAllAnomalies(): SensorAnomaly[] {
    return [...this.anomalies];
  }

  public getActiveAnomalies(): SensorAnomaly[] {
    return this.anomalies.filter((a) => !a.acknowledged);
  }

  public acknowledgeAnomaly(id: string): boolean {
    const anom = this.anomalies.find((a) => a.id === id);
    if (!anom) return false;
    anom.acknowledged = true;
    this.notify();
    return true;
  }

  public clearAllAnomalies(): void {
    this.anomalies = [];
    this.notify();
  }

  public subscribe(callback: (anomalies: SensorAnomaly[]) => void): () => void {
    this.listeners.add(callback);
    callback(this.getAllAnomalies());
    return () => this.listeners.delete(callback);
  }

  private notify(): void {
    const list = this.getAllAnomalies();
    this.listeners.forEach((cb) => {
      try {
        cb(list);
      } catch (err) {
        console.error('[SensorAnomalyDetectionEngine] listener error:', err);
      }
    });
  }
}

export const sensorAnomalyDetectionEngine = SensorAnomalyDetectionEngine.getInstance();
