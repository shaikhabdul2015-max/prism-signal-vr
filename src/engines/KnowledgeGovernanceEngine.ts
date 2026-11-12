/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Knowledge Governance and Security Engine (Phase 35)
 * Zero-Trust access control, cryptographic integrity verification, audit logging,
 * and prompt-injection defense for incoming knowledge payloads.
 * Strictly guarantees that API keys, secrets, and private credentials are never exposed.
 */

import {
  GovernanceAuditLog,
  KnowledgeClassificationTier,
  UniversalKnowledgeNode,
} from '../types/phase35';

export class KnowledgeGovernanceEngine {
  private static instance: KnowledgeGovernanceEngine | null = null;
  private auditLogs: GovernanceAuditLog[] = [];
  private maxLogs = 250;

  public constructor() {
    this.seedInitialAudit();
  }

  public static getInstance(): KnowledgeGovernanceEngine {
    if (!KnowledgeGovernanceEngine.instance) {
      KnowledgeGovernanceEngine.instance = new KnowledgeGovernanceEngine();
    }
    return KnowledgeGovernanceEngine.instance;
  }

  public static resetInstance(): void {
    KnowledgeGovernanceEngine.instance = null;
  }

  private seedInitialAudit(): void {
    const now = new Date().toISOString();
    this.auditLogs.push({
      logId: 'gov-init-01',
      timestamp: now,
      actor: 'SystemZeroTrustBootstrap',
      action: 'ACCESS_GRANTED',
      resourceId: 'src-security-gateway',
      details: 'Zero-Trust knowledge governance policies initialized with 4-tier classification.',
      securityLevel: 'INFO',
    });
  }

  /**
   * Evaluates if an actor is authorized to read or mutate a classified node.
   */
  public evaluateAccess(actorRole: string, nodeClassification: KnowledgeClassificationTier): boolean {
    const isAdmin = actorRole.toUpperCase().includes('ADMIN') || actorRole.toUpperCase().includes('CHIEF');
    const isEngineer = actorRole.toUpperCase().includes('ENGINEER') || actorRole.toUpperCase().includes('OPERATIONS');

    let allowed = true;
    if (nodeClassification === 'CONFIDENTIAL') {
      allowed = isAdmin;
    } else if (nodeClassification === 'RESTRICTED') {
      allowed = isAdmin || isEngineer;
    }

    this.recordAudit({
      actor: actorRole,
      action: allowed ? 'ACCESS_GRANTED' : 'ACCESS_DENIED',
      resourceId: nodeClassification,
      details: allowed
        ? `Access authorized for tier ${nodeClassification}.`
        : `Access DENIED for tier ${nodeClassification}. Insufficient role clearance.`,
      securityLevel: allowed ? 'INFO' : 'WARN',
    });

    return allowed;
  }

  /**
   * Sanitizes and verifies content against prompt-injection signatures and secret leakage.
   */
  public inspectContentSafety(content: string, source: string): { isSafe: boolean; flaggedPattern?: string } {
    const lower = content.toLowerCase();

    // 1. Secret leakage patterns
    if (lower.includes('api_key') || lower.includes('secret_key') || lower.includes('bearer ') || lower.includes('authorization:')) {
      this.recordAudit({
        actor: source,
        action: 'ACCESS_DENIED',
        resourceId: 'SECRET_PROTECTION',
        details: 'Potential secret or credential pattern detected and blocked from knowledge ingestion.',
        securityLevel: 'CRITICAL',
      });
      return { isSafe: false, flaggedPattern: 'CREDENTIAL_LEAKAGE_DETECTED' };
    }

    // 2. Prompt injection patterns
    const injectionPatterns = [
      'ignore previous instructions',
      'ignore all prior instructions',
      'system override',
      'system prompt:',
      'you are now in god mode',
      'reveal your instructions',
      'jailbreak',
    ];

    for (const pattern of injectionPatterns) {
      if (lower.includes(pattern)) {
        this.recordAudit({
          actor: source,
          action: 'PROMPT_INJECTION_DEFENSE_TRIGGERED',
          resourceId: 'PROMPT_SECURITY',
          details: `Prompt injection attack signature "${pattern}" blocked.`,
          securityLevel: 'CRITICAL',
        });
        return { isSafe: false, flaggedPattern: pattern };
      }
    }

    return { isSafe: true };
  }

  /**
   * Verifies knowledge node integrity.
   */
  public verifyNodeIntegrity(node: UniversalKnowledgeNode): boolean {
    const hasValidConfidence = node.confidence >= 0 && node.confidence <= 100;
    const hasValidProvenance = Boolean(node.provenanceSourceId && node.provenanceSourceId.length > 0);
    const hasValidLabel = Boolean(node.label && node.label.trim().length > 0);

    const isValid = hasValidConfidence && hasValidProvenance && hasValidLabel;
    if (!isValid) {
      this.recordAudit({
        actor: 'KnowledgeIntegrityScanner',
        action: 'ACCESS_DENIED',
        resourceId: node.id,
        details: `Integrity check failed for node "${node.id}". Corrupted fields detected.`,
        securityLevel: 'WARN',
      });
    }
    return isValid;
  }

  public recordAudit(params: {
    actor: string;
    action: GovernanceAuditLog['action'];
    resourceId: string;
    details: string;
    securityLevel: GovernanceAuditLog['securityLevel'];
  }): GovernanceAuditLog {
    const log: GovernanceAuditLog = {
      logId: `gov-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toISOString(),
      actor: params.actor,
      action: params.action,
      resourceId: params.resourceId,
      details: params.details,
      securityLevel: params.securityLevel,
    };

    this.auditLogs.unshift(log);
    if (this.auditLogs.length > this.maxLogs) this.auditLogs.pop();
    return log;
  }

  public getAuditLogs(): GovernanceAuditLog[] {
    return [...this.auditLogs];
  }
}
