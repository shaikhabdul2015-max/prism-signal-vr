/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 32: Advanced Cybersecurity & Zero-Trust Intelligence Architecture Types.
 * Complete type definitions for Zero-Trust policy evaluation, AI threat detection,
 * intrusion monitoring, agent identity certificates, API security gateway,
 * prompt injection defense, runtime security health, automated defensive responses,
 * security audit compliance, and secret protection.
 */

import { EnterpriseUserRole } from './phase18';
import { AgentSpecialistRole } from './phase17';

export type SecurityTrustLevel = 'VERIFIED_TRUST' | 'CONDITIONAL_TRUST' | 'UNTRUSTED' | 'REVOKED';

export type SecuritySeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type SecurityDecision = 'PERMIT' | 'DENY' | 'CHALLENGE' | 'RESTRICT';

export type ResponseLevel = 'OBSERVE' | 'ALERT' | 'RESTRICT' | 'CONTAIN' | 'RECOVER';

export type RuntimeSecurityStatus = 'HEALTHY' | 'WARNING' | 'DEGRADED' | 'CRITICAL' | 'UNKNOWN';

export interface ZeroTrustRequestContext {
  requestId?: string;
  subjectId: string; // User ID, Agent ID, or API client IP
  subjectType?: 'USER' | 'AGENT' | 'API_CLIENT' | 'SYSTEM';
  role: EnterpriseUserRole | AgentSpecialistRole | 'ANONYMOUS' | 'VIEWER' | 'OPERATOR' | 'ADMIN' | 'SECURITY_OFFICER';
  resource: string; // e.g., 'telemetry:write', 'incident:close', 'agent:execute', 'ai:prompt'
  action: 'READ' | 'WRITE' | 'EXECUTE' | 'ADMIN' | 'DELETE';
  sessionId?: string;
  sessionToken?: string;
  sessionExpiresAt?: number;
  token?: string;
  ipAddress?: string;
  deviceFingerprint?: string;
  isSimulatedSession?: boolean;
  timestamp?: string;
}

export interface ZeroTrustEvaluationResult {
  decision: SecurityDecision;
  requestId: string;
  subjectId: string;
  resource: string;
  action: string;
  reason: string;
  matchedPolicy: string;
  riskScore: number; // 0 - 100
  evaluatedAt: string;
  requiredRemediation?: string;
  allowed?: boolean;
}

export interface AIThreatEvent {
  eventId: string;
  timestamp: string;
  category:
    | 'AUTHENTICATION_ANOMALY'
    | 'AUTHORIZATION_VIOLATION'
    | 'PROMPT_INJECTION'
    | 'AGENT_IMPERSONATION'
    | 'RATE_LIMIT_ABUSE'
    | 'CONFIGURATION_TAMPERING'
    | 'DATA_EXFILTRATION_PATTERN'
    | 'MALICIOUS_PAYLOAD';
  affectedComponent: string;
  evidence: Record<string, any>;
  severity: SecuritySeverity;
  confidence: number; // 0 - 100%
  explanation: string;
  recommendedDefensiveResponse: string;
  responseLevel: ResponseLevel;
  mitigated: boolean;
  mitigatedAt?: string;
  correlatedIncidentId?: string;
}

export interface AgentSecurityIdentity {
  agentId: string;
  role: AgentSpecialistRole;
  publicKeyFingerprint: string;
  assignedCapabilities: string[];
  maxPrivilegeLevel: 'STANDARD' | 'ELEVATED' | 'CHIEF_ARBITER';
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
  consecutiveViolations: number;
  lastVerifiedAt: string;
  allowedEndpoints: string[];
}

export interface APIGatewaySecurityRule {
  endpoint: string;
  requiredRole?: string;
  maxRequestsPerMinute: number;
  maxPayloadBytes: number;
  requireAuth: boolean;
  enforceCors: boolean;
  allowedOrigins: string[];
}

export interface PromptSecurityAnalysis {
  isSafe: boolean;
  riskScore: number; // 0 - 100
  detectedPatterns: string[];
  injectionType?: 'DIRECT_OVERRIDE' | 'INSTRUCTION_HIJACKING' | 'EXFILTRATION_PROBE' | 'ROLE_ESCAPE' | 'NONE';
  sanitizedInput: string;
  systemPolicyProtected: boolean;
  requiresHumanReview: boolean;
}

export interface SecurityResponseAction {
  actionId: string;
  threatEventId: string;
  level: ResponseLevel;
  actionType:
    | 'LOG_ALERT'
    | 'REVOKE_SESSION'
    | 'SUSPEND_AGENT'
    | 'RATE_LIMIT_IP'
    | 'ISOLATE_ROUTE'
    | 'REQUEST_OPERATOR_APPROVAL'
    | 'RESTORE_BASELINE';
  target: string;
  parameters: Record<string, any>;
  status: 'PENDING_APPROVAL' | 'EXECUTED' | 'REVERTED' | 'REJECTED';
  executedAt?: string;
  executedBy: string; // 'AutomatedSecurityResponseEngine' | 'HumanOperator'
  reversionSafe: boolean;
  auditTrail: string;
}

export interface SecurityAuditCheckResult {
  checkId: string;
  category: 'AUTHENTICATION' | 'AUTHORIZATION' | 'API_GATEWAY' | 'SECRETS' | 'AGENTS' | 'FIRESTORE_RULES';
  title: string;
  severity: SecuritySeverity;
  status: 'PASSED' | 'WARNING' | 'FAILED';
  evidence: string;
  remediationAdvice: string;
  testedAt: string;
}

export interface SecurityAuditReport {
  reportId: string;
  generatedAt: string;
  overallScore: number; // 0 - 100
  runtimeStatus: RuntimeSecurityStatus;
  checks: SecurityAuditCheckResult[];
  unresolvedThreatsCount: number;
  activeBreachesDetected: number;
  compliancePosture: 'HARDENED' | 'ADEQUATE' | 'AT_RISK' | 'NON_COMPLIANT';
}

export interface SecurityConfigurationHealth {
  environmentMode: string;
  hardcodedSecretsDetected: boolean;
  sensitiveEnvVarsExposedToClient: boolean;
  geminiProxySecure: boolean;
  llamaProxySecure: boolean;
  firestoreDefaultDenyEnforced: boolean;
  httpsOrLocalDevEnforced: boolean;
  corsOriginPolicyRestricted: boolean;
  secretRotationStatus: 'HEALTHY' | 'ATTENTION_REQUIRED';
}
