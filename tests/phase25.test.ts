/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 25 Test Suite: AGI-Inspired Cognitive Intelligence & Evolution Engine.
 * Tests structured cognitive reasoning, Bayesian hypothesis evaluation,
 * multi-option decision matrices, human operator authorization gates,
 * retrieval-augmented continuous learning with duplicate suppression,
 * 6-agent collaborative consensus deliberation, 3-tier predictive scenario
 * forecasting with simulation labeling, Brier score confidence calibration,
 * safety guardrails against self-authorization of critical actions,
 * and knowledge graph cycle detection.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { CognitiveReasoningEngine } from '../src/engines/CognitiveReasoningEngine';
import { AdvancedDecisionIntelligence } from '../src/engines/AdvancedDecisionIntelligence';
import { ContinuousLearningEngine } from '../src/engines/ContinuousLearningEngine';
import { CognitiveAgentCollaboration } from '../src/engines/CognitiveAgentCollaboration';
import { PredictiveScenarioIntelligence } from '../src/engines/PredictiveScenarioIntelligence';
import { CognitiveSelfEvaluation } from '../src/engines/CognitiveSelfEvaluation';
import { KnowledgeGraphEngine } from '../src/engines/KnowledgeGraphEngine';
import { HumanApprovalManager } from '../src/engines/HumanApprovalManager';
import { VRTelemetry } from '../src/types/diagnostics';
import { DecisionOption } from '../src/types/phase25';

// Mock telemetry fixture
const mockTelemetry: VRTelemetry = {
  sessionId: 'test-session-p25',
  startedAt: new Date().toISOString(),
  frames: [
    {
      timestampMs: Date.now(),
      frameDurationMs: 18.5, // ~54 FPS (cadence drop)
      dropped: false,
    },
  ],
  latencySamples: [
    {
      timestampMs: Date.now(),
      latencyMs: 22.4, // elevated latency
    },
  ],
  trackingEvents: [],
  joints: Array.from({ length: 25 }, (_, i) => ({
    jointId: `joint_${i}`,
    tracked: i < 21, // 21 tracked, 4 occluded
    confidence: i < 21 ? 0.95 : 0.2,
  })),
  expectedJointCount: 25,
  lightingPreset: null,
  thresholds: {},
  executedCategories: [],
};

describe('Phase 25: Cognitive Reasoning Engine', () => {
  beforeEach(() => {
    CognitiveReasoningEngine.resetInstance();
  });

  it('decomposes problem, collects multi-provenance evidence, and estimates uncertainty', () => {
    const engine = CognitiveReasoningEngine.getInstance();
    const result = engine.analyzeProblem(
      'Frametime spike to 22.4ms with 4 occluded joints',
      mockTelemetry,
      { source: 'Physical Hardware' }
    );

    assert.ok(result.problemId.startsWith('reason-'));
    assert.ok(result.hypotheses.length >= 3, 'Should formulate at least 3 hypotheses');
    assert.ok(result.evidenceItems.length >= 3, 'Should collect multiple empirical evidence markers');

    // Check evidence provenance
    const physicalEvidence = result.evidenceItems.filter((e) => e.provenance === 'PHYSICAL_HARDWARE');
    assert.ok(physicalEvidence.length > 0, 'Physical telemetry markers must have PHYSICAL_HARDWARE provenance');

    // Check Bayesian updating
    const sumProb = result.hypotheses.reduce((acc, h) => acc + h.posteriorProbability, 0);
    assert.ok(Math.abs(sumProb - 1.0) <= 0.05, 'Posterior probabilities should normalize to ~1.0');

    // Check uncertainty & conclusion
    assert.ok(result.uncertaintyScore >= 0 && result.uncertaintyScore <= 1);
    assert.ok(result.overallConfidence > 0 && result.overallConfidence <= 1);
    assert.ok(result.explainableConclusion.length > 20);
    assert.ok(result.actionableDirectives.length >= 1);
  });

  it('correctly shifts probability mass toward cadence degradation under severe frame lag', () => {
    const engine = CognitiveReasoningEngine.getInstance();
    const laggingTelemetry: VRTelemetry = {
      ...mockTelemetry,
      frames: [{ timestampMs: Date.now(), frameDurationMs: 25.0, dropped: false }], // 40 FPS
      latencySamples: [{ timestampMs: Date.now(), latencyMs: 32.0 }],
    };

    const result = engine.analyzeProblem('Severe render stall', laggingTelemetry);
    const cadenceHyp = result.hypotheses.find((h) => h.id.includes('cadence'));
    assert.ok(cadenceHyp, 'Cadence hypothesis should exist');
    assert.ok(cadenceHyp!.posteriorProbability >= 0.45, 'Cadence posterior should rise under severe latency');
    assert.ok(result.selectedHypothesis?.id.includes('cadence') || result.selectedHypothesis?.id.includes('tracking'));
  });
});

