/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 23: Human Approval Manager.
 * Gates all high-impact actions through explicit operator authorization.
 * Features expiration timeouts, cancellation of stale requests,
 * and comprehensive audit logging.
 */

import { AgentRole } from '../types/phase17';
import {
  ApprovalRequest,
  ApprovalStatus,
  CommandImpactLevel,
} from '../types/phase23';
import { commandAuditService } from '../services/CommandAuditService';

const DEFAULT_TIMEOUT_MS = 1000 * 60 * 10; // 10 minutes timeout

export class HumanApprovalManager {
  private static instance: HumanApprovalManager | null = null;
  private requests: Map<string, ApprovalRequest> = new Map();
  private listeners: Set<(requests: ApprovalRequest[]) => void> = new Set();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  private constructor() {
    this.startExpirationMonitor();
  }

  public static getInstance(): HumanApprovalManager {
    if (!HumanApprovalManager.instance) {
      HumanApprovalManager.instance = new HumanApprovalManager();
    }
    return HumanApprovalManager.instance;
  }

  public static resetInstance(): void {
    if (HumanApprovalManager.instance?.cleanupTimer) {
      clearInterval(HumanApprovalManager.instance.cleanupTimer);
    }
    HumanApprovalManager.instance = null;
  }

  public getAllRequests(): ApprovalRequest[] {
    this.checkExpirations();
    return Array.from(this.requests.values());
  }

  public getPendingRequests(): ApprovalRequest[] {
    return this.getAllRequests().filter((r) => r.status === 'PENDING');
  }

  public subscribe(callback: (requests: ApprovalRequest[]) => void): () => void {
    this.listeners.add(callback);
    callback(this.getAllRequests());
    return () => this.listeners.delete(callback);
  }

  private notify(): void {
    const list = this.getAllRequests();
    this.listeners.forEach((cb) => {
      try {
        cb(list);
      } catch (err) {
        console.error('[HumanApprovalManager] listener error:', err);
      }
    });
  }

  private startExpirationMonitor(): void {
    this.cleanupTimer = setInterval(() => {
      this.checkExpirations();
    }, 5000);
    if (this.cleanupTimer && typeof (this.cleanupTimer as any).unref === 'function') {
      (this.cleanupTimer as any).unref();
    }
  }

  private checkExpirations(): void {
    const now = Date.now();
    let hasChanges = false;

    this.requests.forEach((req) => {
      if (req.status === 'PENDING' && new Date(req.expiresAt).getTime() <= now) {
        req.status = 'EXPIRED';
        req.decidedAt = new Date().toISOString();
        req.decisionNotes = 'Request expired automatically after timeout window.';
        hasChanges = true;

        commandAuditService.recordEntry({
          eventType: 'APPROVAL_REJECTED',
          actor: 'AUTONOMOUS_OPERATIONS_MANAGER',
          approvalId: req.approvalId,
          commandId: req.commandId,
          details: `Approval request ${req.approvalId} for "${req.commandName}" expired.`,
          impactLevel: req.impactLevel,
        });
      }
    });

    if (hasChanges) {
      this.notify();
    }
  }

