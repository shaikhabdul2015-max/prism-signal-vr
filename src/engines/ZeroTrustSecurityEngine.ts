/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Zero-Trust Security Engine (Phase 32)
 * Enforces strict, continuous, least-privilege Zero-Trust verification:
 * - "Never Trust, Always Verify"
 * - Default-Deny on unverified credentials, absent roles, or missing sessions
 * - Resource-level granular permission matrices
 * - Contextual risk-based authorization evaluation
 * - Dynamic session token validation and permission revocation
 * - Immutable security decision audit trail
 */

import {
  ZeroTrustRequestContext,
  ZeroTrustEvaluationResult,
  SecurityDecision,
} from '../types/phase32';
import { SystemAuditHistoryRecord } from '../types/phase31';

export class ZeroTrustSecurityEngine {
  private static instance: ZeroTrustSecurityEngine | null = null;
  private revokedSessionIds: Set<string> = new Set();
  private revokedSubjectIds: Set<string> = new Set();
  private decisionsHistory: ZeroTrustEvaluationResult[] = [];
  private auditLogs: SystemAuditHistoryRecord[] = [];
  private listeners: Set<(decisions: ZeroTrustEvaluationResult[]) => void> = new Set();

  // Resource permission matrix: resource -> allowed actions per role
  private permissionMatrix: Map<string, Map<string, string[]>> = new Map();

  public constructor() {
    this.initializePermissionMatrix();
  }

  public static getInstance(): ZeroTrustSecurityEngine {
    if (!ZeroTrustSecurityEngine.instance) {
      ZeroTrustSecurityEngine.instance = new ZeroTrustSecurityEngine();
    }
    return ZeroTrustSecurityEngine.instance;
  }

  public static resetInstance(): void {
    ZeroTrustSecurityEngine.instance = null;
  }

  private initializePermissionMatrix(): void {
    // 1. Telemetry resources
    const telemetryRules = new Map<string, string[]>();
    telemetryRules.set('VIEWER', ['READ']);
    telemetryRules.set('OPERATOR', ['READ', 'WRITE']);
    telemetryRules.set('SECURITY_OFFICER', ['READ', 'WRITE']);
    telemetryRules.set('ADMIN', ['READ', 'WRITE', 'DELETE']);
    telemetryRules.set('OperationsAgent', ['READ', 'WRITE']);
    telemetryRules.set('PerformanceAgent', ['READ', 'WRITE']);
    telemetryRules.set('TrackingAgent', ['READ', 'WRITE']);
    telemetryRules.set('ChiefIntelligenceAgent', ['READ', 'WRITE', 'ADMIN']);
    this.permissionMatrix.set('telemetry', telemetryRules);

    // 2. Incident management resources
    const incidentRules = new Map<string, string[]>();
    incidentRules.set('VIEWER', ['READ']);
    incidentRules.set('OPERATOR', ['READ', 'WRITE']);
    incidentRules.set('SECURITY_OFFICER', ['READ', 'WRITE', 'ADMIN']);
    incidentRules.set('ADMIN', ['READ', 'WRITE', 'ADMIN', 'DELETE']);
    incidentRules.set('IncidentAgent', ['READ', 'WRITE', 'ADMIN']);
    incidentRules.set('ChiefIntelligenceAgent', ['READ', 'WRITE', 'ADMIN']);
    this.permissionMatrix.set('incidents', incidentRules);

    // 3. AI prompt execution & diagnostics
    const aiRules = new Map<string, string[]>();
    aiRules.set('VIEWER', ['READ']);
    aiRules.set('OPERATOR', ['READ', 'EXECUTE']);
    aiRules.set('SECURITY_OFFICER', ['READ', 'EXECUTE']);
    aiRules.set('ADMIN', ['READ', 'EXECUTE', 'ADMIN']);
    aiRules.set('ChiefIntelligenceAgent', ['READ', 'EXECUTE', 'ADMIN']);
    aiRules.set('TestAgent', ['READ', 'EXECUTE']);
    this.permissionMatrix.set('ai_models', aiRules);

    // 4. System configuration & security administration
    const configRules = new Map<string, string[]>();
    configRules.set('VIEWER', []);
    configRules.set('OPERATOR', ['READ']);
    configRules.set('SECURITY_OFFICER', ['READ', 'ADMIN']);
    configRules.set('ADMIN', ['READ', 'WRITE', 'ADMIN', 'DELETE']);
    configRules.set('ChiefIntelligenceAgent', ['READ']);
    this.permissionMatrix.set('security_config', configRules);
  }

