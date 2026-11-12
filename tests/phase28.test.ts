/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 28 Test Suite: Autonomous Mission Research & Execution Intelligence.
 * Verifies:
 * 1. Evidence-based autonomous research, objective decomposition, citation grounding, and contradiction detection.
 * 2. Multi-tier evidence validation distinguishing VERIFIED, PARTIALLY_VERIFIED, UNVERIFIED, CONTRADICTED, and INSUFFICIENT_EVIDENCE.
 * 3. Autonomous task orchestration and dependency sequencing across the 6 specialist agents.
 * 4. Mission lifecycle state transitions with strict invalid transition rejection.
 * 5. Verification gate: prohibition of task completion without verifiable empirical proof.
 * 6. Predictive execution monitoring, delay detection, and strictly marked simulated alerts.
 * 7. Autonomous recovery intelligence and HumanApprovalManager gating on high-impact interventions.
 * 8. Multi-agent council coordination across the 6 specialist agents with consensus and dispute mediation.
 * 9. Mission knowledge integration, duplicate mission prevention, and cross-phase pattern retrieval.
 * 10. Aggregated system state and persistence mode resolution.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { AutonomousMissionResearchEngine } from '../src/engines/AutonomousMissionResearchEngine';
import { MissionEvidenceValidator } from '../src/engines/MissionEvidenceValidator';
import { MissionTaskOrchestrator } from '../src/engines/MissionTaskOrchestrator';
import { PredictiveExecutionMonitor } from '../src/engines/PredictiveExecutionMonitor';
import { MissionRecoveryIntelligence } from '../src/engines/MissionRecoveryIntelligence';
import { MissionResearchAgentCoordinator } from '../src/engines/MissionResearchAgentCoordinator';
import { MissionKnowledgeIntegrator } from '../src/engines/MissionKnowledgeIntegrator';
import { MissionExecutionIntelligence } from '../src/engines/MissionExecutionIntelligence';
import { HumanApprovalManager } from '../src/engines/HumanApprovalManager';
import { MissionObjective, MissionExecutionTask } from '../src/types/phase28';
import { VRTelemetry } from '../src/types/diagnostics';
import { IncidentRecord } from '../src/types/phase17';

// Fixture: Nominal Telemetry
const nominalTelemetry: VRTelemetry = {
  sessionId: 'test-session-p28-nominal',
  startedAt: new Date().toISOString(),
  frames: [
    { timestampMs: Date.now() - 100, frameDurationMs: 13.8, dropped: false },
    { timestampMs: Date.now() - 50, frameDurationMs: 13.5, dropped: false },
    { timestampMs: Date.now(), frameDurationMs: 13.7, dropped: false },
  ],
  latencySamples: [
    { timestampMs: Date.now() - 100, latencyMs: 12.5 },
    { timestampMs: Date.now(), latencyMs: 13.0 },
  ],
  trackingEvents: [],
  joints: Array.from({ length: 25 }, (_, i) => ({
    jointId: `joint_${i}`,
    tracked: true,
    confidence: 0.98,
  })),
  expectedJointCount: 25,
  lightingPreset: 'bright_studio',
  thresholds: {},
  executedCategories: [],
};

// Fixture: Stressed Telemetry (Low FPS & High Latency)
const stressedTelemetry: VRTelemetry = {
  sessionId: 'test-session-p28-stressed',
  startedAt: new Date().toISOString(),
  frames: [
    { timestampMs: Date.now() - 100, frameDurationMs: 25.0, dropped: true },
    { timestampMs: Date.now() - 50, frameDurationMs: 30.0, dropped: true },
    { timestampMs: Date.now(), frameDurationMs: 22.0, dropped: false },
  ],
  latencySamples: [
    { timestampMs: Date.now() - 100, latencyMs: 25.5 },
    { timestampMs: Date.now(), latencyMs: 27.0 },
  ],
  trackingEvents: [],
  joints: Array.from({ length: 25 }, (_, i) => ({
    jointId: `joint_${i}`,
    tracked: i < 18, // 7 occluded joints
    confidence: i < 18 ? 0.90 : 0.35,
  })),
  expectedJointCount: 25,
  lightingPreset: 'low_light',
  thresholds: {},
  executedCategories: [],
};

// Fixture: Sample Incidents
const sampleIncidents: IncidentRecord[] = [
  {
    incidentId: 'INC-P28-01',
    fingerprint: 'fp-p28-01',
    sessionId: stressedTelemetry.sessionId,
    category: 'render_cadence_drop',
    severity: 'HIGH',
    state: 'ACTION_REQUIRED',
    title: 'Frame Time Throttling under Glare',
    detectedAt: new Date().toISOString(),
    resolvedAt: null,
    telemetryEvidence: { fps: 42, latency: 26.5 },
    diagnosticExplanation: 'Frame delta exceeded threshold during fast headturn.',
    recommendedAction: 'Engage dynamic render downsampling.',
    resolutionNotes: null,
    resolvedBy: null,
    rule2ComplianceVerified: true,
    occurrenceCount: 1,
  },
];

