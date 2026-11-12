/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 27 Test Suite: Advanced Strategic Intelligence Engine.
 * Tests:
 * 1. Strategic objective formulation & goal decomposition into measurable SLAs.
 * 2. Long-term mission roadmap planning, critical path analysis, and dynamic telemetry adaptation.
 * 3. Multi-tier predictive scenario analysis with strictly enforced isSimulatedData flags.
 * 4. Quantitative 7-category risk intelligence with early warning triggers and cascading chains.
 * 5. Multi-agent strategic coordination across 6 specialist agents with consensus and disagreement detection.
 * 6. Strategic knowledge association, cross-phase provenance, and outdated assumption auditing.
 * 7. Multi-vector strategy optimization with HumanApprovalManager authorization gating.
 * 8. State aggregation and persistence mode resolution.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { StrategicIntelligenceEngine } from '../src/engines/StrategicIntelligenceEngine';
import { LongTermStrategicPlanner } from '../src/engines/LongTermStrategicPlanner';
import { StrategicScenarioAnalyzer } from '../src/engines/StrategicScenarioAnalyzer';
import { StrategicRiskIntelligence } from '../src/engines/StrategicRiskIntelligence';
import { StrategicAgentCoordinator } from '../src/engines/StrategicAgentCoordinator';
import { StrategicKnowledgeEngine } from '../src/engines/StrategicKnowledgeEngine';
import { StrategicOptimizationEngine } from '../src/engines/StrategicOptimizationEngine';
import { HumanApprovalManager } from '../src/engines/HumanApprovalManager';
import { VRTelemetry } from '../src/types/diagnostics';
import { IncidentRecord } from '../src/types/phase17';

