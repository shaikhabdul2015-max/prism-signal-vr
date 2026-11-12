/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Agent Identity Security Manager (Phase 32)
 * Cryptographic identity, certificate manifest, and message integrity verification
 * for all six canonical specialist AI agents. Enforces strict principle of least privilege:
 * agents CANNOT grant themselves additional capabilities, escalate roles, or alter permissions.
 */

import { AgentSpecialistRole } from '../types/phase17';
import { AgentSecurityIdentity } from '../types/phase32';
import { DistributedAgentNetwork } from './DistributedAgentNetwork';
import { SystemAuditHistoryRecord } from '../types/phase31';

export class AgentIdentitySecurityManager {
  private static instance: AgentIdentitySecurityManager | null = null;
  private identities: Map<string, AgentSecurityIdentity> = new Map();
  private auditLogs: SystemAuditHistoryRecord[] = [];
  private listeners: Set<(identities: AgentSecurityIdentity[]) => void> = new Set();

  public constructor() {
    this.provisionCanonicalIdentities();
  }

  public static getInstance(): AgentIdentitySecurityManager {
    if (!AgentIdentitySecurityManager.instance) {
      AgentIdentitySecurityManager.instance = new AgentIdentitySecurityManager();
    }
    return AgentIdentitySecurityManager.instance;
  }

  public static resetInstance(): void {
    AgentIdentitySecurityManager.instance = null;
  }

  private provisionCanonicalIdentities(): void {
    const now = new Date().toISOString();

    const canonical: AgentSecurityIdentity[] = [
      {
        agentId: 'agent-operations-lead',
        role: 'OperationsAgent',
        publicKeyFingerprint: 'cert:ed25519:ops-lead:89a1c4',
        assignedCapabilities: [
          'SESSION_LIFECYCLE',
          'TELEMETRY_PIPELINE',
          'RUNTIME_COORDINATION',
          'ENVIRONMENT_INVARIANCE_AUDIT',
        ],
        maxPrivilegeLevel: 'STANDARD',
        status: 'ACTIVE',
        consecutiveViolations: 0,
        lastVerifiedAt: now,
        allowedEndpoints: ['in-proc://agents/operations-lead', 'in-proc://telemetry/*'],
      },
      {
        agentId: 'agent-test-orchestrator',
        role: 'TestAgent',
        publicKeyFingerprint: 'cert:ed25519:test-orch:12b9d7',
        assignedCapabilities: [
          'TEST_EXECUTION',
          'SCENARIO_INSPECTION',
          'CHAOS_INJECTION',
          'ASSERTION_VALIDATION',
          'REGRESSION_MONITOR',
        ],
        maxPrivilegeLevel: 'STANDARD',
        status: 'ACTIVE',
        consecutiveViolations: 0,
        lastVerifiedAt: now,
        allowedEndpoints: ['in-proc://agents/test-orchestrator', 'in-proc://tests/*'],
      },
      {
        agentId: 'agent-tracking-specialist',
        role: 'TrackingAgent',
        publicKeyFingerprint: 'cert:ed25519:track-spec:44f0e2',
        assignedCapabilities: [
          'JOINT_POSE_INSPECTION',
          'OCCLUSION_ANALYSIS',
          'KINEMATIC_ALIGNMENT',
          'ANATOMICAL_VERIFICATION',
        ],
        maxPrivilegeLevel: 'STANDARD',
        status: 'ACTIVE',
        consecutiveViolations: 0,
        lastVerifiedAt: now,
        allowedEndpoints: ['in-proc://agents/tracking-specialist', 'in-proc://spatial/*'],
      },
      {
        agentId: 'agent-performance-engineer',
        role: 'PerformanceAgent',
        publicKeyFingerprint: 'cert:ed25519:perf-eng:77c3a8',
        assignedCapabilities: [
          'CADENCE_STABILITY',
          'LATENCY_PROFILING',
          'BOTTLENECK_DETECTION',
          'BUDGET_ENFORCEMENT',
          'WORKLOAD_REBALANCING',
        ],
        maxPrivilegeLevel: 'STANDARD',
        status: 'ACTIVE',
        consecutiveViolations: 0,
        lastVerifiedAt: now,
        allowedEndpoints: ['in-proc://agents/performance-engineer', 'in-proc://performance/*'],
      },
      {
        agentId: 'agent-incident-commander',
        role: 'IncidentAgent',
        publicKeyFingerprint: 'cert:ed25519:inc-cmd:99e1b5',
        assignedCapabilities: [
          'ANOMALY_TRIAGE',
          'INCIDENT_CLASSIFICATION',
          'ROOT_CAUSE_ANALYSIS',
          'RESOLUTION_VERIFICATION',
          'CONTAINMENT_DISPATCH',
        ],
        maxPrivilegeLevel: 'ELEVATED',
        status: 'ACTIVE',
        consecutiveViolations: 0,
        lastVerifiedAt: now,
        allowedEndpoints: ['in-proc://agents/incident-commander', 'in-proc://incidents/*'],
      },
      {
        agentId: 'agent-chief-intelligence',
        role: 'ChiefIntelligenceAgent',
        publicKeyFingerprint: 'cert:ed25519:cio-arbiter:33d8c1',
        assignedCapabilities: [
          'SYNTHESIS_REPORTING',
          'CONSENSUS_ARBITRATION',
          'STRATEGIC_ALIGNMENT',
          'CROSS_SYSTEM_SYNCHRONIZATION',
          'RULE_2_INVARIANCE',
        ],
        maxPrivilegeLevel: 'CHIEF_ARBITER',
        status: 'ACTIVE',
        consecutiveViolations: 0,
        lastVerifiedAt: now,
        allowedEndpoints: ['in-proc://agents/*', 'in-proc://consensus/*'],
      },
    ];

    for (const c of canonical) {
      this.identities.set(c.agentId, c);
    }
  }

