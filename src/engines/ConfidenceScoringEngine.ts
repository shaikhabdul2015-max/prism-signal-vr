/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Confidence Scoring Engine (Phase 33)
 * Unified confidence calibration framework. Calculates transparent, calibrated confidence
 * scores based on sample size, telemetry variance, and missing-data penalties.
 * Strictly avoids representing heuristic scores as formal statistical probabilities.
 */

import { PredictionExplanation, ExplanationFactor } from '../types/phase33';

export class ConfidenceScoringEngine {
  private static instance: ConfidenceScoringEngine | null = null;

  public constructor() {}

  public static getInstance(): ConfidenceScoringEngine {
    if (!ConfidenceScoringEngine.instance) {
      ConfidenceScoringEngine.instance = new ConfidenceScoringEngine();
    }
    return ConfidenceScoringEngine.instance;
  }

  public static resetInstance(): void {
    ConfidenceScoringEngine.instance = null;
  }

  /**
   * Calibrates raw confidence rating against data density and volatility factors.
   */
  public calibrateConfidence(params: {
    rawConfidence: number; // 0 - 100
    sampleCount: number;
    varianceIndex: number; // 0 - 100
    isPhysicalHardware: boolean;
  }): {
    calibratedScore: number;
    qualityRating: 'HIGH' | 'MEDIUM' | 'DEGRADED' | 'SPARSE';
    factors: ExplanationFactor[];
  } {
    const { rawConfidence, sampleCount, varianceIndex, isPhysicalHardware } = params;
    let score = rawConfidence;
    const factors: ExplanationFactor[] = [];

    // 1. Sample density penalty
    if (sampleCount < 10) {
      score -= 20;
      factors.push({
        factorName: 'Sparse Historical Horizon',
        contributionPercent: -20,
        direction: 'ADVERSE',
        description: `Only ${sampleCount} samples collected; statistical confidence reduced.`,
      });
    } else if (sampleCount >= 30) {
      score += 5;
      factors.push({
        factorName: 'Robust Sample Horizon',
        contributionPercent: 5,
        direction: 'FAVORABLE',
        description: `${sampleCount} continuous telemetry samples available.`,
      });
    }

    // 2. Telemetry variance penalty
    if (varianceIndex > 30) {
      const penalty = Math.min(25, Math.round((varianceIndex - 30) * 0.6));
      score -= penalty;
      factors.push({
        factorName: 'High Residual Volatility',
        contributionPercent: -penalty,
        direction: 'ADVERSE',
        description: `Volatility index at ${varianceIndex}/100 induces wider confidence bands.`,
      });
    } else {
      factors.push({
        factorName: 'Low Variance Stability',
        contributionPercent: 10,
        direction: 'FAVORABLE',
        description: 'Pacing variance remains low and tightly bounded.',
      });
    }

    // 3. Hardware provenance bonus
    if (isPhysicalVRActiveHardware(isPhysicalHardware)) {
      factors.push({
        factorName: 'Physical Sensor Grounding',
        contributionPercent: 10,
        direction: 'FAVORABLE',
        description: 'Telemetry derived from verified physical WebXR device stream.',
      });
    } else {
      score -= 8;
      factors.push({
        factorName: 'Synthetic/Simulation Baseline',
        contributionPercent: -8,
        direction: 'NEUTRAL',
        description: 'Session running in preview mode; physical hardware variance absent.',
      });
    }

    const calibratedScore = Math.max(10, Math.min(99, Math.round(score)));

    let qualityRating: 'HIGH' | 'MEDIUM' | 'DEGRADED' | 'SPARSE' = 'HIGH';
    if (sampleCount < 5) qualityRating = 'SPARSE';
    else if (calibratedScore < 50) qualityRating = 'DEGRADED';
    else if (calibratedScore < 75) qualityRating = 'MEDIUM';

    return {
      calibratedScore,
      qualityRating,
      factors,
    };
  }
}

function isPhysicalVRActiveHardware(active: boolean): boolean {
  return active === true;
}
