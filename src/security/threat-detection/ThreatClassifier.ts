/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.3: Autonomous Threat Mitigation — Threat Classifier
 */

import { RawSecuritySignal, ThreatCategory, ThreatEvent } from './ThreatEvent';
import { ThreatRules } from './ThreatRules';
import { ThreatScoring } from './ThreatScoring';
import { ThreatContextManager } from './ThreatContext';
import crypto from 'node:crypto';

export class ThreatClassifier {
  /**
   * Classifies a cluster of security signals against defined deterministic rules.
   */
  public static classifySignals(
    signals: RawSecuritySignal[],
    sourceKey: string,
    options?: { anomalyScore?: number; targetIsAdmin?: boolean }
  ): ThreatEvent | null {
    if (!signals || signals.length === 0) return null;

    const rules = ThreatRules.getRules();
    const latest = signals[signals.length - 1];
    const now = Date.now();

    for (const rule of rules) {
      // Filter signals within rule window
      const windowCutoff = now - rule.timeWindowSeconds * 1000;
      const relevantSignals = signals.filter((s) => (s.timestamp || now) >= windowCutoff);

      if (relevantSignals.length >= rule.thresholdCount && rule.evaluator(relevantSignals)) {
        const sanitizedContext = ThreatContextManager.sanitizeContext({
          sourceIp: latest.sourceIp,
          userId: latest.userId,
          sessionId: latest.sessionId,
          endpoint: latest.endpoint,
          userAgent: latest.userAgent,
          requestRatePerMinute: relevantSignals.length,
          metadata: latest.metadata,
        });

        const scoring = ThreatScoring.calculateScore(rule.category, sanitizedContext, {
          attemptCount: relevantSignals.length,
          anomalyScore: options?.anomalyScore,
          targetIsAdmin: options?.targetIsAdmin,
        });

        const fingerprint = crypto
          .createHash('sha256')
          .update(`${rule.category}:${sourceKey}:${Math.floor(now / (rule.timeWindowSeconds * 1000))}`)
          .digest('hex')
          .substring(0, 16);

        const event: ThreatEvent = {
          id: `threat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          timestamp: new Date().toISOString(),
          category: rule.category,
          severity: scoring.severity,
          riskScore: scoring.riskScore,
          title: rule.name,
          description: `${rule.description} (Triggered with ${relevantSignals.length} events from ${sourceKey})`,
          sourceIp: latest.sourceIp,
          userId: latest.userId,
          sessionId: latest.sessionId,
          endpoint: latest.endpoint,
          fingerprint,
          details: {
            ruleId: rule.id,
            signalCount: relevantSignals.length,
            scoreBreakdown: scoring.scoreBreakdown,
            signalsSample: relevantSignals.slice(0, 5).map((s) => ({
              type: s.type,
              endpoint: s.endpoint,
              status: s.statusCode,
            })),
          },
          context: sanitizedContext,
        };

        return event;
      }
    }

    // Direct classification for individual high-severity signal types
    if (latest.type === 'KMS_UNAUTHORIZED' || latest.type === 'PRIVILEGE_ESCALATION_ATTEMPT') {
      const category: ThreatCategory =
        latest.type === 'KMS_UNAUTHORIZED' ? 'SUSPICIOUS_KMS_OPERATION' : 'PRIVILEGE_ESCALATION';
      const sanitized = ThreatContextManager.sanitizeContext(latest);
      const scoring = ThreatScoring.calculateScore(category, sanitized, {
        attemptCount: 1,
        targetIsAdmin: true,
      });

      return {
        id: `threat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        category,
        severity: scoring.severity,
        riskScore: scoring.riskScore,
        title: `Direct Security Violation: ${latest.type}`,
        description: `Direct security violation triggered on ${latest.endpoint || 'system'}`,
        sourceIp: latest.sourceIp,
        userId: latest.userId,
        sessionId: latest.sessionId,
        endpoint: latest.endpoint,
        fingerprint: `direct_${latest.type}_${latest.sourceIp}`,
        details: { type: latest.type, metadata: latest.metadata },
        context: sanitized,
      };
    }

    return null;
  }
}