// Fixture 1: Nominal Telemetry
const nominalTelemetry: VRTelemetry = {
  sessionId: 'test-session-p27-nominal',
  startedAt: new Date().toISOString(),
  frames: [
    { timestampMs: Date.now() - 100, frameDurationMs: 11.1, dropped: false },
    { timestampMs: Date.now() - 50, frameDurationMs: 11.2, dropped: false },
    { timestampMs: Date.now(), frameDurationMs: 11.0, dropped: false },
  ],
  latencySamples: [
    { timestampMs: Date.now() - 100, latencyMs: 12.0 },
    { timestampMs: Date.now(), latencyMs: 12.5 },
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

// Fixture 2: Stressed Telemetry (Low Cadence, High Latency, Occluded Joint)
const stressedTelemetry: VRTelemetry = {
  sessionId: 'test-session-p27-stressed',
  startedAt: new Date().toISOString(),
  frames: [
    { timestampMs: Date.now() - 100, frameDurationMs: 25.0, dropped: true },
    { timestampMs: Date.now() - 50, frameDurationMs: 30.0, dropped: true },
    { timestampMs: Date.now(), frameDurationMs: 22.0, dropped: false },
  ],
  latencySamples: [
    { timestampMs: Date.now() - 100, latencyMs: 26.5 },
    { timestampMs: Date.now(), latencyMs: 28.0 },
  ],
  trackingEvents: [],
  joints: Array.from({ length: 25 }, (_, i) => ({
    jointId: `joint_${i}`,
    tracked: i < 20, // 5 joints occluded
    confidence: i < 20 ? 0.90 : 0.40,
  })),
  expectedJointCount: 25,
  lightingPreset: 'low_light',
  thresholds: {},
  executedCategories: [],
};

// Fixture 3: Open Incidents
const sampleIncidents: IncidentRecord[] = [
  {
    incidentId: 'INC-P27-01',
    fingerprint: 'fp-p27-01',
    sessionId: stressedTelemetry.sessionId,
    category: 'render_cadence_drop',
    severity: 'MEDIUM',
    state: 'INVESTIGATING',
    title: 'Frame Dropping under Low Light Glare',
    detectedAt: new Date().toISOString(),
    resolvedAt: null,
    telemetryEvidence: { fps: 42, latency: 26.5 },
    diagnosticExplanation: 'Render frame delta exceeded 20ms during spatial interaction.',
    recommendedAction: 'Downsample non-foveated passes and scale resolution.',
    resolutionNotes: null,
    resolvedBy: null,
    rule2ComplianceVerified: true,
    occurrenceCount: 1,
  },
  {
    incidentId: 'INC-P27-02',
    fingerprint: 'fp-p27-02',
    sessionId: stressedTelemetry.sessionId,
    category: 'tracking_loss',
    severity: 'HIGH',
    state: 'ACTION_REQUIRED',
    title: 'Peripheral Skeletal Occlusion',
    detectedAt: new Date().toISOString(),
    resolvedAt: null,
    telemetryEvidence: { trackedJoints: 20, expected: 25 },
    diagnosticExplanation: 'Tracked joints dropped below 25 target.',
    recommendedAction: 'Engage forward kinematics extrapolation and notify operator.',
    resolutionNotes: null,
    resolvedBy: null,
    rule2ComplianceVerified: true,
    occurrenceCount: 1,
  },
];

describe('Phase 27: Strategic Intelligence Engine Test Suite', () => {
  beforeEach(() => {
    StrategicIntelligenceEngine.resetInstance();
    LongTermStrategicPlanner.resetInstance();
    StrategicScenarioAnalyzer.resetInstance();
    StrategicRiskIntelligence.resetInstance();
    StrategicAgentCoordinator.resetInstance();
    StrategicKnowledgeEngine.resetInstance();
    StrategicOptimizationEngine.resetInstance();
    HumanApprovalManager.resetInstance();
  });

  it('1. Objective Formulation & Goal Decomposition: creates structured measurable targets', () => {
    const engine = StrategicIntelligenceEngine.getInstance();
    const objective = engine.decomposeObjective(
      'Synchronize 25-Joint Forward Kinematics at Zero-Jitter Cadence',
      'Continuous skeletal pose tracking across wide dynamic range.',
      'IMMEDIATE',
      'CRITICAL'
    );

    assert.ok(objective.id.startsWith('obj-'));
    assert.strictEqual(objective.horizon, 'IMMEDIATE');
    assert.strictEqual(objective.priority, 'CRITICAL');
    assert.strictEqual(objective.targetMetrics.minCadenceFps, 72);
    assert.strictEqual(objective.targetMetrics.maxLatencyMs, 14);
    assert.ok(objective.feasibilityScore > 70);
    assert.ok(objective.constraints.length >= 2);
  });

  it('2. Long-Term Strategic Planner: computes critical path and dynamically adapts to telemetry shifts', () => {
    const planner = LongTermStrategicPlanner.getInstance();
    const initialPlan = planner.getPlan();

    assert.ok(initialPlan.objectives.length >= 4);
    assert.ok(initialPlan.milestones.length >= 6);
    assert.ok(initialPlan.criticalPathMilestoneIds.length > 0);

    // Initial nominal adaptation: no revision required
    const nominalAdapt = planner.adaptPlanToTelemetry(nominalTelemetry, []);
    assert.strictEqual(nominalAdapt.revised, false);

    // Stress adaptation with active incidents: triggers dynamic plan revision
    const stressedAdapt = planner.adaptPlanToTelemetry(stressedTelemetry, sampleIncidents);
    assert.strictEqual(stressedAdapt.revised, true);
    assert.ok(stressedAdapt.plan.dynamicRevisionCount > 0);
    assert.ok(stressedAdapt.reason?.includes('active incidents'));

    const atRiskMilestones = stressedAdapt.plan.milestones.filter((m) => m.status === 'AT_RISK');
    assert.ok(atRiskMilestones.length > 0);
  });

  it('3. Strategic Scenario Analyzer: evaluates 4 profiles and strictly enforces isSimulatedData: true', () => {
    const analyzer = StrategicScenarioAnalyzer.getInstance();
    const report = analyzer.evaluateScenarios('obj-imm-telemetry', nominalTelemetry, []);

    assert.strictEqual(report.isSimulatedData, true);
    assert.strictEqual(report.scenarios.length, 4);

    const types = report.scenarios.map((s) => s.type);
    assert.ok(types.includes('BEST_CASE'));
    assert.ok(types.includes('EXPECTED'));
    assert.ok(types.includes('WORST_CASE'));
    assert.ok(types.includes('ALTERNATIVE_PATH'));

    // Check strict tag on every individual scenario
    report.scenarios.forEach((scen) => {
      assert.strictEqual(
        scen.isSimulatedData,
        true,
        `Scenario ${scen.id} must be strictly tagged with isSimulatedData: true`
      );
      assert.ok(scen.probability > 0 && scen.probability <= 100);
      assert.ok(scen.estimatedSurvivalProbability > 0);
    });

    assert.ok(report.divergenceIndex >= 0);
    assert.ok(report.sensitivityAnalysis.latencySensitivity);
  });

  it('4. Strategic Risk Intelligence: computes quantitative scores across all 7 categories with triggers', () => {
    const riskEngine = StrategicRiskIntelligence.getInstance();

    // Nominal conditions
    const nominalSummary = riskEngine.evaluateSystemRisks(nominalTelemetry, []);
    assert.strictEqual(nominalSummary.risks.length, 7);
    const nominalCategories = nominalSummary.risks.map((r) => r.category);
    assert.ok(nominalCategories.includes('TECHNICAL'));
    assert.ok(nominalCategories.includes('MISSION_EXECUTION'));
    assert.ok(nominalCategories.includes('PERFORMANCE'));
    assert.ok(nominalCategories.includes('INFRASTRUCTURE'));
    assert.ok(nominalCategories.includes('DATA_INTEGRITY'));
    assert.ok(nominalCategories.includes('SECURITY'));
    assert.ok(nominalCategories.includes('RESOURCE'));

    assert.strictEqual(nominalSummary.riskLevel, 'NOMINAL');

    // Stressed conditions with incidents
    const stressedSummary = riskEngine.evaluateSystemRisks(stressedTelemetry, sampleIncidents);
    assert.ok(stressedSummary.overallSystemRiskScore > nominalSummary.overallSystemRiskScore);

    const triggeredRisks = stressedSummary.risks.filter((r) => r.isTriggered);
    assert.ok(triggeredRisks.length >= 2, 'Stressed telemetry must trigger early warning thresholds');
    assert.ok(stressedSummary.cascadingChains.length >= 2);
  });

  it('5. Multi-Agent Strategic Coordination: models 6 specialist agents and mediates disagreements', () => {
    const coordinator = StrategicAgentCoordinator.getInstance();

    // Stressed conditions cause PerformanceAgent and TrackingAgent to diverge
    const result = coordinator.coordinateStrategicAlignment(stressedTelemetry, sampleIncidents);

    assert.strictEqual(result.agentPositions.length, 6);
    const agentRoles = result.agentPositions.map((p) => p.agentRole);
    assert.ok(agentRoles.includes('OperationsAgent'));
    assert.ok(agentRoles.includes('TestAgent'));
    assert.ok(agentRoles.includes('TrackingAgent'));
    assert.ok(agentRoles.includes('PerformanceAgent'));
    assert.ok(agentRoles.includes('IncidentAgent'));
    assert.ok(agentRoles.includes('ChiefIntelligenceAgent'));

    assert.ok(result.consensusIndex < 90);
    assert.ok(result.activeDisagreements.length > 0);

    const firstDisagreement = result.activeDisagreements[0];
    assert.ok(firstDisagreement.issue.length > 0);
    assert.ok(firstDisagreement.consensusResolutionProposal.length > 0);
  });

  it('6. Strategic Knowledge Engine: audits outdated assumptions and tracks provenance', () => {
    const knowledge = StrategicKnowledgeEngine.getInstance();
    const associations = knowledge.getAssociations();

    assert.ok(associations.length >= 3);
    const provenances = associations.map((a) => a.provenance);
    assert.ok(provenances.includes('PHYSICAL_HARDWARE'));
    assert.ok(provenances.includes('OPERATOR_DIRECTIVE'));

    // Audits operational assumptions under severe telemetry drops
    const audits = knowledge.auditOperationalAssumptions(stressedTelemetry, sampleIncidents);
    assert.ok(audits.length >= 3);
    const resolvedAudit = audits.find((a) => a.status === 'RESOLVED');
    assert.ok(resolvedAudit);
    assert.ok(resolvedAudit.invalidatedReason.length > 0);
  });

  it('7. Strategy Optimization: enforces HumanApprovalManager gate for HIGH/CRITICAL impact strategies', () => {
    const optimizer = StrategicOptimizationEngine.getInstance();
    const approvalMgr = HumanApprovalManager.getInstance();

    // Under nominal telemetry, balanced low-impact profile is recommended
    const nominalReport = optimizer.evaluateStrategyTradeoffs(nominalTelemetry, []);
    assert.strictEqual(nominalReport.competingStrategies.length, 4);

    // Force stress and active incidents so higher impact or failsafe strategy triggers approval gate
    const stressReport = optimizer.evaluateStrategyTradeoffs(stressedTelemetry, sampleIncidents);
    assert.ok(stressReport.competingStrategies.length === 4);

    // If recommended strategy is HIGH or CRITICAL, approval gate is triggered
    const recommended = stressReport.competingStrategies.find((s) => s.isRecommended);
    assert.ok(recommended);

    if (recommended.impactLevel === 'HIGH' || recommended.impactLevel === 'CRITICAL') {
      assert.ok(stressReport.humanApprovalId, 'Must generate approvalId for high-impact action');
      assert.strictEqual(stressReport.humanApproved, false, 'Must not be pre-approved');

      const pending = approvalMgr.getPendingRequests();
      assert.ok(pending.some((p) => p.approvalId === stressReport.humanApprovalId));

      // Operator grants approval
      const approved = approvalMgr.approveRequest(
        stressReport.humanApprovalId!,
        'TEST_OPERATOR_01',
        'Authorized under test protocol'
      );
      assert.strictEqual(approved, true);
    }
  });

  it('8. Strategic Intelligence State: unifies all sub-engines and persists state safely', () => {
    const engine = StrategicIntelligenceEngine.getInstance();
    const state = engine.getStrategicState(nominalTelemetry, []);

    assert.ok(state.latestPlan);
    assert.strictEqual(state.activeScenarios.length, 4);
    assert.strictEqual(state.riskSummary.risks.length, 7);
    assert.strictEqual(state.coordination.agentPositions.length, 6);
    assert.ok(state.knowledgeSummary.length >= 3);
    assert.ok(state.optimizationReport);
    assert.ok(['LOCAL_DEVELOPMENT', 'CLOUD_FIRESTORE', 'OFFLINE_FALLBACK'].includes(state.persistenceMode));
    assert.ok(state.lastUpdated);

    // Test operator approval via StrategicIntelligenceEngine wrapper
    const approvalMgr = HumanApprovalManager.getInstance();
    const fakeReq = approvalMgr.createApprovalRequest({
      commandId: 'strat-test-cmd',
      commandName: 'Test Command',
      actionSummary: 'Test Action Summary',
      initiator: 'ChiefIntelligenceAgent',
      targetModule: 'TestModule',
      impactLevel: 'HIGH',
      justification: 'Test justification',
      riskAssessmentSummary: 'Test risk',
    });

    const approveRes = engine.approveStrategicRecommendation(fakeReq.approvalId, 'TEST_OPERATOR_01');
    assert.strictEqual(approveRes.success, true);
  });
});
