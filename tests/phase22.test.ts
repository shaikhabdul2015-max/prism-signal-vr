/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 22 Test Suite: Autonomous Mission Intelligence Platform.
 * Validates mission objective analysis, task decomposition, dependency resolution,
 * dynamic environmental adaptation, predictive risk estimation with uncertainty disclosure,
 * multi-agent task distribution, context-aware decision engine, execution controller,
 * bounded retries, Digital Twin synchronization, and strict human authorization gates.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { AutonomousMissionIntelligence } from '../src/utils/AutonomousMissionIntelligence';
import { MissionDecisionEngine } from '../src/utils/MissionDecisionEngine';
import { MissionExecutionController } from '../src/utils/MissionExecutionController';
import { VRTelemetry } from '../src/types/diagnostics';
import { AgentRole } from '../src/types/phase17';

describe('Phase 22: Advanced Mission Intelligence Engine', () => {
  beforeEach(() => {
    AutonomousMissionIntelligence.resetInstance();
  });

  it('evaluates mission feasibility and decomposes objectives into dependent task graphs', () => {
    const ami = AutonomousMissionIntelligence.getInstance();

    const mockTelemetry: VRTelemetry = {
      sessionId: 'test-feasibility',
      startedAt: new Date().toISOString(),
      expectedJointCount: 25,
      joints: Array.from({ length: 25 }, (_, i) => ({
        jointId: `joint_${i}`,
        tracked: true,
        confidence: 0.95,
      })),
      frames: [{ timestampMs: 1000, frameDurationMs: 13.88, dropped: false }],
      trackingEvents: [],
      latencySamples: [{ timestampMs: 1000, latencyMs: 14 }],
      lightingPreset: 'bright_studio',
      thresholds: {},
      executedCategories: [],
    };

    const feasibility = ami.evaluateFeasibility('RESONANCE_ALIGNMENT', mockTelemetry);
    assert.ok(feasibility.score >= 80);
    assert.strictEqual(feasibility.isFeasible, true);
    assert.ok(feasibility.estimatedDurationMs > 0);
    assert.ok(feasibility.requiredAgents.includes('TrackingAgent'));
    assert.ok(feasibility.requiredAgents.includes('ChiefIntelligenceAgent'));

    const mission = ami.generateMission(
      'RESONANCE_ALIGNMENT',
      'Test Harmonic Alignment',
      'Harmonic core testing',
      'HIGH',
      mockTelemetry
    );

    assert.ok(mission.missionId.startsWith('msn-auto-'));
    assert.strictEqual(mission.tasks.length, 3);

    // Verify task dependencies
    const [t1, t2, t3] = mission.tasks;
    assert.strictEqual(t1.dependencies.length, 0);
    assert.strictEqual(t1.status, 'READY');
    assert.ok(t2.dependencies.includes(t1.taskId));
    assert.strictEqual(t2.status, 'PENDING');
    assert.ok(t3.dependencies.includes(t2.taskId));

    // Verify high-impact flag and operator approval requirement
    assert.strictEqual(t3.isHighImpact, true);
    assert.strictEqual(t3.operatorApproved, false);
    assert.strictEqual(mission.requiresHumanApproval, true);
    assert.strictEqual(mission.state, 'PENDING_APPROVAL');

    // Verify digital twin synchronization
    assert.ok(mission.twinSnapshotRef);
    assert.ok(mission.twinSnapshotRef.checksum.startsWith('TWIN-'));
  });

  it('forecasts predictive mission risk with non-guaranteed uncertainty disclosure', () => {
    const ami = AutonomousMissionIntelligence.getInstance();

    const degradedTelemetry: VRTelemetry = {
      sessionId: 'test-risk',
      startedAt: new Date().toISOString(),
      expectedJointCount: 25,
      joints: Array.from({ length: 25 }, (_, i) => ({
        jointId: `joint_${i}`,
        tracked: i < 14, // only 14 tracked
        confidence: 0.7,
      })),
      frames: [{ timestampMs: 1000, frameDurationMs: 25.0, dropped: true }], // 40 FPS
      trackingEvents: [],
      latencySamples: [{ timestampMs: 1000, latencyMs: 65 }],
      lightingPreset: 'backlit_glare',
      thresholds: {},
      executedCategories: [],
    };

    const risk = ami.evaluateRisk('STABILITY_SWEEP', degradedTelemetry);

    // Failure probability should reflect degraded state
    assert.ok(risk.failureProbabilityPercent >= 50);
    assert.strictEqual(risk.trackingStabilityRisk, 'HIGH');
    assert.strictEqual(risk.environmentalRisk, 'HIGH');

    // MANDATORY SAFETY INVARIANT: Strictly contains uncertainty disclosure
    assert.ok(risk.uncertaintyDisclosure.includes('NOTICE'));
    assert.ok(risk.uncertaintyDisclosure.includes('probabilistic'));
  });

  it('dynamically adapts mission upon detecting environmental and cadence perturbations', () => {
    const ami = AutonomousMissionIntelligence.getInstance();

    const mission = ami.generateMission(
      'STABILITY_SWEEP',
      'Dynamic Sweep',
      'Testing dynamic adaptation',
      'MEDIUM'
    );

    const initialTaskCount = mission.tasks.length;

    // Simulate sudden optical glare dropout
    const perturbedTelemetry: VRTelemetry = {
      sessionId: 'test-perturb',
      startedAt: new Date().toISOString(),
      expectedJointCount: 25,
      joints: Array.from({ length: 25 }, (_, i) => ({
        jointId: `joint_${i}`,
        tracked: i < 12, // severe occlusion
        confidence: 0.6,
      })),
      frames: [{ timestampMs: 1000, frameDurationMs: 13.88, dropped: false }],
      trackingEvents: [],
      latencySamples: [],
      lightingPreset: 'backlit_glare',
      thresholds: {},
      executedCategories: [],
    };

    const adaptation = ami.adaptMission(mission.missionId, perturbedTelemetry);

    assert.ok(adaptation);
    assert.strictEqual(adaptation.trigger, 'ENVIRONMENTAL_SHIFT');
    assert.ok(adaptation.tasksInjected.length > 0);

    // Injected inertial fallback task should now exist at head of queue
    assert.strictEqual(mission.tasks.length, initialTaskCount + 1);
    assert.strictEqual(mission.tasks[0].assignedAgent, 'TrackingAgent');
    assert.ok(mission.tasks[0].title.includes('Inertial'));
  });
});

