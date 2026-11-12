/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Runtime Security Monitor (Phase 32)
 * Continuously aggregates and assesses real runtime security health across
 * authentication services, Zero-Trust authorization, agent identities,
 * API gateways, and intrusion alerts.
 * Uses real measured data; never fabricates false security health states.
 */

import { RuntimeSecurityStatus } from '../types/phase32';
import { ZeroTrustSecurityEngine } from './ZeroTrustSecurityEngine';
import { AIThreatDetectionEngine } from './AIThreatDetectionEngine';
import { IntrusionDetectionEngine } from './IntrusionDetectionEngine';
import { AgentIdentitySecurityManager } from './AgentIdentitySecurityManager';

export interface RuntimeSecuritySnapshot {
  status: RuntimeSecurityStatus;
  overallScore: number; // 0 - 100
  activeThreatCount: number;
  unauthorizedAccessCount: number;
  suspendedAgentsCount: number;
  totalDecisionsEvaluated: number;
  lastUpdated: string;
  summary: string;
}

export class RuntimeSecurityMonitor {
  private static instance: RuntimeSecurityMonitor | null = null;
  private listeners: Set<(snapshot: RuntimeSecuritySnapshot) => void> = new Set();

  public constructor() {}

  public static getInstance(): RuntimeSecurityMonitor {
    if (!RuntimeSecurityMonitor.instance) {
      RuntimeSecurityMonitor.instance = new RuntimeSecurityMonitor();
    }
    return RuntimeSecurityMonitor.instance;
  }

  public static resetInstance(): void {
    RuntimeSecurityMonitor.instance = null;
  }

  /**
   * Evaluates current system security status based on live engine states.
   */
  public getSecuritySnapshot(): RuntimeSecuritySnapshot {
    const ztEngine = ZeroTrustSecurityEngine.getInstance();
    const threatEngine = AIThreatDetectionEngine.getInstance();
    const intrusionEngine = IntrusionDetectionEngine.getInstance();
    const agentSec = AgentIdentitySecurityManager.getInstance();

    const decisions = ztEngine.getDecisionsHistory();
    const threats = threatEngine.getAllThreats();
    const alerts = intrusionEngine.getAllAlerts();
    const agents = agentSec.getAllIdentities();

    const deniedCount = decisions.filter((d) => d.decision === 'DENY').length;
    const activeThreats = threats.filter((t) => !t.mitigated);
    const criticalThreats = activeThreats.filter((t) => t.severity === 'CRITICAL');
    const suspendedAgents = agents.filter((a) => a.status === 'SUSPENDED' || a.status === 'REVOKED').length;

    let score = 100;
    score -= criticalThreats.length * 35;
    score -= activeThreats.filter((t) => t.severity === 'HIGH').length * 15;
    score -= suspendedAgents * 10;
    score = Math.max(0, Math.min(100, score));

    let status: RuntimeSecurityStatus = 'HEALTHY';
    let summary = 'Security posture nominal. All Zero-Trust controls operational.';

    if (criticalThreats.length > 0) {
      status = 'CRITICAL';
      summary = `Critical threat active: ${criticalThreats[0].explanation}`;
    } else if (score < 70 || suspendedAgents > 0) {
      status = 'DEGRADED';
      summary = 'Security posture degraded due to active threats or suspended agent nodes.';
    } else if (score < 90 || deniedCount > 5) {
      status = 'WARNING';
      summary = 'Elevated access denials or low-severity threat indicators detected.';
    }

    return {
      status,
      overallScore: score,
      activeThreatCount: activeThreats.length,
      unauthorizedAccessCount: deniedCount,
      suspendedAgentsCount: suspendedAgents,
      totalDecisionsEvaluated: decisions.length,
      lastUpdated: new Date().toISOString(),
      summary,
    };
  }

  public subscribe(listener: (snapshot: RuntimeSecuritySnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSecuritySnapshot());
    return () => this.listeners.delete(listener);
  }

  public notify(): void {
    const snap = this.getSecuritySnapshot();
    this.listeners.forEach((l) => l(snap));
  }
}