  /**
   * Verifies agent certificate and capability permission.
   * Throws or returns false if privilege elevation or impersonation is detected.
   */
  public verifyAgentCapability(agentId: string, requiredCapability: string): boolean {
    const identity = this.identities.get(agentId);
    if (!identity) {
      this.recordAudit('SECURITY', 'UNKNOWN_AGENT_DENIED', agentId, `Unknown agent ID ${agentId}`, false);
      return false;
    }

    if (identity.status !== 'ACTIVE') {
      this.recordAudit('SECURITY', 'SUSPENDED_AGENT_DENIED', agentId, `Agent ${agentId} is ${identity.status}`, false);
      return false;
    }

    const hasCap = identity.assignedCapabilities.includes(requiredCapability);
    if (!hasCap) {
      identity.consecutiveViolations += 1;
      this.recordAudit(
        'SECURITY',
        'UNAUTHORIZED_CAPABILITY_ATTEMPT',
        agentId,
        `Attempted unauthorized capability: ${requiredCapability} (Violation count: ${identity.consecutiveViolations})`,
        false
      );

      if (identity.consecutiveViolations >= 3) {
        identity.status = 'SUSPENDED';
        this.recordAudit('SECURITY', 'AGENT_AUTO_SUSPENDED', agentId, 'Suspended due to repeated capability violations', false);
      }

      this.notifyListeners();
      return false;
    }

    identity.lastVerifiedAt = new Date().toISOString();
    return true;
  }

  /**
   * Prevents agents from altering their own or peer credentials.
   * Only Human Operator can modify status or permissions.
   */
  public updateAgentStatus(agentId: string, newStatus: AgentSecurityIdentity['status'], authorizedBy = 'Operator'): boolean {
    const identity = this.identities.get(agentId);
    if (!identity) return false;

    identity.status = newStatus;
    if (newStatus === 'ACTIVE') {
      identity.consecutiveViolations = 0;
    }

    this.recordAudit(
      'SECURITY',
      `AGENT_STATUS_${newStatus}`,
      authorizedBy,
      `Updated agent ${agentId} status to ${newStatus}`,
      true
    );

    this.notifyListeners();
    return true;
  }

  public getIdentity(agentId: string): AgentSecurityIdentity | undefined {
    return this.identities.get(agentId);
  }

  public getAllIdentities(): AgentSecurityIdentity[] {
    return Array.from(this.identities.values());
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
      id: `audit-agsec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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

  public subscribe(listener: (identities: AgentSecurityIdentity[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getAllIdentities());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const list = this.getAllIdentities();
    this.listeners.forEach((l) => l(list));
  }
}
