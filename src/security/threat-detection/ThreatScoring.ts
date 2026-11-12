/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.3: Autonomous Threat Mitigation — Threat Risk Scoring Engine
 */

import { ThreatCategory, ThreatSeverity, ThreatContext } from './ThreatEvent';

export class ThreatScoring {
  private static readonly CATEGORY_BASE_SCORES: Record<ThreatCategory, number> = {
    BRUTE_FORCE: 70,
    CREDENTIAL_STUFFING: 90,
    SUSPICIOUS_API: 45,
    UNAUTHORIZED_ACCESS: 80,
    SESSION_HIJACKING: 85,
    TOKEN_MISUSE: 75,
    PRIVILEGE_ESCALATION: 95,
    API_ABUSE: 55,
    ABNORMAL_TRAFFIC: 50,
    RESOURCE_EXHAUSTION: 80,
    SUSPICIOUS_KMS_OPERATION: 95,
    INJECTION_ATTEMPT: 90,
  };

  /**
   * Calculates deterministic risk score (0-100) based on severity, context, and rate.
   */
  public static calculateScore(
    category: ThreatCategory,
    context: ThreatContext,
    options?: {
      attemptCount?: number;
      anomalyScore?: number;
      targetIsAdmin?: boolean;
    }
  ): { riskScore: number; severity: ThreatSeverity; scoreBreakdown: Record<string, number> } {
    let score = this.CATEGORY_BASE_SCORES[category] || 50;
    const breakdown: Record<string, number> = { base: score };

    // 1. Frequency multiplier
    const attempts = options?.attemptCount || 1;
    if (attempts > 1) {
      const freqBonus = Math.min(25, Math.floor(Math.log2(attempts) * 6));
      score += freqBonus;
      breakdown.frequency = freqBonus;
    }

    // 2. High-privilege / Admin target multiplier
    if (options?.targetIsAdmin || context.endpoint?.includes('/admin') || context.endpoint?.includes('/kms')) {
      const adminBonus = 15;
      score += adminBonus;
      breakdown.privilegedTarget = adminBonus;
    }

    // 3. Behavioral Anomaly bonus (0 - 15)
    if (options?.anomalyScore && options.anomalyScore > 50) {
      const anomalyBonus = Math.min(15, Math.floor((options.anomalyScore - 50) * 0.3));
      score += anomalyBonus;
      breakdown.behavioralAnomaly = anomalyBonus;
    }

    // 4. Prior infractions history
    if (context.priorViolationsCount && context.priorViolationsCount > 0) {
      const historyBonus = Math.min(15, context.priorViolationsCount * 3);
      score += historyBonus;
      breakdown.priorViolations = historyBonus;
    }

    // Clamp score to [0, 100]
    const finalScore = Math.max(0, Math.min(100, Math.round(score)));

    // Map score to ThreatSeverity
    let severity: ThreatSeverity = 'INFORMATIONAL';
    if (finalScore >= 90) {
      severity = 'CRITICAL';
    } else if (finalScore >= 75) {
      severity = 'HIGH';
    } else if (finalScore >= 50) {
      severity = 'MEDIUM';
    } else if (finalScore >= 25) {
      severity = 'LOW';
    }

    return {
      riskScore: finalScore,
      severity,
      scoreBreakdown: breakdown,
    };
  }
}
