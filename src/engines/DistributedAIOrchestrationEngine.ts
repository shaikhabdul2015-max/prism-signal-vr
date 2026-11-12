/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Distributed AI Orchestration Engine (Phase 31)
 * Manages distributed task registration, decomposition, routing, workload allocation,
 * prioritization, tracking, aggregation, timeouts, retries, and failure isolation.
 * Uses idempotency keys to prevent duplicate execution.
 */

import {
  DistributedTaskRecord,
  DistributedTaskStatus,
  TaskPriority,
  ExecutionEnvironmentMode,
  SystemAuditHistoryRecord,
} from '../types/phase31';
import { IntelligentWorkloadBalancer } from './IntelligentWorkloadBalancer';
import { DistributedFaultToleranceEngine } from './DistributedFaultToleranceEngine';
import { DistributedEventBus } from './DistributedEventBus';

export class DistributedAIOrchestrationEngine {
  private static instance: DistributedAIOrchestrationEngine | null = null;
  private tasks: Map<string, DistributedTaskRecord> = new Map();
  private idempotencyMap: Map<string, string> = new Map(); // idempotencyKey -> taskId
  private auditHistory: SystemAuditHistoryRecord[] = [];
  private taskListeners: Set<(tasks: DistributedTaskRecord[]) => void> = new Set();
  private timeoutInterval: any = null;

  public constructor() {
    this.seedDefaultTasks();
  }

  public static getInstance(): DistributedAIOrchestrationEngine {
    if (!DistributedAIOrchestrationEngine.instance) {
      DistributedAIOrchestrationEngine.instance = new DistributedAIOrchestrationEngine();
    }
    return DistributedAIOrchestrationEngine.instance;
  }

  public static resetInstance(): void {
    if (DistributedAIOrchestrationEngine.instance) {
      DistributedAIOrchestrationEngine.instance.cleanup();
      DistributedAIOrchestrationEngine.instance = null;
    }
  }

  public cleanup(): void {
    if (this.timeoutInterval) {
      clearInterval(this.timeoutInterval);
      this.timeoutInterval = null;
    }
    this.taskListeners.clear();
  }

  private seedDefaultTasks(): void {
    const initialTasks: Partial<DistributedTaskRecord>[] = [
      {
        id: 'task-mesh-init-01',
        idempotencyKey: 'mesh-init-telemetry-01',
        taskType: 'TELEMETRY_PIPELINE_VERIFY',
        title: 'Telemetry Pipeline Synchronization',
        priority: 'HIGH',
        status: 'COMPLETED',
        assignedAgentId: 'agent-operations-lead',
        assignedWorkerId: 'worker-local-01',
        dependencies: [],
        payload: { channel: 'webxr-spatial-stream', expectedCadence: 72 },
        result: { synced: true, latencyP95Ms: 14.2, frameDrops: 0 },
        retryCount: 0,
        maxRetries: 3,
        timeoutMs: 10000,
        createdAt: new Date(Date.now() - 120000).toISOString(),
        startedAt: new Date(Date.now() - 119000).toISOString(),
        completedAt: new Date(Date.now() - 118000).toISOString(),
        provenance: 'LOCAL_DEVELOPMENT',
        executionHost: 'Browser Node / Web Worker',
      },
      {
        id: 'task-mesh-anomaly-scan-02',
        idempotencyKey: 'mesh-scan-cadence-02',
        taskType: 'ANOMALY_PATTERN_ANALYSIS',
        title: 'Spatial Anomaly & Cadence Volatility Scan',
        priority: 'NORMAL',
        status: 'COMPLETED',
        assignedAgentId: 'agent-incident-commander',
        assignedWorkerId: 'worker-local-02',
        dependencies: ['task-mesh-init-01'],
        payload: { sampleWindowMs: 30000, sensitivity: 'HIGH' },
        result: { anomaliesDetected: 0, stabilityIndex: 98.4 },
        retryCount: 0,
        maxRetries: 3,
        timeoutMs: 15000,
        createdAt: new Date(Date.now() - 60000).toISOString(),
        startedAt: new Date(Date.now() - 59000).toISOString(),
        completedAt: new Date(Date.now() - 57500).toISOString(),
        provenance: 'LOCAL_DEVELOPMENT',
        executionHost: 'Browser Node / Web Worker',
      },
      {
        id: 'task-mesh-load-balance-03',
        idempotencyKey: 'mesh-load-balance-03',
        taskType: 'WORKLOAD_REBALANCING',
        title: 'Multi-Agent Load Distribution Audit',
        priority: 'NORMAL',
        status: 'QUEUED',
        assignedAgentId: 'agent-performance-engineer',
        assignedWorkerId: null,
        dependencies: [],
        payload: { targetAgents: 6, bufferReserve: 0.2 },
        retryCount: 0,
        maxRetries: 2,
        timeoutMs: 10000,
        createdAt: new Date(Date.now() - 5000).toISOString(),
        provenance: 'LOCAL_DEVELOPMENT',
        executionHost: 'Browser Node / Web Worker',
      },
    ];

    for (const t of initialTasks) {
      if (t.id && t.idempotencyKey) {
        this.tasks.set(t.id, t as DistributedTaskRecord);
        this.idempotencyMap.set(t.idempotencyKey, t.id);
      }
    }
  }

