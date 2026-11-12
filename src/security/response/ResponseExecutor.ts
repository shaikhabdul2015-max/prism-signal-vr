/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.3: Autonomous Threat Mitigation — Response Executor
 * Carries out concrete mitigation actions idempotently and non-destructively.
 */

import { ResponseRollbackManager } from './ResponseRollback';
import { DistributedEventBus } from '../../engines/DistributedEventBus';
import { EnterpriseObservabilityManager } from '../../engines/EnterpriseObservabilityManager';

export interface ExecutionResult {
  action: string;
  target: string;
  success: boolean;
  mitigationId?: string;
  details?: Record<string, unknown>;
}

export class ResponseExecutor {
  private static quarantinedIps: Set<string> = new Set();
  private static revokedSessions: Set<string> = new Set();
  private static stepUpSessions: Set<string> = new Set();
  private static isolatedComponents: Set<string> = new Set();

  public static reset(): void {
    this.quarantinedIps.clear();
    this.revokedSessions.clear();
    this.stepUpSessions.clear();
    this.isolatedComponents.clear();
  }

  public static isIpQuarantined(ip: string): boolean {
    const rollback = ResponseRollbackManager.getInstance();
    if (!rollback.isTargetMitigated('QUARANTINE_IP_TEMP', ip)) {
      this.quarantinedIps.delete(ip);
      return false;
    }
    return this.quarantinedIps.has(ip);
  }

  public static isSessionRevoked(sessionId: string): boolean {
    return this.revokedSessions.has(sessionId);
  }

  public static isStepUpRequired(sessionId: string): boolean {
    const rollback = ResponseRollbackManager.getInstance();
    if (!rollback.isTargetMitigated('REQUIRE_STEP_UP_AUTH', sessionId)) {
      this.stepUpSessions.delete(sessionId);
      return false;
    }
    return this.stepUpSessions.has(sessionId);
  }

  public static isComponentIsolated(componentName: string): boolean {
    const rollback = ResponseRollbackManager.getInstance();
    if (!rollback.isTargetMitigated('ISOLATE_COMPONENT', componentName)) {
      this.isolatedComponents.delete(componentName);
      return false;
    }
    return this.isolatedComponents.has(componentName);
  }

  /**
   * Executes a temporary IP quarantine.
   */
  public static quarantineIp(ip: string, threatId: string, durationSeconds = 1800): ExecutionResult {
    this.quarantinedIps.add(ip);
    const rollback = ResponseRollbackManager.getInstance();
    const mit = rollback.recordMitigation(threatId, 'QUARANTINE_IP_TEMP', ip, durationSeconds);

    this.logAction('QUARANTINE_IP_TEMP', ip, threatId, durationSeconds);
    return { action: 'QUARANTINE_IP_TEMP', target: ip, success: true, mitigationId: mit.id };
  }

  /**
   * Revokes an active session.
   */
  public static revokeSession(sessionId: string, threatId: string): ExecutionResult {
    this.revokedSessions.add(sessionId);
    const rollback = ResponseRollbackManager.getInstance();
    const mit = rollback.recordMitigation(threatId, 'REVOKE_SESSION', sessionId, 86400);

    this.logAction('REVOKE_SESSION', sessionId, threatId, 86400);
    return { action: 'REVOKE_SESSION', target: sessionId, success: true, mitigationId: mit.id };
  }

  /**
   * Flags a session as requiring step-up authentication.
   */
  public static requireStepUpAuth(sessionId: string, threatId: string, durationSeconds = 600): ExecutionResult {
    this.stepUpSessions.add(sessionId);
    const rollback = ResponseRollbackManager.getInstance();
    const mit = rollback.recordMitigation(threatId, 'REQUIRE_STEP_UP_AUTH', sessionId, durationSeconds);

    this.logAction('REQUIRE_STEP_UP_AUTH', sessionId, threatId, durationSeconds);
    return { action: 'REQUIRE_STEP_UP_AUTH', target: sessionId, success: true, mitigationId: mit.id };
  }

  /**
   * Isolates an application subsystem component (degraded mode).
   */
  public static isolateComponent(componentName: string, threatId: string, durationSeconds = 3600): ExecutionResult {
    this.isolatedComponents.add(componentName);
    const rollback = ResponseRollbackManager.getInstance();
    const mit = rollback.recordMitigation(threatId, 'ISOLATE_COMPONENT', componentName, durationSeconds);

    this.logAction('ISOLATE_COMPONENT', componentName, threatId, durationSeconds);
    return { action: 'ISOLATE_COMPONENT', target: componentName, success: true, mitigationId: mit.id };
  }

  private static logAction(action: string, target: string, threatId: string, duration: number): void {
    try {
      const obs = EnterpriseObservabilityManager.getInstance();
      obs.log({
        level: 'WARN',
        service: 'ResponseExecutor',
        message: `[AUTONOMOUS_ACTION_EXECUTED] ${action} on ${target} for threat ${threatId} (TTL: ${duration}s)`,
        metadata: { action, target, threatId, durationSeconds: duration },
      });

      const eventBus = DistributedEventBus.getInstance();
      eventBus.publish({
        eventType: 'SECURITY_EVENT' as any,
        source: 'ResponseExecutor',
        priority: 'HIGH',
        payload: { action, target, threatId, durationSeconds: duration },
        suppressionFingerprint: `action_${action}_${target}`,
      });
    } catch {
      // Non-blocking
    }
  }
}
