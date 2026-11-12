/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.3: Autonomous Threat Mitigation — Configurable Threat Rules
 */

import { RawSecuritySignal, ThreatCategory } from './ThreatEvent';

export interface ThreatRuleDefinition {
  id: string;
  category: ThreatCategory;
  name: string;
  description: string;
  timeWindowSeconds: number;
  thresholdCount: number;
  evaluator: (signals: RawSecuritySignal[]) => boolean;
}

export class ThreatRules {
  private static rules: ThreatRuleDefinition[] = [
    {
      id: 'RULE_BRUTE_FORCE_AUTH',
      category: 'BRUTE_FORCE',
      name: 'Authentication Brute-Force Rule',
      description: 'More than 5 failed authentication attempts for a single user/IP within 60s',
      timeWindowSeconds: 60,
      thresholdCount: 5,
      evaluator: (signals) => {
        const failures = signals.filter(
          (s) => s.type === 'AUTH_FAILED' || s.statusCode === 401
        );
        return failures.length >= 5;
      },
    },
    {
      id: 'RULE_CREDENTIAL_STUFFING',
      category: 'CREDENTIAL_STUFFING',
      name: 'Distributed Credential Stuffing Rule',
      description: 'Multiple failed attempts targeting 3+ distinct user accounts from a single IP within 60s',
      timeWindowSeconds: 60,
      thresholdCount: 6,
      evaluator: (signals) => {
        const failedAuths = signals.filter(
          (s) => s.type === 'AUTH_FAILED' || s.statusCode === 401
        );
        const uniqueUsers = new Set(failedAuths.map((s) => s.userId).filter(Boolean));
        return failedAuths.length >= 6 && uniqueUsers.size >= 3;
      },
    },
    {
      id: 'RULE_SUSPICIOUS_KMS',
      category: 'SUSPICIOUS_KMS_OPERATION',
      name: 'KMS Key Misuse Rule',
      description: 'Any unauthorized KMS wrap/unwrap or access to revoked/deprecated key versions',
      timeWindowSeconds: 120,
      thresholdCount: 1,
      evaluator: (signals) => {
        return signals.some(
          (s) => s.type === 'KMS_UNAUTHORIZED' || s.type === 'KMS_REVOKED_ACCESS' || s.type === 'KMS_TAMPER_DETECTED'
        );
      },
    },
    {
      id: 'RULE_PRIVILEGE_ESCALATION',
      category: 'PRIVILEGE_ESCALATION',
      name: 'Privilege Escalation Rule',
      description: 'Unauthorized role assumption or administrative endpoint probes by non-admin users',
      timeWindowSeconds: 60,
      thresholdCount: 1,
      evaluator: (signals) => {
        return signals.some(
          (s) => s.type === 'PRIVILEGE_ESCALATION_ATTEMPT' || (s.statusCode === 403 && s.endpoint?.includes('/admin'))
        );
      },
    },
    {
      id: 'RULE_SESSION_HIJACKING',
      category: 'SESSION_HIJACKING',
      name: 'Session Anomaly Rule',
      description: 'Sudden user-agent mutation or IP migration on an active authenticated session',
      timeWindowSeconds: 300,
      thresholdCount: 1,
      evaluator: (signals) => {
        return signals.some((s) => s.type === 'SESSION_IP_MUTATION' || s.type === 'SESSION_UA_MUTATION');
      },
    },
    {
      id: 'RULE_API_ABUSE',
      category: 'API_ABUSE',
      name: 'High-Volume API Abuse Rule',
      description: 'Excessive requests exceeding 100 calls in a 10-second window from a single source',
      timeWindowSeconds: 10,
      thresholdCount: 100,
      evaluator: (signals) => {
        return signals.length >= 100;
      },
    },
    {
      id: 'RULE_RESOURCE_EXHAUSTION',
      category: 'RESOURCE_EXHAUSTION',
      name: 'Resource Exhaustion Rule',
      description: 'Payload exceeds 5MB or excessive socket connection churn',
      timeWindowSeconds: 30,
      thresholdCount: 1,
      evaluator: (signals) => {
        return signals.some(
          (s) => (s.payloadSize && s.payloadSize > 5 * 1024 * 1024) || s.type === 'SOCKET_CHURN_DETECTED'
        );
      },
    },
  ];

  public static getRules(): ThreatRuleDefinition[] {
    return [...this.rules];
  }

  public static addRule(rule: ThreatRuleDefinition): void {
    this.rules.push(rule);
  }

  public static resetRules(): void {
    // Retain defaults
  }
}
