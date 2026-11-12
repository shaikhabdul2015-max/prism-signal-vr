/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Unified Intelligence Orchestrator (Phase 36)
 * Central orchestration layer connecting all existing intelligence domains:
 * Strategic Intelligence, Mission Research & Execution, Advanced WebXR, Sensor Intelligence,
 * Distributed AI, Zero-Trust Security, Predictive Intelligence, Autonomous Optimization,
 * and the Universal Knowledge Network.
 */

import {
  EngineRegistrationDescriptor,
  CrossEngineTaskRecord,
} from '../types/phase36';

export class UnifiedIntelligenceOrchestrator {
  private static instance: UnifiedIntelligenceOrchestrator | null = null;
  private engines: Map<string, EngineRegistrationDescriptor> = new Map();
  private orchestrationTasks: CrossEngineTaskRecord[] = [];
  private maxTaskHistory = 200;
  private listeners: Set<() => void> = new Set();

  public constructor() {
    this.seedDefaultEngines();
  }

  public static getInstance(): UnifiedIntelligenceOrchestrator {
    if (!UnifiedIntelligenceOrchestrator.instance) {
      UnifiedIntelligenceOrchestrator.instance = new UnifiedIntelligenceOrchestrator();
    }
    return UnifiedIntelligenceOrchestrator.instance;
  }

  public static resetInstance(): void {
    UnifiedIntelligenceOrchestrator.instance = null;
  }

  private seedDefaultEngines(): void {
    const now = new Date().toISOString();
    const seeds: EngineRegistrationDescriptor[] = [
      {
        engineId: 'eng-p27-strategic',
        name: 'Strategic Intelligence Engine',
        domain: 'CORE_ORCHESTRATION',
        version: 'v27.4.0',
        health: 'HEALTHY',
        capabilities: ['STRATEGIC_PLANNING', 'SCENARIO_ANALYSIS', 'MISSION_ROADMAP'],
        dependencyEngineIds: [],
        latencyMs: 14,
        lastHeartbeat: now,
      },
      {
        engineId: 'eng-p28-mission-exec',
        name: 'Mission Execution Intelligence',
        domain: 'MISSION_EXECUTION',
        version: 'v28.2.1',
        health: 'HEALTHY',
        capabilities: ['MISSION_ORCHESTRATION', 'TASK_DECOMPOSITION', 'EVIDENCE_AUDIT'],
        dependencyEngineIds: ['eng-p27-strategic'],
        latencyMs: 18,
        lastHeartbeat: now,
      },
      {
        engineId: 'eng-p29-webxr-reality',
        name: 'Advanced WebXR Reality Engine',
        domain: 'WEBXR_SPATIAL',
        version: 'v29.1.0',
        health: 'HEALTHY',
        capabilities: ['SPATIAL_INTERACTION', 'THREE_JS_SCENE_MANAGEMENT', 'HEADSET_SESSION'],
        dependencyEngineIds: [],
        latencyMs: 16,
        lastHeartbeat: now,
      },
      {
        engineId: 'eng-p30-sensor-intel',
        name: 'Real-Time Sensor Intelligence',
        domain: 'SENSOR_ENVIRONMENTAL',
        version: 'v30.3.0',
        health: 'HEALTHY',
        capabilities: ['SENSOR_INGESTION', 'CADENCE_TRACKING', 'FRAME_DROP_ANALYSIS'],
        dependencyEngineIds: ['eng-p29-webxr-reality'],
        latencyMs: 12,
        lastHeartbeat: now,
      },
      {
        engineId: 'eng-p31-distributed-mesh',
        name: 'Distributed AI Mesh & Event Bus',
        domain: 'CORE_ORCHESTRATION',
        version: 'v31.5.0',
        health: 'HEALTHY',
        capabilities: ['DISTRIBUTED_EVENT_BUS', 'WORKLOAD_BALANCING', 'AGENT_ROUTING'],
        dependencyEngineIds: [],
        latencyMs: 8,
        lastHeartbeat: now,
      },
      {
        engineId: 'eng-p32-zero-trust',
        name: 'Advanced Cybersecurity & Zero-Trust Security Gateway',
        domain: 'ZERO_TRUST_SECURITY',
        version: 'v32.2.0',
        health: 'HEALTHY',
        capabilities: ['RBAC_VERIFICATION', 'SECRET_SHIELDING', 'PROMPT_INJECTION_DEFENSE'],
        dependencyEngineIds: [],
        latencyMs: 4,
        lastHeartbeat: now,
      },
      {
        engineId: 'eng-p33-predictive-decision',
        name: 'Predictive Intelligence & Decision Optimization Engine',
        domain: 'PREDICTIVE_INTELLIGENCE',
        version: 'v33.4.1',
        health: 'HEALTHY',
        capabilities: ['HOLT_LINEAR_SMOOTHING', 'CUSUM_DRIFT_DETECTION', 'RISK_SCORING'],
        dependencyEngineIds: ['eng-p30-sensor-intel'],
        latencyMs: 10,
        lastHeartbeat: now,
      },
      {
        engineId: 'eng-p34-autonomous-evolution',
        name: 'Autonomous Intelligence Evolution & Self-Optimization Engine',
        domain: 'AUTONOMOUS_OPTIMIZATION',
        version: 'v34.1.0',
        health: 'HEALTHY',
        capabilities: ['RUNTIME_SELF_OPTIMIZATION', 'SAFE_PARAMETER_BOUNDS', 'AUTOMATED_ROLLBACK'],
        dependencyEngineIds: ['eng-p33-predictive-decision', 'eng-p32-zero-trust'],
        latencyMs: 6,
        lastHeartbeat: now,
      },
      {
        engineId: 'eng-p35-universal-knowledge',
        name: 'Global Intelligence Network & Universal Knowledge Orchestrator',
        domain: 'UNIVERSAL_KNOWLEDGE',
        version: 'v35.1.0',
        health: 'HEALTHY',
        capabilities: ['UNIVERSAL_KNOWLEDGE_GRAPH', 'MULTI_SOURCE_FUSION', 'SEMANTIC_SEARCH'],
        dependencyEngineIds: ['eng-p31-distributed-mesh', 'eng-p32-zero-trust'],
        latencyMs: 8,
        lastHeartbeat: now,
      },
    ];

    for (const e of seeds) {
      this.engines.set(e.engineId, e);
    }
  }

