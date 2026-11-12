/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.3: Autonomous Threat Mitigation — Attack Pattern Analyzer
 * Identifies multi-phase advanced persistent threat (APT) patterns and kill chains.
 */

import { ThreatEvent } from '../threat-detection/ThreatEvent';

export interface CorrelatedAttackCluster {
  patternId: string;
  patternName: string;
  sourceIp: string;
  targetUserId?: string;
  confidence: number;
  stageCount: number;
  stages: string[];
  events: ThreatEvent[];
  isCoordinatedAttack: boolean;
}

export class AttackPatternAnalyzer {
  /**
   * Scans a cluster of related events for known multi-stage attack patterns.
   */
  public static analyzePattern(events: ThreatEvent[], sourceIp: string): CorrelatedAttackCluster | null {
    if (!events || events.length < 2) return null;

    const categories = new Set(events.map((e) => e.category));
    const stages: string[] = [];

    // Check Multi-Stage Attack Kill Chain:
    // Stage 1: Recon / API Abuse / Abnormal Traffic
    const hasRecon = categories.has('API_ABUSE') || categories.has('ABNORMAL_TRAFFIC') || categories.has('SUSPICIOUS_API');
    if (hasRecon) stages.push('RECONNAISSANCE');

    // Stage 2: Initial Access / Brute Force / Credential Stuffing
    const hasAccess = categories.has('BRUTE_FORCE') || categories.has('CREDENTIAL_STUFFING') || categories.has('TOKEN_MISUSE');
    if (hasAccess) stages.push('CREDENTIAL_ATTACK');

    // Stage 3: Privilege Escalation / Session Hijacking
    const hasEscalation = categories.has('PRIVILEGE_ESCALATION') || categories.has('SESSION_HIJACKING') || categories.has('UNAUTHORIZED_ACCESS');
    if (hasEscalation) stages.push('PRIVILEGE_ESCALATION');

    // Stage 4: Cryptographic Exfiltration / KMS Abuse
    const hasKMS = categories.has('SUSPICIOUS_KMS_OPERATION');
    if (hasKMS) stages.push('CRYPTO_TARGETING');

    if (stages.length >= 2) {
      const isCoordinated = stages.length >= 3 || hasKMS;
      return {
        patternId: `pattern-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        patternName: stages.join(' -> '),
        sourceIp,
        targetUserId: events.find((e) => e.userId)?.userId,
        confidence: Math.min(0.98, 0.6 + stages.length * 0.12),
        stageCount: stages.length,
        stages,
        events,
        isCoordinatedAttack: isCoordinated,
      };
    }

    return null;
  }
}
