/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 20 Engineering Test Suite:
 * Validates Collective Autonomous Intelligence System, Multi-Agent Communication,
 * Evidence-Weighted Debate Engine, Intelligent Mission Planning,
 * Shared Intelligence Memory, and Explainable AI Decisions.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CollectiveIntelligenceEngine,
  SIX_SPECIALIST_ROLES,
} from '../src/utils/CollectiveIntelligenceEngine';
import { AgentDebateEngine } from '../src/utils/AgentDebateEngine';
import { MissionPlanningEngine } from '../src/utils/MissionPlanningEngine';
import { VRTelemetry } from '../src/types/diagnostics';

function createMockTelemetry(overrides: Partial<VRTelemetry> = {}): VRTelemetry {
  return {
    sessionId: `phase20-test-session-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    frames: [
      { timestampMs: 1000, frameDurationMs: 13.88, dropped: false },
      { timestampMs: 1014, frameDurationMs: 13.88, dropped: false },
    ],
    joints: Array.from({ length: 25 }, (_, i) => ({
      jointId: `joint_${i}`,
      tracked: true,
      confidence: 1.0,
    })),
    expectedJointCount: 25,
    lightingPreset: 'bright_studio',
    latencySamples: [{ timestampMs: 1000, latencyMs: 13.8 }],
    trackingEvents: [{ timestampMs: 1000, tracking: true }],
    causationEvidence: null,
    thresholds: {
      minTrackedJoints: 25,
      maxLatencyMs: 33,
      maxFrameDurationMs: 16.6,
      maxRecoveryTimeMs: 100,
    },
    executedCategories: [
      'skeleton_integrity',
      'tracking_continuity',
      'frame_performance',
      'latency',
      'environmental_conditions',
      'test_execution',
    ],
    autoSavedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('Phase 20: Module 1 - Agent-to-Agent Communication Bus', () => {
  it('dispatches structured messages between specialist agents with acknowledgment tracking', () => {
    CollectiveIntelligenceEngine.resetInstance();
    const engine = CollectiveIntelligenceEngine.getInstance();

    const msg = engine.sendMessage(
      'OperationsAgent',
      'TrackingAgent',
      'TASK_REQUEST',
      'Validate palm orientation bounds',
      { thresholdDeg: 45 },
      true // requiresAck
    );

    assert.ok(msg);
    assert.equal(msg.sender, 'OperationsAgent');
    assert.equal(msg.recipient, 'TrackingAgent');
    assert.equal(msg.requiresAck, true);
    assert.equal(msg.acknowledged, false);

    // Acknowledge the message
    const acked = engine.acknowledgeMessage(msg.messageId);
    assert.equal(acked, true);

    const messages = engine.getMessages();
    const found = messages.find((m) => m.messageId === msg.messageId);
    assert.ok(found);
    assert.equal(found.acknowledged, true);
  });

  it('broadcasts status updates to all six specialist agents', () => {
    const engine = CollectiveIntelligenceEngine.getInstance();
    const broadcast = engine.sendMessage(
      'ChiefIntelligenceAgent',
      'BROADCAST',
      'ALERT_BROADCAST',
      'Global VR Command Center active'
    );

    assert.equal(broadcast.recipient, 'BROADCAST');
    assert.ok(engine.getMessages().some((m) => m.messageId === broadcast.messageId));
  });
});

describe('Phase 20: Module 2 - Multi-Agent Debate Engine', () => {
  it('conducts evidence-weighted debate without relying on simple majority voting', () => {
    AgentDebateEngine.resetInstance();
    const debateEngine = AgentDebateEngine.getInstance();

    const telemetry = createMockTelemetry({
      frames: [{ timestampMs: 1000, frameDurationMs: 24.0, dropped: true }],
      joints: Array.from({ length: 25 }, (_, i) => ({
        jointId: `joint_${i}`,
        tracked: i < 20, // 5 missing joints
        confidence: i < 20 ? 0.95 : 0.40,
      })),
      lightingPreset: 'low_light',
    });

    const debate = debateEngine.conductDebate(
      'Resource Contention: Frame Pacing vs Skeleton Tracking Priority',
      { sessionId: telemetry.sessionId },
      telemetry
    );

    assert.ok(debate);
    assert.equal(debate.isResolved, true);
    assert.ok(debate.arguments.length >= 3);
    assert.ok(debate.resolution);
    assert.ok(debate.resolution.consensusScore >= 0.50 && debate.resolution.consensusScore <= 1.0);
    assert.ok(debate.resolution.winningSynthesis.includes('Consensus Reached'));
    assert.equal(debate.resolution.rule2ComplianceChecked, true);
  });
});

describe('Phase 20: Module 3 - Intelligent Mission Planning & Human Approval Gates', () => {
  it('decomposes mission objectives into dependent tasks and enforces approval on high-impact actions', () => {
    MissionPlanningEngine.resetInstance();
    const planner = MissionPlanningEngine.getInstance();

    const mission = planner.planMission(
      'Meta Quest Thermal & Cadence Regression Sweep',
      'Inspect performance and re-anchor tracking filters under thermal load',
      'CRITICAL'
    );

    assert.ok(mission);
    assert.equal(mission.priority, 'CRITICAL');
    assert.equal(mission.requiresHumanApproval, true);
    assert.equal(mission.humanApprovalGranted, false);
    assert.equal(mission.state, 'PENDING_APPROVAL');
    assert.ok(mission.tasks.length >= 3);

    // High impact task requires approval
    const highImpactTask = mission.tasks.find((t) => t.isHighImpact);
    assert.ok(highImpactTask);
    assert.equal(highImpactTask.operatorApproved, false);

    // Operator approves the high impact task
    const approved = planner.approveTask(mission.missionId, highImpactTask.taskId);
    assert.equal(approved, true);

    const updatedTask = planner.getMissions().find((m) => m.missionId === mission.missionId)?.tasks.find((t) => t.taskId === highImpactTask.taskId);
    assert.equal(updatedTask?.operatorApproved, true);
  });

  it('updates task progress and advances mission completion percentage', () => {
    const planner = MissionPlanningEngine.getInstance();
    const missions = planner.getMissions();
    const active = missions[0];

    const firstTask = active.tasks[0];
    planner.updateTaskProgress(active.missionId, firstTask.taskId, 'COMPLETED', 'Pre-conditions validated');

    const updatedMission = planner.getMissions().find((m) => m.missionId === active.missionId);
    assert.ok(updatedMission);
    assert.ok(updatedMission.progressPercent > 0);
  });
});

describe('Phase 20: Module 4 - Shared Intelligence Memory', () => {
  it('persists, queries, and filters verified collective intelligence memory records', () => {
    CollectiveIntelligenceEngine.resetInstance();
    const engine = CollectiveIntelligenceEngine.getInstance();

    const memItem = engine.storeMemoryItem({
      category: 'RECOVERY_RESULT',
      title: 'Dynamic Resolution Recovery Pacing on Quest 3',
      summary: 'Lowering render scale to 0.85x restored 72Hz display rate within 320ms without perceivable distortion.',
      tags: ['quest3', 'drs_recovery', 'render_pipeline'],
      evidenceHash: 'HASH-DRS-RECOVERY-QUEST3',
      contributingAgents: ['PerformanceAgent', 'OperationsAgent'],
      confidenceScore: 0.95,
      verified: true,
    });

    assert.ok(memItem);
    assert.ok(memItem.memoryId);
    assert.equal(memItem.verified, true);

    const queried = engine.queryMemory('quest3');
    assert.ok(queried.length >= 1);
    assert.equal(queried[0].title, memItem.title);
  });
});

describe('Phase 20: Module 5 - Explainable AI Decisions & Human Oversight', () => {
  it('synthesizes explainable collective decisions with alternative trade-offs and uncertainty disclosures', () => {
    CollectiveIntelligenceEngine.resetInstance();
    const engine = CollectiveIntelligenceEngine.getInstance();
    const telemetry = createMockTelemetry();

    const decision = engine.synthesizeCollectiveDecision(
      'Automated Cadence Pacing Stabilization Pass',
      telemetry,
      true // requires operator approval
    );

    assert.ok(decision);
    assert.ok(decision.decisionId);
    assert.equal(decision.humanApprovalStatus, 'PENDING');
    assert.equal(decision.participatingAgents.length, 6);
    assert.ok(decision.supportingEvidence.length >= 2);
    assert.ok(decision.uncertaintyDisclosure.length > 0);

    // Operator grants approval
    const approved = engine.approveDecision(decision.decisionId);
    assert.equal(approved, true);

    const approvedDec = engine.getDecisions().find((d) => d.decisionId === decision.decisionId);
    assert.equal(approvedDec?.humanApprovalStatus, 'APPROVED');
  });
});

describe('Phase 20: Module 6 - Workload Tracking & Six Specialist Agents', () => {
  it('tracks capacity and availability across all six specialist agents', () => {
    const engine = CollectiveIntelligenceEngine.getInstance();
    const workloads = engine.getWorkloads();

    for (const role of SIX_SPECIALIST_ROLES) {
      assert.ok(workloads[role], `Workload status for '${role}' must exist`);
      assert.equal(workloads[role].maxCapacity, 4);
      assert.equal(workloads[role].isAvailable, true);
    }
  });
});

describe('Phase 20: Module 7 - Security Boundaries & Rule #2 Invariance', () => {
  it('guarantees that collective intelligence records strictly preserve Rule #2 invariants and leak zero secrets', () => {
    const engine = CollectiveIntelligenceEngine.getInstance();
    const telemetry = createMockTelemetry({
      lightingPreset: 'backlit_glare',
      causationEvidence: null, // No hardware token
    });

    const decision = engine.synthesizeCollectiveDecision(
      'Lighting Preset Evaluation under Rule #2',
      telemetry,
      false
    );

    const serialized = JSON.stringify(decision);
    assert.ok(!serialized.includes('AIzaSy'));
    assert.ok(!serialized.includes('LLAMA_API_KEY'));

    // Rule #2 strictly inconclusive
    const rule2Evidence = decision.supportingEvidence.find((e) => e.includes('Rule #2'));
    assert.ok(rule2Evidence);
    assert.ok(rule2Evidence.includes('INCONCLUSIVE'));
  });
});
