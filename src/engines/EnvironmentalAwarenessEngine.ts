/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Environmental Awareness Engine (Phase 30)
 * Evaluates spatial environment dynamics, motion/orientation stability,
 * chamber boundary proximity, and state transitions.
 * 
 * States:
 * - NORMAL: Stable motion, optimal cadence, within safe chamber perimeter.
 * - CHANGING: Active operator rotation, transition between presets, or deliberate translation.
 * - UNSTABLE: High jerk / acceleration spike, severe orientation fluctuations.
 * - DEGRADED: Tracking loss, low framerate (<45 FPS), high latency (>25ms).
 * - UNKNOWN: Inconclusive sensor stream, stale data, or sensors inactive.
 * 
 * STRICT COMPLIANCE:
 * - Never claims physical atmospheric readings (temp/pressure) from browser APIs.
 * - Strictly labels simulated telemetry.
 */

import {
  EnvironmentalState,
  EnvironmentalContext,
  NormalizedSensorTelemetry,
} from '../types/phase30';
import { advancedSpatialIntelligenceEngine } from './AdvancedSpatialIntelligenceEngine';

export class EnvironmentalAwarenessEngine {
  private static instance: EnvironmentalAwarenessEngine | null = null;
  private currentContext: EnvironmentalContext;
  private stateHistory: Array<{ state: EnvironmentalState; timestamp: number; reason: string }> = [];
  private listeners: Set<(context: EnvironmentalContext) => void> = new Set();

  public constructor() {
    this.currentContext = {
      state: 'UNKNOWN',
      stateConfidence: 0.5,
      dominantDynamics: 'Sensor stream idle or initializing.',
      accelerationMagnitude: 0,
      angularVelocityMagnitude: 0,
      boundaryProximityRatio: 0,
      detectedChanges: [],
      recommendations: ['Initialize sensor stream or start session to establish baseline awareness.'],
      lastStateChangeTimestamp: Date.now(),
      isSimulated: false,
    };
  }

  public static getInstance(): EnvironmentalAwarenessEngine {
    if (!EnvironmentalAwarenessEngine.instance) {
      EnvironmentalAwarenessEngine.instance = new EnvironmentalAwarenessEngine();
    }
    return EnvironmentalAwarenessEngine.instance;
  }

  public static resetInstance(): void {
    EnvironmentalAwarenessEngine.instance = null;
  }

  public getContext(): EnvironmentalContext {
    return { ...this.currentContext };
  }

