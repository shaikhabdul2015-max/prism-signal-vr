/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 23: Autonomous Operations Manager.
 * Orchestrates autonomous operational workflows across the 6 AI agents,
 * analyzes system health, resolves bottlenecks, executes safe low-risk operations,
 * gates high-impact actions through HumanApprovalManager, and enforces
 * bounded execution limits to prevent runaway automated processes.
 */

import { VRTelemetry } from '../types/diagnostics';
import { AgentRole } from '../types/phase17';
import {
  AgentTaskAssignment,
  AgentConflictEvent,
  MultiAgentConsensus,
  CommandImpactLevel,
} from '../types/phase23';
import { unifiedCommandCenter } from './UnifiedCommandCenter';
import { humanApprovalManager } from './HumanApprovalManager';
import { commandAuditService } from '../services/CommandAuditService';

export interface AutonomousOpsConfig {
  maxConsecutiveAutonomousActions: number;
  operationTimeoutMs: number;
  autonomousEnabled: boolean;
}

const DEFAULT_CONFIG: AutonomousOpsConfig = {
  maxConsecutiveAutonomousActions: 5,
  operationTimeoutMs: 15000,
  autonomousEnabled: true,
};

export class AutonomousOperationsManager {
  private static instance: AutonomousOperationsManager | null = null;
  private config: AutonomousOpsConfig = { ...DEFAULT_CONFIG };
  private consecutiveActionsCount = 0;
  private isPaused = false;
  private taskRegistry: Map<string, AgentTaskAssignment> = new Map();
  private conflictEvents: AgentConflictEvent[] = [];
  private consensusHistory: MultiAgentConsensus[] = [];
  private listeners: Set<() => void> = new Set();

  private constructor() {
    this.seedDefaultAgentState();
  }

  public static getInstance(): AutonomousOperationsManager {
    if (!AutonomousOperationsManager.instance) {
      AutonomousOperationsManager.instance = new AutonomousOperationsManager();
    }
    return AutonomousOperationsManager.instance;
  }

  public static resetInstance(): void {
    AutonomousOperationsManager.instance = null;
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    callback();
    return () => this.listeners.delete(callback);
  }

