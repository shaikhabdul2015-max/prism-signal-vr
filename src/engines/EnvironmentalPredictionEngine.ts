/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Environmental Prediction Engine (Phase 30)
 * Evaluates short-term predictive trends:
 * - Tracking stability projection over 10s-30s horizon
 * - Cadence degradation probability
 * - Environmental state transition forecasts
 * - Uncertainty band calculation
 * 
 * STRICT COMPLIANCE:
 * Clearly labels all predictions as statistical projections, not confirmed physical events.
 */

import {
  EnvironmentalPrediction,
  EnvironmentalState,
  NormalizedSensorTelemetry,
} from '../types/phase30';
import { adaptiveRealityEngine } from './AdaptiveRealityEngine';

export class EnvironmentalPredictionEngine {
  private static instance: EnvironmentalPredictionEngine | null = null;
  private latestPrediction: EnvironmentalPrediction | null = null;
  private telemetryHistory: NormalizedSensorTelemetry[] = [];
  private listeners: Set<(prediction: EnvironmentalPrediction) => void> = new Set();

  public constructor() {}

  public static getInstance(): EnvironmentalPredictionEngine {
    if (!EnvironmentalPredictionEngine.instance) {
      EnvironmentalPredictionEngine.instance = new EnvironmentalPredictionEngine();
    }
    return EnvironmentalPredictionEngine.instance;
  }

  public static resetInstance(): void {
    EnvironmentalPredictionEngine.instance = null;
  }

  /**
   * Generates a forward-looking environmental prediction
   */
  public predict(
    currentTelemetry: NormalizedSensorTelemetry,
    horizonSeconds: number = 15
  ): EnvironmentalPrediction {
    this.telemetryHistory.unshift(currentTelemetry);
    if (this.telemetryHistory.length > 20) {
      this.telemetryHistory.pop();
    }

    const warnings: string[] = [];
    const currentFps = currentTelemetry.performance?.fps ?? 72;
    const trackedJoints = currentTelemetry.xrTracking?.trackedJointsCount ?? 25;
    const isTrackingLost = Boolean(currentTelemetry.xrTracking?.isTrackingLost);

    // 1. Calculate FPS trend slope
    let fpsTrendSlope = 0;
    if (this.telemetryHistory.length >= 3) {
      const past = this.telemetryHistory[this.telemetryHistory.length - 1].performance?.fps ?? 72;
      fpsTrendSlope = (currentFps - past) / this.telemetryHistory.length;
    }

    // 2. Projected Cadence & Degradation Risk
    let performanceRisk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (currentFps < 50 || fpsTrendSlope < -3.0) {
      performanceRisk = 'HIGH';
      warnings.push(`Projected frame drop to ~${Math.max(20, Math.round(currentFps + fpsTrendSlope * 5))} FPS over next ${horizonSeconds}s.`);
    } else if (currentFps < 65 || fpsTrendSlope < -1.0) {
      performanceRisk = 'MEDIUM';
      warnings.push('Moderate negative cadence trend detected; GPU thermal throttling suspected.');
    }

    // 3. Projected Tracking Stability (0 - 100%)
    let trackingStabilityEstimate = Math.round((trackedJoints / 25) * 100);
    if (isTrackingLost) {
      trackingStabilityEstimate = Math.min(trackingStabilityEstimate, 25);
      warnings.push('Active tracking loss makes near-term spatial stabilization highly uncertain.');
    } else if (trackingStabilityEstimate < 70) {
      warnings.push(`Tracking stability degraded to ${trackingStabilityEstimate}%; occlusion risk elevated.`);
    }

    // 4. Projected Environmental State
    let projectedState: EnvironmentalState = 'NORMAL';
    if (isTrackingLost || performanceRisk === 'HIGH') {
      projectedState = 'DEGRADED';
    } else if (performanceRisk === 'MEDIUM') {
      projectedState = 'UNSTABLE';
    } else if (currentTelemetry.motion && Math.abs(currentTelemetry.motion.acceleration[0]) > 4.0) {
      projectedState = 'CHANGING';
    }

    // 5. Uncertainty Band Estimation
    let uncertainty = 0.12; // Base 12% uncertainty
    if (this.telemetryHistory.length < 5) uncertainty += 0.15; // Limited sample history
    if (isTrackingLost) uncertainty += 0.20;
    if (currentTelemetry.isStale) uncertainty += 0.25;

    const prediction: EnvironmentalPrediction = {
      timestampMs: Date.now(),
      horizonSeconds,
      projectedState,
      trackingStabilityEstimate,
      performanceDegradationRisk: performanceRisk,
      uncertaintyBand: Number(Math.min(0.85, uncertainty).toFixed(2)),
      warnings,
      basisNotes: `Extrapolated from ${this.telemetryHistory.length} historical frames; current FPS: ${currentFps}, slope: ${fpsTrendSlope.toFixed(2)}.`,
      isSimulationEstimate: currentTelemetry.provenance === 'SIMULATED_TELEMETRY',
    };

    // If degradation risk is HIGH, advise adaptive reality engine
    if (performanceRisk === 'HIGH') {
      adaptiveRealityEngine.evaluateTelemetry();
    }

    this.latestPrediction = prediction;
    this.notify();
    return prediction;
  }

  public getLatestPrediction(): EnvironmentalPrediction | null {
    return this.latestPrediction;
  }

  public subscribe(callback: (prediction: EnvironmentalPrediction) => void): () => void {
    this.listeners.add(callback);
    if (this.latestPrediction) {
      callback(this.latestPrediction);
    }
    return () => this.listeners.delete(callback);
  }

  private notify(): void {
    if (!this.latestPrediction) return;
    const p = this.latestPrediction;
    this.listeners.forEach((cb) => {
      try {
        cb(p);
      } catch (err) {
        console.error('[EnvironmentalPredictionEngine] listener error:', err);
      }
    });
  }
}

export const environmentalPredictionEngine = EnvironmentalPredictionEngine.getInstance();
