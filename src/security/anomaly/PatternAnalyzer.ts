/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.3: Autonomous Threat Mitigation — Pattern Analyzer
 * Evaluates deviations against statistical baselines (Z-scores / Sigma analysis)
 * and temporal cluster shifts.
 */

import { AnomalySignal, UserBehavioralProfile } from './AnomalyTypes';

export class PatternAnalyzer {
  /**
   * Analyzes an observation against a profile to detect statistical deviations.
   */
  public static analyzeDeviation(
    profile: UserBehavioralProfile,
    observation: {
      requestRatePerMinute: number;
      errorRatePercentage: number;
      endpoint?: string;
      hourOfDay?: number;
    }
  ): AnomalySignal[] {
    const signals: AnomalySignal[] = [];

    // 1. Request Rate Z-Score Analysis
    const rateBaseline = profile.requestRateBaseline;
    if (rateBaseline.count >= 5 && rateBaseline.standardDeviation > 0) {
      const zScore = (observation.requestRatePerMinute - rateBaseline.mean) / rateBaseline.standardDeviation;
      if (zScore >= 3.0) {
        signals.push({
          metricName: 'request_rate_per_min',
          baselineValue: Number(rateBaseline.mean.toFixed(2)),
          observedValue: observation.requestRatePerMinute,
          deviationSigma: Number(zScore.toFixed(2)),
          confidence: Math.min(0.99, Number((0.7 + Math.min(0.25, zScore * 0.05)).toFixed(2))),
          isAnomaly: true,
          explanation: `Request rate (${observation.requestRatePerMinute}/min) is ${zScore.toFixed(1)}σ above baseline average (${rateBaseline.mean.toFixed(1)}/min)`,
        });
      }
    } else if (rateBaseline.count < 5 && observation.requestRatePerMinute >= 150) {
      // Cold-start heuristic threshold
      signals.push({
        metricName: 'request_rate_per_min',
        baselineValue: 10,
        observedValue: observation.requestRatePerMinute,
        deviationSigma: 4.0,
        confidence: 0.85,
        isAnomaly: true,
        explanation: `Extreme burst rate detected during cold baseline window (${observation.requestRatePerMinute}/min)`,
      });
    }

    // 2. Error Rate Z-Score Analysis
    const errBaseline = profile.errorRateBaseline;
    if (errBaseline.count >= 5 && errBaseline.standardDeviation > 0) {
      const zScore = (observation.errorRatePercentage - errBaseline.mean) / errBaseline.standardDeviation;
      if (zScore >= 3.0 && observation.errorRatePercentage > 20) {
        signals.push({
          metricName: 'error_rate_percentage',
          baselineValue: Number(errBaseline.mean.toFixed(2)),
          observedValue: observation.errorRatePercentage,
          deviationSigma: Number(zScore.toFixed(2)),
          confidence: 0.9,
          isAnomaly: true,
          explanation: `Error rate spike (${observation.errorRatePercentage}%) is ${zScore.toFixed(1)}σ above normal baseline (${errBaseline.mean.toFixed(1)}%)`,
        });
      }
    }

    // 3. Off-hours Activity Pattern
    if (observation.hourOfDay !== undefined && profile.activeHoursBitmask > 0) {
      const isKnownHour = (profile.activeHoursBitmask & (1 << observation.hourOfDay)) !== 0;
      if (!isKnownHour && profile.requestRateBaseline.count >= 20) {
        signals.push({
          metricName: 'active_hours_anomaly',
          baselineValue: 0,
          observedValue: observation.hourOfDay,
          deviationSigma: 2.5,
          confidence: 0.65,
          isAnomaly: true,
          explanation: `Activity detected at off-hours UTC ${observation.hourOfDay}:00 outside historical active schedule`,
        });
      }
    }

    // 4. Unusual Endpoint Probing
    if (observation.endpoint && profile.commonEndpoints.size >= 5) {
      const priorHits = profile.commonEndpoints.get(observation.endpoint) || 0;
      if (priorHits === 0 && (observation.endpoint.includes('/admin') || observation.endpoint.includes('/kms') || observation.endpoint.includes('/v1/secret'))) {
        signals.push({
          metricName: 'unusual_sensitive_endpoint',
          baselineValue: 0,
          observedValue: 1,
          deviationSigma: 3.5,
          confidence: 0.88,
          isAnomaly: true,
          explanation: `First-time access to privileged endpoint (${observation.endpoint}) not present in historical profile`,
        });
      }
    }

    return signals;
  }
}
