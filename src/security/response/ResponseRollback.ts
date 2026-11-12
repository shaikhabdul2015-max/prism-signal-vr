/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.3: Autonomous Threat Mitigation — Response Rollback Manager
 * Manages active mitigation lifecycles, automatic TTL expirations, and manual operator rollbacks.
 */

export interface ActiveMitigation {
  id: string;
  threatId: string;
  actionType: string;
  target: string;
  appliedAt: string;
  expiresAt: string;
  isRolledBack: boolean;
  rolledBackAt?: string;
  rolledBackBy?: string;
  rollbackReason?: string;
}

export class ResponseRollbackManager {
  private static instance: ResponseRollbackManager | null = null;
  private mitigations: Map<string, ActiveMitigation> = new Map();

  private constructor() {}

  public static getInstance(): ResponseRollbackManager {
    if (!ResponseRollbackManager.instance) {
      ResponseRollbackManager.instance = new ResponseRollbackManager();
    }
    return ResponseRollbackManager.instance;
  }

  public static resetInstance(): void {
    if (ResponseRollbackManager.instance) {
      ResponseRollbackManager.instance.mitigations.clear();
    }
    ResponseRollbackManager.instance = null;
  }

  public recordMitigation(
    threatId: string,
    actionType: string,
    target: string,
    durationSeconds = 600
  ): ActiveMitigation {
    const id = `mit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();
    const mit: ActiveMitigation = {
      id,
      threatId,
      actionType,
      target,
      appliedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + durationSeconds * 1000).toISOString(),
      isRolledBack: false,
    };
    this.mitigations.set(id, mit);
    return mit;
  }

  public isTargetMitigated(actionType: string, target: string): boolean {
    const now = new Date();
    for (const mit of this.mitigations.values()) {
      if (
        mit.actionType === actionType &&
        mit.target === target &&
        !mit.isRolledBack &&
        now < new Date(mit.expiresAt)
      ) {
        return true;
      }
    }
    return false;
  }

  public rollbackMitigation(mitigationId: string, operatorId: string, reason: string): boolean {
    const mit = this.mitigations.get(mitigationId);
    if (!mit || mit.isRolledBack) return false;

    mit.isRolledBack = true;
    mit.rolledBackAt = new Date().toISOString();
    mit.rolledBackBy = operatorId;
    mit.rollbackReason = reason;
    return true;
  }

  public rollbackTarget(target: string, operatorId: string, reason: string): number {
    let count = 0;
    for (const mit of this.mitigations.values()) {
      if (mit.target === target && !mit.isRolledBack) {
        this.rollbackMitigation(mit.id, operatorId, reason);
        count++;
      }
    }
    return count;
  }

  public getActiveMitigations(): ActiveMitigation[] {
    const now = new Date();
    return Array.from(this.mitigations.values()).filter(
      (m) => !m.isRolledBack && now < new Date(m.expiresAt)
    );
  }
}
