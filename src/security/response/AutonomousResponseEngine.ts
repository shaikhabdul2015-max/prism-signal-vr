/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.3: Autonomous Threat Mitigation — Autonomous Response Engine
 * Coordinates response policy evaluation, emergency kill-switch gates,
 * human approval workflows, and idempotent mitigation execution.
 */

import { ThreatEvent } from '../threat-detection/ThreatEvent';
import { ResponsePolicy, ResponseActionPlan } from './ResponsePolicy';
import { EmergencyKillSwitch } from './EmergencyKillSwitch';
import { ResponseApprovalManager } from './ResponseApproval';
import { ResponseExecutor, ExecutionResult } from './ResponseExecutor';
import { AdaptiveRateLimiter } from '../rate-limiting/AdaptiveRateLimiter';

export interface AutonomousResponseReport {
  threatId: string;
  responseLevel: number;
  levelName: string;
  isKillSwitchEngaged: boolean;
  executedActions: ExecutionResult[];
  pendingApprovalId?: string;
  status: 'EXECUTED' | 'FROZEN_BY_KILL_SWITCH' | 'PENDING_HUMAN_APPROVAL';
  timestamp: string;
}

export class AutonomousResponseEngine {
  private static instance: AutonomousResponseEngine | null = null;

  private constructor() {}

  public static getInstance(): AutonomousResponseEngine {
    if (!AutonomousResponseEngine.instance) {
      AutonomousResponseEngine.instance = new AutonomousResponseEngine();
    }
    return AutonomousResponseEngine.instance;
  }

  public static resetInstance(): void {
    EmergencyKillSwitch.resetInstance();
    ResponseApprovalManager.resetInstance();
    ResponseExecutor.reset();
    AutonomousResponseEngine.instance = null;
  }

  /**
   * Responds to an ingested ThreatEvent according to security policy.
   */
  public async respondToThreat(threat: ThreatEvent): Promise<AutonomousResponseReport> {
    const timestamp = new Date().toISOString();
    const killSwitch = EmergencyKillSwitch.getInstance();

    // 1. Safety Gate: Check Emergency Kill Switch
    if (killSwitch.isKillSwitchActive()) {
      return {
        threatId: threat.id,
        responseLevel: 0,
        levelName: 'INFORMATIONAL',
        isKillSwitchEngaged: true,
        executedActions: [],
        status: 'FROZEN_BY_KILL_SWITCH',
        timestamp,
      };
    }

    // 2. Evaluate Policy
    const plan: ResponseActionPlan = ResponsePolicy.evaluatePolicy(
      threat.category,
      threat.severity,
      threat.riskScore
    );

    const executedActions: ExecutionResult[] = [];
    let pendingApprovalId: string | undefined;

    // 3. Rate limiting action
    if (plan.actions.includes('APPLY_RATE_LIMIT') && threat.sourceIp) {
      try {
        const rateLimiter = AdaptiveRateLimiter.getInstance();
        const tier = threat.severity === 'CRITICAL' || threat.severity === 'HIGH' ? 'LOCKDOWN' : 'SUSPICIOUS';
        rateLimiter.elevatePenalty(threat.sourceIp, tier);
        executedActions.push({
          action: 'APPLY_RATE_LIMIT',
          target: threat.sourceIp,
          success: true,
          details: { tier },
        });
      } catch {
        // Safe degraded mode
      }
    }

    // 4. Session step-up
    if (plan.actions.includes('REQUIRE_STEP_UP_AUTH') && threat.sessionId) {
      const res = ResponseExecutor.requireStepUpAuth(threat.sessionId, threat.id, plan.durationSeconds);
      executedActions.push(res);
    }

    // 5. Session revocation
    if (plan.actions.includes('REVOKE_SESSION') && threat.sessionId) {
      const res = ResponseExecutor.revokeSession(threat.sessionId, threat.id);
      executedActions.push(res);
    }

    // 6. Temporary IP quarantine
    if (plan.actions.includes('QUARANTINE_IP_TEMP') && threat.sourceIp) {
      const res = ResponseExecutor.quarantineIp(threat.sourceIp, threat.id, plan.durationSeconds);
      executedActions.push(res);
    }

    // 7. Human approval gate for critical actions
    if (plan.requiresHumanApproval) {
      const approvalMgr = ResponseApprovalManager.getInstance();
      const approvalReq = approvalMgr.createApprovalRequest(
        threat.id,
        'CRITICAL_INFRASTRUCTURE_CONTAINMENT',
        threat.sourceIp,
        `Threat ${threat.category} (Score: ${threat.riskScore}) triggered Level 4 policy.`
      );
      pendingApprovalId = approvalReq.id;

      return {
        threatId: threat.id,
        responseLevel: plan.level,
        levelName: plan.levelName,
        isKillSwitchEngaged: false,
        executedActions,
        pendingApprovalId,
        status: 'PENDING_HUMAN_APPROVAL',
        timestamp,
      };
    }

    return {
      threatId: threat.id,
      responseLevel: plan.level,
      levelName: plan.levelName,
      isKillSwitchEngaged: false,
      executedActions,
      status: 'EXECUTED',
      timestamp,
    };
  }
}
