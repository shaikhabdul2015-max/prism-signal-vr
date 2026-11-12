/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.3: Autonomous Threat Mitigation — Response Policy Engine
 */

import { ThreatCategory, ThreatSeverity } from '../threat-detection/ThreatEvent';

export type ResponseLevel = 0 | 1 | 2 | 3 | 4;

export interface ResponseActionPlan {
  level: ResponseLevel;
  levelName: 'INFORMATIONAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  actions: Array<
    | 'RECORD_EVENT'
    | 'UPDATE_TELEMETRY'
    | 'APPLY_RATE_LIMIT'
    | 'RECORD_EVIDENCE'
    | 'REQUIRE_STEP_UP_AUTH'
    | 'RESTRICT_SESSION_TEMP'
    | 'NOTIFY_ADMINS'
    | 'REVOKE_SESSION'
    | 'QUARANTINE_IP_TEMP'
    | 'TRIGGER_INCIDENT'
    | 'REQUIRE_HUMAN_APPROVAL'
    | 'ISOLATE_COMPONENT'
  >;
  durationSeconds?: number;
  requiresHumanApproval: boolean;
}

export class ResponsePolicy {
  /**
   * Maps threat category and severity to a controlled response plan.
   */
  public static evaluatePolicy(
    category: ThreatCategory,
    severity: ThreatSeverity,
    riskScore: number
  ): ResponseActionPlan {
    // Critical overrides
    if (severity === 'CRITICAL' || riskScore >= 90) {
      return {
        level: 4,
        levelName: 'CRITICAL',
        actions: [
          'RECORD_EVENT',
          'RECORD_EVIDENCE',
          'TRIGGER_INCIDENT',
          'NOTIFY_ADMINS',
          'REVOKE_SESSION',
          'QUARANTINE_IP_TEMP',
          'ISOLATE_COMPONENT',
          'REQUIRE_HUMAN_APPROVAL',
        ],
        durationSeconds: 3600, // 1 hour temporary restriction
        requiresHumanApproval: true,
      };
    }

    if (severity === 'HIGH' || riskScore >= 75) {
      return {
        level: 3,
        levelName: 'HIGH',
        actions: [
          'RECORD_EVENT',
          'RECORD_EVIDENCE',
          'NOTIFY_ADMINS',
          'REVOKE_SESSION',
          'QUARANTINE_IP_TEMP',
          'APPLY_RATE_LIMIT',
        ],
        durationSeconds: 1800, // 30 minutes
        requiresHumanApproval: false,
      };
    }

    if (severity === 'MEDIUM' || riskScore >= 50) {
      return {
        level: 2,
        levelName: 'MEDIUM',
        actions: [
          'RECORD_EVENT',
          'REQUIRE_STEP_UP_AUTH',
          'RESTRICT_SESSION_TEMP',
          'NOTIFY_ADMINS',
          'APPLY_RATE_LIMIT',
        ],
        durationSeconds: 600, // 10 minutes
        requiresHumanApproval: false,
      };
    }

    if (severity === 'LOW' || riskScore >= 25) {
      return {
        level: 1,
        levelName: 'LOW',
        actions: ['RECORD_EVENT', 'APPLY_RATE_LIMIT', 'RECORD_EVIDENCE'],
        durationSeconds: 300, // 5 minutes
        requiresHumanApproval: false,
      };
    }

    return {
      level: 0,
      levelName: 'INFORMATIONAL',
      actions: ['RECORD_EVENT', 'UPDATE_TELEMETRY'],
      requiresHumanApproval: false,
    };
  }
}
