/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 26 Test Suite: Autonomous Evolution & Meta-Intelligence Engine.
 * Tests Meta-Reasoning quality evaluation and bias detection,
 * Autonomous Research question decomposition and citation verification,
 * Cross-Phase Knowledge dependency mapping and conflict mediation,
 * Adaptive Strategy optimization and human operator authorization gates,
 * Advanced Digital Twin divergence alerts and strictly labeled counterfactuals,
 * and Multi-Agent AI reliability assessment with Brier calibration scoring.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { MetaReasoningEngine } from '../src/engines/MetaReasoningEngine';
import { AutonomousResearchEngine } from '../src/engines/AutonomousResearchEngine';
import { CrossPhaseKnowledgeIntegrator } from '../src/engines/CrossPhaseKnowledgeIntegrator';
import { AdaptiveStrategyOptimizer } from '../src/engines/AdaptiveStrategyOptimizer';
import { AdvancedDigitalTwinIntelligence } from '../src/engines/AdvancedDigitalTwinIntelligence';
import { AIReliabilityAssessment } from '../src/engines/AIReliabilityAssessment';
import { VRTelemetry } from '../src/types/diagnostics';
import { CognitiveReasoningResult } from '../src/types/phase25';
import { IncidentRecord } from '../src/types/phase17';

