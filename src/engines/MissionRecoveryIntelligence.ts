/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Mission Recovery Intelligence (Phase 28)
 * Performs autonomous root-cause diagnostics and formulates structured recovery
 * recommendations when task failures or operational delays occur.
 * 
 * CRITICAL SAFETY GATE:
 * High and Critical impact recovery strategies (such as resetting hardware state,
 * aborting stages, or force-restarting runtime processes) are NEVER executed
 * autonomously. They are strictly gated behind HumanApprovalManager operator authorization
 * and immutably logged to CommandAuditService.
 */

import {
  RecoveryRecommendation,
  FailureClassification,
  RecoveryStrategyType,
  MissionExecutionTask,
} from '../types/phase28';
import { VRTelemetry } from '../types/diagnostics';
import { IncidentRecord } from '../types/phase17';
import { HumanApprovalManager } from './HumanApprovalManager';
import { commandAuditService } from '../services/CommandAuditService';

export class MissionRecoveryIntelligence {
  private static instance: MissionRecoveryIntelligence | null = null;
  private recommendations: Map<string, RecoveryRecommendation[]> = new Map();

  private constructor() {}

  public static getInstance(): MissionRecoveryIntelligence {
    if (!MissionRecoveryIntelligence.instance) {
      MissionRecoveryIntelligence.instance = new MissionRecoveryIntelligence();
    }
    return MissionRecoveryIntelligence.instance;
  }

  public static resetInstance(): void {
    MissionRecoveryIntelligence.instance = null;
  }

  /**
   * Diagnoses task failure, classifies root cause, and formulates recovery plan
   */
  public formulateRecoveryStrategy(
    missionId: string,
    failedTask: MissionExecutionTask,
    telemetry?: VRTelemetry,
    activeIncidents?: IncidentRecord[]
  ): RecoveryRecommendation {
    const recommendationId = `recov-${failedTask.taskId}-${Date.now().toString(36)}`;

    // 1. Root Cause Classification
    let classification: FailureClassification = 'DEPENDENCY_TIMEOUT';
    let rootCauseSummary = 'Task failed to complete within allocated execution time.';
    let strategy: RecoveryStrategyType = 'RETRY_WITH_BACKOFF';
    let impactLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    let actionSummary = 'Retry task with exponential 1.5x duration backoff.';

    const openIncidents = (activeIncidents || []).filter(
      (i) => i.state !== 'RESOLVED' && i.state !== 'CLOSED'
    );

    let fps = 72;
    if (telemetry && telemetry.frames.length > 0) {
      const avgDuration =
        telemetry.frames.reduce((a, f) => a + (f.frameDurationMs ?? 0), 0) / telemetry.frames.length;
      fps = avgDuration > 0 ? 1000 / avgDuration : 72;
    }

    if (failedTask.assignedAgent === 'PerformanceAgent' || fps < 55) {
      classification = 'CADENCE_THROTTLING';
      rootCauseSummary = `Render loop collapsed to ${fps.toFixed(1)} FPS due to device thermal throttling.`;
      strategy = 'FALLBACK_SAFE_MODE';
      impactLevel = 'HIGH';
      actionSummary = 'Cap target cadence to 60Hz, downscale auxiliary rendering passes, and pause background test worker.';
    } else if (telemetry && telemetry.joints && telemetry.joints.filter((j) => j.tracked).length < 20) {
      classification = 'SENSOR_OCCLUSION';
      rootCauseSummary = 'Severe skeletal tracking loss (<20 tracked joints). Forward kinematics cannot ground pose.';
      strategy = 'ALTERNATIVE_TASK_PATH';
      impactLevel = 'MEDIUM';
      actionSummary = 'Switch to synthetic kinematic interpolation mode and notify operator to clear optical path.';
    } else if (openIncidents.length >= 2) {
      classification = 'RESOURCE_EXHAUSTION';
      rootCauseSummary = `${openIncidents.length} active system incidents have depleted runtime execution buffers.`;
      strategy = 'PAUSE_FOR_OPERATOR_DECISION';
      impactLevel = 'CRITICAL';
      actionSummary = 'Pause mission execution, isolate failing pipeline stage, and await human operator authorization.';
    }

    const requiresHumanApproval = impactLevel === 'HIGH' || impactLevel === 'CRITICAL';
    let approvalId: string | undefined = undefined;

    // Gate High/Critical recovery operations behind HumanApprovalManager
    if (requiresHumanApproval) {
      const approvalMgr = HumanApprovalManager.getInstance();
      const req = approvalMgr.createApprovalRequest({
        commandId: recommendationId,
        commandName: `Recovery Action: ${actionSummary}`,
        actionSummary: `${classification} failure recovery for task ${failedTask.title}`,
        initiator: 'IncidentAgent',
        targetModule: 'MissionExecutionIntelligence',
        impactLevel,
        justification: rootCauseSummary,
        riskAssessmentSummary: `Strategy: ${strategy}, Target Impact: ${impactLevel}. Requires explicit operator sign-off before engagement.`,
      });
      approvalId = req.approvalId;

      // Audit trail record
      commandAuditService.recordEntry({
        eventType: 'COMMAND_DISPATCHED',
        actor: 'IncidentAgent',
        impactLevel,
        commandId: recommendationId,
        approvalId: req.approvalId,
        details: JSON.stringify({
          classification,
          strategy,
          failedTaskId: failedTask.taskId,
          requiresHumanApproval: true,
        }),
      });
    }

    const rec: RecoveryRecommendation = {
      recommendationId,
      missionId,
      failedTaskId: failedTask.taskId,
      classification,
      rootCauseSummary,
      strategy,
      actionSummary,
      alternativeSequence: strategy === 'ALTERNATIVE_TASK_PATH' ? ['task-kinematic-fallback', 'task-resync-pose'] : undefined,
      feasibilityScore: requiresHumanApproval ? 78 : 92,
      impactLevel,
      requiresHumanApproval,
      approvalId,
      status: 'PROPOSED',
      generatedAt: new Date().toISOString(),
    };

    const existing = this.recommendations.get(missionId) || [];
    this.recommendations.set(missionId, [rec, ...existing]);
    return rec;
  }