const testObjective: MissionObjective = {
  id: 'mission-test-01',
  title: 'Optimize Dynamic 25-Joint Kinematic Tracking',
  statement: 'Sustain sub-14ms telemetry cadence and verified 25-joint skeleton lock.',
  scope: 'Spatial Sensors & IMU Sync',
  targetMetrics: {
    minCadenceFps: 72,
    maxLatencyMs: 14,
    minJointConfidence: 0.95,
    maxAllowedFailures: 0,
  },
  constraints: [
    'Enforce Rule #2 inconclusive verification',
    'Human operator approval required for critical changes',
  ],
  priority: 'HIGH',
  assignedLeadAgent: 'OperationsAgent',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('Phase 28: Autonomous Mission Research & Execution Intelligence Test Suite', () => {
  beforeEach(() => {
    AutonomousMissionResearchEngine.resetInstance();
    MissionEvidenceValidator.resetInstance();
    MissionTaskOrchestrator.resetInstance();
    PredictiveExecutionMonitor.resetInstance();
    MissionRecoveryIntelligence.resetInstance();
    MissionResearchAgentCoordinator.resetInstance();
    MissionKnowledgeIntegrator.resetInstance();
    MissionExecutionIntelligence.resetInstance();
    HumanApprovalManager.resetInstance();
  });

  it('1. Autonomous Mission Research: decomposes questions, collects sources, and identifies gaps', () => {
    const researchEngine = AutonomousMissionResearchEngine.getInstance();
    const result = researchEngine.conductMissionResearch(testObjective, nominalTelemetry, []);

    assert.ok(result.researchId.startsWith('res-'));
    assert.strictEqual(result.missionId, testObjective.id);
    assert.ok(result.decomposedQuestions.length >= 4);
    assert.ok(result.sources.length >= 2);
    assert.ok(result.evidence.length >= 2);
    assert.ok(result.confidenceLevel > 0 && result.confidenceLevel <= 100);
    assert.strictEqual(result.verificationStatus, 'VERIFIED');
    assert.ok(result.summary.length > 20);

    // Contradiction detection test under stressed conditions (Objective demands 90 FPS, telemetry is ~42 FPS)
    const demandingObjective: MissionObjective = {
      ...testObjective,
      id: 'mission-test-demanding',
      targetMetrics: { ...testObjective.targetMetrics, minCadenceFps: 90 },
    };
    const stressedResult = researchEngine.conductMissionResearch(
      demandingObjective,
      stressedTelemetry,
      sampleIncidents
    );
    assert.ok(stressedResult.contradictions.length > 0);
    assert.strictEqual(stressedResult.verificationStatus, 'CONTRADICTED');
  });

  it('2. Mission Evidence Validator: rigorously classifies evidence and prevents false certainty', () => {
    const validator = MissionEvidenceValidator.getInstance();
    const researchEngine = AutonomousMissionResearchEngine.getInstance();
    const research = researchEngine.conductMissionResearch(testObjective, nominalTelemetry, []);

    const audit = validator.auditMissionEvidence(
      testObjective.id,
      research.evidence,
      research.sources
    );

    assert.strictEqual(audit.missionId, testObjective.id);
    assert.ok(audit.overallReliabilityScore > 70);
    assert.strictEqual(audit.readinessForExecution, true);
    assert.ok(audit.audits.length === research.evidence.length);

    // Unsupported evidence test: claim with no matching citation
    const orphanEvidence = [
      {
        evidenceId: 'ev-orphan-99',
        citationId: 'NON_EXISTENT_CITATION',
        claim: 'Unproven claim without peer benchmark',
        dataSnippet: 'Speculative assertion',
        verificationStatus: 'UNVERIFIED' as const,
        confidenceScore: 90,
        isSimulatedData: false,
        provenance: 'Unknown',
        recordedAt: new Date().toISOString(),
      },
    ];
    const unsupportedAudit = validator.auditMissionEvidence(testObjective.id, orphanEvidence, []);
    assert.strictEqual(unsupportedAudit.unsupportedClaimsCount, 1);
    assert.strictEqual(unsupportedAudit.overallStatus, 'PARTIALLY_VERIFIED');
    assert.ok(unsupportedAudit.audits[0].calibratedConfidence < 50, 'Confidence must be heavily discounted for unsupported claims');
  });

  it('3. Mission Task Orchestrator: sequences stages across the 6 specialist agents and handles dependencies', () => {
    const orchestrator = MissionTaskOrchestrator.getInstance();
    const plan = orchestrator.generateExecutionPlan(testObjective);

    assert.ok(plan.planId.startsWith('plan-'));
    assert.ok(plan.tasks.length >= 5);
    assert.ok(plan.executionSequence.length >= 3);

    // Verify tasks are distributed among the 6 specialist agents
    const agents = new Set(plan.tasks.map((t) => t.assignedAgent));
    assert.ok(agents.has('OperationsAgent'));
    assert.ok(agents.has('TestAgent'));
    assert.ok(agents.has('TrackingAgent'));
    assert.ok(agents.has('PerformanceAgent'));

    // Check dependency resolution: task3 depends on task1
    const task1 = plan.tasks[0];
    const task3 = plan.tasks[2];
    assert.strictEqual(task1.status, 'QUEUED');
    assert.strictEqual(task3.status, 'PENDING');

    // Completing task1 should unlock task3
    const updatedPlan = orchestrator.updateTaskStatus(
      testObjective.id,
      task1.taskId,
      'COMPLETED',
      {
        evidenceSnippet: 'Hardware latency audited at 12.8ms.',
        verifiedByAgent: 'PerformanceAgent',
        metricProof: { latencyMs: 12.8 },
      }
    );

    assert.ok(updatedPlan);
    const updatedTask3 = updatedPlan.tasks.find((t) => t.taskId === task3.taskId);
    assert.strictEqual(updatedTask3?.status, 'QUEUED');
  });

  it('4. Mission Lifecycle: enforces valid transitions and rejects illegal skips', () => {
    const engine = MissionExecutionIntelligence.getInstance();
    const res = engine.createMission(
      'Lifecycle Test Mission',
      'Test lifecycle state validation.',
      'Core Engine',
      'HIGH'
    );
    assert.strictEqual(res.success, true);
    assert.ok(res.mission);

    const missionId = res.mission.id;
    // Current state should be READY or AWAITING_APPROVAL
    const state = res.mission.state;

    // Illegal transition: Cannot jump directly to COMPLETED
    const badTransition = engine.transitionMissionState(missionId, 'COMPLETED');
    assert.strictEqual(badTransition.success, false);
    assert.ok(badTransition.message.includes('Invalid state transition'));

    // If awaiting approval, must go to READY first
    if (state === 'AWAITING_APPROVAL') {
      const readyRes = engine.transitionMissionState(missionId, 'READY');
      assert.strictEqual(readyRes.success, true);
    }

    // Now valid to transition to EXECUTING
    const execRes = engine.transitionMissionState(missionId, 'EXECUTING');
    assert.strictEqual(execRes.success, true);

    // Can pause
    const pauseRes = engine.transitionMissionState(missionId, 'PAUSED');
    assert.strictEqual(pauseRes.success, true);

    // Resume to EXECUTING
    const resumeRes = engine.transitionMissionState(missionId, 'EXECUTING');
    assert.strictEqual(resumeRes.success, true);
  });

  it('5. Verification Gate: rejects task completion without verified empirical evidence proof', () => {
    const engine = MissionExecutionIntelligence.getInstance();
    const res = engine.createMission(
      'Verification Gate Mission',
      'Test task completion evidence validation.',
      'Test Validation',
      'LOW'
    );
    assert.ok(res.mission && res.mission.executionPlan);
    const missionId = res.mission.id;
    const task = res.mission.executionPlan.tasks[0];

    // Attempt completion with empty evidence snippet
    const invalidRes1 = engine.completeTaskWithVerification(
      missionId,
      task.taskId,
      '', // Empty snippet
      { latencyMs: 12.5 }
    );
    assert.strictEqual(invalidRes1.success, false);
    assert.ok(invalidRes1.message.includes('insufficient'));

    // Attempt completion with empty metric proof
    const invalidRes2 = engine.completeTaskWithVerification(
      missionId,
      task.taskId,
      'Valid description of work executed',
      {} // Missing quantitative proof
    );
    assert.strictEqual(invalidRes2.success, false);
    assert.ok(invalidRes2.message.includes('Missing quantitative metric proof'));

    // Valid completion with verified snippet and metrics
    const validRes = engine.completeTaskWithVerification(
      missionId,
      task.taskId,
      'Performance Agent audited 100 frames with 72.5 FPS mean hold.',
      { fps: 72.5, dropped: 0 }
    );
    assert.strictEqual(validRes.success, true);
  });

  it('6. Predictive Execution Monitor: tracks progress, detects delay, and emits simulated alerts', () => {
    const monitor = PredictiveExecutionMonitor.getInstance();
    const orchestrator = MissionTaskOrchestrator.getInstance();
    const plan = orchestrator.generateExecutionPlan(testObjective);

    const status = monitor.monitorMissionExecution(
      testObjective.id,
      'EXECUTING',
      plan,
      stressedTelemetry,
      sampleIncidents
    );

    assert.strictEqual(status.missionId, testObjective.id);
    assert.ok(status.anomalies.length > 0);
    assert.ok(status.alerts.length > 0);

    // Check strict simulated prediction tag
    status.alerts.forEach((alert) => {
      assert.strictEqual(alert.isSimulatedPrediction, true, 'Alerts must be strictly tagged as simulated predictions');
    });

    assert.ok(status.failureProbability > 30);
    assert.ok(status.resourceUtilization.frameCadenceFps < 60);
  });

  it('7. Autonomous Recovery Intelligence: classifies failure and gates high-impact recovery behind operator approval', () => {
    const recoveryEngine = MissionRecoveryIntelligence.getInstance();
    const approvalMgr = HumanApprovalManager.getInstance();

    const failedTask: MissionExecutionTask = {
      taskId: 'task-fail-demo-01',
      missionId: testObjective.id,
      title: 'Render Pass Allocation',
      description: 'Allocate secondary foveated render pass.',
      assignedAgent: 'PerformanceAgent',
      priority: 'HIGH',
      status: 'FAILED',
      dependencies: [],
      estimatedDurationMs: 4000,
      retryCount: 3,
      maxRetries: 3,
      requiredEvidenceIds: [],
    };

    // Formulate recovery under stressed telemetry (cadence throttling)
    const rec = recoveryEngine.formulateRecoveryStrategy(
      testObjective.id,
      failedTask,
      stressedTelemetry,
      sampleIncidents
    );

    assert.strictEqual(rec.classification, 'CADENCE_THROTTLING');
    assert.strictEqual(rec.strategy, 'FALLBACK_SAFE_MODE');
    assert.strictEqual(rec.requiresHumanApproval, true);
    assert.ok(rec.approvalId);

    // Ensure pending approval exists in HumanApprovalManager
    const pending = approvalMgr.getPendingRequests();
    assert.ok(pending.some((p) => p.approvalId === rec.approvalId));

    // Execute recovery via approval workflow
    const execRes = recoveryEngine.executeRecovery(rec.recommendationId, 'OPERATOR_TEST_01');
    assert.strictEqual(execRes.success, true);
    assert.strictEqual(rec.status, 'EXECUTED');
  });

  it('8. Multi-Agent Council Coordination: coordinates all 6 specialist agents and mediates disputes', () => {
    const coordinator = MissionResearchAgentCoordinator.getInstance();
    const state = coordinator.coordinateAgentsForMission(
      testObjective,
      undefined,
      undefined,
      stressedTelemetry,
      sampleIncidents
    );

    assert.strictEqual(state.agents.length, 6);
    const agentRoles = state.agents.map((a) => a.role);
    assert.ok(agentRoles.includes('OperationsAgent'));
    assert.ok(agentRoles.includes('TestAgent'));
    assert.ok(agentRoles.includes('TrackingAgent'));
    assert.ok(agentRoles.includes('PerformanceAgent'));
    assert.ok(agentRoles.includes('IncidentAgent'));
    assert.ok(agentRoles.includes('ChiefIntelligenceAgent'));

    assert.ok(state.consensusScore < 90);
    assert.ok(state.activeDisagreements.length > 0);
  });

  it('9. Mission Knowledge Integrator: detects duplicate proposed missions and retrieves patterns', () => {
    const integrator = MissionKnowledgeIntegrator.getInstance();
    const engine = MissionExecutionIntelligence.getInstance();
    const systemState = engine.evaluateSystemState();

    // Check duplicate detection
    const existing = systemState.activeMissions;
    assert.ok(existing.length > 0);

    const dupCheck = integrator.checkForDuplicateMission(existing[0].objective.title, existing);
    assert.strictEqual(dupCheck.isDuplicate, true);
    assert.strictEqual(dupCheck.similarityScore, 1.0);

    const uniqueCheck = integrator.checkForDuplicateMission('Completely Novel Hyper-Dimensional Mission Vector', existing);
    assert.strictEqual(uniqueCheck.isDuplicate, false);

    // Verify reusable patterns
    const knowledgeState = integrator.getKnowledgeState();
    assert.ok(knowledgeState.patterns.length >= 3);
    assert.ok(knowledgeState.outdatedKnowledgeFlagged.length >= 2);
  });

  it('10. Aggregated System State & Persistence: manages multi-mode persistence safely', () => {
    const engine = MissionExecutionIntelligence.getInstance();
    const state = engine.evaluateSystemState(nominalTelemetry, []);

    assert.ok(state.activeMissions.length >= 1);
    assert.ok(['LOCAL_DEVELOPMENT', 'CLOUD_FIRESTORE', 'OFFLINE_FALLBACK'].includes(state.persistenceMode));
    assert.ok(state.lastUpdated);
  });
});