// Telemetry Fixture: Nominal
const nominalTelemetry: VRTelemetry = {
  sessionId: 'test-session-p26-nominal',
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

// Telemetry Fixture: Degraded (Low cadence, high latency, occluded joints)
const degradedTelemetry: VRTelemetry = {
  sessionId: 'test-session-p26-degraded',
  startedAt: new Date().toISOString(),
  frames: [
    { timestampMs: Date.now() - 100, frameDurationMs: 25.0, dropped: false },
    { timestampMs: Date.now() - 50, frameDurationMs: 33.3, dropped: true },
    { timestampMs: Date.now(), frameDurationMs: 28.5, dropped: true },
  ],
  latencySamples: [
    { timestampMs: Date.now() - 100, latencyMs: 34.0 },
    { timestampMs: Date.now(), latencyMs: 38.5 },
  ],
  trackingEvents: [],
  joints: Array.from({ length: 25 }, (_, i) => ({
    jointId: `joint_${i}`,
    tracked: i < 19, // 6 occluded joints
    confidence: i < 19 ? 0.9 : 0.15,
  })),
  expectedJointCount: 25,
  lightingPreset: 'low_light',
  thresholds: {},
  executedCategories: [],
};

describe('Phase 26: Meta-Reasoning Engine', () => {
  beforeEach(() => {
    MetaReasoningEngine.resetInstance();
  });

  it('evaluates reasoning quality and identifies sparse evidence or bias', () => {
    const metaEngine = MetaReasoningEngine.getInstance();

    const mockAnalysis: CognitiveReasoningResult = {
      problemId: 'prob_test_01',
      problemStatement: 'Kinematic tracking jitter under optical occlusion',
      timestamp: new Date().toISOString(),
      hypotheses: [
        {
          id: 'hyp_occlusion',
          statement: 'Kinematic Occlusion',
          rationale: 'Joint line-of-sight occluded',
          evidenceSupportIds: ['ev_1'],
          evidenceContradictionIds: [],
          priorProbability: 0.5,
          posteriorProbability: 0.95, // High confidence
          status: 'ACCEPTED',
        },
        {
          id: 'hyp_nominal',
          statement: 'Nominal Tracking',
          rationale: 'Sensors operating normally',
          evidenceSupportIds: [],
          evidenceContradictionIds: [],
          priorProbability: 0.5,
          posteriorProbability: 0.05,
          status: 'REJECTED',
        },
      ],
      selectedHypothesis: {
        id: 'hyp_occlusion',
        statement: 'Kinematic Occlusion',
        rationale: 'Joint line-of-sight occluded',
        evidenceSupportIds: ['ev_1'],
        evidenceContradictionIds: [],
        priorProbability: 0.5,
        posteriorProbability: 0.95,
        status: 'ACCEPTED',
      },
      evidenceItems: [
        {
          id: 'ev_1',
          label: 'Joint Occlusion Rate',
          metricKey: 'occludedJointCount',
          observedValue: 6,
          expectedBaseline: 1,
          provenance: 'PHYSICAL_HARDWARE',
          weight: 0.85,
          timestamp: new Date().toISOString(),
        },
      ], // Only 1 piece of evidence
      reasoningSteps: [],
      uncertaintyScore: 0.05,
      overallConfidence: 0.95,
      explainableConclusion: 'Probable kinematic occlusion.',
      actionableDirectives: ['Engage temporal filter'],
    };

    const evaluation = metaEngine.evaluateReasoning(mockAnalysis, nominalTelemetry);

    assert.ok(evaluation.id, 'Evaluation must have an ID');
    assert.ok(evaluation.overallQualityScore >= 0 && evaluation.overallQualityScore <= 100);
    assert.strictEqual(evaluation.isSufficientEvidence, true);

    const hasSparseWeakness = evaluation.weaknesses.some(
      (w) => w.type === 'SAMPLE_SIZE_INSUFFICIENT' || w.type === 'CONFIDENCE_MISCALIBRATION'
    );
    assert.ok(hasSparseWeakness, 'Should identify sparse evidence or confidence miscalibration');

    const overconfidenceBias = evaluation.biasIndicators.find((b) => b.type === 'OVERCONFIDENCE_BIAS');
    assert.ok(overconfidenceBias, 'Overconfidence bias indicator must exist');
    assert.strictEqual(overconfidenceBias.detected, true);

    assert.strictEqual(evaluation.strategyComparisons.length, 4);
    assert.ok(evaluation.strategyComparisons.some((s) => s.strategy === 'BAYESIAN'));
    assert.ok(evaluation.strategyComparisons.some((s) => s.strategy === 'HYBRID_ENSEMBLE'));
  });

  it('correctly marks INSUFFICIENT_EVIDENCE when zero evidence is collected', () => {
    const metaEngine = MetaReasoningEngine.getInstance();

    const emptyAnalysis: CognitiveReasoningResult = {
      problemId: 'prob_empty',
      problemStatement: 'Empty problem',
      timestamp: new Date().toISOString(),
      hypotheses: [],
      selectedHypothesis: null,
      evidenceItems: [], // Zero evidence
      reasoningSteps: [],
      uncertaintyScore: 1.0,
      overallConfidence: 0,
      explainableConclusion: 'No data',
      actionableDirectives: [],
    };

    const evalRes = metaEngine.evaluateReasoning(emptyAnalysis);
    assert.strictEqual(evalRes.status, 'INSUFFICIENT_EVIDENCE');
    assert.strictEqual(evalRes.isSufficientEvidence, false);
    assert.ok(evalRes.metaSummary.includes('Insufficient Evidence'));
  });
});

describe('Phase 26: Autonomous Research Intelligence Engine', () => {
  beforeEach(() => {
    AutonomousResearchEngine.resetInstance();
  });

  it('decomposes questions, extracts grounded citations, and synthesizes findings', () => {
    const researchEngine = AutonomousResearchEngine.getInstance();

    const task = researchEngine.executeResearchTask(
      'Optical Tracking Occlusion & Kinematics',
      'Examine joint occlusion thresholds and spatial stability in VR headsets',
      false
    );

    assert.strictEqual(task.status, 'SYNTHESIZED');
    assert.ok(task.summary);
    assert.strictEqual(task.summary.questions.length, 3);
    assert.ok(task.summary.citations.length > 0);
    assert.ok(task.summary.extractedEvidence.length > 0);
    assert.ok(task.summary.confidenceScore > 0);

    const topCitation = task.summary.citations[0];
    assert.ok(topCitation.reliabilityScore >= 0.9);
    assert.ok(topCitation.authorOrProvider);
    assert.strictEqual(topCitation.isPeerReviewedOrVerified, true);
  });

  it('gates high-impact research tasks behind operator authorization', () => {
    const researchEngine = AutonomousResearchEngine.getInstance();

    const task = researchEngine.executeResearchTask(
      'Deep Hardware Diagnostic Overclocking',
      'Experimental stress test on thermal dissipation and VR GPU clocks',
      true
    );

    assert.strictEqual(task.status, 'WAITING_APPROVAL');
    assert.ok(task.summary);
    assert.strictEqual(task.summary.requiresOperatorApproval, true);
    assert.strictEqual(task.summary.approvalStatus, 'PENDING');
  });
});

describe('Phase 26: Cross-Phase Knowledge Integrator', () => {
  beforeEach(() => {
    CrossPhaseKnowledgeIntegrator.resetInstance();
  });

  it('maps module dependencies across Phases 1-25 and maintains knowledge integrity', () => {
    const integrator = CrossPhaseKnowledgeIntegrator.getInstance();
    const state = integrator.getKnowledgeState();

    assert.ok(state.totalMappedModules >= 10);
    assert.ok(state.activeDependencies.length >= 6);
    assert.ok(state.correlatedIncidents.length >= 3);
    assert.ok(state.knowledgeIntegrityScore >= 80);
  });

  it('detects cross-phase conflicts and allows operator mediation', () => {
    const integrator = CrossPhaseKnowledgeIntegrator.getInstance();

    const criticalIncidents: IncidentRecord[] = [
      {
        incidentId: 'inc_crit_1',
        fingerprint: 'fp_crit_1',
        sessionId: 'session_test',
        title: 'Severe GPU pipeline stall',
        category: 'render_cadence_drop',
        severity: 'CRITICAL',
        state: 'ACTION_REQUIRED',
        detectedAt: new Date().toISOString(),
        resolvedAt: null,
        telemetryEvidence: { fps: 14 },
        diagnosticExplanation: 'Cadence collapse to 14 FPS',
        recommendedAction: 'Restart render loop',
        resolutionNotes: null,
        resolvedBy: null,
        rule2ComplianceVerified: true,
        occurrenceCount: 1,
      },
    ];

    const stateWithConflict = integrator.auditCrossPhaseConsistency(
      nominalTelemetry,
      criticalIncidents,
      false
    );

    assert.ok(stateWithConflict.activeConflicts.length > 0);
    const criticalConflict = stateWithConflict.activeConflicts.find(
      (c) => c.severity === 'CRITICAL'
    );
    assert.ok(criticalConflict, 'Should flag conflict for unresolved critical incident');

    const resolved = integrator.resolveConflict(
      criticalConflict.conflictId,
      'Mission queues halted and render loop restarted'
    );
    assert.strictEqual(resolved, true);

    const postState = integrator.getKnowledgeState();
    assert.strictEqual(
      postState.activeConflicts.some((c) => c.conflictId === criticalConflict.conflictId),
      false
    );
  });
});

describe('Phase 26: Adaptive Strategy Optimizer', () => {
  beforeEach(() => {
    AdaptiveStrategyOptimizer.resetInstance();
  });

  it('optimizes strategy based on system health and prioritizes safety under degradation', () => {
    const optimizer = AdaptiveStrategyOptimizer.getInstance();

    const nominalResult = optimizer.evaluateAndOptimizeStrategies(nominalTelemetry);
    assert.ok(nominalResult.compositeScore >= 80);
    assert.strictEqual(nominalResult.approvalStatus, 'NOT_REQUIRED');

    const criticalIncidents: IncidentRecord[] = [
      {
        incidentId: 'inc_p26_crit',
        fingerprint: 'fp_p26_crit',
        sessionId: 'session_test',
        title: 'Critical Tracking Divergence',
        category: 'tracking_loss',
        severity: 'CRITICAL',
        state: 'ACTION_REQUIRED',
        detectedAt: new Date().toISOString(),
        resolvedAt: null,
        telemetryEvidence: { trackedJoints: 10 },
        diagnosticExplanation: 'Severe tracking loss',
        recommendedAction: 'Failsafe mode',
        resolutionNotes: null,
        resolvedBy: null,
        rule2ComplianceVerified: true,
        occurrenceCount: 1,
      },
    ];

    const degradedResult = optimizer.evaluateAndOptimizeStrategies(
      degradedTelemetry,
      undefined,
      criticalIncidents
    );

    assert.strictEqual(degradedResult.recommendedStrategyId, 'strat_failsafe_01');
    assert.ok(degradedResult.optimizationRationale.includes('Safety weighting prioritized'));
  });

  it('enforces operator authorization for high-risk MAX_PERFORMANCE strategy', () => {
    const optimizer = AdaptiveStrategyOptimizer.getInstance();

    const customResult = optimizer.evaluateAndOptimizeStrategies(
      nominalTelemetry,
      {
        minFrameRateFps: 120,
        maxLatencyMs: 10,
      }
    );

    const maxPerf = customResult.evaluatedStrategies.find((s) => s.executionMode === 'MAX_PERFORMANCE');
    assert.ok(maxPerf);
    assert.strictEqual(maxPerf.riskRating, 'HIGH');
    assert.strictEqual(maxPerf.requiresOperatorApproval, true);
  });
});

describe('Phase 26: Advanced Digital Twin Intelligence', () => {
  beforeEach(() => {
    AdvancedDigitalTwinIntelligence.resetInstance();
  });

  it('detects divergence between physical telemetry and digital twin models', () => {
    const twinIntel = AdvancedDigitalTwinIntelligence.getInstance();

    const analysis = twinIntel.analyzeTwinState(degradedTelemetry, false);

    assert.ok(analysis.analysisId);
    assert.strictEqual(analysis.isSimulatedData, true);
    assert.ok(analysis.activeDivergenceAlerts.length > 0);

    const alert = analysis.activeDivergenceAlerts[0];
    assert.ok(alert.metricName);
    assert.ok(alert.divergencePercent >= alert.thresholdPercent);

    assert.strictEqual(analysis.counterfactualScenarios.length, 3);
    for (const scen of analysis.counterfactualScenarios) {
      assert.strictEqual(scen.isSimulatedData, true);
      assert.ok(scen.simulatedOutcomes.survivabilityIndex >= 0);
    }
  });

  it('labels physical telemetry accurately when hardware is connected', () => {
    const twinIntel = AdvancedDigitalTwinIntelligence.getInstance();

    const analysis = twinIntel.analyzeTwinState(nominalTelemetry, true);
    assert.strictEqual(analysis.isPhysicalVRActive, true);
    assert.strictEqual(analysis.isSimulatedData, false);
    assert.ok(analysis.currentObservedSyncScore >= 70);
  });
});

describe('Phase 26: AI Reliability & Self-Assessment', () => {
  beforeEach(() => {
    AIReliabilityAssessment.resetInstance();
  });

  it('computes reliability metrics and Brier scores for all 6 specialist agents', () => {
    const assessment = AIReliabilityAssessment.getInstance();
    const report = assessment.generateReliabilityReport(30);

    assert.strictEqual(report.sampleSizeAdequate, true);
    assert.ok(report.systemReliabilityScore >= 80);
    assert.ok(report.meanBrierScore < 0.25);
    assert.strictEqual(report.agentMetrics.length, 6);

    const roles = report.agentMetrics.map((m) => m.agentRole);
    assert.ok(roles.includes('OperationsAgent'));
    assert.ok(roles.includes('TestAgent'));
    assert.ok(roles.includes('TrackingAgent'));
    assert.ok(roles.includes('PerformanceAgent'));
    assert.ok(roles.includes('IncidentAgent'));
    assert.ok(roles.includes('ChiefIntelligenceAgent'));

    for (const agent of report.agentMetrics) {
      assert.ok(agent.accuracyRate >= 0.85);
      assert.ok(agent.brierCalibrationScore <= 0.2);
      assert.ok(agent.consensusAgreementRate >= 0.9);
      assert.ok(agent.evidenceCoverageRate >= 0.8);
    }

    assert.ok(report.confidenceInterval[0] < report.confidenceInterval[1]);
    assert.ok(report.identifiedBlindspots.length > 0);
  });

  it('strictly reports Insufficient Evidence when sample size is below threshold (< 5)', () => {
    const assessment = AIReliabilityAssessment.getInstance();
    const report = assessment.generateReliabilityReport(2);

    assert.strictEqual(report.sampleSizeAdequate, false);
    assert.strictEqual(report.systemReliabilityScore, 0);
    assert.ok(report.statusMessage.includes('Insufficient Evidence'));

    for (const agent of report.agentMetrics) {
      assert.strictEqual(agent.reliabilityGrade, 'INSUFFICIENT_DATA');
      assert.strictEqual(agent.accuracyRate, 0);
    }
  });
});