describe('Phase 25: Advanced Decision Intelligence & Human Approval Gates', () => {
  beforeEach(() => {
    AdvancedDecisionIntelligence.resetInstance();
    HumanApprovalManager.resetInstance();
  });

  it('evaluates multi-option trade-off matrix and recommends highest composite score option', () => {
    const engine = AdvancedDecisionIntelligence.getInstance();
    const options: DecisionOption[] = [
      {
        id: 'opt-safe',
        title: 'Safe DRS Step',
        description: 'Scales resolution down 10%',
        feasibilityScore: 0.95,
        riskScore: 0.1,
        benefitScore: 0.85,
        latencyImpactMs: -4.0,
        costImpactUnits: 0,
        requiresHumanApproval: false,
        pros: ['Zero downtime'],
        cons: ['Minor resolution drop'],
      },
      {
        id: 'opt-risky',
        title: 'Full Pipeline Teardown',
        description: 'Hard reset of GPU context',
        feasibilityScore: 0.5,
        riskScore: 0.9,
        benefitScore: 0.95,
        latencyImpactMs: -15.0,
        costImpactUnits: 10,
        requiresHumanApproval: true,
        pros: ['Guaranteed clean state'],
        cons: ['Headset blackout for 2 seconds'],
      },
    ];

    const decision = engine.evaluateDecision({
      title: 'Emergency Latency Intervention',
      context: 'Frame drops detected in WebXR session',
      options,
    });

    assert.strictEqual(decision.recommendedOptionId, 'opt-safe');
    assert.strictEqual(decision.approvalRequired, false);
    assert.strictEqual(decision.executionStatus, 'APPROVED');
  });

  it('enforces operator authorization gate when recommended option has high risk', () => {
    const engine = AdvancedDecisionIntelligence.getInstance();
    const options: DecisionOption[] = [
      {
        id: 'opt-dangerous',
        title: 'Forced Subsystem Migration',
        description: 'High-risk automated failover',
        feasibilityScore: 0.9,
        riskScore: 0.82, // High risk >= 0.7
        benefitScore: 0.95,
        latencyImpactMs: -10.0,
        costImpactUnits: 5,
        requiresHumanApproval: true,
        pros: ['Maximum recovery'],
        cons: ['Potential session drop'],
      },
    ];

    const decision = engine.evaluateDecision({
      title: 'Critical Subsystem Migration',
      context: 'Hardware fault simulated',
      options,
    });

    assert.strictEqual(decision.recommendedOptionId, 'opt-dangerous');
    assert.strictEqual(decision.approvalRequired, true);
    assert.strictEqual(decision.executionStatus, 'PENDING_APPROVAL');
    assert.ok(decision.approvalRequestId, 'Should generate an approval request ID');

    // Operator approves
    const updated = engine.updateDecisionStatus(decision.decisionId, 'APPROVED', 'Authorized by QA Lead');
    assert.strictEqual(updated, true);
    assert.strictEqual(engine.getDecision(decision.decisionId)?.executionStatus, 'APPROVED');
  });
});

