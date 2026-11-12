/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 31 Test Suite: Distributed AI Architecture & Multi-Agent Intelligence Network
 * Comprehensive verification of:
 * 1. DistributedAIOrchestrationEngine (Task registration, decomposition, idempotency, retries)
 * 2. DistributedAgentNetwork (Discovery, availability, capability routing, liveliness)
 * 3. IntelligentWorkloadBalancer (Workload allocation, capacity limits, overload prevention)
 * 4. AgentCommunicationProtocol (Envelopes, hashing, signatures, delivery, reject malicious code)
 * 5. DistributedKnowledgeSyncEngine (Versioning, conflict detection, resolution strategies, offline queue)
 * 6. DistributedFaultToleranceEngine (Circuit breakers: CLOSED -> OPEN -> HALF_OPEN, manual reset)
 * 7. DistributedEventBus (Publish/subscribe, duplicate suppression, critical incident correlation)
 * 8. DistributedAIProviderRouter (Model route discovery, latency tracking, fallback selection)
 * 9. DistributedConsensusEngine (Quorum evaluation, minority preservation, human approval gate)
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { DistributedAIOrchestrationEngine } from '../src/engines/DistributedAIOrchestrationEngine';
import { DistributedAgentNetwork } from '../src/engines/DistributedAgentNetwork';
import { IntelligentWorkloadBalancer } from '../src/engines/IntelligentWorkloadBalancer';
import { AgentCommunicationProtocol } from '../src/engines/AgentCommunicationProtocol';
import { DistributedKnowledgeSyncEngine } from '../src/engines/DistributedKnowledgeSyncEngine';
import { DistributedFaultToleranceEngine } from '../src/engines/DistributedFaultToleranceEngine';
import { DistributedEventBus } from '../src/engines/DistributedEventBus';
import { DistributedAIProviderRouter } from '../src/engines/DistributedAIProviderRouter';
import { DistributedConsensusEngine } from '../src/engines/DistributedConsensusEngine';

