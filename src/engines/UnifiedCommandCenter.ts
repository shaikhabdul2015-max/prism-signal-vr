/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 23: Unified Command Center Engine.
 * Central coordinator and module registry for PRISM SIGNAL.
 * Aggregates operational status across all system modules,
 * tracks health heartbeats, coordinates cross-module events,
 * and maintains a centralized command execution history.
 */

import {
  RegisteredModule,
  ModuleHealthStatus,
  CommandExecutionRecord,
  CommandImpactLevel,
} from '../types/phase23';
import { AgentRole } from '../types/phase17';
import { commandAuditService } from '../services/CommandAuditService';

export class UnifiedCommandCenter {
  private static instance: UnifiedCommandCenter | null = null;
  private modules: Map<string, RegisteredModule> = new Map();
  private commandHistory: CommandExecutionRecord[] = [];
  private listeners: Set<() => void> = new Set();

  private constructor() {
    this.registerDefaultModules();
  }

  public static getInstance(): UnifiedCommandCenter {
    if (!UnifiedCommandCenter.instance) {
      UnifiedCommandCenter.instance = new UnifiedCommandCenter();
    }
    return UnifiedCommandCenter.instance;
  }

  public static resetInstance(): void {
    UnifiedCommandCenter.instance = null;
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
        console.error('[UnifiedCommandCenter] listener error:', err);
      }
    });
  }

  /**
   * Registers a system module in the centralized registry.
   */
  public registerModule(module: RegisteredModule): void {
    this.modules.set(module.moduleId, {
      ...module,
      lastHeartbeat: new Date().toISOString(),
    });
    this.notify();
  }

  public unregisterModule(moduleId: string): boolean {
    const deleted = this.modules.delete(moduleId);
    if (deleted) this.notify();
    return deleted;
  }

  public getRegisteredModules(): RegisteredModule[] {
    return Array.from(this.modules.values());
  }

  public getModule(moduleId: string): RegisteredModule | undefined {
    return this.modules.get(moduleId);
  }

  /**
   * Updates health status and heartbeat for a registered module.
   */
  public updateModuleHealth(
    moduleId: string,
    status: ModuleHealthStatus,
    latencyMs?: number,
    metrics?: Record<string, string | number | boolean>
  ): void {
    const mod = this.modules.get(moduleId);
    if (!mod) return;

    mod.status = status;
    mod.lastHeartbeat = new Date().toISOString();
    if (latencyMs !== undefined) mod.latencyMs = latencyMs;
    if (metrics) mod.metrics = { ...mod.metrics, ...metrics };

    this.notify();
  }

  /**
   * Computes unified operational status across all registered modules.
   */
  public getUnifiedOperationalStatus(): {
    overallStatus: 'OPTIMAL' | 'DEGRADED' | 'CRITICAL';
    healthyCount: number;
    degradedCount: number;
    criticalCount: number;
    offlineCount: number;
  } {
    const list = this.getRegisteredModules();
    let healthyCount = 0;
    let degradedCount = 0;
    let criticalCount = 0;
    let offlineCount = 0;

    list.forEach((m) => {
      if (m.status === 'HEALTHY') healthyCount++;
      else if (m.status === 'DEGRADED') degradedCount++;
      else if (m.status === 'CRITICAL') criticalCount++;
      else if (m.status === 'OFFLINE') offlineCount++;
    });

    let overallStatus: 'OPTIMAL' | 'DEGRADED' | 'CRITICAL' = 'OPTIMAL';
    if (criticalCount > 0 || offlineCount > 0) {
      overallStatus = 'CRITICAL';
    } else if (degradedCount > 0) {
      overallStatus = 'DEGRADED';
    }

    return {
      overallStatus,
      healthyCount,
      degradedCount,
      criticalCount,
      offlineCount,
    };
  }

  /**
   * Dispatches a command to a target module and records execution history.
   */
  public dispatchCommand(params: {
    commandName: string;
    targetModuleId: string;
    initiator: AgentRole | 'OPERATOR' | 'AUTONOMOUS_OPERATIONS_MANAGER';
    parameters: Record<string, unknown>;
    impactLevel: CommandImpactLevel;
    requiresApproval: boolean;
    approvalId?: string;
  }): CommandExecutionRecord {
    const commandId = `cmd-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();

    const record: CommandExecutionRecord = {
      commandId,
      commandName: params.commandName,
      targetModuleId: params.targetModuleId,
      initiator: params.initiator,
      parameters: params.parameters,
      impactLevel: params.impactLevel,
      status: params.requiresApproval ? 'PENDING_APPROVAL' : 'EXECUTING',
      requiresApproval: params.requiresApproval,
      approvalId: params.approvalId,
      dispatchedAt: now,
      retryCount: 0,
      maxRetries: 3,
    };

    this.commandHistory.unshift(record);
    if (this.commandHistory.length > 100) {
      this.commandHistory.pop();
    }

    commandAuditService.recordEntry({
      eventType: 'COMMAND_DISPATCHED',
      actor: params.initiator,
      commandId,
      approvalId: params.approvalId,
      details: `Command "${params.commandName}" dispatched to module ${params.targetModuleId}. Requires approval: ${params.requiresApproval}`,
      impactLevel: params.impactLevel,
    });

    // If no approval is required, simulate immediate successful execution
    if (!params.requiresApproval) {
      record.status = 'SUCCESS';
      record.completedAt = new Date().toISOString();
      record.resultSummary = `Executed successfully by module ${params.targetModuleId}.`;
    }

    this.notify();
    return record;
  }

  public completeCommand(
    commandId: string,
    success: boolean,
    summary: string,
    errorMessage?: string
  ): void {
    const cmd = this.commandHistory.find((c) => c.commandId === commandId);
    if (!cmd) return;

    cmd.status = success ? 'SUCCESS' : 'FAILED';
    cmd.completedAt = new Date().toISOString();
    cmd.resultSummary = summary;
    if (errorMessage) cmd.errorMessage = errorMessage;

    commandAuditService.recordEntry({
      eventType: success ? 'EXECUTION_SUCCESS' : 'EXECUTION_FAILED',
      actor: cmd.initiator,
      commandId,
      approvalId: cmd.approvalId,
      details: `Command ${commandId} finished: ${summary}${errorMessage ? ` (${errorMessage})` : ''}`,
      impactLevel: cmd.impactLevel,
    });

    this.notify();
  }

  public getCommandHistory(): CommandExecutionRecord[] {
    return [...this.commandHistory];
  }

  /**
   * Registers default Phase 1-22 modules.
   */
  private registerDefaultModules(): void {
    const now = new Date().toISOString();

    const defaultModules: RegisteredModule[] = [
      {
        moduleId: 'mod-core-telemetry',
        name: 'WebXR Core Telemetry Engine',
        category: 'CORE_TELEMETRY',
        version: '22.0.0',
        status: 'HEALTHY',
        lastHeartbeat: now,
        latencyMs: 1.2,
        activeWorkloads: 1,
        capabilities: ['25_joint_skeleton', 'cadence_profiling', 'latency_sampling'],
      },
      {
        moduleId: 'mod-ai-intelligence',
        name: 'Collective Multi-Agent Intelligence',
        category: 'AI_INTELLIGENCE',
        version: '22.0.0',
        status: 'HEALTHY',
        lastHeartbeat: now,
        latencyMs: 3.5,
        activeWorkloads: 6,
        capabilities: ['agent_coordination', 'self_healing', 'root_cause_analysis'],
      },
      {
        moduleId: 'mod-digital-twin',
        name: 'Digital Twin Platform & Simulation Lab',
        category: 'DIGITAL_TWIN',
        version: '21.0.0',
        status: 'HEALTHY',
        lastHeartbeat: now,
        latencyMs: 2.1,
        activeWorkloads: 0,
        capabilities: ['chamber_mirroring', 'multi_horizon_forecasting', 'stress_simulation'],
      },
      {
        moduleId: 'mod-mission-planning',
        name: 'Autonomous Mission Planning Engine',
        category: 'MISSION_PLANNING',
        version: '22.0.0',
        status: 'HEALTHY',
        lastHeartbeat: now,
        latencyMs: 2.8,
        activeWorkloads: 1,
        capabilities: ['task_decomposition', 'dynamic_adaptation', 'risk_assessment'],
      },
      {
        moduleId: 'mod-security-rbac',
        name: 'Enterprise Security & RBAC Guard',
        category: 'SECURITY_RBAC',
        version: '19.5.0',
        status: 'HEALTHY',
        lastHeartbeat: now,
        latencyMs: 0.8,
        activeWorkloads: 0,
        capabilities: ['jwt_verification', 'role_isolation', 'tamper_evident_audit'],
      },
      {
        moduleId: 'mod-cloud-infra',
        name: 'Cloud Firestore & Offline Queue Engine',
        category: 'CLOUD_INFRASTRUCTURE',
        version: '19.5.0',
        status: 'HEALTHY',
        lastHeartbeat: now,
        latencyMs: 14.5,
        activeWorkloads: 0,
        capabilities: ['offline_buffering', 'exponential_backoff', 'quarantine_recovery'],
      },
      {
        moduleId: 'mod-orchestration',
        name: 'Automated Test Orchestrator & Incident Manager',
        category: 'ORCHESTRATION',
        version: '17.0.0',
        status: 'HEALTHY',
        lastHeartbeat: now,
        latencyMs: 1.9,
        activeWorkloads: 0,
        capabilities: ['scenario_execution', 'incident_deduplication', 'timeline_capture'],
      },
    ];

    defaultModules.forEach((m) => this.modules.set(m.moduleId, m));
  }
}

export const unifiedCommandCenter = UnifiedCommandCenter.getInstance();
