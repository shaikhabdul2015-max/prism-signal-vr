/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Automated Security Response Engine (Phase 32)
 * Executes controlled defensive remediations across 5 graduated response levels:
 * 1. OBSERVE -> Passive surveillance
 * 2. ALERT -> Notification and incident logging
 * 3. RESTRICT -> Throttling, session revocation, or temporary capability freeze
 * 4. CONTAIN -> Target agent suspension or IP isolation (requires human operator confirmation)
 * 5. RECOVER -> Safe baseline state restoration
 * Strictly prevents unverified automatic shutoffs of the entire platform.
 */

import {
  ResponseLevel,
  SecurityResponseAction,
} from '../types/phase32';
import { ZeroTrustSecurityEngine } from './ZeroTrustSecurityEngine';
import { AgentIdentitySecurityManager } from './AgentIdentitySecurityManager';
import { DistributedEventBus } from './DistributedEventBus';
import { SystemAuditHistoryRecord } from '../types/phase31';

export class SecurityResponseEngine {
  private static instance: SecurityResponseEngine | null = null;
  private actions: SecurityResponseAction[] = [];
  private auditLogs: SystemAuditHistoryRecord[] = [];
  private listeners: Set<(actions: SecurityResponseAction[]) => void> = new Set();

  public constructor() {
    this.seedInitialActions();
  }

  public static getInstance(): SecurityResponseEngine {
    if (!SecurityResponseEngine.instance) {
      SecurityResponseEngine.instance = new SecurityResponseEngine();
    }
    return SecurityResponseEngine.instance;
  }

  public static resetInstance(): void {
    SecurityResponseEngine.instance = null;
  }

  private seedInitialActions(): void {
    const seeds: SecurityResponseAction[] = [
      {
        actionId: 'act-seed-01',
        threatEventId: 'threat-seed-01',
        level: 'OBSERVE',
        actionType: 'LOG_ALERT',
        target: 'SystemAudit',
        parameters: { message: 'Security baseline verified.' },
        status: 'EXECUTED',
        executedAt: new Date(Date.now() - 3600000).toISOString(),
        executedBy: 'AutomatedSecurityResponseEngine',
        reversionSafe: true,
        auditTrail: 'Automated baseline observation logged successfully.',
      },
    ];
    this.actions.push(...seeds);
  }

  /**
   * Formulates and evaluates a defensive response action.
   * If level is CONTAIN, explicit human operator confirmation is required.
   */
  public triggerResponse(params: {
    threatEventId: string;
    level: ResponseLevel;
    actionType: SecurityResponseAction['actionType'];
    target: string;
    parameters: Record<string, any>;
  }): SecurityResponseAction {
    const actionId = `sact-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const requiresHuman = params.level === 'CONTAIN' || params.actionType === 'SUSPEND_AGENT';

    const action: SecurityResponseAction = {
      actionId,
      threatEventId: params.threatEventId,
      level: params.level,
      actionType: params.actionType,
      target: params.target,
      parameters: params.parameters,
      status: requiresHuman ? 'PENDING_APPROVAL' : 'EXECUTED',
      executedAt: requiresHuman ? undefined : new Date().toISOString(),
      executedBy: requiresHuman ? 'PendingHumanOperator' : 'AutomatedSecurityResponseEngine',
      reversionSafe: true,
      auditTrail: requiresHuman
        ? 'High-impact containment queued pending explicit human operator sign-off.'
        : `Defensive action "${params.actionType}" automatically applied to ${params.target}.`,
    };

    if (!requiresHuman) {
      this.executeAction(action);
    }

    this.actions.unshift(action);
    if (this.actions.length > 50) {
      this.actions.pop();
    }

    this.recordAudit(
      'SECURITY',
      action.status === 'EXECUTED' ? 'DEFENSE_APPLIED' : 'DEFENSE_PENDING_APPROVAL',
      action.executedBy,
      action.auditTrail,
      true
    );

    DistributedEventBus.getInstance().publish({
      eventType: 'SECURITY_DEFENSE_TRIGGERED',
      source: 'SecurityResponseEngine',
      priority: requiresHuman ? 'HIGH' : 'LOW',
      payload: action,
      suppressionFingerprint: `defense-${action.actionId}`,
    });

    this.notifyListeners();
    return action;
  }

  private executeAction(action: SecurityResponseAction): void {
    if (action.actionType === 'REVOKE_SESSION') {
      const sessionId = action.parameters.sessionId || action.target;
      ZeroTrustSecurityEngine.getInstance().revokeSession(sessionId, 'Automated defensive revocation');
    } else if (action.actionType === 'SUSPEND_AGENT') {
      AgentIdentitySecurityManager.getInstance().updateAgentStatus(action.target, 'SUSPENDED', action.executedBy);
    }
  }

  /**
   * Human operator approves or rejects pending containment action.
   */
  public approveAction(actionId: string, operatorName = 'Operator'): boolean {
    const action = this.actions.find((a) => a.actionId === actionId);
    if (!action || action.status !== 'PENDING_APPROVAL') return false;

    action.status = 'EXECUTED';
    action.executedAt = new Date().toISOString();
    action.executedBy = operatorName;
    action.auditTrail = `Containment action approved and executed by human operator "${operatorName}".`;

    this.executeAction(action);

    this.recordAudit('SECURITY', 'DEFENSE_APPROVED', operatorName, action.auditTrail, true);
    this.notifyListeners();
    return true;
  }

  public rejectAction(actionId: string, operatorName = 'Operator', reason = 'Operator denied'): boolean {
    const action = this.actions.find((a) => a.actionId === actionId);
    if (!action || action.status !== 'PENDING_APPROVAL') return false;

    action.status = 'REJECTED';
    action.executedAt = new Date().toISOString();
    action.executedBy = operatorName;
    action.auditTrail = `Containment action rejected by operator "${operatorName}": ${reason}`;

    this.recordAudit('SECURITY', 'DEFENSE_REJECTED', operatorName, action.auditTrail, false);
    this.notifyListeners();
    return true;
  }

  public getAllActions(): SecurityResponseAction[] {
    return [...this.actions];
  }

  public getPendingApprovals(): SecurityResponseAction[] {
    return this.actions.filter((a) => a.status === 'PENDING_APPROVAL');
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
      id: `audit-resp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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

  public subscribe(listener: (actions: SecurityResponseAction[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getAllActions());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const list = this.getAllActions();
    this.listeners.forEach((l) => l(list));
  }
}
