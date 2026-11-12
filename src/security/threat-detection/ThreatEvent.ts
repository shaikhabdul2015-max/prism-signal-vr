/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.3: Autonomous Threat Mitigation — Threat Event Types
 */

export type ThreatCategory =
  | 'BRUTE_FORCE'
  | 'CREDENTIAL_STUFFING'
  | 'SUSPICIOUS_API'
  | 'UNAUTHORIZED_ACCESS'
  | 'SESSION_HIJACKING'
  | 'TOKEN_MISUSE'
  | 'PRIVILEGE_ESCALATION'
  | 'API_ABUSE'
  | 'ABNORMAL_TRAFFIC'
  | 'RESOURCE_EXHAUSTION'
  | 'SUSPICIOUS_KMS_OPERATION'
  | 'INJECTION_ATTEMPT';

export type ThreatSeverity =
  | 'INFORMATIONAL'
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL';

export interface ThreatContext {
  sourceIp: string;
  userAgent?: string;
  userId?: string;
  sessionId?: string;
  tenantId?: string;
  traceId?: string;
  endpoint?: string;
  httpMethod?: string;
  requestRatePerMinute?: number;
  priorViolationsCount?: number;
  metadata?: Record<string, unknown>;
}

export interface ThreatEvent {
  id: string;
  timestamp: string;
  category: ThreatCategory;
  severity: ThreatSeverity;
  riskScore: number; // 0 - 100
  title: string;
  description: string;
  sourceIp: string;
  userId?: string;
  sessionId?: string;
  endpoint?: string;
  fingerprint: string;
  details: Record<string, unknown>;
  context: ThreatContext;
  mitigationApplied?: string;
}

export interface RawSecuritySignal {
  type: string;
  sourceIp: string;
  userId?: string;
  sessionId?: string;
  endpoint?: string;
  httpMethod?: string;
  statusCode?: number;
  payloadSize?: number;
  userAgent?: string;
  timestamp?: number;
  metadata?: Record<string, unknown>;
}