describe('Phase 22: Context-Aware Autonomous Decision Engine', () => {
  beforeEach(() => {
    MissionDecisionEngine.resetInstance();
  });

  it('synthesizes multi-agent trade-off decisions with confidence and uncertainty disclosure', () => {
    const mde = MissionDecisionEngine.getInstance();

    const decision = mde.synthesizeDecision(
      'msn-test-01',
      'Optical Sensor Glare Compensation',
      { fps: 71, trackedJoints: 14, lux: 1400 },
      'HIGH'
    );

    assert.ok(decision.decisionId.startsWith('dec-'));
    assert.strictEqual(decision.impactLevel, 'HIGH');
    assert.strictEqual(decision.requiresOperatorApproval, true);
    assert.strictEqual(decision.operatorApproved, false);
    assert.ok(decision.confidenceScore >= 0.85);

    // Multi-agent alternative trade-offs
    assert.ok(decision.alternatives.length >= 2);
    const agentsInvolved = decision.alternatives.map((a) => a.agent);
    assert.ok(agentsInvolved.includes('OperationsAgent'));
    assert.ok(agentsInvolved.includes('PerformanceAgent'));

    // Rule #2 compliance check
    assert.ok(decision.uncertaintyReport.includes('Rule #2'));

    // Approve decision
    const approved = mde.approveDecision(decision.decisionId, 'OPERATOR_QA_LEAD');
    assert.strictEqual(approved, true);
    assert.strictEqual(decision.operatorApproved, true);
    assert.strictEqual(decision.operatorApprovedBy, 'OPERATOR_QA_LEAD');
  });

  it('allows operator rejection of unsafe autonomous decisions with recorded override reason', () => {
    const mde = MissionDecisionEngine.getInstance();

    const decision = mde.synthesizeDecision(
      'msn-test-02',
      'Emergency Buffer Purge',
      { memoryPressurePercent: 88 },
      'CRITICAL'
    );

    const rejected = mde.rejectDecision(decision.decisionId, 'CHIEF_OPERATOR', 'Audit log retention violation');
    assert.strictEqual(rejected, true);
    assert.strictEqual(decision.operatorApproved, false);
    assert.ok(decision.rationale.includes('REJECTED'));
    assert.ok(decision.rationale.includes('Audit log retention violation'));
  });
});

