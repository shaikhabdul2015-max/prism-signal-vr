/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.3: Autonomous Threat Mitigation — Anomaly Risk Analyzer
 * Produces explainable risk ratings and untrusted mitigation recommendations
 * based on statistical deviation signals.
 */

import { AnomalyRecommendation, AnomalySignal } from './AnomalyTypes';

export class RiskAnalyzer {
  /**
   * Evaluates aggregate signals to produce an explainable AnomalyRecommendation.
   */
  public static evaluateRisk(
    identityKey: string,
    signals: AnomalySignal[]
  ): AnomalyRecommendation {
    const timestamp = new Date().toISOString();

    if (!signals || signals.length === 0) {
      return {
        identityKey,
        anomalyScore: 0,
        confidence: 0.95,
        signals: [],
        recommendedAction: 'MONITOR',
        rationale: 'Behavior aligns with established statistical baseline.',
        isUntrustedRecommendation: true,
        timestamp,
      };
    }

    // Weighted anomaly score calculation
    let totalScore = 0;
    let confidenceSum = 0;

    for (const signal of signals) {
      const metricWeight = signal.metricName.includes('sensitive') ? 40 : 25;
      const sigmaWeight = Math.min(35, signal.deviationSigma * 8);
      totalScore += metricWeight + sigmaWeight;
      confidenceSum += signal.confidence;
    }

    const normalizedScore = Math.min(100, Math.round(totalScore / signals.length + (signals.length - 1) * 15));
    const averageConfidence = Number((confidenceSum / signals.length).toFixed(2));

    let recommendedAction: AnomalyRecommendation['recommendedAction'] = 'MONITOR';
    if (normalizedScore >= 85) {
      recommendedAction = 'RESTRICT';
    } else if (normalizedScore >= 70) {
      recommendedAction = 'RATE_LIMIT';
    } else if (normalizedScore >= 45) {
      recommendedAction = 'INVESTIGATE';
    }

    const rationale = signals.map((s) => s.explanation).join('; ');

    return {
      identityKey,
      anomalyScore: normalizedScore,
      confidence: averageConfidence,
      signals,
      recommendedAction,
      rationale,
      isUntrustedRecommendation: true, // Non-authoritative advisory flag
      timestamp,
    };
  }
}
