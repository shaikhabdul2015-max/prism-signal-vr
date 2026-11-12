/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.3: Autonomous Threat Mitigation — Anomaly Detection Engine
 * Coordinates behavioral baselines, pattern analysis, and untrusted recommendations.
 * 
 * CORE PRINCIPLE:
 * Deterministic security rules retain final enforcement authority.
 * AI anomaly detection classifications are strictly treated as UNTRUSTED advisory signals
 * and must NEVER independently authorize privileged, destructive, or administrative actions.
 */

import { AnomalyRecommendation } from './AnomalyTypes';
import { BehavioralBaselineManager } from './BehavioralBaseline';
import { PatternAnalyzer } from './PatternAnalyzer';
import { RiskAnalyzer } from './RiskAnalyzer';
import { EnterpriseObservabilityManager } from '../../engines/EnterpriseObservabilityManager';

export class AnomalyDetectionEngine {
  private static instance: AnomalyDetectionEngine | null = null;
  private baselineManager: BehavioralBaselineManager;

  private constructor() {
    this.baselineManager = BehavioralBaselineManager.getInstance();
  }

  public static getInstance(): AnomalyDetectionEngine {
    if (!AnomalyDetectionEngine.instance) {
      AnomalyDetectionEngine.instance = new AnomalyDetectionEngine();
    }
    return AnomalyDetectionEngine.instance;
  }

  public static resetInstance(): void {
    BehavioralBaselineManager.resetInstance();
    AnomalyDetectionEngine.instance = null;
  }

  /**
   * Evaluates an observed activity against behavioral profile and returns an untrusted recommendation.
   */
  public analyzeActivity(
    identityKey: string,
    observation: {
      requestRatePerMinute: number;
      errorRatePercentage: number;
      endpoint?: string;
      hourOfDay?: number;
    }
  ): AnomalyRecommendation {
    const profile = this.baselineManager.getOrCreateProfile(identityKey);
    const signals = PatternAnalyzer.analyzeDeviation(profile, observation);
    const recommendation = RiskAnalyzer.evaluateRisk(identityKey, signals);

    // Evolve baseline with new observation
    this.baselineManager.recordObservation(identityKey, observation);

    if (recommendation.anomalyScore >= 60) {
      try {
        const obs = EnterpriseObservabilityManager.getInstance();
        obs.log({
          level: 'WARN',
          service: 'AnomalyDetectionEngine',
          message: `[BEHAVIORAL_ANOMALY] ${identityKey}: Score ${recommendation.anomalyScore} (${recommendation.recommendedAction}) - ${recommendation.rationale}`,
          metadata: {
            identityKey,
            anomalyScore: recommendation.anomalyScore,
            confidence: recommendation.confidence,
            signalsCount: signals.length,
          },
        });
      } catch {
        // Non-blocking
      }
    }

    return recommendation;
  }
}