describe('Phase 22: Mission Execution Controller & Operator Authorization Gates', () => {
  beforeEach(() => {
    AutonomousMissionIntelligence.resetInstance();
    MissionExecutionController.resetInstance();
  });

  it('enforces operator authorization before executing high-impact tasks', () => {
    const ami = AutonomousMissionIntelligence.getInstance();
    const controller = MissionExecutionController.getInstance();

    const mission = ami.generateMission(
      'THERMAL_CADENCE_RECOVERY',
      'Thermal Recovery Mission',
      'Test authorization enforcement',
      'HIGH'
    );

    const highImpactTask = mission.tasks.find((t) => t.isHighImpact);
    assert.ok(highImpactTask, 'Mission must contain at least one high-impact task');

    // Attempting to execute unapproved high-impact task directly enters PENDING_APPROVAL
    const startResult = controller.startMission(mission.missionId);
    assert.strictEqual(startResult, true); // Starts execution of low-impact prerequisites first

    // Snapshot should contain high-impact task in operator approval queue
    const snapshot = controller.getSnapshot();
    assert.ok(snapshot.approvalQueue.some((t) => t.taskId === highImpactTask.taskId));

    // Operator authorizes the task
    const authorized = controller.authorizeTask(mission.missionId, highImpactTask.taskId, 'SR_ENGINEER');
    assert.strictEqual(authorized, true);
    assert.strictEqual(highImpactTask.operatorApproved, true);

    // Operator rejection test
    const rejected = controller.rejectTask(mission.missionId, highImpactTask.taskId, 'SR_ENGINEER', 'Safety limit');
    assert.strictEqual(rejected, true);
    assert.strictEqual(highImpactTask.status, 'CANCELLED');
  });

  it('handles pause, resume, bounded retries, and clean mission cancellation', () => {
    const ami = AutonomousMissionIntelligence.getInstance();
    const controller = MissionExecutionController.getInstance();

    const mission = ami.generateMission('STABILITY_SWEEP', 'Lifecycle Mission', 'Test lifecycle', 'LOW');
    const task = mission.tasks[0];

    // Bounded retry test
    task.retryCount = 0;
    task.maxRetries = 2;

    const r1 = controller.retryTask(mission.missionId, task.taskId);
    assert.strictEqual(r1, true);
    assert.strictEqual(task.retryCount, 1);

    const r2 = controller.retryTask(mission.missionId, task.taskId);
    assert.strictEqual(r2, true);
    assert.strictEqual(task.retryCount, 2);

    // Third retry should be rejected due to bounded limit
    const r3 = controller.retryTask(mission.missionId, task.taskId);
    assert.strictEqual(r3, false);

    // Pause and Resume test
    controller.pauseExecution();
    assert.strictEqual(controller.getSnapshot().isExecutionPaused, true);

    controller.resumeExecution();
    assert.strictEqual(controller.getSnapshot().isExecutionPaused, false);

    // Clean cancellation
    const aborted = controller.abortMission(mission.missionId, 'Emergency drill');
    assert.strictEqual(aborted, true);
    assert.strictEqual(mission.state, 'ABORTED');
    assert.ok(mission.tasks.every((t) => t.status === 'COMPLETED' || t.status === 'CANCELLED'));
  });
});