  public registerEngine(descriptor: EngineRegistrationDescriptor): void {
    this.engines.set(descriptor.engineId, descriptor);
    this.notifyChange();
  }

  public getEngine(id: string): EngineRegistrationDescriptor | undefined {
    return this.engines.get(id);
  }

  public getAllEngines(): EngineRegistrationDescriptor[] {
    return Array.from(this.engines.values());
  }

  /**
   * Discovers healthy engines matching a required capability.
   */
  public discoverEnginesWithCapability(capability: string): EngineRegistrationDescriptor[] {
    return Array.from(this.engines.values()).filter(
      (e) => e.health !== 'UNAVAILABLE' && e.capabilities.includes(capability)
    );
  }

  /**
   * Dispatches and tracks a cross-engine task with correlation ID.
   */
  public dispatchTask(params: {
    initiatingEngineId: string;
    targetEngineId: string;
    taskType: string;
    payload: Record<string, any>;
    correlationId?: string;
  }): CrossEngineTaskRecord {
    const correlationId = params.correlationId || `corr-${Date.now().toString(36)}`;
    const target = this.engines.get(params.targetEngineId);

    const task: CrossEngineTaskRecord = {
      taskId: `task-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      initiatingEngineId: params.initiatingEngineId,
      targetEngineId: params.targetEngineId,
      taskType: params.taskType,
      correlationId,
      status: target && target.health !== 'UNAVAILABLE' ? 'COMPLETED' : 'FAILED',
      payload: params.payload,
      result: target && target.health !== 'UNAVAILABLE' ? { executed: true, targetEngine: target.name } : undefined,
      executionDurationMs: target ? target.latencyMs : 0,
      errorReason: !target ? `Target engine ${params.targetEngineId} not found` : target.health === 'UNAVAILABLE' ? 'Target engine unavailable' : undefined,
      timestamp: new Date().toISOString(),
    };

    this.orchestrationTasks.unshift(task);
    if (this.orchestrationTasks.length > this.maxTaskHistory) {
      this.orchestrationTasks.pop();
    }

    this.notifyChange();
    return task;
  }

  public getOrchestrationHistory(): CrossEngineTaskRecord[] {
    return [...this.orchestrationTasks];
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyChange(): void {
    this.listeners.forEach((fn) => fn());
  }
}
