/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Distributed Fault Tolerance Engine (Phase 31)
 * Enforces industrial circuit breaker state machines (CLOSED -> OPEN -> HALF_OPEN -> CLOSED),
 * tracks worker and agent health, isolates failing nodes to prevent cascading systemic failure,
 * manages exponential backoff ceilings, and emits service recovery notifications.
 */

import {
  CircuitBreakerRecord,
  CircuitBreakerState,
  SystemAuditHistoryRecord,
} from '../types/phase31';
import { DistributedEventBus } from './DistributedEventBus';

export class DistributedFaultToleranceEngine {
  private static instance: DistributedFaultToleranceEngine | null = null;
  private breakers: Map<string, CircuitBreakerRecord> = new Map();
  private auditLogs: SystemAuditHistoryRecord[] = [];
  private listeners: Set<(breakers: CircuitBreakerRecord[]) => void> = new Set();

  public constructor() {
    this.seedCanonicalBreakers();
  }

  public static getInstance(): DistributedFaultToleranceEngine {
    if (!DistributedFaultToleranceEngine.instance) {
      DistributedFaultToleranceEngine.instance = new DistributedFaultToleranceEngine();
    }
    return DistributedFaultToleranceEngine.instance;
  }

  public static resetInstance(): void {
    DistributedFaultToleranceEngine.instance = null;
  }

  private seedCanonicalBreakers(): void {
    const agents = [
      'agent-operations-lead',
      'agent-test-orchestrator',
      'agent-tracking-specialist',
      'agent-performance-engineer',
      'agent-incident-commander',
      'agent-chief-intelligence',
      'provider-gemini-pro',
      'provider-browser-worker',
    ];

    const now = new Date().toISOString();
    for (const a of agents) {
      this.breakers.set(a, {
        id: `cb-${a}`,
        targetServiceOrAgent: a,
        state: 'CLOSED',
        failureCount: 0,
        consecutiveSuccesses: 5,
        failureThreshold: 3,
        successThreshold: 2,
        resetTimeoutMs: 15000,
        lastStateChange: now,
      });
    }
  }

  /**
   * Checks if execution is permitted through the circuit breaker for the given target.
   */
  public canExecute(targetId: string): boolean {
    const breaker = this.getOrCreateBreaker(targetId);

    if (breaker.state === 'CLOSED') {
      return true;
    }

    if (breaker.state === 'OPEN') {
      const now = Date.now();
      const lastFail = breaker.lastFailureTime ? new Date(breaker.lastFailureTime).getTime() : 0;
      if (now - lastFail >= breaker.resetTimeoutMs) {
        // Transition to HALF_OPEN (probe attempt)
        breaker.state = 'HALF_OPEN';
        breaker.lastStateChange = new Date().toISOString();
        this.recordAudit('FAULT', 'CIRCUIT_HALF_OPEN', targetId, `Circuit breaker transitioned to HALF_OPEN for probing`, true);
        this.notifyListeners();
        return true;
      }
      return false; // Still within cooldown window
    }

    if (breaker.state === 'HALF_OPEN') {
      return true; // Probe permitted
    }

    return false;
  }

  /**
   * Records successful execution through the target's circuit breaker.
   */
  public recordSuccess(targetId: string): void {
    const breaker = this.getOrCreateBreaker(targetId);

    if (breaker.state === 'HALF_OPEN') {
      breaker.consecutiveSuccesses += 1;
      if (breaker.consecutiveSuccesses >= breaker.successThreshold) {
        breaker.state = 'CLOSED';
        breaker.failureCount = 0;
        breaker.lastStateChange = new Date().toISOString();
        this.recordAudit('FAULT', 'CIRCUIT_CLOSED', targetId, `Target recovered; circuit breaker restored to CLOSED`, true);

        DistributedEventBus.getInstance().publish({
          eventType: 'CIRCUIT_BREAKER_RESET',
          source: 'DistributedFaultToleranceEngine',
          priority: 'MEDIUM',
          payload: { targetId, state: 'CLOSED' },
          suppressionFingerprint: `cb-reset-${targetId}`,
        });
      }
    } else if (breaker.state === 'CLOSED') {
      breaker.failureCount = Math.max(0, breaker.failureCount - 1);
      breaker.consecutiveSuccesses += 1;
    }

    this.notifyListeners();
  }

  /**
   * Records a failure for a target, tripping the breaker to OPEN if the threshold is reached.
   */
  public recordFailure(targetId: string, reason: string): void {
    const breaker = this.getOrCreateBreaker(targetId);
    const now = new Date();
    breaker.lastFailureTime = now.toISOString();
    breaker.consecutiveSuccesses = 0;
    breaker.failureCount += 1;

    if (breaker.state === 'HALF_OPEN' || breaker.failureCount >= breaker.failureThreshold) {
      breaker.state = 'OPEN';
      breaker.nextAttemptTime = new Date(now.getTime() + breaker.resetTimeoutMs).toISOString();
      breaker.lastStateChange = now.toISOString();

      this.recordAudit(
        'FAULT',
        'CIRCUIT_TRIPPED_OPEN',
        targetId,
        `Circuit breaker tripped OPEN (${breaker.failureCount} failures). Reason: ${reason}`,
        false
      );

      DistributedEventBus.getInstance().publish({
        eventType: 'CIRCUIT_BREAKER_TRIPPED',
        source: 'DistributedFaultToleranceEngine',
        priority: 'CRITICAL',
        payload: { targetId, failureCount: breaker.failureCount, reason },
        suppressionFingerprint: `cb-tripped-${targetId}`,
      });
    }

    this.notifyListeners();
  }

  /**
   * Manually resets a tripped circuit breaker (e.g. via operator command).
   */
  public manualReset(targetId: string): boolean {
    const breaker = this.breakers.get(targetId);
    if (!breaker) return false;

    breaker.state = 'CLOSED';
    breaker.failureCount = 0;
    breaker.consecutiveSuccesses = 0;
    breaker.lastStateChange = new Date().toISOString();

    this.recordAudit('FAULT', 'MANUAL_RESET', 'Operator', `Operator manually reset circuit breaker for ${targetId}`, true);
    this.notifyListeners();
    return true;
  }

  private getOrCreateBreaker(targetId: string): CircuitBreakerRecord {
    let breaker = this.breakers.get(targetId);
    if (!breaker) {
      breaker = {
        id: `cb-${targetId}`,
        targetServiceOrAgent: targetId,
        state: 'CLOSED',
        failureCount: 0,
        consecutiveSuccesses: 0,
        failureThreshold: 3,
        successThreshold: 2,
        resetTimeoutMs: 15000,
        lastStateChange: new Date().toISOString(),
      };
      this.breakers.set(targetId, breaker);
    }
    return breaker;
  }

  public getBreaker(targetId: string): CircuitBreakerRecord | undefined {
    return this.breakers.get(targetId);
  }

  public getAllBreakers(): CircuitBreakerRecord[] {
    return Array.from(this.breakers.values());
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
      id: `audit-ft-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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

  public subscribe(listener: (breakers: CircuitBreakerRecord[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getAllBreakers());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const list = this.getAllBreakers();
    this.listeners.forEach((l) => l(list));
  }
}
