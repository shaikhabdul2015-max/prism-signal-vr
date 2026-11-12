/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Distributed Agent Network (Phase 31)
 * Manages identity, registration, discovery, availability, capabilities,
 * and live health of the six specialist AI agents:
 * 1. Operations Lead (OperationsAgent)
 * 2. Automated Test Orchestrator (TestAgent)
 * 3. Tracking Specialist (TrackingAgent)
 * 4. Performance Engineer (PerformanceAgent)
 * 5. Incident Commander (IncidentAgent)
 * 6. Chief Intelligence Officer (ChiefIntelligenceAgent)
 */

import { AgentSpecialistRole } from '../types/phase17';
import {
  DistributedAgentDescriptor,
  AgentAvailabilityStatus,
  AgentHealthStatus,
  AgentMessageEnvelope,
} from '../types/phase31';
import { AgentCommunicationProtocol } from './AgentCommunicationProtocol';
import { DistributedEventBus } from './DistributedEventBus';

export class DistributedAgentNetwork {
  private static instance: DistributedAgentNetwork | null = null;
  private agents: Map<string, DistributedAgentDescriptor> = new Map();
  private listeners: Set<(agents: DistributedAgentDescriptor[]) => void> = new Set();
  private heartbeatInterval: any = null;

  public constructor() {
    this.registerCanonicalSpecialists();
    this.startHeartbeatMonitor();
  }

  public static getInstance(): DistributedAgentNetwork {
    if (!DistributedAgentNetwork.instance) {
      DistributedAgentNetwork.instance = new DistributedAgentNetwork();
    }
    return DistributedAgentNetwork.instance;
  }

  public static resetInstance(): void {
    if (DistributedAgentNetwork.instance) {
      DistributedAgentNetwork.instance.cleanup();
      DistributedAgentNetwork.instance = null;
    }
  }