describe('Phase 25: Continuous Learning Engine (Experiential RAM)', () => {
  beforeEach(() => {
    ContinuousLearningEngine.resetInstance();
  });

  it('records verified outcomes and prevents duplicate entries via signature hashing', () => {
    const engine = ContinuousLearningEngine.getInstance();
    const initialCount = engine.getInsightCount();

    const record1 = engine.recordOutcome({
      category: 'PERFORMANCE_TUNING',
      patternDescription: 'Dynamic resolution drop during physics burst',
      remedyApplied: 'Pre-warm physics collision broadphase',
      outcomeSuccess: true,
      responsibleAgent: 'PerformanceAgent',
    });

    assert.strictEqual(record1.status, 'RECORDED');
    assert.strictEqual(engine.getInsightCount(), initialCount + 1);

    // Attempt recording duplicate
    const record2 = engine.recordOutcome({
      category: 'PERFORMANCE_TUNING',
      patternDescription: 'Dynamic resolution drop during physics burst',
      remedyApplied: 'Pre-warm physics collision broadphase',
      outcomeSuccess: true,
      responsibleAgent: 'PerformanceAgent',
    });

    assert.strictEqual(record2.status, 'DUPLICATE_UPDATED');
    assert.strictEqual(engine.getInsightCount(), initialCount + 1, 'Duplicate must not increase total count');
    assert.strictEqual(record2.insight.applicationCount, 2, 'Application count must increment on duplicate');
  });

  it('retrieves relevant insights via keyword queries', () => {
    const engine = ContinuousLearningEngine.getInstance();
    const results = engine.queryInsights('frametime latency drs');
    assert.ok(results.length >= 1, 'Should match seeded DRS performance insight');
    assert.ok(results[0].retrievalKeywords.includes('frametime') || results[0].retrievalKeywords.includes('drs'));
  });
});

describe('Phase 25: Cognitive Agent Collaboration (6 Specialist Council)', () => {
  beforeEach(() => {
    CognitiveAgentCollaboration.resetInstance();
  });

  it('convenes all 6 specialist agents and calculates consensus score', () => {
    const engine = CognitiveAgentCollaboration.getInstance();
    const report = engine.conveneMultiAgentDeliberation(
      'Evaluating DRS activation setpoint under skeletal occlusion',
      mockTelemetry
    );

    assert.strictEqual(report.perspectives.length, 6, 'All 6 specialist agents must provide perspectives');

    const agentRoles = report.perspectives.map((p) => p.agentRole);
    assert.ok(agentRoles.includes('OperationsAgent'));
    assert.ok(agentRoles.includes('TestAgent'));
    assert.ok(agentRoles.includes('TrackingAgent'));
    assert.ok(agentRoles.includes('PerformanceAgent'));
    assert.ok(agentRoles.includes('IncidentAgent'));
    assert.ok(agentRoles.includes('ChiefIntelligenceAgent'));

    assert.ok(report.consensusScore >= 0.5 && report.consensusScore <= 1.0);
    assert.ok(report.unifiedDirective.includes('Consensus achieved'));
    assert.strictEqual(typeof report.approvedByChiefOfficer, 'boolean');
  });
});

describe('Phase 25: Predictive Scenario Intelligence (3-Tier Projections)', () => {
  beforeEach(() => {
    PredictiveScenarioIntelligence.resetInstance();
  });

  it('generates Best-Case, Expected, and Worst-Case projections strictly labelled as simulated', () => {
    const engine = PredictiveScenarioIntelligence.getInstance();
    const report = engine.generateScenarioProjections(mockTelemetry);

    assert.ok(report.projections.bestCase);
    assert.ok(report.projections.expected);
    assert.ok(report.projections.worstCase);

    // Check strict simulation labelling (Rule #7 & #8)
    assert.strictEqual(report.projections.bestCase.isSimulatedData, true);
    assert.strictEqual(report.projections.expected.isSimulatedData, true);
    assert.strictEqual(report.projections.worstCase.isSimulatedData, true);

    // Numerical consistency across tiers
    assert.ok(report.projections.bestCase.projectedFps >= report.projections.expected.projectedFps);
    assert.ok(report.projections.expected.projectedFps >= report.projections.worstCase.projectedFps);
    assert.ok(report.projections.worstCase.projectedLatencyMs >= report.projections.bestCase.projectedLatencyMs);

    assert.ok(report.volatilityIndex >= 0 && report.volatilityIndex <= 1.0);
    assert.ok(report.recommendedAction.length > 10);
  });
});