  private notify(): void {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('[AutonomousOperationsManager] listener error:', err);
      }
    });
  }

  public getConfig(): AutonomousOpsConfig {
    return { ...this.config };
  }

  public setConfig(newConfig: Partial<AutonomousOpsConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.notify();
  }

  public isExecutionPaused(): boolean {
    return this.isPaused;
  }

  public pauseOperations(): void {
    this.isPaused = true;
    commandAuditService.recordEntry({
      eventType: 'OPERATOR_OVERRIDE',
      actor: 'OPERATOR',
      details: 'Autonomous operations paused by operator.',
      impactLevel: 'LOW',
    });
    this.notify();
  }

  public resumeOperations(): void {
    this.isPaused = false;
    this.consecutiveActionsCount = 0;
    commandAuditService.recordEntry({
      eventType: 'OPERATOR_OVERRIDE',
      actor: 'OPERATOR',
      details: 'Autonomous operations resumed by operator.',
      impactLevel: 'LOW',
    });
    this.notify();
  }

  public resetActionCounter(): void {
    this.consecutiveActionsCount = 0;
    this.notify();
  }

  /**
   * Analyzes system telemetry and identifies bottlenecks.
   */
  public analyzeBottlenecks(telemetry?: VRTelemetry): {
    bottlenecks: string[];
    recommendedActions: Array<{
      title: string;
      targetModule: string;
      agent: AgentRole;
      impact: CommandImpactLevel;
      actionSummary: string;
    }>;
  } {
    const bottlenecks: string[] = [];
    const recommendedActions: Array<{
      title: string;
      targetModule: string;
      agent: AgentRole;
      impact: CommandImpactLevel;
      actionSummary: string;
    }> = [];

    const frames = telemetry?.frames || [];
    const joints = telemetry?.joints || [];
    const currentFps = frames[0]?.frameDurationMs ? Math.round(1000 / frames[0].frameDurationMs) : 72;
    const trackedJoints = joints.length > 0 ? joints.filter((j) => j.tracked).length : 25;
    const latency = telemetry?.latencySamples?.[0]?.latencyMs || 14;

    if (currentFps < 60) {
      bottlenecks.push(`Display frame cadence degradation: ${currentFps} FPS.`);
      recommendedActions.push({
        title: 'Dynamic Foveated Rendering Clamp',
        targetModule: 'mod-core-telemetry',
        agent: 'PerformanceAgent',
        impact: 'HIGH',
        actionSummary: 'Clamp MSAA to 2x and activate high foveation level.',
      });
    }

    if (trackedJoints < 18) {
      bottlenecks.push(`Optical skeleton tracking occlusion: ${trackedJoints}/25 joints.`);
      recommendedActions.push({
        title: 'Switch to Kalman Inertial Dead-Reckoning',
        targetModule: 'mod-core-telemetry',
        agent: 'TrackingAgent',
        impact: 'MEDIUM',
        actionSummary: 'Compensate optical dropout with high-frequency IMU sensor fusion.',
      });
    }

    if (latency > 50) {
      bottlenecks.push(`Network round-trip latency spike: ${latency.toFixed(1)}ms.`);
      recommendedActions.push({
        title: 'Spool Offline Telemetry Buffer',
        targetModule: 'mod-cloud-infra',
        agent: 'OperationsAgent',
        impact: 'LOW',
        actionSummary: 'Route pending packets into local storage ring-buffer.',
      });
    }

    // Default preventive maintenance if no acute bottlenecks
    if (recommendedActions.length === 0) {
      recommendedActions.push({
        title: 'Autonomous Telemetry Calibration Check',
        targetModule: 'mod-core-telemetry',
        agent: 'OperationsAgent',
        impact: 'LOW',
        actionSummary: 'Sample background sensor jitter to maintain running calibration baseline.',
      });
    }

    return { bottlenecks, recommendedActions };
  }

  /**
   * Executes or queues a recommended operation according to risk level and approval gates.
   */
  public executeOperation(params: {
    title: string;
    targetModule: string;
    agent: AgentRole;
    impact: CommandImpactLevel;
    actionSummary: string;
  }): { executed: boolean; requiresApproval: boolean; approvalId?: string; reason?: string } {
    if (this.isPaused) {
      return { executed: false, requiresApproval: false, reason: 'Operations currently paused.' };
    }

    // Check bounded execution limit
    if (this.consecutiveActionsCount >= this.config.maxConsecutiveAutonomousActions) {
      return {
        executed: false,
        requiresApproval: true,
        reason: `Reached limit of ${this.config.maxConsecutiveAutonomousActions} autonomous actions. Operator confirmation required to reset counter.`,
      };
    }

    // High or Critical impact MUST require operator authorization
    if (params.impact === 'HIGH' || params.impact === 'CRITICAL') {
      const approval = humanApprovalManager.createApprovalRequest({
        commandId: `cmd-op-${Date.now().toString(36)}`,
        commandName: params.title,
        actionSummary: params.actionSummary,
        initiator: params.agent,
        targetModule: params.targetModule,
        impactLevel: params.impact,
        justification: `Autonomous operations manager flagged high-impact bottleneck resolution.`,
        riskAssessmentSummary: `Impact level: ${params.impact}. Requires human-in-the-loop authorization before execution.`,
      });

      unifiedCommandCenter.dispatchCommand({
        commandName: params.title,
        targetModuleId: params.targetModule,
        initiator: params.agent,
        parameters: { actionSummary: params.actionSummary },
        impactLevel: params.impact,
        requiresApproval: true,
        approvalId: approval.approvalId,
      });

      this.notify();
      return { executed: false, requiresApproval: true, approvalId: approval.approvalId };
    }

    // Low and Medium operations execute autonomously
    this.consecutiveActionsCount += 1;
    const cmd = unifiedCommandCenter.dispatchCommand({
      commandName: params.title,
      targetModuleId: params.targetModule,
      initiator: params.agent,
      parameters: { actionSummary: params.actionSummary },
      impactLevel: params.impact,
      requiresApproval: false,
    });

    this.assignTaskToAgent({
      commandId: cmd.commandId,
      agent: params.agent,
      title: params.title,
      priority: 'MEDIUM',
    });

    this.notify();
    return { executed: true, requiresApproval: false };
  }

  /**
   * Assigns a command task to one of the six specialist agents.
   */
  public assignTaskToAgent(params: {
    commandId: string;
    agent: AgentRole;
    title: string;
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  }): AgentTaskAssignment {
    const assignmentId = `asgn-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();

    const assignment: AgentTaskAssignment = {
      assignmentId,
      agent: params.agent,
      commandId: params.commandId,
      title: params.title,
      priority: params.priority,
      status: 'ASSIGNED',
      assignedAt: now,
      evidence: [`Assigned based on role specialization for ${params.agent}.`],
    };

    this.taskRegistry.set(assignmentId, assignment);

    commandAuditService.recordEntry({
      eventType: 'COMMAND_DISPATCHED',
      actor: params.agent,
      commandId: params.commandId,
      details: `Task "${params.title}" assigned to ${params.agent}.`,
      impactLevel: 'LOW',
    });

    this.notify();
    return assignment;
  }

  public getAgentTasks(): AgentTaskAssignment[] {
    return Array.from(this.taskRegistry.values());
  }

  public getConflicts(): AgentConflictEvent[] {
    return [...this.conflictEvents];
  }

  public getConsensusHistory(): MultiAgentConsensus[] {
    return [...this.consensusHistory];
  }

  /**
   * Detects and records conflicts between specialist directives.
   */
  public resolveConflict(
    agents: AgentRole[],
    directives: string[],
    strategy: AgentConflictEvent['resolutionStrategy']
  ): AgentConflictEvent {
    const conflictId = `cfl-${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    const winningDirective =
      strategy === 'PRIORITY_OVERRIDE'
        ? directives[0] || 'Prioritize system stability'
        : 'Synthesized consensus compromise';

    const event: AgentConflictEvent = {
      conflictId,
      involvedAgents: agents,
      conflictingDirectives: directives,
      detectedAt: now,
      resolutionStrategy: strategy,
      winningDirective,
      resolvedAt: now,
      isResolved: true,
    };

    this.conflictEvents.unshift(event);
    if (this.conflictEvents.length > 20) this.conflictEvents.pop();

    commandAuditService.recordEntry({
      eventType: 'COMMAND_DISPATCHED',
      actor: agents[0] || 'OperationsAgent',
      details: `Conflict between [${agents.join(', ')}] resolved via ${strategy}: "${winningDirective}".`,
      impactLevel: 'MEDIUM',
    });

    this.notify();
    return event;
  }

  private seedDefaultAgentState(): void {
    const now = new Date().toISOString();

    const initialConsensus: MultiAgentConsensus = {
      consensusId: 'cns-seed-01',
      topic: 'Optimal Frame Rate and Foveation Profile',
      consensusScore: 0.94,
      participatingAgents: [
        'OperationsAgent',
        'TestAgent',
        'TrackingAgent',
        'PerformanceAgent',
        'IncidentAgent',
        'ChiefIntelligenceAgent',
      ],
      unanimous: true,
      recommendation: 'Maintain standard 72Hz refresh with low-latency optical sensor polling.',
      explanation: 'Verified nominal thermal baseline and full 25-joint skeleton tracking confidence.',
      timestamp: now,
    };

    this.consensusHistory.push(initialConsensus);
  }
}

export const autonomousOperationsManager = AutonomousOperationsManager.getInstance();