  public cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.listeners.clear();
  }

  private registerCanonicalSpecialists(): void {
    const now = new Date().toISOString();

    const canonicalAgents: DistributedAgentDescriptor[] = [
      {
        id: 'agent-operations-lead',
        role: 'OperationsAgent',
        name: 'Operations Lead',
        capabilities: [
          'SESSION_LIFECYCLE',
          'TELEMETRY_PIPELINE',
          'RUNTIME_COORDINATION',
          'ENVIRONMENT_INVARIANCE_AUDIT',
        ],
        availability: 'IDLE',
        healthStatus: 'HEALTHY',
        currentWorkload: 0,
        maxCapacity: 5,
        assignedTaskIds: [],
        completedTaskCount: 14,
        failedTaskCount: 0,
        lastHeartbeat: now,
        latencyMs: 12.4,
        endpoint: 'in-proc://agents/operations-lead',
        permissions: ['READ_TELEMETRY', 'DISPATCH_OPERATIONS', 'RESET_SESSION'],
      },
      {
        id: 'agent-test-orchestrator',
        role: 'TestAgent',
        name: 'Automated Test Orchestrator',
        capabilities: [
          'TEST_EXECUTION',
          'SCENARIO_INSPECTION',
          'CHAOS_INJECTION',
          'ASSERTION_VALIDATION',
          'REGRESSION_MONITOR',
        ],
        availability: 'IDLE',
        healthStatus: 'HEALTHY',
        currentWorkload: 0,
        maxCapacity: 6,
        assignedTaskIds: [],
        completedTaskCount: 22,
        failedTaskCount: 0,
        lastHeartbeat: now,
        latencyMs: 15.1,
        endpoint: 'in-proc://agents/test-orchestrator',
        permissions: ['EXECUTE_TESTS', 'MANAGE_QUEUE', 'READ_ASSERTIONS'],
      },
      {
        id: 'agent-tracking-specialist',
        role: 'TrackingAgent',
        name: 'Tracking Specialist',
        capabilities: [
          'JOINT_POSE_INSPECTION',
          'OCCLUSION_ANALYSIS',
          'KINEMATIC_ALIGNMENT',
          'ANATOMICAL_VERIFICATION',
        ],
        availability: 'IDLE',
        healthStatus: 'HEALTHY',
        currentWorkload: 0,
        maxCapacity: 4,
        assignedTaskIds: [],
        completedTaskCount: 38,
        failedTaskCount: 0,
        lastHeartbeat: now,
        latencyMs: 10.8,
        endpoint: 'in-proc://agents/tracking-specialist',
        permissions: ['READ_TRACKING', 'RECALIBRATE_SKELETON', 'FLAG_OCCLUSIONS'],
      },
      {
        id: 'agent-performance-engineer',
        role: 'PerformanceAgent',
        name: 'Performance Engineer',
        capabilities: [
          'CADENCE_STABILITY',
          'LATENCY_PROFILING',
          'BOTTLENECK_DETECTION',
          'BUDGET_ENFORCEMENT',
          'WORKLOAD_REBALANCING',
        ],
        availability: 'IDLE',
        healthStatus: 'HEALTHY',
        currentWorkload: 0,
        maxCapacity: 5,
        assignedTaskIds: [],
        completedTaskCount: 19,
        failedTaskCount: 0,
        lastHeartbeat: now,
        latencyMs: 11.2,
        endpoint: 'in-proc://agents/performance-engineer',
        permissions: ['READ_PERFORMANCE', 'THROTTLE_RENDER', 'TUNE_CADENCE'],
      },
      {
        id: 'agent-incident-commander',
        role: 'IncidentAgent',
        name: 'Incident Commander',
        capabilities: [
          'ANOMALY_TRIAGE',
          'INCIDENT_CLASSIFICATION',
          'ROOT_CAUSE_ANALYSIS',
          'RESOLUTION_VERIFICATION',
          'CONTAINMENT_DISPATCH',
        ],
        availability: 'IDLE',
        healthStatus: 'HEALTHY',
        currentWorkload: 0,
        maxCapacity: 4,
        assignedTaskIds: [],
        completedTaskCount: 9,
        failedTaskCount: 0,
        lastHeartbeat: now,
        latencyMs: 13.9,
        endpoint: 'in-proc://agents/incident-commander',
        permissions: ['CREATE_INCIDENT', 'ACKNOWLEDGE_ALERT', 'CLOSE_INCIDENT'],
      },
      {
        id: 'agent-chief-intelligence',
        role: 'ChiefIntelligenceAgent',
        name: 'Chief Intelligence Officer',
        capabilities: [
          'SYNTHESIS_REPORTING',
          'CONSENSUS_ARBITRATION',
          'STRATEGIC_ALIGNMENT',
          'CROSS_SYSTEM_SYNCHRONIZATION',
          'RULE_2_INVARIANCE',
        ],
        availability: 'IDLE',
        healthStatus: 'HEALTHY',
        currentWorkload: 0,
        maxCapacity: 8,
        assignedTaskIds: [],
        completedTaskCount: 45,
        failedTaskCount: 0,
        lastHeartbeat: now,
        latencyMs: 16.5,
        endpoint: 'in-proc://agents/chief-intelligence',
        permissions: ['APPROVE_CONSENSUS', 'EVALUATE_DISPUTES', 'SUPERVISE_COUNCIL'],
      },
    ];

    for (const a of canonicalAgents) {
      this.agents.set(a.id, a);
    }
  }

  private startHeartbeatMonitor(): void {
    // Check heartbeat liveliness every 10 seconds
    this.heartbeatInterval = setInterval(() => {
      const nowMs = Date.now();
      let updated = false;

      for (const agent of this.agents.values()) {
        const lastHbMs = new Date(agent.lastHeartbeat).getTime();
        const elapsed = nowMs - lastHbMs;

        if (elapsed > 45000 && agent.healthStatus !== 'UNRESPONSIVE') {
          agent.healthStatus = 'UNRESPONSIVE';
          agent.availability = 'OFFLINE';
          updated = true;
        } else if (elapsed > 20000 && agent.healthStatus === 'HEALTHY') {
          agent.healthStatus = 'DEGRADED';
          updated = true;
        }
      }

      if (updated) {
        this.notifyListeners();
      }
    }, 10000);
  }

  public recordHeartbeat(agentId: string, latencyMs?: number): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    agent.lastHeartbeat = new Date().toISOString();
    agent.healthStatus = 'HEALTHY';
    if (agent.availability === 'OFFLINE') {
      agent.availability = agent.currentWorkload >= agent.maxCapacity ? 'BUSY' : 'IDLE';
    }
    if (typeof latencyMs === 'number' && latencyMs > 0) {
      agent.latencyMs = Math.round((agent.latencyMs * 0.7 + latencyMs * 0.3) * 10) / 10;
    }
    this.notifyListeners();
    return true;
  }

  public getAgent(agentId: string): DistributedAgentDescriptor | undefined {
    return this.agents.get(agentId);
  }

  public getAgentByRole(role: AgentSpecialistRole): DistributedAgentDescriptor | undefined {
    for (const a of this.agents.values()) {
      if (a.role === role) return a;
    }
    return undefined;
  }

  public getAllAgents(): DistributedAgentDescriptor[] {
    return Array.from(this.agents.values());
  }

  /**
   * Discovers available agents matching one or more required capabilities.
   */
  public discoverAgentsByCapability(requiredCapability: string): DistributedAgentDescriptor[] {
    return Array.from(this.agents.values()).filter(
      (a) =>
        a.healthStatus !== 'UNRESPONSIVE' &&
        a.availability !== 'OFFLINE' &&
        a.capabilities.includes(requiredCapability)
    );
  }

  /**
   * Updates an agent's workload and availability state.
   */
  public updateAgentWorkload(agentId: string, deltaTasks: number, taskId?: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    agent.currentWorkload = Math.max(0, agent.currentWorkload + deltaTasks);

    if (taskId) {
      if (deltaTasks > 0 && !agent.assignedTaskIds.includes(taskId)) {
        agent.assignedTaskIds.push(taskId);
      } else if (deltaTasks < 0) {
        agent.assignedTaskIds = agent.assignedTaskIds.filter((id) => id !== taskId);
        agent.completedTaskCount += 1;
      }
    }

    if (agent.currentWorkload >= agent.maxCapacity) {
      agent.availability = 'BUSY';
    } else if (agent.currentWorkload === 0) {
      agent.availability = 'IDLE';
    }

    this.notifyListeners();
  }

  /**
   * Delegating a task from one agent to another with validated message exchange.
   */
  public delegateTask(
    senderAgentId: string,
    targetAgentId: string,
    taskId: string,
    instructions: string
  ): AgentMessageEnvelope {
    const sender = this.agents.get(senderAgentId);
    const target = this.agents.get(targetAgentId);

    if (!sender) {
      throw new Error(`Sender agent ${senderAgentId} is not registered`);
    }
    if (!target) {
      throw new Error(`Target agent ${targetAgentId} is not registered`);
    }

    const proto = AgentCommunicationProtocol.getInstance();
    const envelope = proto.sendMessage({
      senderId: sender.id,
      receiverId: target.id,
      category: 'TASK_REQUEST',
      payload: { taskId, instructions, delegatedBy: sender.role },
      ackRequired: true,
    });

    DistributedEventBus.getInstance().publish({
      eventType: 'TASK_DELEGATED',
      source: 'DistributedAgentNetwork',
      priority: 'MEDIUM',
      payload: { sender: sender.id, target: target.id, taskId },
      suppressionFingerprint: `task-delegated-${taskId}-${sender.id}-${target.id}`,
    });

    return envelope;
  }

  public subscribe(listener: (agents: DistributedAgentDescriptor[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getAllAgents());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const list = this.getAllAgents();
    this.listeners.forEach((l) => l(list));
  }
}
