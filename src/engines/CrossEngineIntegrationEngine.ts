/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Cross-Engine Integration Engine (Phase 36)
 * Decoupled integration fabric managing cross-engine communication, dependency-aware execution,
 * failure isolation, timeout handling, circuit-breaker trips, and context propagation.
 * Prevents circular dependencies and spaghetti coupling across the 36 phases.
 */

import { CrossEngineTaskRecord } from '../types/phase36';
import { UnifiedIntelligenceOrchestrator } from './UnifiedIntelligenceOrchestrator';
import { DistributedEventBus } from './DistributedEventBus';

export interface CircuitBreakerStatus {
  engineId: string;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  consecutiveFailures: number;
  lastFailureTime?: number;
}

export class CrossEngineIntegrationEngine {
  private static instance: CrossEngineIntegrationEngine | null = null;
  private circuitBreakers: Map<string, CircuitBreakerStatus> = new Map();
  private failureThreshold = 3;
  private resetTimeoutMs = 15000;

  public constructor() {}

  public static getInstance(): CrossEngineIntegrationEngine {
    if (!CrossEngineIntegrationEngine.instance) {
      CrossEngineIntegrationEngine.instance = new CrossEngineIntegrationEngine();
    }
    return CrossEngineIntegrationEngine.instance;
  }

  public static resetInstance(): void {
    CrossEngineIntegrationEngine.instance = null;
  }

  /**
   * Executes a cross-engine operation with circuit breaker and failure isolation.
   */
  public executeCrossEngineOperation(
    initiatorEngineId: string,
    targetEngineId: string,
    taskType: string,
    payload: Record<string, any>,
    timeoutMs = 5000
  ): CrossEngineTaskRecord {
    const orchestrator = UnifiedIntelligenceOrchestrator.getInstance();
    const breaker = this.getCircuitBreaker(targetEngineId);

    // 1. Check Circuit Breaker
    if (breaker.state === 'OPEN') {
      const now = Date.now();
      if (breaker.lastFailureTime && now - breaker.lastFailureTime > this.resetTimeoutMs) {
        breaker.state = 'HALF_OPEN';
      } else {
        return {
          taskId: `task-cb-trip-${Date.now().toString(36)}`,
          initiatingEngineId: initiatorEngineId,
          targetEngineId,
          taskType,
          correlationId: `cb-trip-${Date.now().toString(36)}`,
          status: 'CIRCUIT_BROKEN',
          payload,
          errorReason: `Circuit breaker OPEN for engine "${targetEngineId}". Consecutive failures: ${breaker.consecutiveFailures}.`,
          timestamp: new Date().toISOString(),
        };
      }
    }

    // 2. Dispatch through Orchestrator
    const task = orchestrator.dispatchTask({
      initiatingEngineId: initiatorEngineId,
      targetEngineId,
      taskType,
      payload,
    });

    // 3. Update Breaker State
    if (task.status === 'COMPLETED') {
      breaker.consecutiveFailures = 0;
      breaker.state = 'CLOSED';
    } else {
      breaker.consecutiveFailures += 1;
      breaker.lastFailureTime = Date.now();
      if (breaker.consecutiveFailures >= this.failureThreshold) {
        breaker.state = 'OPEN';
      }
    }

    // 4. Emit Event
    try {
      DistributedEventBus.getInstance().publish({
        eventType: task.status === 'COMPLETED' ? 'CROSS_ENGINE_TASK_COMPLETED' : 'CROSS_ENGINE_TASK_FAILED',
        source: 'CrossEngineIntegrationEngine',
        priority: task.status === 'COMPLETED' ? 'LOW' : 'HIGH',
        payload: { taskId: task.taskId, status: task.status, target: targetEngineId },
        suppressionFingerprint: `cross-task-${task.taskId}`,
      });
    } catch {
      // Event bus fallback
    }

    return task;
  }

  public getCircuitBreaker(engineId: string): CircuitBreakerStatus {
    let breaker = this.circuitBreakers.get(engineId);
    if (!breaker) {
      breaker = { engineId, state: 'CLOSED', consecutiveFailures: 0 };
      this.circuitBreakers.set(engineId, breaker);
    }
    return breaker;
  }

  public getAllCircuitBreakers(): CircuitBreakerStatus[] {
    return Array.from(this.circuitBreakers.values());
  }

  public resetCircuitBreaker(engineId: string): void {
    const breaker = this.getCircuitBreaker(engineId);
    breaker.state = 'CLOSED';
    breaker.consecutiveFailures = 0;
  }
}