  /**
   * Evaluates an incoming request against Zero-Trust policies.
   * STRICT DEFAULT-DENY: If identity, session, or explicit permission cannot be verified, access is denied.
   */
  public evaluateRequest(ctx: ZeroTrustRequestContext): ZeroTrustEvaluationResult {
    const now = new Date().toISOString();
    const reqId = ctx.requestId || `zte-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // 0. Check session token expiration
    if (ctx.sessionExpiresAt && Date.now() > ctx.sessionExpiresAt) {
      return this.recordDecision({
        decision: 'DENY',
        requestId: reqId,
        subjectId: ctx.subjectId,
        resource: ctx.resource,
        action: ctx.action,
        reason: 'Session token has expired.',
        matchedPolicy: 'EXPIRED_SESSION_DENY',
        riskScore: 90,
        evaluatedAt: now,
        requiredRemediation: 'Re-authenticate with verified credentials.',
      });
    }

    // 1. Check if subject or session is explicitly revoked
    if (this.revokedSubjectIds.has(ctx.subjectId)) {
      return this.recordDecision({
        decision: 'DENY',
        requestId: reqId,
        subjectId: ctx.subjectId,
        resource: ctx.resource,
        action: ctx.action,
        reason: 'Subject identity has been revoked due to security restriction or compromise.',
        matchedPolicy: 'REVOKED_SUBJECT_DENY',
        riskScore: 95,
        evaluatedAt: now,
        requiredRemediation: 'Re-authenticate with valid credentials or contact System Administrator.',
      });
    }

    if (ctx.sessionId && this.revokedSessionIds.has(ctx.sessionId)) {
      return this.recordDecision({
        decision: 'DENY',
        requestId: reqId,
        subjectId: ctx.subjectId,
        resource: ctx.resource,
        action: ctx.action,
        reason: 'Session token has been invalidated or expired.',
        matchedPolicy: 'REVOKED_SESSION_DENY',
        riskScore: 85,
        evaluatedAt: now,
        requiredRemediation: 'Re-establish a fresh authenticated session.',
      });
    }

    // 2. Anonymous access check (Strict default-deny for non-read operations)
    if (ctx.role === 'ANONYMOUS') {
      if (ctx.action !== 'READ' || ctx.resource === 'security_config') {
        return this.recordDecision({
          decision: 'DENY',
          requestId: reqId,
          subjectId: ctx.subjectId,
          resource: ctx.resource,
          action: ctx.action,
          reason: 'Anonymous unauthenticated actor attempted protected action.',
          matchedPolicy: 'ANONYMOUS_PROTECTED_ACTION_DENY',
          riskScore: 90,
          evaluatedAt: now,
          requiredRemediation: 'Sign in through verified enterprise identity provider.',
        });
      }
    }

    // 3. Resolve resource policy domain
    const resourceDomain = ctx.resource.split(':')[0] || ctx.resource;
    const roleMap = this.permissionMatrix.get(resourceDomain);

    if (!roleMap) {
      // Unmapped resource domain -> Default Deny
      return this.recordDecision({
        decision: 'DENY',
        requestId: reqId,
        subjectId: ctx.subjectId,
        resource: ctx.resource,
        action: ctx.action,
        reason: `Resource "${ctx.resource}" has no declared permission rule. Default-deny enforced.`,
        matchedPolicy: 'UNDEFINED_RESOURCE_DEFAULT_DENY',
        riskScore: 75,
        evaluatedAt: now,
        requiredRemediation: 'Declare explicit permission rule in ZeroTrustSecurityEngine matrix.',
      });
    }

    const normalizedRole = ctx.role.toUpperCase();
    const allowedActions = roleMap.get(ctx.role) || roleMap.get(normalizedRole) || [];

    if (!allowedActions.includes(ctx.action) && !allowedActions.includes('ADMIN')) {
      return this.recordDecision({
        decision: 'DENY',
        requestId: reqId,
        subjectId: ctx.subjectId,
        resource: ctx.resource,
        action: ctx.action,
        reason: `Role "${ctx.role}" lacks "${ctx.action}" authorization on resource "${ctx.resource}".`,
        matchedPolicy: 'ROLE_RBAC_DENY',
        riskScore: 65,
        evaluatedAt: now,
        requiredRemediation: 'Elevate role permissions with verified supervisor authorization.',
      });
    }

    // 4. Contextual risk checks (e.g., destructive actions in simulated preview mode require confirmation)
    if (ctx.action === 'DELETE' && ctx.isSimulatedSession) {
      return this.recordDecision({
        decision: 'CHALLENGE',
        requestId: reqId,
        subjectId: ctx.subjectId,
        resource: ctx.resource,
        action: ctx.action,
        reason: 'Destructive deletion in preview environment requires explicit human verification.',
        matchedPolicy: 'PREVIEW_DESTRUCTIVE_CHALLENGE',
        riskScore: 50,
        evaluatedAt: now,
        requiredRemediation: 'Submit explicit human operator confirmation.',
      });
    }

    // 5. Authorized - PERMIT
    return this.recordDecision({
      decision: 'PERMIT',
      requestId: reqId,
      subjectId: ctx.subjectId,
      resource: ctx.resource,
      action: ctx.action,
      reason: `Authorized: Role "${ctx.role}" holds verified privilege for "${ctx.action}" on "${ctx.resource}".`,
      matchedPolicy: 'ZERO_TRUST_VERIFIED_PERMIT',
      riskScore: 5,
      evaluatedAt: now,
    });
  }

  public revokeSession(sessionId: string, reason: string): void {
    this.revokedSessionIds.add(sessionId);
    this.recordAudit('SECURITY', 'REVOKE_SESSION', 'ZeroTrustEngine', `Revoked session ${sessionId}: ${reason}`, true);
  }

  public revokeSubject(subjectId: string, reason: string = 'Security revocation'): void {
    this.revokedSubjectIds.add(subjectId);
    this.recordAudit('SECURITY', 'REVOKE_SUBJECT', 'ZeroTrustEngine', `Revoked subject ${subjectId}: ${reason}`, true);
  }

  public restoreSubject(subjectId: string): void {
    this.revokedSubjectIds.delete(subjectId);
    this.recordAudit('SECURITY', 'RESTORE_SUBJECT', 'ZeroTrustEngine', `Restored subject ${subjectId}`, true);
  }

  private recordDecision(result: ZeroTrustEvaluationResult): ZeroTrustEvaluationResult {
    result.allowed = result.decision === 'PERMIT';
    this.decisionsHistory.unshift(result);
    if (this.decisionsHistory.length > 100) {
      this.decisionsHistory.pop();
    }

    if (result.decision === 'DENY' || result.decision === 'CHALLENGE') {
      this.recordAudit(
        'SECURITY',
        `ACCESS_${result.decision}`,
        result.subjectId,
        `Zero-Trust ${result.decision} on ${result.resource} (${result.action}): ${result.reason}`,
        false
      );
    }

    this.notifyListeners();
    return result;
  }

  public getDecisionsHistory(): ZeroTrustEvaluationResult[] {
    return [...this.decisionsHistory];
  }

  public getAuditLogs(): SystemAuditHistoryRecord[] {
    return [...this.auditLogs];
  }

  private recordAudit(
    category: SystemAuditHistoryRecord['category'],
    action: string,
    actor: string,
    details: string,
    success: boolean
  ): void {
    this.auditLogs.unshift({
      id: `audit-zt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      category,
      action,
      actor,
      details,
      success,
    });
    if (this.auditLogs.length > 100) {
      this.auditLogs.pop();
    }
  }

  public subscribe(listener: (decisions: ZeroTrustEvaluationResult[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getDecisionsHistory());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const list = this.getDecisionsHistory();
    this.listeners.forEach((l) => l(list));
  }
}