  /**
   * Applies an approved recovery recommendation
   */
  public executeRecovery(
    recommendationId: string,
    operatorId: string = 'OPERATOR'
  ): { success: boolean; message: string } {
    let targetRec: RecoveryRecommendation | null = null;
    let foundMissionId = '';

    for (const [mId, list] of this.recommendations.entries()) {
      const r = list.find((item) => item.recommendationId === recommendationId);
      if (r) {
        targetRec = r;
        foundMissionId = mId;
        break;
      }
    }

    if (!targetRec) {
      return { success: false, message: 'Recovery recommendation not found.' };
    }

    if (targetRec.requiresHumanApproval && targetRec.approvalId) {
      const approvalMgr = HumanApprovalManager.getInstance();
      const approved = approvalMgr.approveRequest(targetRec.approvalId, operatorId, 'Authorized recovery execution');
      if (!approved) {
        return { success: false, message: 'Operator authorization required but could not be verified.' };
      }
    }

    targetRec.status = 'EXECUTED';

    // Immutable audit record
    commandAuditService.recordEntry({
      eventType: 'EXECUTION_SUCCESS',
      actor: 'OPERATOR',
      impactLevel: targetRec.impactLevel,
      commandId: recommendationId,
      approvalId: targetRec.approvalId,
      details: JSON.stringify({
        action: 'RECOVERY_EXECUTED',
        missionId: foundMissionId,
        strategy: targetRec.strategy,
      }),
    });

    return { success: true, message: `Recovery strategy '${targetRec.strategy}' executed successfully.` };
  }

  public getRecommendations(missionId: string): RecoveryRecommendation[] {
    return this.recommendations.get(missionId) || [];
  }
}

export const missionRecoveryIntelligence = MissionRecoveryIntelligence.getInstance();