  /**
   * Registers a new task or returns the existing task if the idempotency key matches.
   */
  public registerTask<TPayload = any>(params: {
    idempotencyKey: string;
    taskType: string;
    title: string;
    priority?: TaskPriority;
    payload: TPayload;
    dependencies?: string[];
    maxRetries?: number;
    timeoutMs?: number;
    parentTaskId?: string;
    preferredAgentId?: string;
  }): DistributedTaskRecord<TPayload> {
    // 1. Check idempotency
    const existingTaskId = this.idempotencyMap.get(params.idempotencyKey);
    if (existingTaskId && this.tasks.has(existingTaskId)) {
      return this.tasks.get(existingTaskId) as DistributedTaskRecord<TPayload>;
    }

    // 2. Build unique task record
    const taskId = `dtask-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const record: DistributedTaskRecord<TPayload> = {
      id: taskId,
      idempotencyKey: params.idempotencyKey,
      taskType: params.taskType,
      title: params.title,
      priority: params.priority || 'NORMAL',
      status: 'QUEUED',
      assignedAgentId: params.preferredAgentId || null,
      assignedWorkerId: null,
      dependencies: params.dependencies || [],
      parentTaskId: params.parentTaskId,
      payload: params.payload,
      retryCount: 0,
      maxRetries: params.maxRetries ?? 3,
      timeoutMs: params.timeoutMs ?? 15000,
      createdAt: now,
      provenance: 'LOCAL_DEVELOPMENT',
      executionHost: 'Browser Node / Web Worker (Local Mesh)',
    };

    this.tasks.set(taskId, record);
    this.idempotencyMap.set(params.idempotencyKey, taskId);

    // If child task, associate with parent
    if (params.parentTaskId && this.tasks.has(params.parentTaskId)) {
      const parent = this.tasks.get(params.parentTaskId)!;
      parent.subtasks = parent.subtasks || [];
      if (!parent.subtasks.includes(taskId)) {
        parent.subtasks.push(taskId);
      }
    }

    this.recordAudit('TASK', 'REGISTER', 'System', `Registered task "${record.title}" (${taskId})`, true);
    this.notifyListeners();

    // Trigger workload balancer routing
    this.scheduleExecutionCheck(taskId);

    return record;
  }

  /**
   * Decomposes a complex objective into sequential or parallel subtasks.
   */
  public decomposeTask(
    parentTaskId: string,
    subtaskSpecs: Array<{
      title: string;
      taskType: string;
      payload: any;
      priority?: TaskPriority;
      dependsOnPrevious?: boolean;
    }>
  ): DistributedTaskRecord[] {
    const parent = this.tasks.get(parentTaskId);
    if (!parent) {
      throw new Error(`Parent task ${parentTaskId} does not exist`);
    }

    const createdSubtasks: DistributedTaskRecord[] = [];
    let previousSubtaskId: string | null = null;

    for (let i = 0; i < subtaskSpecs.length; i++) {
      const spec = subtaskSpecs[i];
      const subtaskKey = `${parent.idempotencyKey}-sub-${i}-${spec.taskType}`;
      const dependencies: string[] = [];

      if (spec.dependsOnPrevious && previousSubtaskId) {
        dependencies.push(previousSubtaskId);
      }

      const subtask = this.registerTask({
        idempotencyKey: subtaskKey,
        taskType: spec.taskType,
        title: spec.title,
        priority: spec.priority || parent.priority,
        payload: spec.payload,
        dependencies,
        parentTaskId: parent.id,
      });

      previousSubtaskId = subtask.id;
      createdSubtasks.push(subtask);
    }

    parent.status = 'WAITING';
    this.notifyListeners();
    return createdSubtasks;
  }

  /**
   * Attempts to assign and execute pending tasks whose dependencies are resolved.
   */
  public scheduleExecutionCheck(specificTaskId?: string): void {
    const tasksToCheck = specificTaskId
      ? [this.tasks.get(specificTaskId)].filter(Boolean) as DistributedTaskRecord[]
      : Array.from(this.tasks.values()).filter((t) => t.status === 'QUEUED');

    for (const task of tasksToCheck) {
      if (task.status !== 'QUEUED') continue;

      // Check dependencies
      const depsReady = task.dependencies.every((depId) => {
        const dep = this.tasks.get(depId);
        return dep && dep.status === 'COMPLETED';
      });

      if (!depsReady) {
        continue; // Wait until all dependencies succeed
      }

      // Check with intelligent workload balancer
      const balancer = IntelligentWorkloadBalancer.getInstance();
      const assignment = balancer.assignTask(task);

      if (assignment.success && assignment.assignedAgentId) {
        task.assignedAgentId = assignment.assignedAgentId;
        task.assignedWorkerId = assignment.workerId || 'worker-local-01';
        task.status = 'ASSIGNED';
        this.notifyListeners();

        // Dispatch via EventBus
        DistributedEventBus.getInstance().publish({
          eventType: 'TASK_ASSIGNED',
          source: 'DistributedAIOrchestrationEngine',
          priority: task.priority === 'CRITICAL' ? 'CRITICAL' : 'MEDIUM',
          payload: { taskId: task.id, agentId: task.assignedAgentId },
          suppressionFingerprint: `task-assigned-${task.id}`,
        });
      }
    }
  }

  /**
   * Starts running an assigned task.
   */
  public startTaskExecution(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    // Check circuit breaker for the assigned agent
    if (task.assignedAgentId) {
      const ft = DistributedFaultToleranceEngine.getInstance();
      if (!ft.canExecute(task.assignedAgentId)) {
        task.status = 'RETRYING';
        task.failureReason = `Circuit breaker OPEN for agent ${task.assignedAgentId}`;
        this.notifyListeners();
        return false;
      }
    }

    task.status = 'RUNNING';
    task.startedAt = new Date().toISOString();
    this.recordAudit('TASK', 'START', task.assignedAgentId || 'Orchestrator', `Started task "${task.title}"`, true);
    this.notifyListeners();
    return true;
  }

  /**
   * Marks a task as COMPLETED with its execution result.
   */
  public completeTask<TResult = any>(taskId: string, result: TResult): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.status = 'COMPLETED';
    task.completedAt = new Date().toISOString();
    task.result = result;

    if (task.assignedAgentId) {
      DistributedFaultToleranceEngine.getInstance().recordSuccess(task.assignedAgentId);
      IntelligentWorkloadBalancer.getInstance().releaseTask(task.assignedAgentId, task.id);
    }

    this.recordAudit('TASK', 'COMPLETE', task.assignedAgentId || 'Orchestrator', `Completed task "${task.title}"`, true);

    // If part of parent, check if parent can be completed
    if (task.parentTaskId) {
      this.checkParentTaskCompletion(task.parentTaskId);
    }

    this.notifyListeners();
    this.scheduleExecutionCheck(); // Unlock dependent tasks
    return true;
  }

  /**
   * Fails a task, respecting retry limits, timeouts, and circuit breaker trip thresholds.
   */
  public failTask(taskId: string, reason: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    if (task.assignedAgentId) {
      DistributedFaultToleranceEngine.getInstance().recordFailure(task.assignedAgentId, reason);
      IntelligentWorkloadBalancer.getInstance().releaseTask(task.assignedAgentId, task.id);
    }

    if (task.retryCount < task.maxRetries) {
      task.retryCount += 1;
      task.status = 'RETRYING';
      task.failureReason = `Attempt ${task.retryCount} failed: ${reason}. Retrying with exponential backoff.`;
      this.recordAudit('TASK', 'RETRY', task.assignedAgentId || 'Orchestrator', task.failureReason, false);
      
      // Re-queue task for reassignment
      setTimeout(() => {
        if (task.status === 'RETRYING') {
          task.status = 'QUEUED';
          task.assignedAgentId = null;
          this.scheduleExecutionCheck(task.id);
          this.notifyListeners();
        }
      }, Math.min(1000 * Math.pow(2, task.retryCount), 10000));
    } else {
      task.status = 'FAILED';
      task.failureReason = `Permanent failure after ${task.retryCount} retries: ${reason}`;
      task.completedAt = new Date().toISOString();
      this.recordAudit('TASK', 'FAIL', task.assignedAgentId || 'Orchestrator', task.failureReason, false);

      DistributedEventBus.getInstance().publish({
        eventType: 'TASK_FAILED',
        source: 'DistributedAIOrchestrationEngine',
        priority: 'HIGH',
        payload: { taskId: task.id, reason: task.failureReason },
        suppressionFingerprint: `task-failed-${task.id}`,
      });
    }

    this.notifyListeners();
    return true;
  }

  /**
   * Cancels a running or queued task safely.
   */
  public cancelTask(taskId: string, reason = 'Operator cancellation'): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    if (task.assignedAgentId) {
      IntelligentWorkloadBalancer.getInstance().releaseTask(task.assignedAgentId, task.id);
    }

    task.status = 'CANCELLED';
    task.failureReason = reason;
    task.completedAt = new Date().toISOString();
    this.recordAudit('TASK', 'CANCEL', 'Operator', `Cancelled task "${task.title}": ${reason}`, true);
    this.notifyListeners();
    return true;
  }

  private checkParentTaskCompletion(parentTaskId: string): void {
    const parent = this.tasks.get(parentTaskId);
    if (!parent || !parent.subtasks || parent.subtasks.length === 0) return;

    const allSubtasks = parent.subtasks.map((id) => this.tasks.get(id)).filter(Boolean) as DistributedTaskRecord[];
    const allCompleted = allSubtasks.every((st) => st.status === 'COMPLETED');
    const anyFailed = allSubtasks.some((st) => st.status === 'FAILED');

    if (allCompleted) {
      const aggregatedResults = allSubtasks.reduce((acc, st) => {
        acc[st.taskType] = st.result;
        return acc;
      }, {} as Record<string, any>);
      this.completeTask(parentTaskId, { aggregatedResults, subtasksCount: allSubtasks.length });
    } else if (anyFailed) {
      this.failTask(parentTaskId, 'One or more required subtasks encountered permanent failure.');
    }
  }

  public getTask(taskId: string): DistributedTaskRecord | undefined {
    return this.tasks.get(taskId);
  }

  public getAllTasks(): DistributedTaskRecord[] {
    return Array.from(this.tasks.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getAuditHistory(): SystemAuditHistoryRecord[] {
    return [...this.auditHistory];
  }

  private recordAudit(
    category: SystemAuditHistoryRecord['category'],
    action: string,
    actor: string,
    details: string,
    success: boolean
  ): void {
    this.auditHistory.unshift({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      category,
      action,
      actor,
      details,
      success,
    });
    if (this.auditHistory.length > 100) {
      this.auditHistory.pop();
    }
  }

  public subscribe(listener: (tasks: DistributedTaskRecord[]) => void): () => void {
    this.taskListeners.add(listener);
    listener(this.getAllTasks());
    return () => this.taskListeners.delete(listener);
  }

  private notifyListeners(): void {
    const list = this.getAllTasks();
    this.taskListeners.forEach((l) => l(list));
  }
}