describe('Phase 25: Cognitive Self-Evaluation & Calibration Guardrails', () => {
  beforeEach(() => {
    CognitiveSelfEvaluation.resetInstance();
  });

  it('computes Brier score calibration metrics and discount factors', () => {
    const engine = CognitiveSelfEvaluation.getInstance();
    const metrics = engine.getCalibrationMetrics();

    assert.ok(metrics.totalEvaluations >= 4, 'Should include seeded evaluation history');
    assert.ok(metrics.meanBrierScore >= 0 && metrics.meanBrierScore <= 1.0);
    assert.ok(['OVERCONFIDENT', 'UNDERCONFIDENT', 'WELL_CALIBRATED'].includes(metrics.calibrationBias));
    assert.ok(metrics.suggestedDiscountFactor > 0);
  });

  it('STRICT SAFETY GUARDRAIL: Prohibits self-authorization of high and critical impact actions', () => {
    const engine = CognitiveSelfEvaluation.getInstance();

    const lowCheck = engine.verifySelfAuthorizationEligibility('LOW');
    assert.strictEqual(lowCheck.canSelfAuthorize, true);

    const medCheck = engine.verifySelfAuthorizationEligibility('MEDIUM');
    assert.strictEqual(medCheck.canSelfAuthorize, true);

    const highCheck = engine.verifySelfAuthorizationEligibility('HIGH');
    assert.strictEqual(highCheck.canSelfAuthorize, false);
    assert.ok(highCheck.reason.includes('STRICT SAFETY GUARDRAIL'));

    const critCheck = engine.verifySelfAuthorizationEligibility('CRITICAL');
    assert.strictEqual(critCheck.canSelfAuthorize, false);
    assert.ok(critCheck.reason.includes('require explicit human operator authorization'));
  });
});

describe('Phase 25: Knowledge Graph Engine & Cycle Detection', () => {
  beforeEach(() => {
    KnowledgeGraphEngine.resetInstance();
  });

  it('manages typed nodes, relationships, and confirms default graph is acyclic', () => {
    const kg = KnowledgeGraphEngine.getInstance();
    const snapshot = kg.getSnapshot();

    assert.ok(snapshot.nodeCount >= 10, 'Graph should contain default seeded modules, agents, and rules');
    assert.ok(snapshot.relationshipCount >= 7, 'Graph should contain default seeded relationships');

    const cycles = kg.detectCycles();
    assert.strictEqual(cycles.hasCycles, false, 'Default architecture graph must be strictly acyclic');
    assert.strictEqual(cycles.cycles.length, 0);
  });

  it('detects circular dependencies when an invalid cyclic relation is attempted', () => {
    const kg = KnowledgeGraphEngine.getInstance();

    // Node A depends on Node B
    kg.addNode({
      id: 'node-test-alpha',
      name: 'Alpha Module',
      type: 'MODULE',
      properties: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    kg.addNode({
      id: 'node-test-beta',
      name: 'Beta Module',
      type: 'MODULE',
      properties: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const rel1 = kg.addRelationship({
      id: 'rel-alpha-beta',
      sourceNodeId: 'node-test-alpha',
      targetNodeId: 'node-test-beta',
      relation: 'DEPENDS_ON',
      weight: 1.0,
    });
    assert.strictEqual(rel1.success, true);
    assert.strictEqual(rel1.wouldCauseCycle, false);

    // Attempting Beta depends on Alpha creates Alpha -> Beta -> Alpha cycle!
    const rel2 = kg.addRelationship({
      id: 'rel-beta-alpha-cycle',
      sourceNodeId: 'node-test-beta',
      targetNodeId: 'node-test-alpha',
      relation: 'DEPENDS_ON',
      weight: 1.0,
    });
    assert.strictEqual(rel2.success, false, 'Cycle-causing relation should be rejected');
    assert.strictEqual(rel2.wouldCauseCycle, true, 'Engine must identify that relation causes cycle');
  });
});