describe('Phase 31: Distributed AI Architecture & Multi-Agent Network', () => {
  beforeEach(() => {
    DistributedAIOrchestrationEngine.resetInstance();
    DistributedAgentNetwork.resetInstance();
    IntelligentWorkloadBalancer.resetInstance();
    AgentCommunicationProtocol.resetInstance();
    DistributedKnowledgeSyncEngine.resetInstance();
    DistributedFaultToleranceEngine.resetInstance();
    DistributedEventBus.resetInstance();
    DistributedAIProviderRouter.resetInstance();
    DistributedConsensusEngine.resetInstance();
  });

  describe('1. DistributedAIOrchestrationEngine', () => {
    it('registers tasks and enforces idempotency based on unique idempotency keys', () => {
      const orchestrator = DistributedAIOrchestrationEngine.getInstance();
      const task1 = orchestrator.registerTask({
        idempotencyKey: 'idemp-telemetry-sync-100',
        taskType: 'TELEMETRY_PIPELINE_VERIFY',
        title: 'Initial Telemetry Check',
        priority: 'HIGH',
        payload: { targetFps: 72 },
      });

      assert.ok(task1.id);
      assert.equal(task1.title, 'Initial Telemetry Check');
      assert.equal(task1.status, 'ASSIGNED'); // Auto-assigned by workload balancer

      // Re-registering with the same idempotency key must return the exact same task
      const task2 = orchestrator.registerTask({
        idempotencyKey: 'idemp-telemetry-sync-100',
        taskType: 'TELEMETRY_PIPELINE_VERIFY',
        title: 'Initial Telemetry Check (Duplicate Attempt)',
        priority: 'HIGH',
        payload: { targetFps: 72 },
      });

      assert.equal(task1.id, task2.id);
      assert.equal(task2.title, 'Initial Telemetry Check');
    });

    it('decomposes complex parent tasks into subtasks with dependency tracking', () => {
      const orchestrator = DistributedAIOrchestrationEngine.getInstance();
      const parent = orchestrator.registerTask({
        idempotencyKey: 'idemp-parent-mission-01',
        taskType: 'MISSION_PREPARATION',
        title: 'Master Mission Initialization',
        priority: 'NORMAL',
        payload: { missionId: 'void-chamber-alpha' },
      });

      const subtasks = orchestrator.decomposeTask(parent.id, [
        {
          title: 'Subtask 1: Optical Alignment',
          taskType: 'TRACKING_INSPECTION',
          payload: { minJoints: 20 },
          dependsOnPrevious: false,
        },
        {
          title: 'Subtask 2: Cadence Tuning',
          taskType: 'PERFORMANCE_TUNING',
          payload: { targetFps: 72 },
          dependsOnPrevious: true,
        },
      ]);

      assert.equal(subtasks.length, 2);
      assert.equal(subtasks[0].parentTaskId, parent.id);
      assert.equal(subtasks[1].dependencies.length, 1);
      assert.equal(subtasks[1].dependencies[0], subtasks[0].id);

      const refreshedParent = orchestrator.getTask(parent.id);
      assert.equal(refreshedParent?.status, 'WAITING');
    });

    it('handles retries and moves task to FAILED when maximum retry ceiling is exceeded', () => {
      const orchestrator = DistributedAIOrchestrationEngine.getInstance();
      const task = orchestrator.registerTask({
        idempotencyKey: 'idemp-fail-test-01',
        taskType: 'FAULTY_OPERATION',
        title: 'Unstable Worker Task',
        priority: 'NORMAL',
        maxRetries: 1,
        payload: {},
      });

      // First failure -> RETRYING
      orchestrator.failTask(task.id, 'Connection timeout');
      const state1 = orchestrator.getTask(task.id);
      assert.equal(state1?.status, 'RETRYING');
      assert.equal(state1?.retryCount, 1);

      // Second failure -> Exceeds maxRetries (1) -> FAILED
      orchestrator.failTask(task.id, 'Persistent socket drop');
      const state2 = orchestrator.getTask(task.id);
      assert.equal(state2?.status, 'FAILED');
      assert.ok(state2?.failureReason?.includes('Permanent failure'));
    });
  });

  describe('2. DistributedAgentNetwork', () => {
    it('initializes canonical six specialist agents with unique identities', () => {
      const network = DistributedAgentNetwork.getInstance();
      const all = network.getAllAgents();

      assert.equal(all.length, 6);
      const roles = all.map((a) => a.role);
      assert.ok(roles.includes('OperationsAgent'));
      assert.ok(roles.includes('TestAgent'));
      assert.ok(roles.includes('TrackingAgent'));
      assert.ok(roles.includes('PerformanceAgent'));
      assert.ok(roles.includes('IncidentAgent'));
      assert.ok(roles.includes('ChiefIntelligenceAgent'));

      all.forEach((agent) => {
        assert.ok(agent.capabilities.length > 0);
        assert.ok(agent.permissions.length > 0);
        assert.equal(agent.healthStatus, 'HEALTHY');
      });
    });

    it('discovers agents by verified capability without returning unresponsive workers', () => {
      const network = DistributedAgentNetwork.getInstance();
      const trackingCapable = network.discoverAgentsByCapability('JOINT_POSE_INSPECTION');

      assert.ok(trackingCapable.length >= 1);
      assert.equal(trackingCapable[0].id, 'agent-tracking-specialist');
    });

    it('updates workload and availability state accurately', () => {
      const network = DistributedAgentNetwork.getInstance();
      const agentId = 'agent-operations-lead';

      network.updateAgentWorkload(agentId, 2, 'task-01');
      let agent = network.getAgent(agentId);
      assert.equal(agent?.currentWorkload, 2);
      assert.ok(agent?.assignedTaskIds.includes('task-01'));

      network.updateAgentWorkload(agentId, -2, 'task-01');
      agent = network.getAgent(agentId);
      assert.equal(agent?.currentWorkload, 0);
      assert.equal(agent?.availability, 'IDLE');
    });
  });

  describe('3. IntelligentWorkloadBalancer', () => {
    it('assigns tasks to appropriate specialist agent based on task type capability match', () => {
      const orchestrator = DistributedAIOrchestrationEngine.getInstance();
      const balancer = IntelligentWorkloadBalancer.getInstance();

      const task = orchestrator.registerTask({
        idempotencyKey: 'idemp-test-balance-01',
        taskType: 'CADENCE_PERFORMANCE_CHECK',
        title: 'Check Framerate Jitter',
        priority: 'NORMAL',
        payload: {},
      });

      const assignment = balancer.assignTask(task);
      assert.ok(assignment.success);
      assert.equal(assignment.assignedAgentId, 'agent-performance-engineer');
    });

    it('computes cluster workload utilization metrics accurately', () => {
      const balancer = IntelligentWorkloadBalancer.getInstance();
      const metrics = balancer.getClusterMetrics();

      assert.ok(metrics.totalCapacity > 0);
      assert.ok(metrics.agentDistribution.length === 6);
      assert.equal(typeof metrics.utilizationPercent, 'number');
    });
  });

  describe('4. AgentCommunicationProtocol', () => {
    it('creates secure message envelopes with cryptographic digests', () => {
      const proto = AgentCommunicationProtocol.getInstance();
      const envelope = proto.sendMessage({
        senderId: 'agent-operations-lead',
        receiverId: 'agent-tracking-specialist',
        category: 'TASK_REQUEST',
        payload: { action: 'VERIFY_JOINTS', expected: 25 },
        ackRequired: true,
      });

      assert.ok(envelope.id.startsWith('msg-'));
      assert.ok(envelope.signature.startsWith('dgst-'));
      assert.equal(envelope.deliveryStatus, 'DELIVERED');
      assert.equal(envelope.ackRequired, true);

      // Recipient acknowledges message
      const ackSuccess = proto.acknowledgeMessage(envelope.id, 'agent-tracking-specialist');
      assert.equal(ackSuccess, true);

      const refreshed = proto.getMessage(envelope.id);
      assert.equal(refreshed?.deliveryStatus, 'ACKNOWLEDGED');
      assert.ok(refreshed?.acknowledgedAt);
    });

    it('strictly rejects malicious payloads attempting arbitrary code execution', () => {
      const proto = AgentCommunicationProtocol.getInstance();

      assert.throws(() => {
        proto.sendMessage({
          senderId: 'agent-operations-lead',
          receiverId: 'agent-tracking-specialist',
          category: 'TASK_REQUEST',
          payload: { code: '<script>alert(1)</script>' },
        });
      }, /Executable code or prototype pollution/);

      assert.throws(() => {
        proto.sendMessage({
          senderId: 'agent-operations-lead',
          receiverId: 'agent-tracking-specialist',
          category: 'TASK_REQUEST',
          payload: { bad: 'eval(maliciousCode)' },
        });
      }, /Executable code or prototype pollution/);
    });
  });

  describe('5. DistributedKnowledgeSyncEngine', () => {
    it('synchronizes knowledge entities with semantic versioning and checksum verification', () => {
      const syncEngine = DistributedKnowledgeSyncEngine.getInstance();
      const res = syncEngine.publishKnowledge({
        key: 'chamber.crystal.resonance',
        domain: 'CHAMBER_PHYSICS',
        data: { frequencyHz: 432, harmonicIndex: 1.618 },
        sourceAgentId: 'agent-chief-intelligence',
      });

      assert.equal(res.conflictDetected, false);
      assert.equal(res.item.version, 1);
      assert.ok(res.item.checksum.startsWith('chk-'));
    });

    it('detects conflicting updates and prevents silent overwriting', () => {
      const syncEngine = DistributedKnowledgeSyncEngine.getInstance();
      syncEngine.publishKnowledge({
        key: 'safety.laser.power',
        domain: 'SAFETY_SYSTEMS',
        data: { maxOutputMilliwatts: 50 },
        sourceAgentId: 'agent-operations-lead',
        version: 2,
        resolutionStrategy: 'HIGHER_VERSION',
      });

      // Attempt to publish lower version with divergent data
      const conflictRes = syncEngine.publishKnowledge({
        key: 'safety.laser.power',
        domain: 'SAFETY_SYSTEMS',
        data: { maxOutputMilliwatts: 900 },
        sourceAgentId: 'agent-test-orchestrator',
        version: 1, // Lower version!
        resolutionStrategy: 'HIGHER_VERSION',
      });

      assert.equal(conflictRes.conflictDetected, true);
      const current = syncEngine.getKnowledge('safety.laser.power');
      // Existing data must remain intact and not silently overwritten
      assert.equal(current?.data.maxOutputMilliwatts, 50);
      assert.equal(current?.conflictState, 'CONFLICT_DETECTED');
    });

    it('buffers updates in offline queue and flushes them upon reconnection', () => {
      const syncEngine = DistributedKnowledgeSyncEngine.getInstance();
      syncEngine.setOnlineStatus(false);

      syncEngine.publishKnowledge({
        key: 'offline.telemetry.buffer',
        domain: 'OFFLINE_TELEMETRY',
        data: { samples: [1, 2, 3] },
        sourceAgentId: 'agent-performance-engineer',
      });

      assert.equal(syncEngine.getOfflineQueue().length, 1);

      // Reconnect
      syncEngine.setOnlineStatus(true);
      assert.equal(syncEngine.getOfflineQueue().length, 0);
      assert.ok(syncEngine.getKnowledge('offline.telemetry.buffer'));
    });
  });

  describe('6. DistributedFaultToleranceEngine', () => {
    it('manages circuit breaker states: CLOSED -> OPEN -> HALF_OPEN', () => {
      const ft = DistributedFaultToleranceEngine.getInstance();
      const targetId = 'agent-operations-lead';

      assert.equal(ft.canExecute(targetId), true);
      const breaker = ft.getBreaker(targetId);
      assert.equal(breaker?.state, 'CLOSED');

      // Induce 3 failures to trip breaker
      ft.recordFailure(targetId, 'Network partition 1');
      ft.recordFailure(targetId, 'Network partition 2');
      ft.recordFailure(targetId, 'Network partition 3');

      assert.equal(breaker?.state, 'OPEN');
      assert.equal(ft.canExecute(targetId), false); // Execution blocked!

      // Manual operator reset
      const resetOk = ft.manualReset(targetId);
      assert.equal(resetOk, true);
      assert.equal(breaker?.state, 'CLOSED');
      assert.equal(ft.canExecute(targetId), true);
    });
  });

  describe('7. DistributedEventBus', () => {
    it('publishes and routes events with duplicate suppression window', () => {
      const bus = DistributedEventBus.getInstance();
      let receivedCount = 0;

      const unsub = bus.subscribeToEvent('CUSTOM_TELEMETRY_PULSE', () => {
        receivedCount++;
      });

      // First publish -> succeeds
      const evt1 = bus.publish({
        eventType: 'CUSTOM_TELEMETRY_PULSE',
        source: 'TestRunner',
        payload: { pulseId: 1 },
        suppressionFingerprint: 'pulse-fp-101',
      });
      assert.ok(evt1);
      assert.equal(receivedCount, 1);

      // Immediate duplicate publish with same fingerprint -> suppressed
      const evt2 = bus.publish({
        eventType: 'CUSTOM_TELEMETRY_PULSE',
        source: 'TestRunner',
        payload: { pulseId: 1 },
        suppressionFingerprint: 'pulse-fp-101',
      });
      assert.equal(evt2, null); // Suppressed!
      assert.equal(receivedCount, 1);

      unsub();
    });
  });

  describe('8. DistributedAIProviderRouter', () => {
    it('discovers real configured providers and routes tasks with latency tracking', () => {
      const router = DistributedAIProviderRouter.getInstance();
      const all = router.getAllRoutes();

      assert.ok(all.length >= 4);
      const names = all.map((r) => r.providerId);
      assert.ok(names.includes('provider-gemini-server'));
      assert.ok(names.includes('provider-local-heuristic'));

      const chosen = router.selectBestProvider('DIAGNOSTIC_SYNTHESIS');
      assert.ok(chosen);
      assert.ok(chosen.providerId);

      // Record latency sample
      router.recordExecutionResult(chosen.providerId, 150.0, true);
      const updated = router.getRoute(chosen.providerId);
      assert.ok(updated);
      assert.ok(updated.averageLatencyMs > 0);
    });
  });

  describe('9. DistributedConsensusEngine', () => {
    it('evaluates multi-agent consensus, preserves minority opinions, and supports human operator approval', () => {
      const consensus = DistributedConsensusEngine.getInstance();

      const report = consensus.evaluateConsensus({
        topic: 'Authorize Optical Tracking Recalibration',
        opinions: [
          {
            agentId: 'agent-operations-lead',
            agentRole: 'OperationsAgent',
            stance: 'APPROVE',
            confidence: 90,
            rationale: 'Nominal operational window available.',
            timestamp: new Date().toISOString(),
          },
          {
            agentId: 'agent-tracking-specialist',
            agentRole: 'TrackingAgent',
            stance: 'APPROVE',
            confidence: 95,
            rationale: 'Camera FOV clear for recalibration.',
            timestamp: new Date().toISOString(),
          },
          {
            agentId: 'agent-incident-commander',
            agentRole: 'IncidentAgent',
            stance: 'REJECT',
            confidence: 85,
            rationale: 'Minor cadence flutter detected; recommend pausing 5s first.',
            timestamp: new Date().toISOString(),
          },
        ],
        requiresHumanApproval: true,
      });

      assert.ok(report.id);
      assert.equal(report.opinions.length, 3);
      assert.ok(report.disagreements.length > 0); // Preserved IncidentAgent rejection!
      assert.equal(report.humanApprovalState, 'PENDING');

      // Operator submits human approval
      const approved = consensus.submitHumanDecision(report.id, true, 'Lead Engineer');
      assert.equal(approved, true);

      const refreshed = consensus.getReport(report.id);
      assert.equal(refreshed?.humanApprovalState, 'APPROVED');
      assert.ok(refreshed?.approvedBy?.includes('Lead Engineer'));
    });
  });
});