  /**
   * Creates an approval request for a high-impact operation.
   */
  public createApprovalRequest(params: {
    commandId: string;
    commandName: string;
    actionSummary: string;
    initiator: AgentRole | 'AUTONOMOUS_OPERATIONS_MANAGER';
    targetModule: string;
    impactLevel: CommandImpactLevel;
    justification: string;
    riskAssessmentSummary: string;
    timeoutMs?: number;
  }): ApprovalRequest {
    const approvalId = `appr-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date();
    const timeout = params.timeoutMs || DEFAULT_TIMEOUT_MS;
    const expiresAt = new Date(now.getTime() + timeout).toISOString();

    const request: ApprovalRequest = {
      approvalId,
      commandId: params.commandId,
      commandName: params.commandName,
      actionSummary: params.actionSummary,
      initiator: params.initiator,
      targetModule: params.targetModule,
      impactLevel: params.impactLevel,
      justification: params.justification,
      riskAssessmentSummary: params.riskAssessmentSummary,
      status: 'PENDING',
      createdAt: now.toISOString(),
      expiresAt,
    };

    this.requests.set(approvalId, request);

    commandAuditService.recordEntry({
      eventType: 'COMMAND_DISPATCHED',
      actor: params.initiator,
      approvalId,
      commandId: params.commandId,
      details: `High-impact action "${params.commandName}" submitted for operator approval.`,
      impactLevel: params.impactLevel,
    });

    this.notify();
    return request;
  }

  /**
   * Operator approves a pending request.
   */
  public approveRequest(
    approvalId: string,
    operatorId: string = 'LEAD_SYSTEMS_OPERATOR',
    notes?: string
  ): boolean {
    const req = this.requests.get(approvalId);
    if (!req || req.status !== 'PENDING') return false;

    req.status = 'APPROVED';
    req.decidedAt = new Date().toISOString();
    req.decidedBy = operatorId;
    req.decisionNotes = notes || 'Operator authorization granted.';

    commandAuditService.recordEntry({
      eventType: 'APPROVAL_GRANTED',
      actor: 'OPERATOR',
      approvalId,
      commandId: req.commandId,
      details: `Operator ${operatorId} approved "${req.commandName}". Notes: ${req.decisionNotes}`,
      impactLevel: req.impactLevel,
    });

    this.notify();
    return true;
  }

  /**
   * Operator rejects a pending request.
   */
  public rejectRequest(
    approvalId: string,
    operatorId: string = 'LEAD_SYSTEMS_OPERATOR',
    notes?: string
  ): boolean {
    const req = this.requests.get(approvalId);
    if (!req || req.status !== 'PENDING') return false;

    req.status = 'REJECTED';
    req.decidedAt = new Date().toISOString();
    req.decidedBy = operatorId;
    req.decisionNotes = notes || 'Operator rejection.';

    commandAuditService.recordEntry({
      eventType: 'APPROVAL_REJECTED',
      actor: 'OPERATOR',
      approvalId,
      commandId: req.commandId,
      details: `Operator ${operatorId} rejected "${req.commandName}". Notes: ${req.decisionNotes}`,
      impactLevel: req.impactLevel,
    });

    this.notify();
    return true;
  }

  /**
   * Checks whether a command has been authorized by an operator.
   */
  public isCommandAuthorized(commandId: string): boolean {
    for (const req of this.requests.values()) {
      if (req.commandId === commandId && req.status === 'APPROVED') {
        return true;
      }
    }
    return false;
  }

  // Static convenience facades for Cross-Engine & Phase 29 interactions
  public static requestIntervention(params: {
    type?: string;
    title: string;
    description: string;
    riskLevel?: CommandImpactLevel;
    estimatedImpact?: string;
    targetSubsystem?: string;
    parameters?: Record<string, unknown>;
  }): ApprovalRequest {
    const mgr = HumanApprovalManager.getInstance();
    return mgr.createApprovalRequest({
      commandId: `cmd-${Date.now().toString(36)}`,
      commandName: params.title,
      actionSummary: params.description,
      initiator: 'AUTONOMOUS_OPERATIONS_MANAGER',
      targetModule: params.targetSubsystem || 'CoreAutonomousSystems',
      impactLevel: params.riskLevel || 'MEDIUM',
      justification: params.description,
      riskAssessmentSummary: params.estimatedImpact || 'Moderate system adaptation impact.',
    });
  }

  public static getPendingInterventions(): Array<{ id: string; title: string; status: string }> {
    return HumanApprovalManager.getInstance()
      .getPendingRequests()
      .map((r) => ({
        id: r.approvalId,
        title: r.commandName,
        status: r.status,
      }));
  }

  public static approveIntervention(id: string, operator: string = 'LEAD_SYSTEMS_OPERATOR'): boolean {
    return HumanApprovalManager.getInstance().approveRequest(id, operator);
  }
}

export const humanApprovalManager = HumanApprovalManager.getInstance();