  /**
   * Analyzes normalized telemetry to update environmental context
   */
  public evaluateTelemetry(telemetry: NormalizedSensorTelemetry): EnvironmentalContext {
    const changes: string[] = [];
    const recommendations: string[] = [];

    // 1. Motion & Acceleration Magnitude
    let accMag = 0;
    if (telemetry.motion?.acceleration) {
      const [ax, ay, az] = telemetry.motion.acceleration;
      accMag = Math.sqrt(ax * ax + ay * ay + az * az);
    }

    // 2. Angular Velocity / Orientation Dynamics
    let angMag = 0;
    if (telemetry.orientation) {
      angMag = Math.abs(telemetry.orientation.beta) + Math.abs(telemetry.orientation.gamma);
    }

    // 3. Chamber Boundary Proximity
    let boundaryProximityRatio = 0.1;
    if (telemetry.xrTracking?.headPosition) {
      const [hx, hy, hz] = telemetry.xrTracking.headPosition;
      const bounds = advancedSpatialIntelligenceEngine.getChamberBoundary();
      const distToEdgeX = Math.min(Math.abs(bounds.max[0] - hx), Math.abs(hx - bounds.min[0]));
      const distToEdgeZ = Math.min(Math.abs(bounds.max[2] - hz), Math.abs(hz - bounds.min[2]));
      const minDistance = Math.min(distToEdgeX, distToEdgeZ);
      // Chamber width is 16m; proximity ratio increases when within 1.5m of wall
      boundaryProximityRatio = Math.max(0, Math.min(1.0, (1.5 - minDistance) / 1.5));
    }

    // 4. Determine Environmental State
    let targetState: EnvironmentalState = 'NORMAL';
    let dominantDynamics = 'Stable chamber telemetry; nominal user kinetics.';
    let confidence = 0.9;

    const fps = telemetry.performance?.fps ?? 72;
    const isTrackingLost = Boolean(telemetry.xrTracking?.isTrackingLost);

    if (telemetry.isStale) {
      targetState = 'UNKNOWN';
      dominantDynamics = 'Telemetry stream is stale or unpopulated.';
      confidence = 0.4;
      recommendations.push('Awaiting fresh sensor inputs from browser or WebXR device.');
    } else if (isTrackingLost || fps < 45) {
      targetState = 'DEGRADED';
      dominantDynamics = isTrackingLost
        ? 'Severe optical tracking occlusion or sensor joint dropout.'
        : `Cadence throttle detected (${fps} FPS).`;
      confidence = 0.95;
      changes.push('Tracking or frame rate degradation detected.');
      recommendations.push('Verify optical sensor line-of-sight and reduce visual scene complexity.');
    } else if (accMag > 15.0 || angMag > 180.0) {
      targetState = 'UNSTABLE';
      dominantDynamics = `High kinetic volatility detected (acc: ${accMag.toFixed(1)} m/s², ang: ${angMag.toFixed(0)}°).`;
      confidence = 0.88;
      changes.push('Rapid operator movement or mechanical shock detected.');
      recommendations.push('Dampen spatial head transitions to prevent simulator disorientation.');
    } else if (accMag > 4.0 || angMag > 60.0) {
      targetState = 'CHANGING';
      dominantDynamics = 'Active operator translation or angular head gaze rotation.';
      confidence = 0.92;
      changes.push('Dynamic operator gaze/position transition underway.');
      recommendations.push('Maintain active spatial collider surveillance.');
    }

    if (boundaryProximityRatio > 0.7) {
      recommendations.push('Operator approaching physical chamber boundary; display chaperone guardrails.');
      changes.push('Boundary proximity warning triggered.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Maintain nominal sensor polling and continue standard mission operations.');
    }

    const previousState = this.currentContext.state;
    if (previousState !== targetState) {
      this.stateHistory.unshift({
        state: targetState,
        timestamp: Date.now(),
        reason: dominantDynamics,
      });
      if (this.stateHistory.length > 30) {
        this.stateHistory.pop();
      }
    }

    this.currentContext = {
      state: targetState,
      stateConfidence: confidence,
      dominantDynamics,
      accelerationMagnitude: Number(accMag.toFixed(2)),
      angularVelocityMagnitude: Number(angMag.toFixed(2)),
      boundaryProximityRatio: Number(boundaryProximityRatio.toFixed(2)),
      detectedChanges: changes,
      recommendations,
      lastStateChangeTimestamp: previousState !== targetState ? Date.now() : this.currentContext.lastStateChangeTimestamp,
      isSimulated: telemetry.provenance === 'SIMULATED_TELEMETRY',
    };

    this.notify();
    return this.getContext();
  }

  public getStateHistory(): Array<{ state: EnvironmentalState; timestamp: number; reason: string }> {
    return [...this.stateHistory];
  }

  public subscribe(callback: (context: EnvironmentalContext) => void): () => void {
    this.listeners.add(callback);
    callback(this.getContext());
    return () => this.listeners.delete(callback);
  }

  private notify(): void {
    const ctx = this.getContext();
    this.listeners.forEach((cb) => {
      try {
        cb(ctx);
      } catch (err) {
        console.error('[EnvironmentalAwarenessEngine] listener error:', err);
      }
    });
  }
}

export const environmentalAwarenessEngine = EnvironmentalAwarenessEngine.getInstance();
